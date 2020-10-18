const crypto = require('crypto-js');

module.exports.PubScriptToUnlockContainsAHashOf = (algorithm, callback) => {
	const hash256 = crypto.SHA256(algorithm).toString();
	callback(); //for the moment always return true
}

module.exports.PSBT = (callback) => {
	callback("PSBT"); //for the moment always return something valid
}

module.exports.createAndBroadcastCircleGenesisTx = (toPubkey) => {
	//based on  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts

	// scriptPubKey (to lock output):
				// IF
				// <oraclePleaseSignTx_hash> DROP
				// 2 <ID pubkey> <oraclePleaseSignTx_pubkey> 2 CHECKMULTISIG
				// ELSE
				// <contractBurn_hash> DROP
				// n +1 <IDi pubkey> ..... <IDn pubkey><oracleBurn pubkey> m+1 CHECKMULTISIG
				// ENDIF

				//make this Segwit later: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts


//WIP

	const multisig = createPayment('p2sh-p2ms(2 of 4)');
    const inputData1 = await getInputData(2e4, multisig.payment, false, 'p2sh');
    {
      const {
        hash,
        index,
        nonWitnessUtxo,
        redeemScript, // NEW: P2SH needs to give redeemScript when adding an input.
      } = inputData1;
      assert.deepStrictEqual(
        { hash, index, nonWitnessUtxo, redeemScript },
        inputData1,
      );
    }

    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData1)
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 1e4,
      })
      .signInput(0, multisig.keys[0])
      .signInput(0, multisig.keys[2]);

    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    assert.strictEqual(
      psbt.validateSignaturesOfInput(0, multisig.keys[0].publicKey),
      true,
    );
    assert.throws(() => {
      psbt.validateSignaturesOfInput(0, multisig.keys[3].publicKey);
    }, new RegExp('No signatures for this pubkey'));
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex());

    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 1e4,
    });
}


