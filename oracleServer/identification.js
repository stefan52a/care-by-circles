const constants = require('./constants');

const transactions  = require('./transactions');
const bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto-js');
const Circles = require('../lib/Circles');

// Checkexists does this by returning a message with a random Hash256 (H256), towards the telephone number of id and 
// let that user id send H256 back to the server by posting endpoint validateMyId(Id, H256), which returns:
// 	Not allowed (H256 does not belong to the id)
// Or 	Succeeded
module.exports.checkExists = (id, callback) => { //needed by contract
    callback(); //for the moment always exists //identity determnined by his telephone number
}

module.exports.hasGenesisCircle = (id, callback) => {// needed by contract
    // if (hasCircle(id))
    // {
    //     callback("abracadabraCirkel");
    // }
    // else
    // {
    callback("abracadabraCirkel", "fout");// FTM pretend id not to have a Circle
    // }
}

module.exports.hasNoGenesisCircle = (id, callback) => {
    // Connect to Mongoose
    CirclesCollection.find({ "saltedHashedIdentification": id, "version": constants.VERSION }).toArray(function (err, circles) {
        if (err) { callback(err, "NotFound") } else
        if (circles.length == 0) {callback("No circles assigned to a user!")} else 
        if (circles.length != 1) callback("Something went wrong terribly: more circles assigned to a user!", "more than 1 Circle")
        else callback(circles[0].instanceCircles, "exactly 1 Circle already exists for this user");
    })
}

module.exports.createAddressLockedWithCirclesScript = async (toPubkeyStr, contract, oracleSignTx, oracleBurnTx, regtest ) => { //todo how get new HD address?
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	// const toPubkey = Buffer.from(toPubkeyStr, 'hex');   
	//create (and broadcast via 3PBP) a Circles' genesis Transaction 
	// const redeemscript = this.circlesLockScriptSigOutput(toPubkey,
	// 	algorithm,
	// 	oracleSignTx,  //: KeyPair,
	// 	oracleBurnTx  //: KeyPair,
	// )
	// const p2sh = await bitcoin.payments.p2sh({
	// 	redeem: {
	// 		output: redeemscript,
	// 	},
	// 	network: regtest,
	// }
	// let payment = {
    //     network: regtest,
		// output:  
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
	const p2sh = await bitcoin.payments.p2sh({
		redeem: {output:  redeemscript,
					network: regtest},
		network: regtest,
	})

	return p2sh;
}

// // to test scripts:  https://github.com/kallewoof/btcdeb
// module.exports.circlesLockScript = (  //TODO FTM this script because don't know how to sign the other yet
// 	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
// 	toPubkey,
// 	algorithm,
// 	oraclePleaseSignTxQ,  //: KeyPair,
// 	oracleBurnTxQ  //: KeyPair,
// ) => {
// 	//returns a buffer:
// 	return bitcoin.script.fromASM(
// 		`
// 			OP_0
// 			OP_2
// 			${toPubkey.toString('hex')}
// 			${oraclePleaseSignTxQ.publicKey.toString('hex')}
// 			OP_2
// 			OP_CHECKMULTISIGVERIFY
// 			${crypto.SHA256(algorithm).toString()} 
//     `
// 			.trim()
// 			.replace(/\s+/g, ' '),
// 	);
// }


// written along the lines of https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
// to test scripts:  https://github.com/kallewoof/btcdeb
module.exports.circlesLockScriptSigOutput =  (
	//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
	alice,
	contract,
	oraclePleaseSignTxQ,  //: KeyPair,
	oracleBurnTxQ  //: KeyPair,
) => {
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

