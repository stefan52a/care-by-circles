// see for a tutorial of bitcoinjs:  https://bitcoinjs-guide.bitcoin-studio.com/


// see https://github.com/bitcoinjs/regtest-server/tree/master/docker
//Downloads the image from docker
//docker run -d -p 8080:8080 junderw/bitcoinjs-regtest-server

const crypto = require('crypto-js');
const bitcoin = require('bitcoinjs-lib');
const assert = require('assert')

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
const oracleBurnTx = bitcoin.ECPair.fromWIF(
	'cRs1KTufxBpY4wcexxaQEULA4CFT3hKTqENEy7KZtpR5mqKeijwU',  ///// TODO KEEP SECRET
	regtest,
);
const contractHash = "48f3e95d19ca1b5eea847057b2f2487e8b07534c801473f35487ad92cc745993"; //hash of algorithm

module.exports.PubScriptToUnlockContainsAHashOf = (algorithm, callback) => {

	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. with hash of contract etc) and look whether it hashes to the right hash of the redeem script.

	const txid = '7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7' 
	const addressToUnlock = "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; //TODO get addressToUnlock from mongodb
	const pubkeyUsedInUTXO = "033af0554f882a2dce68a4f9c162c7862c84ba1e5d01a349f29c0a7bdf11d05030"; //todo also from mongodb????, do we lose some anonimity here?

	// make hash of the redeemscript
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
	const { address } = bitcoin.payments.p2sh({
		redeem: { output: redeemScript, network: regtest },
		network: regtest,
	});

	// is address equal to utxo?
	if (JSON.stringify(address) === "\"" + addressToUnlock + "\"") callback();
	else callback("Hash of contract not in UTXO redeemScript")
	//   }

	//   const hash256ToCheck = crypto.SHA256(algorithm).toString();

}

module.exports.PSBT = async () => {
	// Signs PSBT by oracle
	// const addressToUnlock = "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; //TODO get addressToUnlock from mongodb
	// const txid = '7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7' 

	const pubkeyUsedInUTXO = "033af0554f882a2dce68a4f9c162c7862c84ba1e5d01a349f29c0a7bdf11d05030"; //todo also from mongodb????, do we lose some anonimity here?
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
	TX_ID = '7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7'
	TX_HEX= '02000000000101bda5a57d5d718c57d7640c146dfb0f95e3514e99b31d377f9774b7df3e5749dd00000000171600141bded115d49c7e95eb9d2a5da8ad931e11c07105feffffff0288a5e60e0000000017a914ce477ee9809f607f19672eef7e113d9da272ecf78700ca9a3b0000000017a914011d4e768a3f43276cb42bf9dbb5df2b1ec36925870247304402205a61bea2267a04e81899a920d939f6fa50cfd6684f3b95d872a72ae8956e883b02203535e1c709ee4d7daefb9b2e697530a900698bb4448f8484d07c371c62822f2d012103f4f015e0e304b8946de00ee57757427100949b05ca03133e9c3118185998bb0f00000000'
	TX_VOUT = 1
	const psbt = new bitcoin.Psbt({ network: regtest });
	psbt
	.addInput({
	  hash: TX_ID,
	  index: TX_VOUT,
	  sequence: 0xfffffffe,
	  nonWitnessUtxo: Buffer.from(TX_HEX,'hex'),
	  redeemScript: Buffer.from(redeemScript,'hex')
	//   witnessUtxo: {
	// 	script: Buffer.from('0020' +
	// 	  bitcoin.crypto.sha256(Buffer.from(WITNESS_SCRIPT, 'hex')).toString('hex'),
	// 	  'hex'),
	// 	value: 12e2
	//   },
	//   witnessScript: Buffer.from(WITNESS_SCRIPT, 'hex')
	})
	.addOutput({
			address: regtestUtils.RANDOM_ADDRESS,  // TODO should be  locked with pubkey in ToBeSignedPSBT.jpg
			value: 1e4,
		})
		.signInput(0, oracleSignTx)

	// assert.strictEqual(psbt.validateSignaturesOfAllInputs(), true);
	// psbt.finalizeAllInputs();

	// const tx = psbt.extractTransaction();

	// // build and broadcast to the Bitcoin RegTest network
	// await regtestUtils.broadcast(tx.toHex());

	return psbt; //for the moment always return something valid
}

module.exports.createAndBroadcastCircleGenesisTx = async (toPubkeyStr, satoshis) => {
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts

	const toPubkey = Buffer.from(toPubkeyStr, 'hex'); //new Buffer.alloc(32, toPubkeyStr, 'hex');// TODO unsure whether this works   
	//create (and broadcast via 3PBP) a Circles' genesis Transaction 
	const redeemScript = circlesLockScript(toPubkey, oracleSignTx, oracleBurnTx);
	const { address } = bitcoin.payments.p2sh({
		redeem: { output: redeemScript, network: regtest },
		network: regtest,
	});


	// fund the P2SH address
	const unspentMINT = await regtestUtils.faucet(address, satoshis); // TODO we actually want to MINT here NOT USE A FAUCET

	// to get TX_HEX
// by http://localhost:8080/1/t/7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7    (BTW you can find more endpoints in https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js)
// whcih gives
//02000000000101bda5a57d5d718c57d7640c146dfb0f95e3514e99b31d377f9774b7df3e5749dd00000000171600141bded115d49c7e95eb9d2a5da8ad931e11c07105feffffff0288a5e60e0000000017a914ce477ee9809f607f19672eef7e113d9da272ecf78700ca9a3b0000000017a914011d4e768a3f43276cb42bf9dbb5df2b1ec36925870247304402205a61bea2267a04e81899a920d939f6fa50cfd6684f3b95d872a72ae8956e883b02203535e1c709ee4d7daefb9b2e697530a900698bb4448f8484d07c371c62822f2d012103f4f015e0e304b8946de00ee57757427100949b05ca03133e9c3118185998bb0f00000000
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

	const txId = unspentMINT.txId; // e.g. 7bd079f15deeff70566cd7078666c557d21d799d7ab3fe3110772dbe9c05e8e7 vout=1  for address 2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC
   return unspentMINT;
}

function circlesLockScript(
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	toPubkey,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) {
	const contractHash = "48f3e95d19ca1b5eea847057b2f2487e8b07534c801473f35487ad92cc745993"; //hash of algorithm
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



