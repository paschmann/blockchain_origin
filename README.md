# Introduction
A naive simplified implementation of using blockchain as a static register in a food origin scenario allowing manufactures, distributers and retailers to publish product information and view the data.

# Concept
This project was developed as a Proof of concept for a paper entitled "Blockchain and the transformation of Marketing". The general premise behind the paper was around how companies can utilize digital ledgers on blockchain for product tracability and reduce the risks or impact of food fraud or food safety incidents.

# Architecture
The application has 3 main components.
1. A **web UI** used to create and view the blockchain, peers on the network and create transactions.
2. A **HTTP API** used to accept calls from the web UI and interact with the blockchain
3. A **peer-to-peer network** used for syncronization of peers on the blockchain network

**Note**: Blockchain data is not persisted, when all 3 of the server components are stopped, data is cleared.

# Installation
Download/clone this repo
Run ```npm install``` to install dependencies

I would suggest opening at least 3 terminal/command windows:
- Run ```npm run start:manufacturing``` in one window
- Run ```npm run start:distribution``` in another window
- Run ```npm run start:retail``` in another window

This will run 3 different nodes simulating the peer-to-peer network

Open your browser to [http://localhost:3001](http://localhost:3001) once the server is running to view the Admin panel where you create transactions directly on each of the nodes.

# Reference
The blockchain component of this project is largely based on [Naivechain](https://github.com/lhartikk/naivechain) from Ihartikk

# Requirements
Node.js

# Contributions
If you would like to contribute to the development of this project, please feel free to create a issue, fork the repo and subsequently make a pull request. Creating a issue will enable others to see what you are working on and avoid work duplication.