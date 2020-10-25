const bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto-js');
const Circles = require('./lib/Circles');

const regtestClient = require('regtest-client');
// const e = require('express');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
//e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;

// Checkexists does this by returning a message with a random Hash256 (H256), towards the telephone number of id and 
// let that user id send H256 back to the server by posting endpoint validateMyId(Id, H256), which returns:
// 	Not allowed (H256 does not belong to the id)
// Or 	Succeeded
module.exports.checkExists = (id, callback) => {
    callback(); //for the moment always exists //identity determnined by his telephone number
}

module.exports.hasGenesisCircle = (id, callback) => {
    // if (hasCircle(id))
    // {
    //     callback("abracadabraCirkel");
    // }
    // else
    // {
    callback("abracadabraCirkel", "fout");// FTM pretend id not to have a Circle
    // }
}

module.exports.noGenesisCircle = (id, callback) => {
    // Connect to Mongoose
    CirclesCollection.find({ "saltedHashedIdentification": id }).toArray(function (err, circles) {
        if (err) { return callback(err, "NotFound") }
        if (circles.length == 0) return callback("No circles assigned to a user!")
        if (circles.length != 1) return callback("Something went wrong terribly: more circles assigned to a user!", "more than 1 Circle")
        else return callback(circles[0].instanceCircles, "exactly 1 Circle already exists");
    })
}

module.exports.createAddressLockedWithCirclesScript = (toPubkeyStr, algorithm, oracleSignTx, oracleBurnTx ) => {
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	const toPubkey = Buffer.from(toPubkeyStr, 'hex'); //new Buffer.alloc(32, toPubkeyStr, 'hex');// TODO unsure whether this works   
	//create (and broadcast via 3PBP) a Circles' genesis Transaction 
	const redeemScript = this.circlesLockScript(toPubkey, algorithm, oracleSignTx, oracleBurnTx);
	const { address } = bitcoin.payments.p2sh({
		redeem: { output: redeemScript, network: regtest },
		network: regtest,
	});
	return address;
}

module.exports.circlesLockScript = (
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	toPubkey,
	algorithm,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) => {
	//returns a buffer:
	return bitcoin.script.fromASM(
		`
	  OP_IF
			${crypto.SHA256(algorithm).toString()} 
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

