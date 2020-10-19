// This criupt is callable by anybody, there is no login needed.
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const ID = require('./identification');
const transactions = require('./transactions');
const randomBytes = require('randombytes');

// app.use(express.static(__dirname + '/client')); //for the Angular version
app.use(bodyParser.json());

// Connect to Mongoose
// mongoose.connect('mongodb://localhost/CirclesOracle', {useNewUrlParser: true, useUnifiedTopology: true});
// var db = mongoose.connection;

// Airdrop tokens to an identity that does not have a genesis Circle yet
app.post('/api/oracleGetAirdrop', (req, res) => {
	const id = req.body.id;
	const pubkey = req.body.pubkey;
	// bitcoin.ECPair.makeRandom({ network: regtest }).publicKey.toString('hex')
	// pubkey = '033af0554f882a2dce68a4f9c162c7862c84ba1e5d01a349f29c0a7bdf11d05030'  //FTM
	ID.checkExists(id, (err) => { //best would be to use an existing DID system preferably as trustless as possible
		if (err) {
			return res.json(err + " Not allowed (id does not exist, id is not a person)");
		}
		ID.getGenesisCircle(id, async (CircleId, err) => {
			if (err) {
				await transactions.createAndBroadcastCircleGenesisTx(pubkey, 1e9) //10BTC 
				return res.json("Circle " + CircleId + " created for " + id + " and " + (1e9 / 1e8) + " tokens will be airdropped (locked with an oracle and pubkey: " + pubkey+ ")";// xx e.g. could e.g. be be the same as the current blockchain reward
				// but in this case you'll get the reward because you are an identity that does not have a genesis Circle yet.
			} else {
				return res.json("Not allowed (the Id already has a genesis Circle(id)) " + CircleId);
			}
		});
	});
});

app.post('/api/oraclePleaseSignTx', (req, res) => {
	var addressToUnlock = req.body.addressToUnlock;
	addressToUnlock = "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; // example address
	const newId = req.body.newId;
	const contractAlgorithm = req.body.contract;
	// execute the contract if has its hash is in the pubscript to be unlocked
	transactions.PubScriptToUnlockContainsAHashOf(addressToUnlock, contractAlgorithm, (err) => {
		if (err) return res.json("Not allowed (The Hash of the contract (contractAlgorithm) is not in the UTXO's lock (pubscript) a new input could unlock)")
		//save contractALgorithm to contract.js and execute that contract.js
		try {
			var randFile;
			randomBytes(100, (err, buf) => {
				if (err) console.log(err);
				else {
					randFile = path.join(__dirname, "contract" + buf.toString('hex') + ".js");
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
			});
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

function bin2string(array) {
	return array.map(function (b) {
		return String.fromCharCode(b);
	}).join("");
}

app.listen(3000);
console.log('Listening on port 3000...');