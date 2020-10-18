module.exports.PubScriptToUnlockContainsAHashOf = (algorithm, callback) => {
	callback(); //for the moment always return true
}

module.exports.PSBT = (callback) => {
	callback("PSBT"); //for the moment always return something valid
	//TODO Succeeded and sends User Id the <see ToBeSignedPSBT.png> PSBT transaction which is partially to be signed by the Oracle oraclePleaseSignTx
	// scriptPubKey (to lock output):
	// IF
	// <oraclePleaseSignTx_hash> DROP
	// 2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2 CHECKMULTISIG
	// ELSE
	// <contractBurn_hash> DROP
	// n +1 <IDi pubkey> ..... <IDn pubkey><oracleBurn pubkey> m+1 CHECKMULTISIG
	// ENDIF
}

