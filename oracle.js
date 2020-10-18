// This criupt is callable by anybody, there is no login needed.
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const ID = require('./identification');
const transactions = require('./transactions');

// app.use(express.static(__dirname + '/client')); //for the Angular version
app.use(bodyParser.json());

// Connect to Mongoose
// mongoose.connect('mongodb://localhost/CirclesOracle', {useNewUrlParser: true, useUnifiedTopology: true});
// var db = mongoose.connection;

// Airdrop tokens to an identity that does not have a genesis Circle yet
app.post('/api/oracleGetAirdrop', (req, res) => {
	const id = req.body.id;
	const pubkey = req.body.pubkey;
	ID.checkExists(id, (err) => { //best would be to use an existing DID system preferably as trustless as possible
		if (err) {
			throw (err + " Not allowed (id does not exist, id is not a person)");
		}
		ID.getGenesisCircle(id, (CircleId, err) => {
			if (err) {
				// scriptPubKey (to lock output):
				// IF
				// <oraclePleaseSignTx_hash> DROP
				// 2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2 CHECKMULTISIG
				// ELSE
				// <contractBurn_hash> DROP
				// n +1 <IDi pubkey> ..... <IDn pubkey><oracleBurn pubkey> m+1 CHECKMULTISIG
				// ENDIF
				res.json("Circle " + CircleId + " created for " + id + " and " + "x" + " tokens will be airdropped (locked with a scriptPubkey) to " + pubkey);// xx e.g. could e.g. be be the same as the current blockchain reward
				// but in this case you'll get the reward because you are an identity that does not have a genesis Circle yet.
			} else {
				throw ("Not allowed (the Id already has a genesis Circle(id)) " + CircleId);
			}
		});
	});
});

app.post('/api/oraclePleaseSignTx', (req, res) => {
	const newId = req.body.newId;
	const contractAlgorithm = req.body.contract;
	// execute the contract if has its hash in the pubscript to unlock
	transactions.PubScriptToUnlockContainsAHashOf(contractAlgorithm, (err) => {
		if (err) return res.json("Not allowed (The Hash of the contract (above conditions C) is not in the lock (pubscript))")
		//save contractALgorithm to contract.js and execute that contract.js
		try {  //todo study how to prevent js injection attack, is prevented by checking the hash
			randFile = path.join(__dirname, "contract" + "Random256ByteRealRandom" + Math.random() + ".js");// generate a real random 256 byte string
			createTempContractFile(randFile, contractAlgorithm,
				function (err) { 
					if (err) return res.json(err);
					try {
						require(randFile).contract(newId, (errInContract) => {
							if (errInContract) return res.json(errInContract)
							transactions.PSBT((PSBT, err) => {
								if (err) return res.json(err)
								return res.json(PSBT)
							})
						})
					}
					catch (e2) {
						return res.json("invalid contract syntax. expecting exactly: " +
							"const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId)\nelse if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId)\nelse callback(PSBT);});});}    "
						);
					}
				})
		}
		catch (e) {
			return res.json("invalid contract syntax. Include \"contract\": in jour JSON. " + e);
		}
	})
});

function createTempContractFile(randFile, contractAlgorithm, callback) {
	//a janitor that deletes the contract file after 30 secs
	setTimeout((function (randFil) {
		return function () {
			rmFile(randFil)
		}
	})(randFile), 30000);
	fs.writeFile(randFile, contractAlgorithm, callback)
}

function rmFile(f) {
	fs.unlink(f, (err) => {
		if (err) return console.log("Unexpected error removing " + f + " " + err)
	})
}

app.listen(3000);
console.log('Listening on port 3000...');