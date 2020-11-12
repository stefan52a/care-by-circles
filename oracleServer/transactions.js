const constants = require('./constants');
const Circles = require('../lib/Circles');
const ID = require('./identification');

const randomBytes = require('randombytes');

// see for a tutorial of bitcoinjs:  https://bitcoinjs-guide.bitcoin-studio.com/

// see https://github.com/bitcoinjs/regtest-server/tree/master/docker
//Downloads the image from docker
//docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server

const bitcoin = require('bitcoinjs-lib');
const psbtHelper = require('./psbtHelper')
const regtestClient = require('regtest-client');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
//e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;
// const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
const oracleSignTx = bitcoin.ECPair.fromWIF( //todo bip32 HD derivation
	'cTsrZtbGTamSLAQVbLfv3takw97x28FKEmVmCfSkebDoeQ3547jV', ///// TODO KEEP SECRET
	regtest,
);
const oracleBurnTx = bitcoin.ECPair.fromWIF(
	'cRs1KTufxBpY4wcexxaQEULA4CFT3hKTqENEy7KZtpR5mqKeijwU',  ///// TODO KEEP SECRET
	regtest,
);


// todo get miner's fee from a servce
// ftm take satoshis:
const minersFee = 6100;

module.exports.createAndBroadcastCircleGenesisTx = (id, salt, AlicePubkeyStr, contract, satoshisFromFaucet, createGenesis, cb) => { console.log("tralala");// see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts  for basic transactions
	randomBytes(256, async (err, buf) => { console.log("tralala");
		if (err) return cb({ unspent: "", CircleId: "", addressOfUTXO: "", status: "500", err: err })
		else if (satoshisFromFaucet < constants.DUST_SATOSHIS) return b({ unspent: "", CircleId: "", addressOfUTXO: "", status: "500", err: "satoshis from faucet is lower than dust: " + (constants.DUST_SATOSHIS - 1) })
		else {
			// force update MTP  (Merkle Tree Proof?)
			await regtestUtils.mine(11);
			const hashType = bitcoin.Transaction.SIGHASH_ALL;

			//for the output  lock of the airdropped tokens^
			const { p2sh: Alice_p2shOutputLock, redeemscript: dummy } = await ID.createAddressLockedWithCirclesScript(AlicePubkeyStr, contract, oracleSignTx, oracleBurnTx, regtest) // Alice  will get the airdrop
			const AliceAddressToUnlockLater = Alice_p2shOutputLock.address;

			try {
				// fund the P2SH address, make an output to refer to 
				// TODO we actually want to MINT here NOT USE A FAUCET
				const { payment: faucetPayment, keys: faucetKeys } = psbtHelper.createPayment('p2sh-p2pk', '', regtest)
				console.log("output lock of the airdrop: " + bitcoin.script.toASM(faucetPayment.output))
				//for the output  lock of the airdropped tokens
				const psbt = new bitcoin.Psbt({ network: regtest });
				// .setVersion(2) // These are defaults. This line is not needed.
				// .setLocktime(0) // These are defaults. This line is not needed.
				// Tell the server to send you coins (satoshis)
				// Can pass address
				// Can pass Buffer of the scriptPubkey (in case address can not be parsed by bitcoinjs-lib)
				// Non-standard outputs will be rejected, though.
				// Tell the server to send you coins (satoshis)
				const faucetUnspent = await regtestUtils.faucetComplex(faucetPayment.output, satoshisFromFaucet);
				const inputDataToUnlockFaucet = await psbtHelper.getInputData(faucetUnspent, faucetPayment.redeem.output, false, 'p2sh', regtestUtils)
				console.log("redeem for the airdrop: " + bitcoin.script.toASM(inputDataToUnlockFaucet.redeemScript))
				psbt.addInput(inputDataToUnlockFaucet)
					.addOutput({
						address: AliceAddressToUnlockLater,//script: Buffer.from(inputDataToUnlockFaucet.redeemScript,'hex'),
						value: Math.max(constants.DUST_SATOSHIS, satoshisFromFaucet - minersFee), //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
						//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
						// network: { regtest },
					})
					//nbo change output, all goes to output 0
					.signInput(0, faucetKeys[0], [hashType]) //sign coins given by faucet by its key
					// psbt.validateSignaturesOfInput(0);
					// Using the finalizeInput second parameter to
					// define how you finalize the inputs, allowing for any type of script.
					.finalizeInput(0, psbtHelper.getFinalScripts)
					.extractTransaction();
				// Mine 10 blocks, returns an Array of the block hashes
				// the above psbt will confirm
				await regtestUtils.mine(10);
				await regtestUtils.broadcast(psbt.extractTransaction().toHex());

				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				// // This verifies that the vout output of txId transaction is actually for value
				// // in satoshis and is locked for the address given.
				// // The utxo can be unconfirmed. We are just verifying it was at least placed in
				// // the mempool.
				// await regtestUtils.verify({
				// 	txId: psbt.extractTransaction().toHex(),
				// 	address: regtestUtils.RANDOM_ADDRESS,
				// 	vout: 0,
				// 	value: satoshisFromFaucet,
				// });
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				//////////////////////////////////////////////////////////////////////todo
				console.log(Math.max(constants.DUST_SATOSHIS, satoshisFromFaucet - minersFee) + " airdropped satoshi is now locked with:\n" + bitcoin.script.toASM(inputDataToUnlockFaucet.redeemScript) + "\nat address " + AliceAddressToUnlockLater)
				if (createGenesis) {
					randCircle = "Circle" + buf.toString('hex');
					var doc1 = Circles({ instanceCircles: randCircle, saltedHashedIdentification: ID.HMAC(id, salt), "version": constants.VERSION, });
					CirclesCollection.insertOne(doc1, function (err, circles) {
						if (err) { return cb({ "version": constants.VERSION, psbt: "", CircleId: "", addressOfUTXO: "", status: "500", err: "Could not store the Circle." + err, satoshiAliceLeft: Math.max(constants.DUST_SATOSHIS, satoshisFromFaucet - minersFee) }) }
						return cb({ psbt: psbt.toHex(), CircleId: randCircle, addressOfUTXO: AliceAddressToUnlockLater, status: "200", satoshiAliceLeft: Math.max(constants.DUST_SATOSHIS, satoshisFromFaucet - minersFee) });
					})

				} else {
					return cb()
				}
			}
			catch (e) { return cb({ psbt: "", CircleId: "", addressOfUTXO: "", status: "500", err: e }) }// if you get Error: mandatory-script-verify-flag-failed (Operation not valid with the current stack size) (code 16) , then e.g. see https://bitcoin.stackexchange.com/a/81740/45311
		}
	})
}

module.exports.PubScriptToUnlockContainsAHashOfContract = (id, salt, pubkeyOfUTXO, addressOfUTXO, contract, callback) => { console.log("tralala");
	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. containing a  hash of the contract etc) and look whether it hashes to the right hash of the redeem script.
	// If so the user gave the right contract for addressOfUTXO
	CirclesCollection.find({ "saltedHashedIdentification": ID.HMAC(id, salt), "version": constants.VERSION }).toArray(async function (err, circles) {
		if (err) { return callback(err + " 1 Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!") }
		if (circles.length == 0) return callback("error" + " 1 Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!")
		if (circles.length > 1) return callback("error" + " 1 Something went terribly wrong: more than 1 circles assigned to a user, in the function when checking the contract hash!")
		const { p2sh: p2sh, redeemscript: dummy } = await ID.createAddressLockedWithCirclesScript(pubkeyOfUTXO, contract, oracleSignTx, oracleBurnTx, regtest)
		// is calculated address equal to utxo?
		if (p2sh.address === addressOfUTXO) return callback();
		else return callback("Hash of contract not in UTXO redeemScript")
	});
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//We won't store pubkey and address in mongodb, but will get the pubkey
	// from the client, who should remember his last generated pubkey used in a Circle transaction
	//The address can be derived from that pubkey, see https://bitcoin.stackexchange.com/a/49375/45311
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}

// along the lines of https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
//broadcast via a 3rd Party Blockchain Provider (3PBP)
module.exports.PSBT = (AliceId, saltAlice, contract, AlicePubkey, BobId, saltBob, BobPubkey, circleId, callback) => { console.log("tralala");
	// Signs PSBT by oracle
	// force update MTP  (Merkle Tree Proof?)
	CirclesCollection.find({ "saltedHashedIdentification": ID.HMAC(AliceId, saltAlice), "version": constants.VERSION }).toArray(async function (err, circles) {
		if (err) { return callback("", "", "", 500, "2 Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash! " + err) }
		if (circles.length != 1) { return callback("", "", "", 500, "2 Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!") }
		//for the output  lock of the airdropped tokens
		const { p2sh: AliceP2shToUnlock, redeemscript: redeemScriptToAlice } = await ID.createAddressLockedWithCirclesScript(AlicePubkey, contract, oracleSignTx, oracleBurnTx, regtest)
		const { p2sh: BobP2shToUnlock, redeemscript: redeemScriptToBob } = await ID.createAddressLockedWithCirclesScript(BobPubkey, contract, oracleSignTx, oracleBurnTx, regtest)
		const unspentToUnlock = await regtestUtils.unspents(AliceP2shToUnlock.address)
		if (unspentToUnlock.length == 0) return callback("", "", "", "400", 'the transaction is already spent:  no unspent tx for the address to unlock')
		if (unspentToUnlock.length > 1) console.log('more than 1 unspent tx for the address to unlock, taking a arbitrary one with value > dust')
		// find the amount of Satoshis locked:
		var satoshisToUnlock = 0;
		var voutIndex
		for (voutIndex = 0; voutIndex < unspentToUnlock.length; voutIndex++) {
			const sat = unspentToUnlock[unspentToUnlock[voutIndex].vout].value
			if (sat > constants.DUST_SATOSHIS) {
				satoshisToUnlock = sat  //TODO ATM there is exactly 1 output greater than dust+1, 
				//which is Alice's value, find out another way???
				break
			}
		}
		console.log("which locks " + satoshisToUnlock + " satoshi")
		if (satoshisToUnlock < (2 * constants.DUST_SATOSHIS)) return callback("", "", "", 500, "unfortunately there are not enough tokens left to carry out this transaction");
		try {
			// make an output to refer to 
			// unspent = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
			// utx = await regtestUtils.fetch(unspent.txId) // gets json of txid
			const psbt = new bitcoin.Psbt({ network: regtest });
			const utx = await regtestUtils.fetch(unspentToUnlock[voutIndex].txId);
			// for non segwit inputs, you must pass the full transaction buffer
			const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');
			const inputDataToUnlockALiceTransaction = await psbtHelper.getInputData(unspentToUnlock[voutIndex], redeemScriptToAlice, false, 'p2ms', regtestUtils)
			psbt.addInput(inputDataToUnlockALiceTransaction)
			const satoshisToAlice = satoshisToUnlock * (1 - constants.ENTRY_COST_FACTOR)
			const satoshisToBob = satoshisToUnlock * constants.ENTRY_COST_FACTOR
			if ((satoshisToAlice + satoshisToBob) != satoshisToUnlock) satoshisToBob += 1
			if ((satoshisToAlice + satoshisToBob) != satoshisToUnlock) return callback("", "", "", 500, "internal arithmetic error when sharing satoshis when Alice wants Bob in her Circle");
			psbt.addOutput({
				script: Buffer.from(redeemScriptToAlice, 'hex'),// regtestUtils.RANDOM_ADDRESS,
				value: Math.max(constants.DUST_SATOSHIS, (satoshisToAlice - constants.DUST_SATOSHIS)), //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
				//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
			})
				.addOutput({
					script: Buffer.from(redeemScriptToBob, 'hex'),// regtestUtils.RANDOM_ADDRESS,
					value: Math.max(constants.DUST_SATOSHIS, (satoshisToBob - minersFee)),  //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311
				})
			// no change output!
			// encode to send out to the signers
			const psbtBaseText = psbt.toBase64();
			// Alice and Oracle signs their input with the respective private keys
			// signInput and signInputAsync are better
			// (They take the input index explicitly as the first arg)
			psbt.signAllInputs(oracleSignTx);
			// If your signer object's sign method returns a promise, use the following
			// await Alice.signAllInputsAsync(alice2.keys[0])
			// encode to send back to combiner (Oracle and Alice are not near each other)
			const psbtSignedByOracleText = psbt.toBase64();
			//maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
			//547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311
			console.log((satoshisToUnlock) + " satoshi transferred from Alice to Alice, who gets " + Math.max(constants.DUST_SATOSHIS, (satoshisToAlice - constants.DUST_SATOSHIS)) + " is now locked with:\n" + bitcoin.script.toASM(redeemScriptToAlice))// + "\nat address " + redeemScriptToAlice.address)
			console.log(Math.max(constants.DUST_SATOSHIS, (satoshisToBob - minersFee)) + " satoshi transferred from Alice to Bob is now locked with:\n" + bitcoin.script.toASM(redeemScriptToBob))// + "\nat address " + redeemScriptToBob.address)
			//for the output  lock of the tokens for Bob
			const { p2sh: Bob_p2shOutputLock, redeemscript: dummy } = await ID.createAddressLockedWithCirclesScript(BobPubkey, contract, oracleSignTx, oracleBurnTx, regtest)
			const BobAddressToUnlockLater = Bob_p2shOutputLock.address;
			CirclesCollection.insertOne(
				{ "version": constants.VERSION, instanceCircles: circleId, saltedHashedIdentification: ID.HMAC(BobId, saltBob) },
				function (err, circles) {
					if (err) { return callback("", "", "", 500, "Something went wrong terribly while inserting!" + err) }
					return callback(BobAddressToUnlockLater, psbtBaseText, psbtSignedByOracleText, 200);
				})
		}
		catch (e) {
			return callback("", "", "", 500, e)
		}
	})
}
