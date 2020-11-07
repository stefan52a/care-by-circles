// This API is callable by anybody, there is no protection needed.

const constants = require('./constants');
const bitcoin = require('bitcoinjs-lib');
const regtestClient = require('regtest-client');
// const e = require('express');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
//e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;

const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const ID = require('./identification');
const transactions = require('./transactions');
const randomBytes = require('randombytes');
// Make only one mongodb connection per session:  BY TOM:
var db;
global.CirclesCollection;
var MongoClient = require('mongodb').MongoClient;

// app.use(express.static(__dirname + '/client')); //for an Angular version
app.use(bodyParser.json());


// Airdrop tokens to an identity that does not have a genesis Circle yet
app.post('/api/oracleGetAirdrop', (req, res) => {  //Alice wil get an airdrop form a faucet
	const AliceId = req.body.AliceId; // telephone number FTM
	const saltAlice = req.body.saltAlice; // a secret number which only the user controls
	// todo study changing with a timestamp, like done in Corona BLE apps.
	const AlicePubkey = req.body.AlicePubkey; //a HD wallet changing public key
	ID.checkExists(AliceId, saltAlice, (error) => { //best would be to use an existing DID system preferably as trustless as possible
		if (error) {
			console.log("error: " + error + " Not allowed (id does not exist, id is not a person)");
			return res.status(400).json({ error: error + " Not allowed (id does not exist, id is not a person)" });
		}
		//http://www.lifewithalacrity.com/2004/03/the_dunbar_numb.html
		filename = __dirname + '/ExamplecontractExample.js';
		fs.readFile(filename, 'utf8', function (err, contractFromFile) {
			if (err) throw err;
			console.log('OK: ' + filename);
			console.log(contractFromFile)
			const contract = contractFromFile.trim().replace(/\s+/g, ' ')
			ID.hasNoGenesisCircle(AliceId, saltAlice, (ans, error) => {
				if (error) {
					console.log("error: " + error);
					return res.status(400).json({ error: error });
				}
				transactions.createAndBroadcastCircleGenesisTx(AliceId, saltAlice, AlicePubkey, contract, constants.SATOSHI_FORGENESIS, true, (answ) => {
					const status = answ.status
					const err = answ.err
					if (err) {
						console.log("status " + status + " " + err)
						return res.status(status).json({ error: "status " + status + " " + err });
					}
					const psbt = answ.psbt
					const CircleId = answ.CircleId
					//0.001BTC ,   store UTXO in mongodb, e.g.   unpsent.txId en unspent.vout
					console.log({ version: constants.VERSION, error: "none", CircleId: CircleId, tokens: (answ.satoshiAliceLeft / 1e8), psbt: psbt, addressOfUTXO: answ.addressOfUTXO, contract: contract })
					res.status(200).json({ version: constants.VERSION, error: "none", Circle: CircleId, tokens: (answ.satoshiAliceLeft / 1e8), psbt: psbt, addressOfUTXO: answ.addressOfUTXO, contract: contract });// xx e.g. could e.g. be be the same as the current blockchain reward
					return
					// but in this case you'll get the reward because you are an identity that does not have a genesis Circle yet.
				})
			})
		})
	});
});

app.post('/api/oraclePleaseSignTx', (req, res) => {
	// const addressToUnlock = req.body.addressToUnlock;// "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; // example address
	const AliceId = req.body.AliceId;
	const saltAlice = req.body.saltAlice;
	const circleId = req.body.circleId;

	const pubkeyOfUTXO = req.body.pubkeyInUTXO; //For Privacyreasons: The client also has to keep track of the pubkey belonging to his last Circle transaction
	//TODo TODO !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!instead of this pubkeyInUTXO and addressOfUTXO we better transfer the hash of the script in transaction.PubScriptToUnlockContainsAHashOfContract
	const addressOfUTXO = req.body.addressOfUTXO; //For Privacyreasons: The client also has to keep track of the address belonging to his last Circle transaction

	const AliceNewPubkey = req.body.AliceNewPubkey;

	const BobPubkey = req.body.BobPubkey;
	const BobId = req.body.BobId;
	const saltBob = req.body.saltBob;

	const contract = req.body.contract;
	// execute the contract if has its hash is in the pubscript to be unlocked
	transactions.PubScriptToUnlockContainsAHashOfContract(AliceId, saltAlice, pubkeyOfUTXO, addressOfUTXO, contract, (err) => {
		if (err) {
			console.log({ error: err + " Not allowed (unlockscript contains incorrect information (contract or pubkey))" })
			return res.status(400).json({ error: err + " Not allowed (unlockscript contains incorrect information (contract or pubkey)) " })
		}
		//save contractALgorithm to contract.js and execute that contract.js
		try {
			var randFile;
			randomBytes(100, (err, buf) => {
				if (err) {
					console.log({ error: err });
					return res({ error: err });
				}
				else {
					randFile = path.join(__dirname, "contractTMP" + buf.toString('hex') + ".js");
					createTempContractFile(randFile, contract,
						function (err) {
							if (err) {
								console.log({ error: err });
								return res.status(500).json({ error: err });
							}
							try {
								require(randFile).contract(circleId, BobId, saltBob, (dummy, errInContract) => {
									if (errInContract) {
										console.log({ error: errInContract })
										return res.json({ error: errInContract })
									}






									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
									// TEMPORARY, somehow it does not mine the transfer from Alice to Alice
									// therefore we use a faucet to emulate that there is some tokens on Alice's address
									transactions.createAndBroadcastCircleGenesisTx(AliceId, saltAlice, AliceNewPubkey, contract, constants.SATOSHI_FORGENESIS - 500, false, (answ) => {
										// but in this case you'll get the reward because you are an identity that does not have a genesis Circle yet.
										// TEMPORARY, somehow it does not mine the transfer from Alice to Alice
										// therefore we use a faucet to emulate that there is some tokens on Alice's address
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										transactions.PSBT(AliceId, saltAlice, contract, AliceNewPubkey, BobId, saltBob, BobPubkey, circleId, (AliceAddressOfNewUTXO, PSBT, OracleFinal, status, err) => {
											if (err) {
												console.log({ status: status, error: err })
												return res.status(status).json({ error: err })
											}
											// const dummy = PSBT.data.inputs[0].partialSig[0].signature  // this is the signature of the Oracle oracleSignTx
											console.log({ status: status, error: "none", psbtBaseText: PSBT, OracleText: OracleFinal })


											//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
											// 										//temp:
											// 										const regtestClient = require('regtest-client');
											// 										const APIPASS = process.env.APIPASS || 'sastoshi';
											// 										const APIURL = process.env.APIURL || 'http://localhost:8080/1';
											// 										const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
											// 										const regtest = regtestUtils.network;
											// 										const bitcoin = require('bitcoinjs-lib');
											// 										var aClientSignTxID = bitcoin.ECPair.fromWIF(
											// 											'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS', ///// TODO KEEP SECRET
											// 											regtest,
											// 										);

											// 										const psbt = require('./test/psbtMod/psbtMod').Psbt.fromHex(PSBT.toHex());
											// 										// const psbtObj = new Function('return ' + psbt.toString()+'')()
											// 										psbt.signInput(0, aClientSignTxID)

											// 										// you can use validate signature method provided by library to make sure generated signature is valid
											// 										if (!psbt.validateSignaturesOfAllInputs()) // if this returns false, then you can throw the error
											// 										{
											// 											console.log("could not validate signatures of psbt ")
											// 										}

											// 										psbt.finalizeAllInputs(regtest)


											// 										// signed transaction hex
											// 										const transaction = psbt.extractTransaction()
											// 										const signedTransaction = transaction.toHex()
											// 										const transactionId = transaction.getId()
											// 										// sign transaction end

											// 										// // build and broadcast to the Bitcoin RegTest network
											// 										async function dum() {console.log (await regtestUtils.broadcast(signedTransaction))}
											// 										dum();
											// 										//endtemp 
											// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
											res.status(status).json({
												error: "none", psbtBaseText: PSBT, psbtSignedByOracleBaseText: OracleFinal,
												version: constants.VERSION, error: "none", Circle: circleId, tokens: (constants.SATOSHI_FORGENESIS / 1e8), addressOfUTXO: AliceAddressOfNewUTXO, contract: contract
											})
											return
										})

									})
								})
							}
							catch (e2) {
								//client error = status 400
								console.log({
									error: "invalid contract syntax" + e2 +
										""// "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
								}
								);
								return res.status(400).json({
									error: "invalid contract syntax" + e2 +
										""//"const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
								}
								);
							}
						})
				}
			});
		}
		catch (e) {
			console.log({ error: "invalid contract syntax. Include \"contract\": in jour JSON. " + e });
			return res.status(400).json({ error: "invalid contract syntax. Include \"contract\": in jour JSON. " + e });
		}
	})
});


// app.post('/api/startFresh', (req, res) => {  //temporary endpoint
// 	// const addressToUnlock = req.body.addressToUnlock;// "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; // example address
// 	const AliceId = req.body.AliceId;
// 	const saltAlice = req.body.saltAlice;
// 	const circleId = req.body.circleId;
// 	CirclesCollection.updateOne(
// 		// { "Attribute": "good" },
// 		{ saltedHashedIdentification: ID.HMAC(AliceId, saltAlice), instanceCircles: circleId, "version": constants.VERSION },
// 		{ $set: { version: "deleted"+ constants.VERSION } },
// 		// { upsert: true },
// 		function (err, circles) {
// 			if (err) { return res.status(500).json({error: "Something went wrong: could not delete id/circle combination" + err}) }
// 			if (circles.matchedCount != 1) return res.status(500).json({error: "2: Something went terribly wrong: no or more than 1 circles assigned to a user"} )  
// 			else {
// 				return res.status(200).json({error:"none"});
// 			}


// 		});
// });

// app.post('/api/GiveTxIdToOracle', (req, res) => {
// 	const instanceCircles = req.body.instanceCircles;
// 	const id = req.body.id;

// 	const txId = req.body.txId;

// 	//get address of public key:  https://bitcoin.stackexchange.com/a/54999/45311
// 	//update mongoDB here for instanceCircles, id   combination with valuyes txId and address (ToUnlock)
// 	CirclesCollection.updateOne(
// 		// { "Attribute": "good" },
// 		{ instanceCircles: instanceCircles, saltedHashedIdentification: id,  "version": constants.VERSION  },
// 		{ $set: { txId: txId, addressToUnlock: address, updateDate: Date.now } },
// 		function (err, circles) {
// 			if (err) { return res.status(500).json({ error: "Something went wrong while updating!" + err }) }
// 			// addressToUnlock=circles[0].BTCaddress;
// 			// txId = circles[0].txId;
// 			// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
// 			return res.status(200).json({ error: "none" })
// 		})
// });

// app.post('/api/GiveTxIdToOracle', (req, res) => {
// 	const instanceCircles = req.body.instanceCircles;
// 	const id = req.body.id;

// 	const txId = req.body.txId;

// 	//get address of public key:  https://bitcoin.stackexchange.com/a/54999/45311
// 	//update mongoDB here for instanceCircles, id   combination with valuyes txId and address (ToUnlock)
// 	CirclesCollection.updateOne(
// 		// { "Attribute": "good" },
// 		{ instanceCircles: instanceCircles, saltedHashedIdentification: id,  "version": constants.VERSION  },
// 		{ $set: { txId: txId, addressToUnlock: address, updateDate: Date.now } },
// 		function (err, circles) {
// 			if (err) { return res.status(500).json({ error: "Something went wrong while updating!" + err }) }
// 			// addressToUnlock=circles[0].BTCaddress;
// 			// txId = circles[0].txId;
// 			// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
// 			return res.status(200).json({ error: "none" })
// 		})
// });

app.post('/api/broadcastToRegtest', async (req, res) => {
	const psbt = req.body.psbtToBroadcast;
	const psbtToBroadcast = bitcoin.Psbt.fromBase64(psbt, { network: regtest })
	// build and broadcast to our RegTest network
	await regtestUtils.broadcast(psbtToBroadcast.extractTransaction().toHex());
	// Mine 10 blocks, returns an Array of the block hashes
	// the above psbt will confirm
	await regtestUtils.mine(10);
	// for bitcoin-cli decodepsbt use the psbt fromhex then to base64 (e.g. with cyberchef)
	//////////////////////////////////////////////////////////////////////todo
	//////////////////////////////////////////////////////////////////////todo
	//////////////////////////////////////////////////////////////////////todo
	//////////////////////////////////////////////////////////////////////todo
	//////////////////////////////////////////////////////////////////////todo
	// await regtestUtils.verify({
	//     txId: psbtToBroadcast.extractTransaction().toHex(),
	//     address: fromPubkey,
	//     vout: 0,
	//     value: response.data.tokens,
	// });
	//////////////////////////////////////////////////////////////////////todo

	const psbtBase64 = psbtToBroadcast.toBase64()
	console.log('\npsbt can be decoded with \n"  bitcoin-cli -regtest decodepsbt ', psbtBase64 + '   "\n')//fromhex, tobase64  (e.g. with cyberchef)


	return res.status(200).json({ msg: "done", error: '' })
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
		if (err) {
			return console.log({ error: "Unexpected error removing " + f + " " + err })
		}
	})
}

//janitor clean any old contract files
require("glob").glob("contractTMP*.js", function (er, files) {
	if (er) console.log(er)
	for (f in files) {
		fs.unlink(files[f], (err) => {
			if (err) console.log({ error: "Unexpected error removing " + files[f] + " " + err })
		})
	}
});


// Make only one mongodb connection per session:  BY TOM:
// Initialize connection once
MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
	if (err) throw err;

	db = database.db("carebycircles");
	// console.log(db);
	CirclesCollection = db.collection("circles");
	// console.log(CirclesCollection);


	// Start the application after the database connection is ready
	app.listen(3000);

	console.log("Listening on port 3000");
});


