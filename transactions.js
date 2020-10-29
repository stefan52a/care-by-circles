const Circles = require('./lib/Circles');
const ID = require('./identification');

const randomBytes = require('randombytes');

const axios = require('axios')
// see for a tutorial of bitcoinjs:  https://bitcoinjs-guide.bitcoin-studio.com/


// see https://github.com/bitcoinjs/regtest-server/tree/master/docker
//Downloads the image from docker
//docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server

const assert = require('assert')

const bitcoin = require('bitcoinjs-lib');
const PsbtMod = require('./test/psbtMod/psbtMod')

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


module.exports.createAndBroadcastCircleGenesisTx = async (id, toPubkeyStr, algorithm, satoshis, callback) => {
	randomBytes(256, async (err, buf) => {
		if (err) return callback("", "", "500", err);
		else {

			const { p2sh } = ID.createAddressLockedWithCirclesScript(toPubkeyStr, algorithm, oracleSignTx, oracleBurnTx)

			var txId;
			var unspentMINT;
			try {
				// fund the P2SH address
				unspentMINT = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
				utx = await regtestUtils.fetch(unspentMINT.txId) // gets json of txid
			}
			catch (e) { return callback("", "", "500", e); }
			// for non segwit inputs, you must pass the full transaction buffer
			const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');

			const tx = new bitcoin.Psbt({ network: regtest })
				.setVersion(2)
				.addInput({
					hash: unspent.txId,
					index: unspent.vout,
					sequence,
					redeemScript: p2sh.redeem.output,
					nonWitnessUtxo,
				})
				.addOutput({
					address: addressToUnlock,// regtestUtils.RANDOM_ADDRESS,
					value: //7e4,
				})
				.signInput(0, alice)
				// This is an example of using the finalizeInput second parameter to
				// define how you finalize the inputs, allowing for any type of script.
				.finalizeInput(0, csvGetFinalScripts) // See csvGetFinalScripts below
				.extractTransaction();

			await regtestUtils.mine(10);

			await regtestUtils.broadcast(tx.toHex());

			await regtestUtils.verify({
				txId: tx.getId(),
				address: addressToUnlock,// regtestUtils.RANDOM_ADDRESS,
				vout: 0,
				value: //7e4,
			});

			randCircle = "Circle" + buf.toString('hex');

			var doc1 = Circles({ instanceCircles: randCircle, saltedHashedIdentification: id, txId: unspentMINT.txId, pubKey: toPubkeyStr, addressToUnlock: address, redeemScript: redeemScript.toString('hex') });
			CirclesCollection.save(doc1, function (err, circles) {
				if (err) { return calback("", "", "500", "Could not store the Circle." + err) }
				return callback(unspentMINT, randCircle, "200");
			})
		}
	})
}

// const contractHash = "ad40955030777152caefd9e48ec01012f674c5300e1543d32191adba55b83a4d"; //SHA256 hash of algorithm: const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}

module.exports.PubScriptToUnlockContainsAHashOfContract = (id, pubkeyUsedInUTXO, algorithm, circleId, callback) => {

	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. with hash of contract etc) and look whether it hashes to the right hash of the redeem script.

	var addressToUnlock;


	CirclesCollection.find({ "saltedHashedIdentification": id }).toArray(function (err, circles) {
		if (err) { return callback(err + " Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!") }
		if (circles.length != 1) return callback("error" + " Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
		else {
			addressToUnlock = circles[0].addressToUnlock;//can be derived from pubkeyUsedInUTXO!!!
			// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
		}
		// make hash of the redeemscript
		try {
			const redeemScript = ID.circlesLockScriptSigOutput(pubkeyUsedInUTXO,
				algorithm,
				oracleSignTx,  //: KeyPair,
				oracleBurnTx  //: KeyPair,
			)
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

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//We won't store pubkey and address in mongodb, but will get the pubkey
	// from the client, who should remember his last generated pubkey used in a Circle transaction
	//The address can be derived from that pubkey, see https://bitcoin.stackexchange.com/a/49375/45311
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	//   const hash256ToCheck = crypto.SHA256(algorithm).toString();

}

// along the lines of https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
//broadcast via a 3rd Party Blockchain Provider (3PBP)
module.exports.PSBT = (id, pubkeyUsedInUTXO, algorithm, newPubkeyId, newId, pubkeyNewId, circleId, callback) => {
	// Signs PSBT by oracle

	var pubkeyUsedInUTXO
	var txId;
	var TX_HEX;

	async () => {
		CirclesCollection.find({ "saltedHashedIdentification": id }).toArray(function (err, circles) {
			if (err) { return callback("", "Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash! " + err) }
			if (circles.length != 1) { return callback("", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!") }
			// addressToUnlock=circles[0].BTCaddress;
			txId = circles[0].txId;
			// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
			const p2sh = bitcoin.payments.p2sh({
				redeem: {
					output: ID.circlesLockScriptSigOutput(pubkeyUsedInUTXO,
						algorithm,
						oracleSignTx,  //: KeyPair,
						oracleBurnTx  //: KeyPair,
					),
				},
				network: regtest,
			})
			axiosInstance.get('/t/' + txId)
				.then(function (response) {
					// console.log(response);
					TX_HEX = response.data;

					const tx = bitcoin.Transaction.fromHex(TX_HEX)

					const TX_VOUT = 0
					const psbt = new PsbtMod.Psbt({ network: regtest });
					// const psbt = new bitcoin.Psbt({ network: regtest });
					try {
						psbt
							.addInput({
								hash: txId,
								index: TX_VOUT,
								sequence: 0xfffffffe,
								nonWitnessUtxo: Buffer.from(TX_HEX, 'hex'),// works for witness inputs too!
								redeemScript: Buffer.from(redeemScript, 'hex'), // only if there's redeem script
								// witnessScript: input.witnessScript // only if there's witness script							
								//Use SEGWIT later:
								//   witnessUtxo: {
								// 	script: Buffer.from('0020' +
								// 	  bitcoin.crypto.sha256(Buffer.from(WITNESS_SCRIPT, 'hex')).toString('hex'),
								// 	  'hex'),
								// 	value: 12e2
								//   },
								//   witnessScript: Buffer.from(WITNESS_SCRIPT, 'hex')
							})

						// todo get miner's fee from a servce
						// ftm take 5 000  satoshi
						const minersFee = 5000;
						psbt
							.addOutput({
								address: ID.createAddressLockedWithCirclesScript(newPubkeyId, algorithm, oracleSignTx, oracleBurnTx).address,
								value: tx.outs[0].value - minersFee,
							})
						psbt
							.addOutput({
								address: ID.createAddressLockedWithCirclesScript(pubkeyNewId, algorithm, oracleSignTx, oracleBurnTx).address,
								value: 0,
							})

						// ************** signing **************

						psbt.data.inputs.forEach((input, index) => {
							//// sign regular inputs that can be simply signed
							// if (!input.redeemScript && !input.witnessScript) {
							psbt.signInput(index, oracleSignTx)

							// give error if signature failed
							if (!psbt.validateSignaturesOfInput(index)) {
								throw new Error('Signature validation failed for input index ' + index.toString())
							}


						})

						// TODO scan blockchain for confirmed signature by Id, then

						CirclesCollection.updateOne(
							// { "Attribute": "good" },
							{ saltedHashedIdentification: id },
							{ $set: { pubKey: newPubkeyId } },
							// { upsert: true },
							function (err, circles) {
								if (err) { return callback("", "Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!" + err) }
								if (circles.matchedCount != 1) return callback("", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
								else {
									// addressToUnlock=circles[0].BTCaddress;
									// txId = circles[0].txId;
									// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
									CirclesCollection.updateOne(
										// { "Attribute": "good" },
										{ instanceCircles: circleId, saltedHashedIdentification: newId },
										{ $set: { txId: "determine when fully signed", pubKey: pubkeyNewId, addressToUnlock: "determine when fully signed" } },
										{ upsert: true },
										function (err, circles) {
											if (err) { return callback("", "Something went wrong terribly while inserting!" + err) }
											// addressToUnlock=circles[0].BTCaddress;
											// txId = circles[0].txId;
											// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
											return callback(psbt);
										})
								}
							})

					} catch (e) {
						return callback("", "500" + e)
					}
				})
				.catch(function (error) {
					return callback("", "very strange there is no TX_HEX of the txId:" + txId + " " + error);
				});

		})
	}
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
