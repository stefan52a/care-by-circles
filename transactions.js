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
const contractHash = "ad40955030777152caefd9e48ec01012f674c5300e1543d32191adba55b83a4d"; //SHA256 hash of algorithm: const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}


module.exports.PubScriptToUnlockContainsAHashOf = (algorithm, callback) => {

	// The redeem script has a hash in the pubscript, and given the one-way nature of hashes
	// you can never find the contents of the redeem script. (P2SH)
	// we have to make a redeem script (a.o. with hash of contract etc) and look whether it hashes to the right hash of the redeem script.

	const addressToUnlock = "2N213DaFM1Mpx2mH3qPyGYvGA3R1DoY1pJc"; //TODO get addressToUnlock from mongodb
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
	TX_ID = '65c5802f45db571718b53baad72619778fe0dee8bb046d02c1700fb2342a56e6'
	TX_HEX = '02000000000101885e1f124e2d0d4ca6f2c5fb87055515a7ba8c9c1d1484b832f5ff2f4c20029800000000171600141bded115d49c7e95eb9d2a5da8ad931e11c07105feffffff0200ca9a3b0000000017a914600a51497a5d235fc9d2faf28fba1db81daa663087082268590000000017a9147ed2effc94497c719222b1b13dc4a68363a2dfe9870247304402201195a7c1b79a1a8cff8b4fc43999ab4e7e68dfa0069d61662d56864fbbae9bf3022042bdd8527cf5119cdb6313acfc4dcc7e127e77f6166938a313d19cf5f39e5d28012103f4f015e0e304b8946de00ee57757427100949b05ca03133e9c3118185998bb0f00000000'
	TX_VOUT = 0
	const psbt = new bitcoin.Psbt({ network: regtest });
	psbt
		.addInput({
			hash: TX_ID,
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
	psbt
		.addOutput({
			address: regtestUtils.RANDOM_ADDRESS,  // TODO should be  locked with pubkey in ToBeSignedPSBT.jpg
			value: 1e4,
		})
	psbt
		.signInput(0, oracleSignTx)

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

	const txId = unspentMINT.txId; // e.g. 65c5802f45db571718b53baad72619778fe0dee8bb046d02c1700fb2342a56e6 vout=1  for address 2N213DaFM1Mpx2mH3qPyGYvGA3R1DoY1pJc
	return unspentMINT;
}

function circlesLockScript(
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	toPubkey,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) {
	const contractHash = "ad40955030777152caefd9e48ec01012f674c5300e1543d32191adba55b83a4d"; //hash of algorithm
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



