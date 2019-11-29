'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");
var Block = require("./block");
var logger = require("./logger");
var portscanner = require('portscanner');

var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
var server_name = process.env.NODE_NAME || "Unknown Node";
var peers = initialPeers;

var connectedPeers = []
var sockets = [];

var server = new WebSocket.Server({ port: p2p_port });

var messageTypes = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

var blockchain = [Block.genesis()]; //Initialize in-memory blockchain with genesis block

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();
setTimeout(initP2PAutoDiscovery, 2000); //Wait 2 seconds and then check for peers
setInterval(initP2PAutoDiscovery, 60000); //Check for new peers every minute

function initHttpServer() {
    var app = express();
    app.use(bodyParser.json());

    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    //Blockchain API routes
    app.get('/api/v1/blocks', function (req, res) {
        res.send(JSON.stringify(blockchain));
    });
    app.get('/api/v1/blocks/latest', function (req, res) {
        res.send(JSON.stringify([getLatestBlock()]));
    });
    app.post('/api/v1/blocks/mine', function (req, res) {
        var newBlock = generateNextBlock(JSON.stringify(req.body));
        addBlock(newBlock);
        broadcast(responseLatestMsg());
        logger.winston.info('block added: ' + JSON.stringify(newBlock));
        res.send({});
    });

    //Peer/Node API routes
    app.get('/api/v1/peers', function (req, res) {
        res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    //Peer/Node API routes
    app.get('/api/v1/peers/discover', function (req, res) {
        initP2PAutoDiscovery();
        res.send({ status: "success"});
    });
    app.post('/api/v1/peers/add', function (req, res) {
        connectToPeers([req.body.peer]);
        res.send({});
    });
    app.delete('/api/v1/peers', function (req, res) {
        disconnectPeer([req.body.peer]);
        res.send({ status: "success"});
    });


    // Serve static files for UI website on root
    app.use('/', express.static('web/'));
    app.use('/scripts', express.static('node_modules/'));

    //Create HTTP Server
    app.listen(http_port, function () {
        logger.winston.info('HTTP API on: http://localhost:' + http_port + '/api/v1/');
    });
};


function initP2PServer() {
    //Create/initialize P2P Server
    server.on('connection', function (ws) {
        initConnection(ws)
    });
    logger.winston.info('Websocket P2P on: ws://localhost:' + p2p_port);
};

function initP2PAutoDiscovery() {
    //We assume other Nodes are on localhost and their port number is in the range 6001 -> 6010
    var host = "ws://localhost:";
    var i = 6000;

    while (i < 6011) {
        portscanner.findAPortInUse(i).then(function (port_no) {
            var address = host + port_no;
            if (host && port_no && peers.indexOf(address) == -1 && findWithAttr(sockets, "url", address) == -1 && port_no.toString() !== p2p_port.toString()) {
                logger.winston.info("New node added: " + address);
                peers.push(address);
                connectToPeers([address]);
            }
        })
        i++;
    }
}

function initConnection(ws) {
    //Initialize P2P connection
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
    //}
};

function initMessageHandler(ws) {
    //Initialize P2P message handler/router
    ws.on('message', function (data) {
        var message = JSON.parse(data);
        logger.winston.info('Rec. Message: ' + JSON.stringify(message).substr(0, 30));
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
        logger.winston.error('Connection failed to: ' + ws.url);
        disconnectPeer(ws.url);
    };
    ws.on('close', function () {
        closeConnection(ws);
    });
    ws.on('error', function () {
        closeConnection(ws);
    });
};

function connectToPeers(newPeers) {
    //Connect to initialPeer List or any additional peers added
    newPeers.forEach((peer) => {
        if (findWithAttr(sockets, "url", peer) == -1) {
            var ws = new WebSocket(peer);
            ws.on('open', function () {
                initConnection(ws);
            });
            ws.on('error', function () {
                logger.winston.error('Connection failed to: ' + ws.url);
                disconnectPeer(ws.url);
            });
        }
    });
};

function disconnectPeer(url) {
    if (url) {
        var idx = findWithAttr(sockets, "url", url)
        sockets.splice(idx, 1);
        peers.splice(peers.indexOf(url), 1);
        logger.winston.info("Node removed: " + url);
    }
}

function generateNextBlock(blockData) {
    //Generate new block ( /blocks/mine )
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
    var sourceNode = "http://localhost:" + http_port;
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash, sourceNode);
};


function calculateHashForBlock(block) {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
};

function calculateHash(index, previousHash, timestamp, data) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

function addBlock(newBlock) {
    //Validate new block and add it
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.push(newBlock);
    }
};

function isValidNewBlock(newBlock, previousBlock) {
    if (previousBlock.index + 1 !== newBlock.index) {
        logger.winston.error('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        logger.winston.error('invalid previous hash');
        return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        logger.winston.error(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        logger.winston.error('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};

function handleBlockchainResponse(message) {
    //Receieved blockchain from a Peer, compare it to the local blockchain
    try {
        var receivedBlocks = [JSON.parse(message.data)];
        receivedBlocks = receivedBlocks.sort((b1, b2) => (b1.index - b2.index)); //Sort blockchain by the index property
        var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        var latestBlockHeld = getLatestBlock();
        //Compare last received block index with the held block index
        if (latestBlockReceived.index > latestBlockHeld.index) {
            logger.winston.info('Received block index (' + latestBlockReceived.index + ') > Local block index (' + latestBlockHeld.index + ')');
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                logger.winston.info("---------------------------------------------------");
                logger.winston.info("Hash == previous Hash, appending to Local blockchain");
                blockchain.push(latestBlockReceived);
                broadcast(responseLatestMsg());
            } else if (receivedBlocks.length === 1) {
                logger.winston.info("Query blockchain from our peer");
                broadcast(queryAllMsg());
            } else {
                logger.winston.info("---------------------------------------------------");
                logger.winston.info("Received blockchain > Local blockchain, checking validity ...");
                replaceChain(receivedBlocks);
            }
        } else {
            logger.winston.info('Received blockchain <= Local blockchain. Ignore');
        }
    } catch (err) {
        logger.winston.error(err);
    }
};

function replaceChain(newBlocks) {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        logger.winston.info('Received blockchain is valid. Replacing Local with received.');
        blockchain = newBlocks;
        broadcast(responseLatestMsg());
    } else {
        logger.winston.error('Received blockchain invalid');
    }
};

function isValidChain(blockchainToValidate) {
    //To validate the blockchain, compare the recieved genesis block to the held block
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(Block.genesis())) {
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

function getLatestBlock() {
    return blockchain[blockchain.length - 1];
}

function queryChainLengthMsg() {
    return { 'source': p2p_port, 'type': messageTypes.QUERY_LATEST };
}
function queryAllMsg() {
    return { 'source': p2p_port, 'type': messageTypes.QUERY_ALL };
}

function responseChainMsg() {
    return { 'source': p2p_port, 'type': messageTypes.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain) };
}

function responseLatestMsg() {
    return { 'source': p2p_port, 'type': messageTypes.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(getLatestBlock()) };
}

function write(ws, message) {
    ws.send(JSON.stringify(message));
}

function broadcast(message) {
    sockets.forEach(socket => write(socket, message));
}

function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}