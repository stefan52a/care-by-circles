//# Downloads the image from docker hub automatically
//docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server
// see https://github.com/bitcoinjs/regtest-server/tree/master/docker

const crypto = require('crypto-js');
const bitcoin = require('bitcoinjs-lib');

const regtestClient = require('regtest-client');

//const APIPASS = process.env.APIPASS || 'satsoshi';
const APIPASS = '';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;
// const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
const oracleSignTx = bitcoin.ECPair.fromWIF(
	'cTsrZtbGTamSLAQVbLfv3takw97x28FKEmVmCfSkebDoeQ3547jV', ///// TODO KEEP SECRET
	regtest,
);
const oracleBurn = bitcoin.ECPair.fromWIF(
	'cRs1KTufxBpY4wcexxaQEULA4CFT3hKTqENEy7KZtpR5mqKeijwU',  ///// TODO KEEP SECRET
	regtest,
);

module.exports.PubScriptToUnlockContainsAHashOf = (addressToUnlock, algorithm, callback) => {

//WIP

// I believe this does not work because the redeem script has a hash in the pubscript, and given the one-way nature of hashes
// you can never find the contents of the redeem script. (P2SH)
// we have to make a redeem script (a.o. with hash of contract etc) and look whether it hashes to the right redeem script.

	const hash256ToCheck = crypto.SHA256(algorithm).toString();
	let decodeBase58;
	try {
		decodeBase58 = bitcoin.address.fromBase58Check(addressToUnlock);
	  } catch (e) { callback (e)}
	  if (decodeBase58)
	  {
		const utxo = bitcoin.payments.p2sh({ hash: decodeBase58.hash }).output
		const utxoStr=  Buffer.from(utxo,'hex').reverse();
		callback(); 
	  }
}

module.exports.PSBT = (callback) => {
	callback("PSBT"); //for the moment always return something valid
}

module.exports.createAndBroadcastCircleGenesisTx = async (toPubkeyStr, satoshis) => {
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts

	//WIP

	const toPubkey= Buffer.from(toPubkeyStr,'hex'); //new Buffer.alloc(32, toPubkeyStr, 'hex');// TODO unsure whether this works   
	//create (and broadcast via 3PBP) a Circles' genesis Transaction 
	const redeemScript = circlesLockScript(toPubkey, oracleSignTx, oracleBurn);
	const { address } = bitcoin.payments.p2sh({
		redeem: { output: redeemScript, network: regtest },
		network: regtest,
	});


// fund the P2SH address
//const unspent = await regtestUtils.faucet(address, 1e5); // TODO we actually want to MINT here
	const unspentMINT = await regtestUtils.faucet(address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET

/*const tx = new bitcoin.Transaction();
tx.addInput(Buffer.from(unspent.txId, 'hex').reverse()
, unspent.vout);//, 0xfffffffe);
tx.addOutput(bitcoin.address.toOutputScript(address, regtest), 1e9);//(regtestUtils.RANDOM_ADDRESS, regtest), 1e9);

// {toPubkey's signature} OP_TRUE
const signatureHash = tx.hashForSignature(0, redeemScript, hashType);
const redeemScriptSig = bitcoin.payments.p2sh({
  redeem: {
	input: bitcoin.script.compile([
	  bitcoin.script.signature.encode(
		oracleSignTx.sign(signatureHash),
		hashType,
	  ),
	  bitcoin.opcodes.OP_TRUE,
	]),
	output: redeemScript,
  },
}).input;
tx.setInputScript(0, redeemScriptSig);

await regtestUtils.broadcast(tx.toHex());

await regtestUtils.verify({
  txId: tx.getId(),
  address: regtestUtils.RANDOM_ADDRESS,
  vout: 0,
  value: 1e9,
});
*/

// 	const multisig = createPayment('p2sh-p2ms(2 of 4)');
//     const inputData1 = await getInputData(2e4, multisig.payment, false, 'p2sh');
//     {
//       const {
//         hash,
//         index,
//         nonWitnessUtxo,
//         redeemScript, // NEW: P2SH needs to give redeemScript when adding an input.
//       } = inputData1;
//       assert.deepStrictEqual(
//         { hash, index, nonWitnessUtxo, redeemScript },
//         inputData1,
//       );
//     }

//     const psbt = new bitcoin.Psbt({ network: regtest })
//       .addInput(inputData1)
//       .addOutput({
//         address: regtestUtils.RANDOM_ADDRESS,
//         value: 1e4,
//       })
//       .signInput(0, multisig.keys[0])
//       .signInput(0, multisig.keys[2]);

//     assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
//     assert.strictEqual(
//       psbt.validateSignaturesOfInput(0, multisig.keys[0].publicKey),
//       true,
//     );
//     assert.throws(() => {
//       psbt.validateSignaturesOfInput(0, multisig.keys[3].publicKey);
//     }, new RegExp('No signatures for this pubkey'));
//     psbt.finalizeAllInputs();

//     const tx = psbt.extractTransaction();

//     // build and broadcast to the Bitcoin RegTest network
//     await regtestUtils.broadcast(tx.toHex());

//     await regtestUtils.verify({
//       txId: tx.getId(),
//       address: regtestUtils.RANDOM_ADDRESS,
//       vout: 0,
//       value: 1e4,
//     });
}

function circlesLockScript(
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts

	// 48f3e95d19ca1b5eea847057b2f2487e8b07534c801473f35487ad92cc745993 is hash256 of
	// of a contract
	// const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId)
	// else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId)
	// else callback(PSBT);});});}
	// see for a formatted version: ExamplecontractExample.js

	// scriptPubKey (to lock output):
	// IF
	// <oraclePleaseSignTx_hash> DROP   
	// 2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2 CHECKMULTISIG
	// ELSE
	// <contractBurn_hash> DROP
	// n +1 <IDi pubkey> ..... <IDn pubkey><oracleBurn pubkey> m+1 CHECKMULTISIG
	// ENDIF

	toPubkey,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) {//returns a buffer:
	return bitcoin.script.fromASM(
		`
	  OP_IF
		  	48f3e95d19ca1b5eea847057b2f2487e8b07534c801473f35487ad92cc745993 
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
