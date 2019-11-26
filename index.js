'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");
var Block = require("./block");
var logger = require("./logger");

var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

var sockets = [];

var messageTypes = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

var blockchain = [Block.genesis()]; //Initialize in-memory blockchain with genesis block

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();

function initHttpServer() {
    var app = express();
    app.use(bodyParser.json());

    //Blockchain API routes
    app.get('/blocks', function (req, res) {
        res.send(JSON.stringify(blockchain));
    });
    app.get('/blocks/latest', function (req, res) {
        res.send(JSON.stringify([getLatestBlock()]));
    });
    app.post('/blocks/mine', function (req, res) {
        var newBlock = generateNextBlock(req.body.data);
        addBlock(newBlock);
        broadcast(responseLatestMsg());
        logger.winston.info('block added: ' + JSON.stringify(newBlock));
        res.send();
    });

    //Peer/Node API routes
    app.get('/peers', function (req, res) {
        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/peers/add', function (req, res) {
        logger.winston.info(req.body);
        connectToPeers([req.body.peer]);
        res.send();
    });

    //Create HTTP Server
    app.listen(http_port, function () {
        logger.winston.info('HTTP API on: http://localhost:' + http_port + " ");
    });
};


function initP2PServer () { 
    //Create/initialize P2P Server
    var server = new WebSocket.Server({port: p2p_port});
    server.on('connection', function(ws) {
        initConnection(ws)
    });
    logger.winston.info('Websocket P2P on: http://localhost:' + p2p_port + " ");
};

function initConnection (ws) {
    //Initialize P2P connection
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};

function initMessageHandler (ws) {
    //Initialize P2P message handler/router
    ws.on('message', function (data) {
        var message = JSON.parse(data);
        logger.winston.info('Received message' + JSON.stringify(message));
        switch (message.type) {
            case messageTypes.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case messageTypes.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case messageTypes.RESPONSE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
        }
    });
};

function initErrorHandler(ws) {
    //Initialize error handler
    var closeConnection = function (ws) {
        logger.winston.error('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', function () { 
        closeConnection(ws);
    });
    ws.on('error', function () { 
        closeConnection(ws);
    });
};

function connectToPeers (newPeers) {
    //Connect to all peers
    newPeers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', function () { 
            initConnection(ws);
        });
        ws.on('error', function () {
            logger.winston.error('connection failed');
        });
    });
};

function generateNextBlock (blockData) {
    //Generate new block ( /blocks/mine )
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
};


function calculateHashForBlock (block) {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
};

function calculateHash (index, previousHash, timestamp, data) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

function addBlock (newBlock) {
    //Validate new block and add it
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);
    }
};

function isValidNewBlock (newBlock, previousBlock) {
    if (previousBlock.index + 1 !== newBlock.index) {
        logger.winston.info('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        logger.winston.info('invalid previous hash');
        return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        logger.winston.info(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        logger.winston.info('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};

function handleBlockchainResponse (message) {
    //Receieved blockchain from a Peer, compare it to the local blockchain
    var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index)); //Sort blockchain by the index property
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld = getLatestBlock();
    //Compare last received block index with the held block index
    if (latestBlockReceived.index > latestBlockHeld.index) {
        logger.winston.info('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        //Check if the latest held block hash is equal to the previous hash of the latest received block PREVIOUS hash
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            logger.winston.info("We can append the received block to our chain");
            blockchain.push(latestBlockReceived);
            broadcast(responseLatestMsg());
        //If the received blocks length = 1, 
        } else if (receivedBlocks.length === 1) {
            logger.winston.info("We have to query the chain from our peer");
            broadcast(queryAllMsg());
        } else {
            logger.winston.info("Received blockchain is longer than current blockchain");
            replaceChain(receivedBlocks);
        }
    } else {
        logger.winston.info('received blockchain is not longer than current blockchain. Do nothing');
    }
};

function replaceChain (newBlocks) {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        logger.winston.info('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        broadcast(responseLatestMsg());
    } else {
        logger.winston.error('Received blockchain invalid');
    }
};

function isValidChain (blockchainToValidate) {
    //To validate the blockchain, compare the recieved genesis block to the held block
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis()) ) {
        return false;
    }
    var tempBlocks = [blockchainToValidate[0]];
    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
};

// Helper Functions //

function getLatestBlock () {
    return blockchain[blockchain.length - 1];
}

function queryChainLengthMsg () {
    return {'type': messageTypes.QUERY_LATEST};
}
function queryAllMsg () {
    return {'type': messageTypes.QUERY_ALL};
}

function responseChainMsg () {
    return {'type': messageTypes.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain) };
}

function responseLatestMsg () {
    return {'type': messageTypes.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(getLatestBlock())
    };
}

function write (ws, message)  {
    ws.send(JSON.stringify(message));
}

function broadcast (message) {
    sockets.forEach(socket => write(socket, message));
}