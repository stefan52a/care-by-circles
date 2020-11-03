const bitcoin = require('bitcoinjs-lib');

const regtestClient = require('regtest-client');
// const e = require('express');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
//e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;

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
    unspent,
    redeem,
    isSegwit,
    redeemType,
    regtestUtils,
) => {
    const utx = await regtestUtils.fetch(unspent.txId);
    // for non segwit inputs, you must pass the full transaction buffer
    const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');
    // for segwit inputs, you only need the output script and value as an object.
    const witnessUtxo = this.getWitnessUtxo(utx.outs[unspent.vout]);
    const mixin = isSegwit ? { witnessUtxo } : { nonWitnessUtxo };
    const mixin2 = {};
    switch (redeemType) {
        case 'p2ms':
            if (redeem.data) {
                mixin2.redeemScript = Buffer.from(redeem.data, 'hex');
            } else {
                mixin2.redeemScript = redeem;
            }
            break;
        case 'p2sh':
            if (redeem.data) {
                mixin2.redeemScript = Buffer.from(redeem.data, 'hex');
            } else {
                mixin2.redeemScript = redeem;
            }
            break;
        case 'p2wsh':
            mixin2.witnessScript = redeem;
            break;
        case 'p2sh-p2wsh':
            mixin2.witnessScript = redeem.output;
            mixin2.redeemScript = redeem;
            break;
    }
    return {
        hash: unspent.txId,
        index: unspent.vout,
        sequence: 0xFFFFFFFF, //https://bitcoin.stackexchange.com/questions/87372/what-does-the-sequence-in-a-transaction-input-mean
        ...mixin2,
        ...mixin,
    };
}

module.exports.decoderawtransaction = (hex) => {
    const tx = bitcoin.Transaction.fromHex(hex)
    return {
        txId: tx.getId(),
        hash: tx.getHash(true).toString('hex'),
        size: tx.byteLength(),
        vsize: tx.virtualSize(),
        weight: tx.weight(),
        version: tx.version,
        locktime: tx.locktime,
        vin: tx.ins.map(input => ({
            txid: Buffer.from(input.hash).reverse().toString('hex'),
            vout: input.index,
            scriptSig: {
                asm: bitcoin.script.toASM(input.script),
                hex: input.script.toString('hex'),
            },
            txinwitness: input.witness.map(b => b.toString('hex')),
            sequence: input.sequence,
        })),
        vout: tx.outs.map((output, i) => ({
            value: output.value,
            n: i,
            scriptPubKey: {
                asm: bitcoin.script.toASM(output.script),
                hex: output.script.toString('hex'),
            },
        })),
    }
}

//from  https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts
// This function is used to finalize a transaction using PSBT.
module.exports.getFinalScripts2 = (
    inputIndex,//: number,
    input,//: PsbtInput,
    script,//: Buffer,
    isSegwit,//: boolean,
    isP2SH,//: boolean,
    isP2WSH,//: boolean,
) => {
    // Step 1: Check to make sure the meaningful script matches what you expect.
    const decompiled = bitcoin.script.decompile(script);
    // Checking if first OP is OP_IF... should do better check in production!
    // You may even want to check the public keys in the script against a
    // whitelist depending on the circumstances!!!
    // You also want to check the contents of the input to see if you have enough
    // info to actually construct the scriptSig and Witnesses.

    //todo: uncomment:
    if (!decompiled || decompiled[0] !== bitcoin.opcodes.OP_IF) {
        throw new Error(`Can not finalize input #${inputIndex} not starting with OP_IF`);
    }
    console.log("lock: " + bitcoin.script.toASM(decompiled))


    // Step 2: Create final scripts
    let payment = {
        network: regtest,
        output: script,
        // This logic should be more strict and make sure the pubkeys in the
        // meaningful script are the ones signing in the PSBT etc.
        input: bitcoin.script.compile([
            bitcoin.opcodes.OP_0,// because of multisig bug, don't do this in case of gneesis transaction
            input.partialSig[0].signature,
            input.partialSig[1].signature,
            bitcoin.opcodes.OP_TRUE,// don't do this in case of gneesis transaction
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




    console.log("unlock: " + bitcoin.script.toASM(bitcoin.script.decompile(payment.redeem.input)))

    console.log("try out with btcdeb:\nbtcdeb '[" + bitcoin.script.toASM(bitcoin.script.decompile(payment.redeem.input)) + " " + bitcoin.script.toASM(decompiled) + "]'")
    //      btcdeb '[OP_0 3045022100cc48b2b15404ec8dbdfaf3f001bb9f6ca4f8889c2dde09b46f5dbc26ac9281a002202ee792efcc8804b9f0b0176fb242ac2a0c2774487a2dba0bc2282bdffb12a4e201 304402203291eeccac48830fcbb06b07b9ee55523b792cedc9ca8d008a4faa2ce9b7f93602206f87dc6a0a8812a36cd58c2032ead1a7c98031ced0e47232e86b35af4d6f5ec7 OP_TRUE OP_IF 347afd7f77d0538d24979c520de1254a26b92b1c83c07f781a40fbac96dc368a OP_DROP OP_2 02758bfe7f2b8e61821e3e32b47be516193117daddde3c3f9126b8f2bd3ae40e1d 02a211312047f4ed82628df97148cccbbaba8927fce3f47061e841536fc5a3ee1e OP_2 OP_CHECKMULTISIGVERIFY OP_ELSE abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd OP_DROP OP_1 026194a5e97b32473c2e8c95118815ba5bade70ec47b7667d9ce627b4e29720982 OP_1 OP_CHECKMULTISIGVERIFY OP_ENDIF]'
    // e.g. btcdeb '[OP_0 3045022100dee56de1b3c991f5169f96c53cd817d8eb4420f5659e3581dc2e69b12fe0376d02205e8916504c5131d1eabb2e31fd80765b5b7135cf39ab782800d4e424720f7569 30440220272d9f592037a221b4926f96f71668c0898e8e0cc608888bfb47bb8d9be7a34802207f404f93abdaf83d20c4363ca8be2dd8dd11ef94b45394120e13090d1e5507ad01 OP_TRUE OP_IF 347afd7f77d0538d24979c520de1254a26b92b1c83c07f781a40fbac96dc368a OP_DROP OP_2 02758bfe7f2b8e61821e3e32b47be516193117daddde3c3f9126b8f2bd3ae40e1d 02a211312047f4ed82628df97148cccbbaba8927fce3f47061e841536fc5a3ee1e OP_2 OP_CHECKMULTISIGVERIFY OP_ELSE abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd OP_DROP OP_1 026194a5e97b32473c2e8c95118815ba5bade70ec47b7667d9ce627b4e29720982 OP_1 OP_CHECKMULTISIGVERIFY OP_ENDIF]'
    // e.g. btcdeb '[3045022100dee56de1b3c991f5169f96c53cd817d8eb4420f5659e3581dc2e69b12fe0376d02205e8916504c5131d1eabb2e31fd80765b5b7135cf39ab782800d4e424720f7569 02758bfe7f2b8e61821e3e32b47be516193117daddde3c3f9126b8f2bd3ae40e1d OP_DUP OP_HASH160 9b8ed87a689ace35b66dddbc3beda82793aca3e4 OP_EQUALVERIFY OP_CHECKSIG]'

    console.log ("or try very nice, but does not work ATM: https://siminchen.github.io/bitcoinIDE/build/editor.html ")

    function witnessStackToScriptWitness(witness) {
        let buffer = Buffer.allocUnsafe(0);

        function writeSlice(slice) {
            buffer = Buffer.concat([buffer, Buffer.from(slice)]);
        }

        function writeVarInt(i) {
            const currentLen = buffer.length;
            const varintLen = varuint.encodingLength(i);

            buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
            varuint.encode(i, buffer, currentLen);
        }

        function writeVarSlice(slice) {
            writeVarInt(slice.length);
            writeSlice(slice);
        }

        function writeVector(vector) {
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


//from https://github.com/bitcoinjs/bitcoinjs-lib/blob/f1d04cec002f8c4203389c80d259ad33656ad6f1/src/psbt.js
module.exports.getFinalScripts = (inputIndex, input, script, isSegwit, isP2SH, isP2WSH) => {
    const scriptType = classifyScript(script);
    if (!canFinalize(input, script, scriptType))
        throw new Error(`Can not finalize input #${inputIndex}`);
    return prepareFinalScripts(
        script,
        scriptType,
        input.partialSig,
        isSegwit,
        isP2SH,
        isP2WSH,
    );
}

function prepareFinalScripts(
    script,
    scriptType,
    partialSig,
    isSegwit,
    isP2SH,
    isP2WSH,
) {
    let finalScriptSig;
    let finalScriptWitness;
    // Wow, the payments API is very handy
    const payment = getPayment(script, scriptType, partialSig);
    const p2wsh = !isP2WSH ? null : bitcoin.payments.p2wsh({ redeem: payment });
    const p2sh = !isP2SH ? null : bitcoin.payments.p2sh({ redeem: p2wsh || payment });
    if (isSegwit) {
        if (p2wsh) {
            finalScriptWitness = witnessStackToScriptWitness(p2wsh.witness);
        } else {
            finalScriptWitness = witnessStackToScriptWitness(payment.witness);
        }
        if (p2sh) {
            finalScriptSig = p2sh.input;
        }
    } else {
        if (p2sh) {
            finalScriptSig = p2sh.input;
        } else {
            finalScriptSig = payment.input;
        }
    }
    return {
        finalScriptSig,
        finalScriptWitness,
    };
}

function witnessStackToScriptWitness(witness) {
    let buffer = Buffer.allocUnsafe(0);
    function writeSlice(slice) {
        buffer = Buffer.concat([buffer, Buffer.from(slice)]);
    }
    function writeVarInt(i) {
        const currentLen = buffer.length;
        const varintLen = varuint.encodingLength(i);
        buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
        varuint.encode(i, buffer, currentLen);
    }
    function writeVarSlice(slice) {
        writeVarInt(slice.length);
        writeSlice(slice);
    }
    function writeVector(vector) {
        writeVarInt(vector.length);
        vector.forEach(writeVarSlice);
    }
    writeVector(witness);
    return buffer;
}

function classifyScript(script) {
    if (isP2WPKH(script)) return 'witnesspubkeyhash';
    if (isP2PKH(script)) return 'pubkeyhash';
    if (isP2MS(script)) return 'multisig';
    if (isP2PK(script)) return 'pubkey';
    return 'nonstandard';
}
function canFinalize(input, script, scriptType) {
    switch (scriptType) {
        case 'pubkey':
        case 'pubkeyhash':
        case 'witnesspubkeyhash':
            return hasSigs(1, input.partialSig);
        case 'multisig':
            const p2ms = bitcoin.payments.p2ms({ output: script });
            return hasSigs(p2ms.m, input.partialSig, p2ms.pubkeys);
        default:
            return false;
    }
}
function hasSigs(neededSigs, partialSig, pubkeys) {
    if (!partialSig) return false;
    let sigs;
    if (pubkeys) {
        sigs = pubkeys
            .map(pkey => {
                const pubkey = ecpair_1.fromPublicKey(pkey, { compressed: true })
                    .publicKey;
                return partialSig.find(pSig => pSig.pubkey.equals(pubkey));
            })
            .filter(v => !!v);
    } else {
        sigs = partialSig;
    }
    if (sigs.length > neededSigs) throw new Error('Too many signatures');
    return sigs.length === neededSigs;
}
const isP2MS = isPaymentFactory(bitcoin.payments.p2ms);
const isP2PK = isPaymentFactory(bitcoin.payments.p2pk);
const isP2PKH = isPaymentFactory(bitcoin.payments.p2pkh);
const isP2WPKH = isPaymentFactory(bitcoin.payments.p2wpkh);
const isP2WSHScript = isPaymentFactory(bitcoin.payments.p2wsh);
const isP2SHScript = isPaymentFactory(bitcoin.payments.p2sh);

function isPaymentFactory(payment) {
    return script => {
        try {
            payment({ output: script });
            return true;
        } catch (err) {
            return false;
        }
    };
}

function getPayment(script, scriptType, partialSig) {
    let payment;
    switch (scriptType) {
        case 'multisigCircle':
            const sigsC = getSortedSigs(script, partialSig);
            payment = bitcoin.payments.p2ms({
                output: script,
                signatures: sigsC,
            });
            break;
        case 'multisig':
            const sigs = getSortedSigs(script, partialSig);
            payment = bitcoin.payments.p2ms({
                output: script,
                signatures: sigs,
            });
            break;
        case 'pubkey':
            payment = bitcoin.payments.p2pk({
                output: script,
                signature: partialSig[0].signature,
            });
            break;
        case 'pubkeyhash':
            payment = bitcoin.payments.p2pkh({
                output: script,
                pubkey: partialSig[0].pubkey,
                signature: partialSig[0].signature,
            });
            break;
        case 'witnesspubkeyhash':
            payment = bitcoin.payments.p2wpkh({
                output: script,
                pubkey: partialSig[0].pubkey,
                signature: partialSig[0].signature,
            });
            break;
    }
    return payment;
}