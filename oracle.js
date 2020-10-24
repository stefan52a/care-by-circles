// This script is callable by anybody, there is no protection needed.
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { Connection } = require('./lib/Connection.js')

const ID = require('./identification');
const transactions = require('./transactions');
const randomBytes = require('randombytes');

// app.use(express.static(__dirname + '/client')); //for the Angular version
app.use(bodyParser.json());

// // Connect to Mongoose
// const mongoose = require('mongoose')
// mongoose.connect('mongodb://localhost/carebycircles', { useNewUrlParser: true, useUnifiedTopology: true });

// var connection = mongoose.connection;
// connection.on('error', console.error.bind(console, 'connection error:'));
// connection.once('open', function () {
//     connection.db.collection("Circles", function(err, Circles){
//         Circles.find({}).toArray(function(err, data){
//             console.log(data); // it will print your collection data
//         })
//     });
// });

// Better if this goes in your server setup somewhere and waited for.
// Connection.connectToMongo()

// Airdrop tokens to an identity that does not have a genesis Circle yet
app.post('/api/oracleGetAirdrop', (req, res) => {
	const id = req.body.id; // telephone number FTM
	const salt = req.body.salt; // a secret number which only the user controls
	// todo study changing with a timestamp, like done in Corona BLE apps.
	const pubkey = req.body.pubkey; //a HD wallet changing public key
	// bitcoin.ECPair.makeRandom({ network: regtest }).publicKey.toString('hex')
	// pubkey'02cd1e024ea5660dfe4c44221ad32e96d9bf57151d7105d90070c5b56f9df59e5e'  //FTM
	ID.checkExists(id, (err) => { //best would be to use an existing DID system preferably as trustless as possible
		if (err) {
			return res.status(400).json({error: err + " Not allowed (id does not exist, id is not a person)"});
		}
		ID.noGenesisCircle(id, (ans, err) => {
			if (err) {
				return res.status(400).json({error: err});
			}
			transactions.createAndBroadcastCircleGenesisTx(id, pubkey, 1e5, function (unspent, CircleId, err) {
				if (err) return res.status(400).json({error: "Not allowed (maybe the Id already has a genesis Circle(id)) " + CircleId + " " + err} );
				//0.001BTC ,   store UTXO in mongodb, e.g.   unpsent.txId en unspent.vout
				if (unspent.toString().startsWith("500")) return res.status(500).json({ error: unspent});
				else return res.status(200).json({error: "none", Circle: CircleId , tokens:  (1e5 / 1e8), txId: unspent.txId });// xx e.g. could e.g. be be the same as the current blockchain reward
				// but in this case you'll get the reward because you are an identity that does not have a genesis Circle yet.
			})
		});
	});
});

app.post('/api/oraclePleaseSignTx', (req, res) => {
	// const addressToUnlock = req.body.addressToUnlock;// "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; // example address
	const id = req.body.id;
	const circleId = req.body.circleId;

	const pubkeyInUTXO = req.body.pubkeyInUTXO; //Privacyreason: The client also has to keep track of the pubkey belonging to his last Circle transaction
	//instead of this pubkeyInUTXO we better transfer the hash of the script in transaction.PubScriptToUnlockContainsAHashOfContract
	const newPubkeyId = req.body.newPubkeyId;

	const pubkeyNewId = req.body.pubkeyNewId;
	const newId = req.body.newId;

	const contractAlgorithm = req.body.contract;
	// execute the contract if has its hash is in the pubscript to be unlocked
	transactions.PubScriptToUnlockContainsAHashOfContract(id, pubkeyInUTXO, contractAlgorithm, circleId, (err) => {
		if (err) return res.status(400).json({error: err + " Not allowed (The Hash of the contract (contractAlgorithm) is not in the UTXO's lock (pubscript) which a new input could unlock)"})
		//save contractALgorithm to contract.js and execute that contract.js
		try {
			var randFile;
			randomBytes(100, (err, buf) => {
				if (err) return res ({error: err});
				else {
					randFile = path.join(__dirname, "contractTMP" + buf.toString('hex') + ".js");
					createTempContractFile(randFile, contractAlgorithm,
						function (err) {
							if (err) return res.status(500).json({error: err});
							try {
								require(randFile).contract(newId, async (errInContract) => {
									if (errInContract) return res.json({error: errInContract})
									const PSBT = await transactions.PSBT(id, newPubkeyId, pubkeyNewId, circleId)
									if (PSBT.startsWith("500"))
										return res.status(500).json({error: PSBT})// PSBT.data.inputs[0].partialSig[0].signature)  // this is the signature of the Oracle oracleSignTx
									else
										return res.status(200).json({error: "none", PSBT: PSBT})// PSBT.data.inputs[0].partialSig[0].signature)  // this is the signature of the Oracle oracleSignTx
								})
							}
							catch (e2) {
								//client error = status 400
								return res.status(400).json({error: "invalid contract syntax. expecting exactly: " +
									"const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"}
								);
							}
						})
				}
			});
		}
		catch (e) {
			return res.status(400).json({error: "invalid contract syntax. Include \"contract\": in jour JSON. " + e});
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
		if (err) return console.log({error: "Unexpected error removing " + f + " " + err})
	})
}

//janitor clean any old contract files
require("glob").glob("contractTMP*.js", function (er, files) {
	if (er) console.log(er)
	for (f in files) {
		fs.unlink(files[f], (err) => {
			if (err) console.log({error: "Unexpected error removing " + files[f] + " " + err})
		})
	}
});

app.listen(3000);
console.log('Listening on port 3000...');