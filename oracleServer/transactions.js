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

module.exports.createAndBroadcastCircleGenesisTx = (id, salt, AlicePubkeyStr, contract, satoshisFromFaucet, createGenesis, cb) => {// see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts  for basic transactions
	randomBytes(256, async (err, buf) => {
		if (err) return cb({ unspent: "", CircleId: "", addressOfUTXO: "", status: "500", err: err });
		else {
			// force update MTP  (Merkle Tree Proof?)
			await regtestUtils.mine(11);
			const hashType = bitcoin.Transaction.SIGHASH_ALL;

			//for the output  lock of the airdropped tokens^
			const { p2sh: Alice_p2shOutputLock, redeemscript: dummy } = await ID.createAddressLockedWithCirclesScript(AlicePubkeyStr, contract, oracleSignTx, oracleBurnTx, regtest) // Alice  will get the airdrop
			const AliceAddressToUnlockLater = Alice_p2shOutputLock.address;

			try {
				// fund the P2SH address, make an output to refer to 
				// unspent = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
				// utx = await regtestUtils.fetch(unspent.txId) // gets json of txid
				const { payment: faucetPayment, keys: faucetKeys } = psbtHelper.createPayment('p2sh-p2pk', '', regtest)
				console.log("output lock of the airdrop: " + bitcoin.script.toASM(faucetPayment.output))
				//for the output  lock of the airdropped tokens
				// const Alice_p2shOutputLock = await ID.createAddressLockedWithCirclesScript(AlicePubkeyStr, algorithm, oracleSignTx, oracleBurnTx, regtest) // Alice  will get the airdrop
				// const AliceAddressToUnlockLater = Alice_p2shOutputLock.address;
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

				// // Get all current unspents of the address.
				// const unspents = await regtestUtils.unspents(faucetPayment.address)
				// // Get data of a certain transaction
				// const fetchedTx = await regtestUtils.fetch(faucetUnspent.txId)
				// // Mine 10 blocks, returns an Array of the block hashes
				// // the above faucet payments will confirm
				// const results = await regtestUtils.mine(10);

				const inputDataToUnlockFaucet = await psbtHelper.getInputData(faucetUnspent, faucetPayment.redeem.output, false, 'p2sh', regtestUtils)
				console.log("redeem for the airdrop: " + bitcoin.script.toASM(inputDataToUnlockFaucet.redeemScript))
				psbt.addInput(inputDataToUnlockFaucet)
					.addOutput({
						address: AliceAddressToUnlockLater,//script: Buffer.from(inputDataToUnlockFaucet.redeemScript,'hex'),
						value: satoshisFromFaucet - minersFee, //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
						//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
						// network: { regtest },
					})
					//nbo change output, all goes to output 0
					.signInput(0, faucetKeys[0], [hashType]) //sign coins given by faucet by its key
					// psbt.validateSignaturesOfInput(0);
					// This is an example of using the finalizeInput second parameter to
					// define how you finalize the inputs, allowing for any type of script.
					.finalizeInput(0, psbtHelper.getFinalScripts) // See getFinalScripts below
					.extractTransaction();

				// Mine 10 blocks, returns an Array of the block hashes
				// the above psbt will confirm
				const resultsCircle = await regtestUtils.mine(10);

				const resultBroadcast = await regtestUtils.broadcast(psbt.extractTransaction().toHex());

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


				// const redeemScript = ID.circlesLockScriptSigOutput(AlicePubkeyStr,
				// 	contract,
				// 	oracleSignTx,  //: KeyPair,
				// 	oracleBurnTx  //: KeyPair,
				// )
				// const address = bitcoin.payments.p2sh({
				// 	redeem: { output: inputDataToUnlockFaucet.redeemScript, network: regtest },
				// 	network: regtest,
				// });

				console.log((satoshisFromFaucet - minersFee) + " airdropped satoshi is now locked with:\n" + bitcoin.script.toASM(inputDataToUnlockFaucet.redeemScript) + "\nat address " + AliceAddressToUnlockLater)

				if (createGenesis) {
					randCircle = "Circle" + buf.toString('hex');
					var doc1 = Circles({ instanceCircles: randCircle, saltedHashedIdentification: ID.HMAC(id, salt), "version": constants.VERSION, });
					CirclesCollection.insertOne(doc1, function (err, circles) {
						if (err) { return cb({ "version": constants.VERSION, psbt: "", CircleId: "", addressOfUTXO: "", status: "500", err: "Could not store the Circle." + err, satoshiAliceLeft: satoshisFromFaucet - minersFee }) }
						return cb({ psbt: psbt.toHex(), CircleId: randCircle, addressOfUTXO: AliceAddressToUnlockLater, status: "200", satoshiAliceLeft: satoshisFromFaucet - minersFee });
					})

				} else{
					return cb()
				}
			}
			catch (e) { return cb({ psbt: "", CircleId: "", addressOfUTXO: "", status: "500", err: e }) }// if you get Error: mandatory-script-verify-flag-failed (Operation not valid with the current stack size) (code 16) , then e.g. see https://bitcoin.stackexchange.com/a/81740/45311
		}
	})
}

// const contractHash = "ad40955030777152caefd9e48ec01012f674c5300e1543d32191adba55b83a4d"; //SHA256 hash of algorithm: const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}

module.exports.PubScriptToUnlockContainsAHashOfContract = (id, salt, pubkeyOfUTXO, addressOfUTXO, contract, callback) => {

	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. containing a  hash of the contract etc) and look whether it hashes to the right hash of the redeem script.
	// If so the user gave the right contract for addressOfUTXO

	// var addressOfUTXO;


	CirclesCollection.find({ "saltedHashedIdentification": ID.HMAC(id, salt), "version": constants.VERSION }).toArray(async function (err, circles) {
		if (err) { return callback(err + " 1 Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!") }
		if (circles.length == 0) return callback("error" + " 1 Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash!")
		if (circles.length > 1) return callback("error" + " 1 Something went terribly wrong: more than 1 circles assigned to a user, in the function when checking the contract hash!")

		// else {
		// 	addressOfUTXO = circles[0].addressToUnlock; //client should remember this!
		// }
		// make hash of the redeemscript

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

	//   const hash256ToCheck = crypto.SHA256(algorithm).toString();

}

// along the lines of https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
//broadcast via a 3rd Party Blockchain Provider (3PBP)
module.exports.PSBT = (AliceId, saltAlice, contract, AlicePubkey, BobId, saltBob, BobPubkey, circleId, callback) => {
	// Signs PSBT by oracle
	// force update MTP  (Merkle Tree Proof?)
	const dustSatoshis = 547
	CirclesCollection.find({ "saltedHashedIdentification": ID.HMAC(AliceId, saltAlice), "version": constants.VERSION }).toArray(async function (err, circles) {
		if (err) { return callback("", "", "", 500, "2 Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash! " + err) }
		if (circles.length != 1) { return callback("", "", "", 500, "2 Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!") }
		// addressToUnlock=circles[0].BTCaddress;
		// await regtestUtils.mine(11);
		// console.log("output lock of Alice's transaction: " + bitcoin.script.toASM(Buffer.from(paymentToUnlock.output.data, 'hex')))
		// console.log("We will create a script for this, which hash160 is equal to the above hexadecimal number")

		//for the output  lock of the airdropped tokens
		const { p2sh: AliceP2shToUnlock, redeemscript: redeemScriptToAlice } = await ID.createAddressLockedWithCirclesScript(AlicePubkey, contract, oracleSignTx, oracleBurnTx, regtest)
		const { p2sh: BobP2shToUnlock, redeemscript: redeemScriptToBob } = await ID.createAddressLockedWithCirclesScript(BobPubkey, contract, oracleSignTx, oracleBurnTx, regtest)
		// console.log("it might be: " + bitcoin.script.toASM(redeemScriptToAlice))

		const unspentToUnlock = await regtestUtils.unspents(AliceP2shToUnlock.address)

		//    const unspent2s = await regtestUtils.unspents(redeemScriptToAlice.toString('hex'))




		if (unspentToUnlock.length == 0) return callback("", "", "", "400", 'the transaction is already spent:  no unspent tx for the address to unlock')
		// if (unspents.length > 1) return callback("", "", "500", 'more than 1 unspent tx for the address to unlock, taking the first one')
		if (unspentToUnlock.length > 1) console.log('more than 1 unspent tx for the address to unlock, taking a arbitrary one with value > dust')


		// const unspentToUnlock = [unspents[0]]//TODTODOTDOTDO  .filter(x => x.txId ===  txIdToUnlock);

		// const txIdToUnlockHash = bitcoin.Transaction.fromHex(txIdToUnlock).getId()

		// find the amount of Satoshis locked:
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
			// const inputDataToUnlockALiceTransaction = await psbtHelper.getInputData(unspentToUnlock[voutIndex], paymentToUnlock, false, 'p2sh', regtestUtils)
			// const inputDataToUnlockALiceTransaction = await psbtHelper.getInputData(unspentToUnlock[voutIndex], paymentToUnlock, false, 'p2sh', regtestUtils)
			// psbt.addInput(inputDataToUnlockALiceTransaction)
			const utx = await regtestUtils.fetch(unspentToUnlock[voutIndex].txId);
			// for non segwit inputs, you must pass the full transaction buffer
			const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');

			const inputDataToUnlockALiceTransaction = await psbtHelper.getInputData(unspentToUnlock[voutIndex], redeemScriptToAlice, false, 'p2ms', regtestUtils)
			psbt.addInput(inputDataToUnlockALiceTransaction)

			// psbt.addInput({hash: unspentToUnlock[voutIndex].txId, index: unspentToUnlock[voutIndex].vout, sequence: 0xFFFFFFFF, //https://bitcoin.stackexchange.com/questions/87372/what-does-the-sequence-in-a-transaction-input-mean)
			// 				nonWitnessUtxo: nonWitnessUtxo,
			// 				redeemScript: Buffer.from(redeem, 'hex')
			// 			})
			// psbt.addInput({hash: Buffer.from((unspentToUnlock[voutIndex].txId), 'hex').reverse(), index: unspentToUnlock[voutIndex].vout, seq: 0xffffffff})
			psbt.addOutput({
				// address: bitcoin.address.toOutputScript(p2shOutputLockGoesBackToAlice.address, regtest),// regtestUtils.RANDOM_ADDRESS,
				script: Buffer.from(redeemScriptToAlice, 'hex'),// regtestUtils.RANDOM_ADDRESS,

				// address: p2shOutputLockGoesBackToAlice.address,// regtestUtils.RANDOM_ADDRESS,^M


				// address: regtestUtils.RANDOM_ADDRESS,
				value: (satoshisToUnlock - dustSatoshis - minersFee), //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
				//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
			})
				.addOutput({
					script: Buffer.from(redeemScriptToBob, 'hex'),// regtestUtils.RANDOM_ADDRESS,


					// address: p2shOutputLockGoesToBob.address,^M

					value: dustSatoshis,  //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311
				})
			// no change output!

			//tx.locktime = lockTime;
			// Note: nSequence MUST be <= 0xfffffffe otherwise LockTime is ignored, and is immediately spendable.

			// // {Alice's signature} {Bob's signature} OP_FALSE
			// const signatureHash = tx.hashForSignature(0, redeemScript, hashType);
			// const redeemScriptSig = bitcoin.payments.p2sh({
			//   redeem: {
			// 	input: bitcoin.script.compile([
			// 	  bitcoin.script.signature.encode(
			// 		alice.sign(signatureHash),
			// 		hashType,
			// 	  ),
			// 	  bitcoin.script.signature.encode(bob.sign(signatureHash), hashType),
			// 	  bitcoin.opcodes.OP_FALSE,
			// 	]),
			// 	output: redeemScript,
			//   },
			// }).input;
			// tx.setInputScript(0, redeemScriptSig!);

			// await regtestUtils.broadcast(tx.toHex());
			// await regtestUtils.verify({
			//   txId: tx.getId(),
			//   address: regtestUtils.RANDOM_ADDRESS,
			//   vout: 0,
			//   value: 8e4,
			// });
			// },
			// );
			// encode to send out to the signers
			const psbtBaseText = psbt.toBase64();

			// each signer imports
			// const psbt = bitcoin.Psbt.fromBase64(psbtBaseText);
			// const Alice = bitcoin.Psbt.fromBase64(psbtBaseText);

			// Alice and Oracle signs their input with the respective private keys
			// signInput and signInputAsync are better
			// (They take the input index explicitly as the first arg)



			psbt.signAllInputs(oracleSignTx);//alice1.keys[0]);
			// psbt.signInput(0,oracleSignTx,[hashType])


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

			console.log((satoshisToUnlock) + " satoshi transferred from Alice to Alice, who gets " + (satoshisToUnlock - minersFee - dustSatoshis) + " is now locked with:\n" + bitcoin.script.toASM(redeemScriptToAlice))// + "\nat address " + redeemScriptToAlice.address)
			console.log(dustSatoshis + " satoshi transferred from Alice to Bob is now locked with:\n" + bitcoin.script.toASM(redeemScriptToBob))// + "\nat address " + redeemScriptToBob.address)

			//for the output  lock of the tokens for Bob
			const { p2sh: Bob_p2shOutputLock, redeemscript: dummy } = await ID.createAddressLockedWithCirclesScript(BobPubkey, contract, oracleSignTx, oracleBurnTx, regtest)
			const BobAddressToUnlockLater = Bob_p2shOutputLock.address;

			CirclesCollection.insertOne(
				// { "Attribute": "good" },
				{ "version": constants.VERSION, instanceCircles: circleId, saltedHashedIdentification: ID.HMAC(BobId, saltBob) },
				// { $set: { addressToUnlock: "determine when fully signed"} },
				// { upsert: true },
				function (err, circles) {
					if (err) { return callback("", "", "", 500, "Something went wrong terribly while inserting!" + err) }
					// addressToUnlock=circles[0].BTCaddress;
					// txId = circles[0].txId;
					// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
					return callback(BobAddressToUnlockLater, psbtBaseText, psbtSignedByOracleText, 200);
				})

		}
		catch (e) {
			return callback("", "", "", 500, e)
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

