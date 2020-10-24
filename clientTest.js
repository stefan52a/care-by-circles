async function run() {

    const axios = require('axios')
    const bitcoin = require('bitcoinjs-lib');
    const prompt = require('prompt-sync')({ sigint: true })
    const bip32 = require('bip32');
    const bip39 = require('bip39');

    const axiosInstance = axios.create({
        baseURL: 'http://localhost:3000/api/',
        timeout: 10000
    });

    const regtestClient = require('regtest-client');
    // const e = require('express');
    const APIPASS = process.env.APIPASS || 'sastoshi';
    const APIURL = process.env.APIURL || 'http://localhost:8080/1';
    //e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
    const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
    const regtest = regtestUtils.network;


    // const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
    const aClientSignTx = bitcoin.ECPair.fromWIF(
        'cU4suhCk1LDHEksGRen2293CmZE1GdfSA4V4A6GmwZvmVRC7Vpvu', ///// TODO KEEP SECRET
        regtest,
    );

    // const path = "m/0'/0/0"
    // var mnemonic = 'praise you muffin enable lion neck crumble super myself grocery license ghost'  //id
    // mnemonic = 'lion neck crumble super myself grocery license ghost praise you muffin enable'  //newId
    // const seed = await bip39.mnemonicToSeed(mnemonic)
    // const root = bip32.fromSeed(seed, regtest)
    // const child1 = root.derivePath("m/0'/0")
    // const child2 = root.derivePath("m/0'/1")
    // //public keys
    // const a = child1.publicKey.toString('hex')
    // const b = child2.publicKey.toString('hex')
    // //p2pkh addresses:
    // const aa = bitcoin.payments.p2pkh({ pubkey: child1.publicKey }).address
    // const ba = bitcoin.payments.p2pkh({ pubkey: child2.publicKey }).address
    // //private keys:
    // const ap = child1.privateKey.toString('hex')
    // const bp = child2.privateKey.toString('hex')



    // var answ = prompt('(a)irdrop or ask (o)racle to sign?')
    var answ = "o"
    stop = false
    while (!stop) {
        if (answ === "a") {
            axiosInstance.post('/oracleGetAirdrop', {
                pubkey: "0221583d06005c99e28344838d6910b864d7fa59e09cd1fc59aa1b0f7ee381ca57", // privkey 01ec555958aa91e110b1ae6e2457704e67bf69af93453675881a8c5b2d4e310c
                id: '+31-6-233787929',

                contract: "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
            })
                .then(function (response) {
                    console.log(response.data);
                })
                .catch(function (error) {
                    console.log(error.message);
                });
            stop = true
        } else if (answ === "o") {
            axiosInstance.post('/oraclePleaseSignTx', {
                id: '+31-6-233787929',
                pubkeyInUTXO: "0221583d06005c99e28344838d6910b864d7fa59e09cd1fc59aa1b0f7ee381ca57",
                newPubkeyId: "02b5ef2e5668acbf4b1a7f69eebe0ee5f69a3a3c27995472e41c654b4ac6592b2f",  // privkey e1c3b0ab84c4c387c3bafb33feb5223f11009423c66fee24c2389bc06122d144   huh?

                newId: '+31-6-231610011',
                pubkeyNewId: aClientSignTx.publicKey.toString('hex'),

                contract: "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
            })
                .then(function (response) {
                    const psbt = response.data.PSBT;
                    const psbtObj = new Function('return ' + psbt.toString())()
                    const dummy =psbtObj.signInput(0, aClientSignTx)
                    console.log(dummy)
                })
                .catch(function (error) {
                    console.log(error.stack);
                });
            stop = true
        } else {
            answ = prompt('(a)irdrop or ask (o)rale to sign?')
        }
    }








    // assert.strictEqual(psbt.validateSignaturesOfAllInputs(), true);
    // psbt.finalizeAllInputs();

    // const tx = psbt.extractTransaction();

    // // build and broadcast to the Bitcoin RegTest network
    // await regtestUtils.broadcast(tx.toHex());
}

run();