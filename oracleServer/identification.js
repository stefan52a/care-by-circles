const constants = require('./constants');

const transactions = require('./transactions');
const bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto-js');
const Circles = require('../lib/Circles');

module.exports.HMAC = (id, salt) => { console.log("tralala"); //needed by contract
	saltedHashOfId = crypto.HmacSHA256(id, salt).toString(crypto.enc.Hex);
	return saltedHashOfId; //for the moment always exists //identity determnined by his telephone number
}

// Checkexists does this by returning a message with a random Hash256 (H256), towards the telephone number of id and 
// let that user id send H256 back to the server by posting endpoint validateMyId(Id, H256), which returns:
// 	Not allowed (H256 does not belong to the id)
// Or 	Succeeded
module.exports.checkExists = (id, salt, callback) => { console.log("tralala"); //needed by contract
	callback(); //for the moment always exists //identity determnined by his telephone number
}

module.exports.inThisGenesisCircle = (circleId, id, salt, callback) => { console.log("tralala");// needed by contract
	CirclesCollection.find({ instanceCircles: circleId, "saltedHashedIdentification": this.HMAC(id, salt), "version": constants.VERSION }).toArray(function (err, circles) {
		if (err) { callback("NotFound", "", err) }
		else if (circles.length > 0) { callback(id+" already in Circle "+circleId, "", "Error") }
		else {
			CirclesCollection.find({ instanceCircles: circleId, "version": constants.VERSION }).toArray(function (err, circles) {
				if (err) { callback("NotFound", "", err) }
				else if (circles.length == 0) { callback("no Circles found", "", "NotFound") }
				else callback(circles[0], circles.length);
			})
		}
	})
}

module.exports.hasNoGenesisCircle = (id, salt, callback) => { console.log("tralala");
	CirclesCollection.find({ "saltedHashedIdentification": this.HMAC(id, salt), "version": constants.VERSION }).toArray(function (err, circles) {
		if (err) { callback(err, "NotFound") } else
			if (circles.length == 0) { callback("No circles assigned to a user!") } else
				if (circles.length != 1) { callback("Something went wrong terribly: more circles assigned to a user!", "more than 1 Circle") }
				else callback(circles[0].instanceCircles, "exactly 1 Genesis Circle already exists for this user");
	})
}

module.exports.createAddressLockedWithCirclesScript = (toPubkeyStr, contract, oracleSignTx, oracleBurnTx, regtest) => { console.log("tralala"); //todo how get new HD address?
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	const redeemscript = this.circlesLockScriptSigOutput(toPubkeyStr,
		contract,
		oracleSignTx,  //: KeyPair,
		oracleBurnTx  //: KeyPair,
	)
	// This logic should be more strict and make sure the pubkeys in the
	// meaningful script are the ones signing in the PSBT etc.
	// input: bitcoin.script.compile([
	//     bitcoin.opcodes.OP_0,// because of multisig bug, don't do this in case of gneesis transaction
	//     input.partialSig[0].signature,
	//     input.partialSig[1].signature,
	//     bitcoin.opcodes.OP_TRUE,// don't do this in case of gneesis transaction
	// ]),
	// };
	const p2sh = bitcoin.payments.p2sh({
		redeem: {
			output: redeemscript,
			network: regtest
		},
		network: regtest,
	})
	return { p2sh: p2sh, redeemscript: redeemscript };
}

// written along the lines of https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
// to test scripts:  https://github.com/kallewoof/btcdeb
module.exports.circlesLockScriptSigOutput = (
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	alice,
	contract,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) => { console.log("tralala");
	//returns a buffer:
	return bitcoin.script.fromASM(`
	OP_IF
		${bitcoin.crypto.hash256(Buffer.from(contract)).toString('hex')} 
		OP_DROP
		OP_2
		${alice}			
		${oraclePleaseSignTxQ.publicKey.toString('hex')}
		OP_2
	OP_ELSE
		${bitcoin.crypto.hash256(Buffer.from("programmaatje")).toString('hex')} 
		OP_DROP
		OP_1
		${oracleBurnTxQ.publicKey.toString('hex')}
		OP_1
	OP_ENDIF
	OP_CHECKMULTISIG
    `
		.trim()
		.replace(/\s+/g, ' '),
	);
}

