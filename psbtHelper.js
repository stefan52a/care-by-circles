const bitcoin = require('bitcoinjs-lib');

// see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts  for basic transactions
module.exports.createPayment = (_type, myKeys, network) => {
    network = network || regtest;
    const splitType = _type.split('-').reverse();
    const isMultisig = splitType[0].slice(0, 4) === 'p2ms';
    const keys = myKeys || [];
    let m
    if (isMultisig) {
        const match = splitType[0].match(/^p2ms\((\d+) of (\d+)\)$/);
        m = parseInt(match[1], 10);
        let n = parseInt(match[2], 10);
        if (keys.length > 0 && keys.length !== n) {
            throw new Error('Need n keys for multisig');
        }
        while (!myKeys && n > 1) {
            keys.push(bitcoin.ECPair.makeRandom({ network }));
            n--;
        }
    }
    if (!myKeys) keys.push(bitcoin.ECPair.makeRandom({ network }));

    let payment;
    splitType.forEach(type => {
        if (type.slice(0, 4) === 'p2ms') {
            payment = bitcoin.payments.p2ms({
                m,
                pubkeys: keys.map(key => key.publicKey).sort((a, b) => a.compare(b)),
                network,
            });
        } else if (['p2sh', 'p2wsh'].indexOf(type) > -1) {
            payment = (bitcoin.payments)[type]({
                redeem: payment,
                network,
            });
        } else {
            payment = (bitcoin.payments)[type]({
                pubkey: keys[0].publicKey,
                network,
            });
        }
    });

    return {
        payment,
        keys,
    };
}

module.exports.getWitnessUtxo = (out) => {
    delete out.address;
    out.script = Buffer.from(out.script, 'hex');
    return out;
}

module.exports.getInputData = async (
    regtestUtils,
    amount,
    payment,
    isSegwit,
    redeemType,
) => {
    const unspent = await regtestUtils.faucetComplex(payment.output, amount);
    const utx = await regtestUtils.fetch(unspent.txId);
    // for non segwit inputs, you must pass the full transaction buffer
    const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');
    // for segwit inputs, you only need the output script and value as an object.
    const witnessUtxo = this.getWitnessUtxo(utx.outs[unspent.vout]);
    const mixin = isSegwit ? { witnessUtxo } : { nonWitnessUtxo };
    const mixin2 = {};
    switch (redeemType) {
        case 'p2sh':
            mixin2.redeemScript = payment.redeem.output;
            break;
        case 'p2wsh':
            mixin2.witnessScript = payment.redeem.output;
            break;
        case 'p2sh-p2wsh':
            mixin2.witnessScript = payment.redeem.redeem.output;
            mixin2.redeemScript = payment.redeem.output;
            break;
    }
    return {
        hash: unspent.txId,
        index: unspent.vout,
        ...mixin,
        ...mixin2,
    };
}

