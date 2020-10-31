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
const psbtHelper = require('./psbtHelper')

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
// todo get miner's fee from a servce
// ftm take 5 000  satoshi
const minersFee = 5000;

const axiosInstance = axios.create({
	baseURL: APIURL,
	timeout: 10000
});


module.exports.createAndBroadcastCircleGenesisTx = (id, toPubkeyStr, algorithm, satoshis, cb) => {// see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts  for basic transactions
	var returnValue = "";
	randomBytes(256, async (err, buf) => {
		if (err) return cb({ unspent: "", CircleId: "", status: "500", err: err });
		else {
			//for the output  lock of the airdropped tokens
			const p2shOutputLock = await ID.createAddressLockedWithCirclesScript(toPubkeyStr, algorithm, oracleSignTx, oracleBurnTx)

			try {
				// fund the P2SH address, make an output to refer to 
				// unspent = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
				// utx = await regtestUtils.fetch(unspent.txId) // gets json of txid
				const { payment, keys } = psbtHelper.createPayment('p2sh-p2pkh', '', regtest)
				const psbt = new bitcoin.Psbt({ network: regtest });
				// .setVersion(2) // These are defaults. This line is not needed.
				// .setLocktime(0) // These are defaults. This line is not needed.
				const unspent = await regtestUtils.faucetComplex(payment.output, amount);
				const inputData = await psbtHelper.getInputData(unspent, regtestUtils, satoshis, payment, false, 'p2sh')
				psbt.addInput(inputData)
					.addOutput({
						address: p2shOutputLock.address,// regtestUtils.RANDOM_ADDRESS,
						value: satoshis - minersFee, //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
						//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
					})
					.signInput(0, keys[0])
					// psbt.validateSignaturesOfInput(0);
					// This is an example of using the finalizeInput second parameter to
					// define how you finalize the inputs, allowing for any type of script.
					.finalizeInput(0, getFinalScripts) // See getFinalScripts below
					.extractTransaction();

				regtestUtils.mine(10);

				regtestUtils.broadcast(psbt.toHex());

				regtestUtils.verify({
					txId: psbt.extractTransaction().toHex(),
					address: p2shOutputLock.address,// regtestUtils.RANDOM_ADDRESS,
					vout: 0,
					value: satoshis,//7e4,
				});

				randCircle = "Circle" + buf.toString('hex');

				var doc1 = Circles({ instanceCircles: randCircle, saltedHashedIdentification: id, psbt: psbt.toHex(), txId: psbt.extractTransaction().toHex(), pubKey: toPubkeyStr, addressToUnlock: p2shOutputLock.address });//, redeemScript: redeemScript.toString('hex') });
				CirclesCollection.insertOne(doc1, function (err, circles) {
					if (err) { cb({ psbt: "", CircleId: "", status: "500", err: "Could not store the Circle." + err }) }
					cb({ psbt: psbt.toHex(), CircleId: randCircle, status: "200" });
				})
			}
			catch (e) { cb({ psbt: "", CircleId: "", status: "500", err: e }) }// if you get Error: mandatory-script-verify-flag-failed (Operation not valid with the current stack size) (code 16) , then e.g. see https://bitcoin.stackexchange.com/a/81740/45311
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

	CirclesCollection.find({ "saltedHashedIdentification": id }).toArray(async function (err, circles) {
		if (err) { return callback("", "Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash! " + err) }
		if (circles.length != 1) { return callback("", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!") }
		// addressToUnlock=circles[0].BTCaddress;
		txId = circles[0].txId;

		//for the output  lock of the airdropped tokens
		const p2shOutputLock = await ID.createAddressLockedWithCirclesScript(newPubkeyId, algorithm, oracleSignTx, oracleBurnTx)
		const unspent = bitcoin.Transaction.fromHex(txId)
		var satoshis = unspent.outs[0].value; if (satoshis == 0) satoshis = unspent.outs[1].value

		try {
			// make an output to refer to 
			// unspent = await regtestUtils.faucet(p2sh.address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET
			// utx = await regtestUtils.fetch(unspent.txId) // gets json of txid
			const psbt = new bitcoin.Psbt({ network: regtest });
			// .setVersion(2) // These are defaults. This line is not needed.
			// .setLocktime(0) // These are defaults. This line is not needed.
			const inputData = await psbtHelper.getInputData(unspent, regtestUtils, satoshis, payment, false, 'p2sh')
			psbt.addInput(inputData)
				.addOutput({
					address: p2shOutputLock.address,// regtestUtils.RANDOM_ADDRESS,
					value: satoshis - minersFee, //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
					//   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
				})
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

				// This is an example of using the finalizeInput second parameter to
				// define how you finalize the inputs, allowing for any type of script.
				.finalizeInput(0, getFinalScripts) // See getFinalScripts below
				.extractTransaction();

			regtestUtils.mine(10);

			regtestUtils.broadcast(psbt.toHex());

			regtestUtils.verify({
				txId: psbt.extractTransaction().toHex(),
				address: p2shOutputLock.address,// regtestUtils.RANDOM_ADDRESS,
				vout: 0,
				value: satoshis,//7e4,
			});
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

		}
		catch (e) {
			return callback("", "500" + e)
		}

})
		.catch (function (error) {
	return callback("", "very strange there is no TX_HEX of the txId:" + txId + " " + error);
});

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




//from  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
// This function is used to finalize a transaction using PSBT.
// See  above.
getFinalScripts = (
	inputIndex,//: number,
	input,//: PsbtInput,
	script,//: Buffer,
	isSegwit,//: boolean,
	isP2SH,//: boolean,
	isP2WSH,//: boolean,
) =>
//   : {
// 	finalScriptSig;//: Buffer | undefined;
// 	finalScriptWitness;//: Buffer | undefined;
//   } 
{
	// Step 1: Check to make sure the meaningful script matches what you expect.
	const decompiled = bitcoin.script.decompile(script);
	//TODO:
	// Checking if first OP is OP_IF... should do better check in production!
	// You may even want to check the public keys in the script against a
	// whitelist depending on the circumstances!!!
	// You also want to check the contents of the input to see if you have enough
	// info to actually construct the scriptSig and Witnesses.
	// if (!decompiled || decompiled[0] !== bitcoin.opcodes.OP_IF) {
	// 	throw new Error(`Can not finalize input #${inputIndex}`);
	// }

	// Step 2: Create final scripts
	let payment//: bitcoin.Payment 
		= {
		network: regtest,
		output: script,
		// This logic should be more strict and make sure the pubkeys in the
		// meaningful script are the ones signing in the PSBT etc.
		input: bitcoin.script.compile([
			// input.partialSig![0].signature,
			input,
			bitcoin.opcodes.OP_TRUE,
		]),
	};
	if (isP2WSH && isSegwit)
		payment = bitcoin.payments.p2wsh({
			network: regtest,
			redeem: payment,
		});
	if (isP2SH)
		payment = bitcoin.payments.p2sh({
			network: regtest,
			redeem: payment,
		});

	function witnessStackToScriptWitness(witness)//: Buffer[]): Buffer 
	{
		let buffer = Buffer.allocUnsafe(0);

		function writeSlice(slice)//: Buffer): void 
		{
			buffer = Buffer.concat([buffer, Buffer.from(slice)]);
		}

		function writeVarInt(i)//: number): void 
		{
			const currentLen = buffer.length;
			const varintLen = varuint.encodingLength(i);

			buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
			varuint.encode(i, buffer, currentLen);
		}

		function writeVarSlice(slice)//: Buffer): void 
		{
			writeVarInt(slice.length);
			writeSlice(slice);
		}

		function writeVector(vector)//: Buffer[]): void 
		{
			writeVarInt(vector.length);
			vector.forEach(writeVarSlice);
		}

		writeVector(witness);

		return buffer;
	}

	return {
		finalScriptSig: payment.input,
		finalScriptWitness:
			payment.witness && payment.witness.length > 0
				? witnessStackToScriptWitness(payment.witness)
				: undefined,
	};
}
