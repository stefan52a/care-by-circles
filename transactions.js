var mongoose = require('mongoose');
const Circles = require('./lib/Circles');
const randomBytes = require('randombytes');

const axios = require('axios')
// see for a tutorial of bitcoinjs:  https://bitcoinjs-guide.bitcoin-studio.com/


// see https://github.com/bitcoinjs/regtest-server/tree/master/docker
//Downloads the image from docker
//docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server

const assert = require('assert')
const { Connection } = require('./lib/Connection.js')

const crypto = require('crypto-js');
const bitcoin = require('bitcoinjs-lib');

const regtestClient = require('regtest-client');
// const e = require('express');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
//e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;
// const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
const oracleSignTx = bitcoin.ECPair.fromWIF(
	'cTsrZtbGTamSLAQVbLfv3takw97x28FKEmVmCfSkebDoeQ3547jV', ///// TODO KEEP SECRET
	regtest,
);
const oracleBurnTx = bitcoin.ECPair.fromWIF(
	'cRs1KTufxBpY4wcexxaQEULA4CFT3hKTqENEy7KZtpR5mqKeijwU',  ///// TODO KEEP SECRET
	regtest,
);

const axiosInstance = axios.create({
	baseURL: APIURL,
	timeout: 10000
});

const contractHash = "ad40955030777152caefd9e48ec01012f674c5300e1543d32191adba55b83a4d"; //SHA256 hash of algorithm: const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}

module.exports.PubScriptToUnlockContainsAHashOfContract = (id, pubkeyUsedInUTXO, algorithm, circleId, callback) => {

	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. with hash of contract etc) and look whether it hashes to the right hash of the redeem script.

	var addressToUnlock;


	mongoose.connect('mongodb://localhost/carebycircles', { useNewUrlParser: true, useUnifiedTopology: true });

	var connection = mongoose.connection;
	// connection.on('error', () => { return callback("fout", "Something went wrong: " + 'connection error:') });
	connection.once('open', function () {

		connection.db.collection("Circles", function (err, Circles) {
			Circles.find({ saltedHashedIdentification: id }).toArray(function (err, circles) {
				connection.close()
				if (err) { return callback(err, "Something went wrong terribly: no circles assigned to a user, in the function when checking the contract hash!") }
				if (circles.length != 1) return callback("error", "Something went wrong terribly: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
				else {
					addressToUnlock = circles[0].BTCaddress;
					pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
				}
				// make hash of the redeemscript
				try {
					const redeemScript = bitcoin.script.fromASM(
						`
			  OP_IF
					  ${crypto.SHA256(algorithm).toString()} 
					OP_DROP
					OP_0
					OP_2
					${pubkeyUsedInUTXO.toString('hex')}
					${oracleSignTx.publicKey.toString('hex')}
					OP_2
					OP_CHECKMULTISIGVERIFY
			  OP_ELSE
					abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd
					OP_DROP
					OP_0
					OP_1
					${oracleBurnTx.publicKey.toString('hex')}
					OP_1
					OP_CHECKMULTISIGVERIFY
			  OP_ENDIF
			`
							.trim()
							.replace(/\s+/g, ' '),
					);
					const { address } = bitcoin.payments.p2sh({
						redeem: { output: redeemScript, network: regtest },
						network: regtest,
					});

					// is address equal to utxo?
					if (address === addressToUnlock) callback();
					else callback("Hash of contract not in UTXO redeemScript")
				}
				catch (e) {
					callback(e)
				}

			});
		});
	});

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//In a later phase we won't store pubkey and address in mongodb, but will get the pubkey
	// from the client, who should remember his last generated pubkey used in a Circle transaction
	//The address can be derived from that pubkey, see https://bitcoin.stackexchange.com/a/49375/45311
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// Connection.db.collection('Circles').find({saltedHashedIdentification: id})
	// .then(circles => 
	//     {   
	//         if (circles.length != 1) return callback (err, "Something went wrong terribly: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
	// 		else 
	// 		{
	// 			addressToUnlock=circles[0].BTCaddress;
	// 			pubkeyUsedInUTXO=circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
	// 		}
	//     })
	// .catch(err => {return callback (err,  "Something went wrong terribly: no circles assigned to a user, in the function when checking the contract hash!")})

	// const addressToUnlock = "2Mxhnw8BMVLy5vaqxLn97seNue6gzrTkCwj"; //TODO get addressToUnlock from mongodb
	// const pubkeyUsedInUTXO = "02cd1e024ea5660dfe4c44221ad32e96d9bf57151d7105d90070c5b56f9df59e5e"; //todo also from mongodb????, do we lose some anonimity here?


	//   const hash256ToCheck = crypto.SHA256(algorithm).toString();

}

module.exports.PSBT = async (id, newPubkeyId, pubkeyNewId, circleId) => {
	// Signs PSBT by oracle
	// const addressToUnlock = "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; //TODO get addressToUnlock from mongodb
	// const txid = '7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7' 

	var pubkeyUsedInUTXO, txId;


	mongoose.connect('mongodb://localhost/carebycircles', { useNewUrlParser: true, useUnifiedTopology: true });

	var connection = mongoose.connection;
	// connection.on('error', () => { return callback("fout", "Something went wrong: " + 'connection error:') });
	connection.once('open', function () {

		connection.db.collection("Circles", function (err, Circles) {
			Circles.find({ saltedHashedIdentification: id }).toArray(function (err, circles) {
				connection.close()
				if (err) { return callback(err, "Something went wrong terribly: no circles assigned to a user, in the function when checking the contract hash!") }
				if (circles.length != 1) return callback("error", "Something went wrong terribly: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
				else {
					// addressToUnlock=circles[0].BTCaddress;
					txId = circles[0].txId;
					pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
				}
				const redeemScript = bitcoin.script.fromASM(
					`
					  OP_IF
							  ${contractHash} 
							OP_DROP
							OP_0
							OP_2
							${pubkeyUsedInUTXO.toString('hex')}
							${oracleSignTx.publicKey.toString('hex')}
							OP_2
							OP_CHECKMULTISIGVERIFY
					  OP_ELSE
							abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd
							OP_DROP
							OP_0
							OP_1
							${oracleBurnTx.publicKey.toString('hex')}
							OP_1
							OP_CHECKMULTISIGVERIFY
					  OP_ENDIF
					`
						.trim()
						.replace(/\s+/g, ' '),
				);
				// TX_ID = '8c270058dec109c44d27271dde2fdf6bb4430e1fd575cfb808b37b5a40e20029'
				axiosInstance.get('/t/' + txId)
					.then(function (response) {
						// console.log(response);
						TX_HEX = response.data;
					})
					.catch(function (error) {
						return callback(error, "very strange there is no TX_HEX of the txId:" + txId);
					});

				TX_VOUT = 0
				const psbt = new bitcoin.Psbt({ network: regtest });
				try {
					psbt
						.addInput({
							hash: txId,
							index: TX_VOUT,
							sequence: 0xfffffffe,
							nonWitnessUtxo: Buffer.from(TX_HEX, 'hex'),
							redeemScript: Buffer.from(redeemScript, 'hex')
							//Use SEGWIT later:
							//   witnessUtxo: {
							// 	script: Buffer.from('0020' +
							// 	  bitcoin.crypto.sha256(Buffer.from(WITNESS_SCRIPT, 'hex')).toString('hex'),
							// 	  'hex'),
							// 	value: 12e2
							//   },
							//   witnessScript: Buffer.from(WITNESS_SCRIPT, 'hex')
						})

// todo get miner's fee fro ma servce
// ftm take 50 000  satoshi
const minersFee = 50000;
							psbt
								.addOutput({
									address: createAddressLockedWithCirclesScript(newPubkeyId),
									value: input - minersFee,
								})
							psbt
								.addOutput({
									address: createAddressLockedWithCirclesScript(pubkeyNewId),
									value: 0,
								})
						psbt
							.signInput(0, oracleSignTx)
					
	// TODO scan blockchain for confirmed signature by Id, then
							
							mongoose.connect('mongodb://localhost/carebycircles', { useNewUrlParser: true, useUnifiedTopology: true });
					
							var connection = mongoose.connection;
							connection.on('error', console.error.bind(console, 'connection error:'));
							connection.once('open', function () {
						
								connection.db.collection("Circles", function (err, Circles) {
									Circles.save({ saltedHashedIdentification: newPubkeyId, CircleInstance: circleId }).toArray(function (err, circles) {
										if (err) { return callback(err, "Something went wrong terribly: no circles assigned to a user, in the function when checking the contract hash!") }
										if (circles.length != 1) return callback(err, "Something went wrong terribly: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
										else {
											// addressToUnlock=circles[0].BTCaddress;
											txId = circles[0].txId;
											pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
										}
									})
									Circles.save({ saltedHashedIdentification: PubkeyNewId, CircleInstance: circleId }).toArray(function (err, circles) {
										if (err) { return callback(err, "Something went wrong terribly: no circles assigned to a user, in the function when checking the contract hash!") }
										if (circles.length != 1) return callback(err, "Something went wrong terribly: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
										else {
											// addressToUnlock=circles[0].BTCaddress;
											txId = circles[0].txId;
											pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
										}
									})
								});
							});
					

				} catch (e) {
					return "500" + e
				}
				return psbt;
			})
		});
	});


	// Connection.db.collection('Circles').find({saltedHashedIdentification: id})
	// .then(circles => 
	//     {   
	//         if (circles.length != 1) return callback (err, "Something went wrong terribly: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
	// 		else 
	// 		{
	// 			// addressToUnlock=circles[0].BTCaddress;
	// 			txId=circles[0].txId;
	// 			pubkeyUsedInUTXO=circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
	// 		}
	//     })
	// .catch(err => {return callback (err,  "Something went wrong terribly: no circles assigned to a user, in the function when checking the contract hash!")})
	// var pubkeyUsedInUTXO = "02cd1e024ea5660dfe4c44221ad32e96d9bf57151d7105d90070c5b56f9df59e5e"; //todo also from mongodb????, do we lose some anonimity here?
}

module.exports.createAndBroadcastCircleGenesisTx = async (id, toPubkeyStr, satoshis) => {
	randomBytes(256, async (err, buf) => {
		if (err) return "500" + err;
		else {

			const address = createAddressLockedWithCirclesScript(toPubkeyStr)

			var txId;
			var unspentMINT;
			try {
				// fund the P2SH address
				unspentMINT = await regtestUtils.faucet(address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET

				// to get TX_HEX
				// by http://localhost:8080/1/t/65c5802f45db571718b53baad72619778fe0dee8bb046d02c1700fb2342a56e6    (BTW you can find more endpoints in https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js)
				// whcih gives
				//02000000000101885e1f124e2d0d4ca6f2c5fb87055515a7ba8c9c1d1484b832f5ff2f4c20029800000000171600141bded115d49c7e95eb9d2a5da8ad931e11c07105feffffff0200ca9a3b0000000017a914600a51497a5d235fc9d2faf28fba1db81daa663087082268590000000017a9147ed2effc94497c719222b1b13dc4a68363a2dfe9870247304402201195a7c1b79a1a8cff8b4fc43999ab4e7e68dfa0069d61662d56864fbbae9bf3022042bdd8527cf5119cdb6313acfc4dcc7e127e77f6166938a313d19cf5f39e5d28012103f4f015e0e304b8946de00ee57757427100949b05ca03133e9c3118185998bb0f00000000
				//
				// OR
				//
				// createrawtransaction
				// '[
				// 	{ "txid": "7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7", "vout": 1 }
				// ]'
				// '{
				// 	"14rbFswzZfkPGkbFZ7Ffj2qhQA1omvgiUx": sathoshis/1e8
				// }'

				txId = unspentMINT.txId; // e.g. 65c5802f45db571718b53baad72619778fe0dee8bb046d02c1700fb2342a56e6 vout=1  for address 2N213DaFM1Mpx2mH3qPyGYvGA3R1DoY1pJc
			}
			catch (e) { return "500" + e; }
			randCircle = "Circle" + buf.toString('hex');

			mongoose.connect('mongodb://localhost/carebycircles', { useNewUrlParser: true, useUnifiedTopology: true });

			var doc1 = Circles({ instanceCircle: randCircle, saltedHashedIdentification: id, txId: txId, pubkey: toPubkeyStr });

			var connection = mongoose.connection;
			// connection.on('error', () => { return callback("fout", "Something went wrong: " + 'connection error:') });
			connection.once('open', function () {

				connection.db.collection("Circles", function (err, Circles) {
					doc1.save(function (err, doc) {
						connection.close()
						if (err) { return "500" + "Could not store the Circle." + err }
						console.log(result);
						return unspentMINT;
					});
				});
			});

			// 	Connection.db.save({ instanceCircle: randCircle, saltedHashedIdentification: id, txId: txId })
			// .then(result => {
			// 	console.log(result);
			// 	return unspentMINT;
			// })
			// .catch(err => { return "500" + "Could not store the Circle." + err })


			// var connection = mongoose.connection;
			// connection.on('error', console.error.bind(console, 'connection error:'));
			// connection.once('open', function () {
			//     connection.db.collection("Circles", function(err, Circles){
			//         Circles.find({}).toArray(function(err, data){
			//             console.log(data); // it will print your collection data
			//         })
			//     });
			// });
		}
	});
}

function circlesLockScript(
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	toPubkey,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) {
	//returns a buffer:
	return bitcoin.script.fromASM(
		`
	  OP_IF
		  	${contractHash} 
		  	OP_DROP
			OP_0
			OP_2
			${toPubkey.toString('hex')}
			${oraclePleaseSignTxQ.publicKey.toString('hex')}
			OP_2
			OP_CHECKMULTISIGVERIFY
	  OP_ELSE
		  	abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd
	  		OP_DROP
			OP_0
			OP_1
			${oracleBurnTxQ.publicKey.toString('hex')}
			OP_1
			OP_CHECKMULTISIGVERIFY
      OP_ENDIF
    `
			.trim()
			.replace(/\s+/g, ' '),
	);
}

function createAddressLockedWithCirclesScript(toPubkeyStr) {
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	const toPubkey = Buffer.from(toPubkeyStr, 'hex'); //new Buffer.alloc(32, toPubkeyStr, 'hex');// TODO unsure whether this works   
	//create (and broadcast via 3PBP) a Circles' genesis Transaction 
	const redeemScript = circlesLockScript(toPubkey, oracleSignTx, oracleBurnTx);
	const { address } = bitcoin.payments.p2sh({
		redeem: { output: redeemScript, network: regtest },
		network: regtest,
	});
	return address;
}

