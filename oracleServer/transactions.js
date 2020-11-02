const constants = require('./constants');
const Circles = require('../lib/Circles');
const ID = require('./identification');

const randomBytes = require('randombytes');

const axios = require('axios')
// see for a tutorial of bitcoinjs:  https://bitcoinjs-guide.bitcoin-studio.com/


// see https://github.com/bitcoinjs/regtest-server/tree/master/docker
//Downloads the image from docker
//docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server

const assert = require('assert')

const bitcoin = require('bitcoinjs-lib');

const psbtHelper = require('./psbtHelper')

const regtestClient = require('regtest-client');
// const e = require('express');
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

const axiosInstance = axios.create({
	baseURL: APIURL,
	timeout: 10000
});

module.exports.createAndBroadcastCircleGenesisTx = (id, AlicePubkeyStr, algorithm, satoshisFromFaucet, cb) => {// see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts  for basic transactions
	randomBytes(256, async (err, buf) => {
		if (err) return cb({ unspent: "", CircleId: "", status: "500", err: err });
		else {
			//for the output  lock of the airdropped tokens
			const Alice_p2shOutputLock = await ID.createAddressLockedWithCirclesScript(AlicePubkeyStr, algorithm, oracleSignTx, oracleBurnTx, regtest) // Alice  will get the airdrop
			const AliceAddressToUnlockLater = Alice_p2shOutputLock.address;

			try {
				// fund the P2SH address, make an output to refer to 
				// unspent = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
				// utx = await regtestUtils.fetch(unspent.txId) // gets json of txid
				const { payment: faucetPayment, keys: faucetKeys } = psbtHelper.createPayment('p2sh-p2pk', '', regtest)
				console.log("output lock of the airdrop: " + bitcoin.script.toASM(faucetPayment.output))
				const psbt = new bitcoin.Psbt({ network: regtest });
				// .setVersion(2) // These are defaults. This line is not needed.
				// .setLocktime(0) // These are defaults. This line is not needed.
				// Tell the server to send you coins (satoshis)
				// Can pass address
				// const unspent = await regtestUtils.faucet(payment.address, 2e4)

				// Tell the server to send you coins (satoshis)
				// Can pass Buffer of the scriptPubkey (in case address can not be parsed by bitcoinjs-lib)
				// Non-standard outputs will be rejected, though.
				// Tell the server to send you coins (satoshis)
				const faucetUnspent = await regtestUtils.faucetComplex(faucetPayment.output, satoshisFromFaucet);

				// Get all current unspents of the address.
				const unspents = await regtestUtils.unspents(faucetPayment.address)
				// Get data of a certain transaction
				const fetchedTx = await regtestUtils.fetch(faucetUnspent.txId)
				// Mine 10 blocks, returns an Array of the block hashes
				// the above faucet payments will confirm
				const results = await regtestUtils.mine(10);

				const inputDataToUnlockFaucet = await psbtHelper.getInputData(faucetUnspent, faucetPayment, false, 'p2sh', regtestUtils)
				console.log("redeem for the airdrop: " + bitcoin.script.toASM(inputDataToUnlockFaucet.redeemScript))
				psbt.addInput(inputDataToUnlockFaucet)
					.addOutput({
						address: AliceAddressToUnlockLater,
						value: satoshisFromFaucet - minersFee, //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
						//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
					})
					//nbo change output, all goes to output 0
					.signInput(0, faucetKeys[0]) //sign coins given by faucet by its key
					// psbt.validateSignaturesOfInput(0);
					// This is an example of using the finalizeInput second parameter to
					// define how you finalize the inputs, allowing for any type of script.
					.finalizeInput(0, psbtHelper.getFinalScripts) // See getFinalScripts below
					.extractTransaction();

				// Mine 10 blocks, returns an Array of the block hashes
				// the above psbt will confirm
				const resultsCircle = await regtestUtils.mine(10);

				const resultBroadcast = await regtestUtils.broadcast(psbt.extractTransaction().toHex());

				// This verifies that the vout output of txId transaction is actually for value
				// in satoshis and is locked for the address given.
				// The utxo can be unconfirmed. We are just verifying it was at least placed in
				// the mempool.
				regtestUtils.verify({
					txId: psbt.extractTransaction().toHex(),
					address: regtestUtils.RANDOM_ADDRESS,
					vout: 0,
					value: satoshisFromFaucet,
				});

				console.log((satoshisFromFaucet - minersFee) + " airdropped satoshi is now locked with:\n" + bitcoin.script.toASM(Alice_p2shOutputLock.redeem.output) + "\nat address " + AliceAddressToUnlockLater)

				randCircle = "Circle" + buf.toString('hex');

				var doc1 = Circles({
					instanceCircles: randCircle, saltedHashedIdentification: id, psbt: psbt.toHex(), txId: psbt.extractTransaction().toHex(), pubKey: AlicePubkeyStr, addressToUnlock: AliceAddressToUnlockLater,
					redeem: Alice_p2shOutputLock.redeem.output.toString('hex'), payment: JSON.stringify(Alice_p2shOutputLock), "version": constants.VERSION
				});//, redeemScript: redeemScript.toString('hex') });
				CirclesCollection.insertOne(doc1, function (err, circles) {
					if (err) { return cb({ "version": constants.VERSION, psbt: "", CircleId: "", status: "500", err: "Could not store the Circle." + err }) }
					return cb({ psbt: psbt.toHex(), CircleId: randCircle, status: "200" });
				})
			}
			catch (e) { return cb({ psbt: "", CircleId: "", status: "500", err: e }) }// if you get Error: mandatory-script-verify-flag-failed (Operation not valid with the current stack size) (code 16) , then e.g. see https://bitcoin.stackexchange.com/a/81740/45311
		}
	})
}

// const contractHash = "ad40955030777152caefd9e48ec01012f674c5300e1543d32191adba55b83a4d"; //SHA256 hash of algorithm: const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}

module.exports.PubScriptToUnlockContainsAHashOfContract = (id, pubkeyUsedInUTXO, algorithm, circleId, callback) => {

	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. with hash of contract etc) and look whether it hashes to the right hash of the redeem script.

	var addressToUnlock;


	CirclesCollection.find({ "saltedHashedIdentification": id, "version": constants.VERSION }).toArray(function (err, circles) {
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
module.exports.PSBT = (AliceId, pubkeyUsedInUTXO, contract, AlicePubkey, BobId, BobPubkey, circleId, callback) => {
	// Signs PSBT by oracle

	const dustSatoshis = 547
	CirclesCollection.find({ "saltedHashedIdentification": AliceId, "version": constants.VERSION }).toArray(async function (err, circles) {
		if (err) { return callback("", "", "Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash! " + err) }
		if (circles.length != 1) { return callback("", "", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!") }
		// addressToUnlock=circles[0].BTCaddress;
		const txIdToUnlock = circles[0].txId;
		const AliceAddressToUnlock = circles[0].addressToUnlock;

		const paymentToUnlock = JSON.parse(circles[0].payment)
		console.log("output lock of Alice's transaction: " + bitcoin.script.toASM(Buffer.from(paymentToUnlock.output.data, 'hex')))
		console.log("We will create a script for this, which hash160 is equal to the above hexadecimal number")

		//for the output  lock of the airdropped tokens
		const p2shOutputLockGoesBackToAlice = await ID.createAddressLockedWithCirclesScript(AlicePubkey, contract, oracleSignTx, oracleBurnTx, regtest)
		const p2shOutputLockGoesToBob = await ID.createAddressLockedWithCirclesScript(BobPubkey, contract, oracleSignTx, oracleBurnTx, regtest)

		console.log("it might be: " + bitcoin.script.toASM(p2shOutputLockGoesBackToAlice.redeem.output))
		const txIdToUnlockHash = bitcoin.Transaction.fromHex(txIdToUnlock).getId()
		const unspents = await regtestUtils.unspents(AliceAddressToUnlock)


		//Todo turn on later:
		// if (unspents.length != 1) return callback("", 'not exactly 1 unspent tx for the address to unlock')
		// and then not needed:
		const unspentToUnlock = unspents.filter(x => x.txId === txIdToUnlockHash);

		var satoshisToUnlock = 0;
		var voutIndex
		for (voutIndex = 0; voutIndex < unspentToUnlock.length; voutIndex++) {
			const sat = unspentToUnlock[unspentToUnlock[voutIndex].vout].value
			if (sat > dustSatoshis) {
				satoshisToUnlock = sat  //TODO ATM there is exactly 1 output greater than dust+1, 
				//which is Alice's value, find out another way???
				break
			}
		}
		console.log("which locks " + satoshisToUnlock + " satoshi")

		try {
			// make an output to refer to 
			// unspent = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
			// utx = await regtestUtils.fetch(unspent.txId) // gets json of txid
			const psbt = new bitcoin.Psbt({ network: regtest });
			// .setVersion(2) // These are defaults. This line is not needed.
			// .setLocktime(0) // These are defaults. This line is not needed.
			const inputDataToUnlockALiceTransaction = await psbtHelper.getInputData(unspentToUnlock[voutIndex], paymentToUnlock, false, 'p2sh', regtestUtils)
			psbt.addInput(inputDataToUnlockALiceTransaction)

				.addOutput({
					// address: bitcoin.address.toOutputScript(p2shOutputLockGoesBackToAlice.address, regtest),// regtestUtils.RANDOM_ADDRESS,
					address: p2shOutputLockGoesBackToAlice.address,// regtestUtils.RANDOM_ADDRESS,
					// address: regtestUtils.RANDOM_ADDRESS,
					value: (satoshisToUnlock - dustSatoshis - minersFee), //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
					//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
				})
				.addOutput({
					address: p2shOutputLockGoesToBob.address,
					value: dustSatoshis,  //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311
				})
			// no change output!


			// encode to send out to the signers
			const psbtBaseText = psbt.toBase64();

			// each signer imports
			// const psbt = bitcoin.Psbt.fromBase64(psbtBaseText);
			// const Alice = bitcoin.Psbt.fromBase64(psbtBaseText);

			// Alice and Oracle signs their input with the respective private keys
			// signInput and signInputAsync are better
			// (They take the input index explicitly as the first arg)
			psbt.signAllInputs(oracleSignTx);//alice1.keys[0]);
			// Alice.signAllInputs(AliceClientSignTxID.privateKey);//alice2.keys[0]);  


			// If your signer object's sign method returns a promise, use the following
			// await Alice.signAllInputsAsync(alice2.keys[0])

			// encode to send back to combiner (Oracle and Alice are not near each other)
			const psbtSignedByOracleText = psbt.toBase64();
			// const s2text = Alice.toBase64();

			// const OracleFinal = bitcoin.Psbt.fromBase64(OracleText);
			// const final2 = bitcoin.Psbt.fromBase64(s2text);

			// If your signer object's sign method returns a promise, use the following
			// await Alice.signAllInputsAsync(alice2.keys[0])

			// encode to send back to combiner (Oracle and Alice are not near each other)
			// const s1text = Oracle.toBase64();
			// const s2text = Alice.toBase64();

			// const final1 = bitcoin.Psbt.fromBase64(s1text);
			// const final2 = bitcoin.Psbt.fromBase64(s2text);

			// final1.combine(final2) would give the exact same result
			// psbt.combine(final1, final2);

			// Finalizer wants to check all signatures are valid before finalizing.
			// If the finalizer wants to check for specific pubkeys, the second arg
			// can be passed. See the first multisig example below.
			// assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
			// assert.strictEqual(psbt.validateSignaturesOfInput(1), true);

			// This step it new. Since we separate the signing operation and
			// the creation of the scriptSig and witness stack, we are able to
			// psbt.finalizeAllInputs();

			// build and broadcast our RegTest network
			// await regtestUtils.broadcast(psbt.extractTransaction().toHex());
			// to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839

			// ************** signing **************

			// psbt.data.inputs.forEach((input, index) => {
			// 	//// sign regular inputs that can be simply signed
			// 	// if (!input.redeemScript && !input.witnessScript) {
			// 	psbt.signInput(index, oracleSignTx)

			// psbt.signInput(voutIndex, oracleSignTx)
			// // give error if signature failed
			// if (!psbt.validateSignaturesOfInput(voutIndex)) {
			// 	return callback("", 'Signature validation failed for input index ' + voutIndex.toString())
			// }


			// })

			// // This is an example of using the finalizeInput second parameter to
			// // define how you finalize the inputs, allowing for any type of script.
			// psbt.finalizeInput(0, getFinalScripts) // See getFinalScripts below
			// 	.extractTransaction();


			// const resultsCircle = await regtestUtils.mine(10);
			//Only partially signed so we cannot broadcast yet:
			// const resultBroadcast = await regtestUtils.broadcast(psbt.extractTransaction().toHex());

			// regtestUtils.verify({
			// 	txId: psbt.extractTransaction().toHex(),
			// 	address: regtestUtils.RANDOM_ADDRESS,
			// 	vout: 0,  //todo is this the right vout?
			// 	value: satoshisToUnlock,
			// });

			console.log((satoshisToUnlock) + " satoshi transferred from Alice to Alice, who gets " + (satoshisToUnlock - minersFee - dustSatoshis) + " is now locked with:\n" + bitcoin.script.toASM(p2shOutputLockGoesBackToAlice.redeem.output) + "\nat address " + p2shOutputLockGoesBackToAlice.address)
			console.log(dustSatoshis + " satoshi transferred from Alice to Bob is now locked with:\n" + bitcoin.script.toASM(p2shOutputLockGoesToBob.redeem.output) + "\nat address " + p2shOutputLockGoesToBob.address)

			CirclesCollection.updateOne(
				// { "Attribute": "good" },
				{ saltedHashedIdentification: AliceId, "version": constants.VERSION },
				{ $set: { pubKey: AlicePubkey, updateDate: Date.now } },
				// { upsert: true },
				function (err, circles) {
					if (err) { return callback("", "", "Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!" + err) }
					if (circles.matchedCount != 1) return callback("", "", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!")
					else {
						// addressToUnlock=circles[0].BTCaddress;
						// txId = circles[0].txId;
						// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
						CirclesCollection.updateOne(
							// { "Attribute": "good" },
							{ "version": constants.VERSION, instanceCircles: circleId, saltedHashedIdentification: BobId },
							{
								$set: {
									psbt: psbt.toHex(), txId: "determine when fully signed", pubKey: BobPubkey, addressToUnlock: "determine when fully signed",
									redeem: p2shOutputLockGoesToBob.redeem.output.toString('hex'), payment: JSON.stringify(p2shOutputLockGoesToBob),
									updateDate: Date.now()
								}
							},
							{ upsert: true },
							function (err, circles) {
								if (err) { return callback("", "", "Something went wrong terribly while inserting!" + err) }
								// addressToUnlock=circles[0].BTCaddress;
								// txId = circles[0].txId;
								// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
								return callback(psbtBaseText, psbtSignedByOracleText);
							})
					}
				})

		}
		catch (e) {
			return callback("", "", "500" + e)
		}

	})
	// .catch(function (error) {
	// 	return callback("", "very strange there is no TX_HEX of the txId:" + txId + " " + error);
	// });

}
//from  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
// This function is used to finalize a transaction using PSBT.
// See  above.
// getFinalScripts = (
// 	inputIndex,//: number,
// 	input,//: PsbtInput,
// 	script,//: Buffer,
// 	isSegwit,//: boolean,
// 	isP2SH,//: boolean,
// 	isP2WSH,//: boolean,
// ) =>
// //   : {
// // 	finalScriptSig;//: Buffer | undefined;
// // 	finalScriptWitness;//: Buffer | undefined;
// //   } 
// {
// 	// Step 1: Check to make sure the meaningful script matches what you expect.
// 	const decompiled = bitcoin.script.decompile(script);
// 	//TODO:
// 	// Checking if first OP is OP_IF... should do better check in production!
// 	// You may even want to check the public keys in the script against a
// 	// whitelist depending on the circumstances!!!
// 	// You also want to check the contents of the input to see if you have enough
// 	// info to actually construct the scriptSig and Witnesses.
// 	// if (!decompiled || decompiled[0] !== bitcoin.opcodes.OP_IF) {
// 	// 	throw new Error(`Can not finalize input #${inputIndex}`);
// 	// }

// 	// Step 2: Create final scripts
// 	let payment//: bitcoin.Payment 
// 		= {
// 		network: regtest,
// 		output: script,
// 		// This logic should be more strict and make sure the pubkeys in the
// 		// meaningful script are the ones signing in the PSBT etc.
// 		input: bitcoin.script.compile([
// 			// input.partialSig![0].signature,
// 			input,
// 			bitcoin.opcodes.OP_TRUE,
// 		]),
// 	};
// 	if (isP2WSH && isSegwit)
// 		payment = bitcoin.payments.p2wsh({
// 			network: regtest,
// 			redeem: payment,
// 		});
// 	if (isP2SH)
// 		payment = bitcoin.payments.p2sh({
// 			network: regtest,
// 			redeem: payment.input,
// 		});

// 	function witnessStackToScriptWitness(witness)//: Buffer[]): Buffer 
// 	{
// 		let buffer = Buffer.allocUnsafe(0);

// 		function writeSlice(slice)//: Buffer): void 
// 		{
// 			buffer = Buffer.concat([buffer, Buffer.from(slice)]);
// 		}

// 		function writeVarInt(i)//: number): void 
// 		{
// 			const currentLen = buffer.length;
// 			const varintLen = varuint.encodingLength(i);

// 			buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
// 			varuint.encode(i, buffer, currentLen);
// 		}

// 		function writeVarSlice(slice)//: Buffer): void 
// 		{
// 			writeVarInt(slice.length);
// 			writeSlice(slice);
// 		}

// 		function writeVector(vector)//: Buffer[]): void 
// 		{
// 			writeVarInt(vector.length);
// 			vector.forEach(writeVarSlice);
// 		}

// 		writeVector(witness);

// 		return buffer;
// 	}

// 	return {
// 		finalScriptSig: payment.input,
// 		finalScriptWitness:
// 			payment.witness && payment.witness.length > 0
// 				? witnessStackToScriptWitness(payment.witness)
// 				: undefined,
// 	};
// }

