async function run() {

    // Make only one mongodb connection per session:  BY TOM:
    var db;
    global.CirclesCollection;
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
        if (err) throw err;

        db = database.db("carebycircles");
        CirclesCollection = db.collection("circles");


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
        const aClientSignTxID = bitcoin.ECPair.fromWIF(
            'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS', ///// TODO KEEP SECRET
            regtest,
        );
        const pubKeyID = aClientSignTxID.publicKey.toString('hex')
        const aClientSignTxNEWID = bitcoin.ECPair.fromWIF(
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

        var answ = prompt('(a)irdrop or ask (o)racle to sign?')
        stop = false
        while (!stop) {
            stop = true
            if (answ === "a") {
                axiosInstance.post('/oracleGetAirdrop', {


                    // generate another pubkey from a WIF

                    pubkey: pubKeyID,
                    id: '+31-6-233787929',

                    contract: "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
                })
                    .then(function (response) {
                        console.log(response.data);
                        const circleID = response.data.Circle;//store them persistent on client
                        const txID = response.data.txId;//store them persistent on client
                    })
                    .catch(function (error) {
                        console.log(error.message);
                    });
                stop = true
            } else if (answ === "o") {
                stop = true
                CirclesCollection.find({ "saltedHashedIdentification": '+31-6-233787929' }).toArray(function (err, circles) {
                    if (err) { return callback("", "Something went terribly wrong: no circles assigned to a user, in the function when checking the contract hash! " + err) }
                    if (circles.length != 1) { return callback("", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!") }
                    // addressToUnlock=circles[0].BTCaddress;
                    const txID = circles[0].txId;
                    const circleID = circles[0].instanceCircles;

                    axiosInstance.post('/oraclePleaseSignTx', {
                        id: '+31-6-233787929',
                        pubkeyInUTXO: pubKeyID,
                        txId: txID,//get txID from persistent storage on client
                        newPubkeyId: aClientSignTxID.publicKey.toString('hex'),

                        newId: '+31-6-231610011',
                        circleId: circleID,//get circleID from persistent storage on client
                        pubkeyNewId: aClientSignTxNEWID.publicKey.toString('hex'),

                        contract: "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
                    })
                        .then(function (response) {
                            const psbt = response.data.PSBT;
                            // const psbtObj = new Function('return ' + psbt.toString()+'')()
                            const dummy = psbt.signInput(0, aClientSignTxNEWID)
                            console.log(dummy)
                        })
                        .catch(function
                            (error) {
                            console.log(error.message);
                        });
                });
            } else {
                answ = prompt('(a)irdrop or ask (o)rale to sign?')
            }
        }




    })


    // assert.strictEqual(psbt.validateSignaturesOfAllInputs(), true);
    // psbt.finalizeAllInputs();

    // const tx = psbt.extractTransaction();

    // // build and broadcast to the Bitcoin RegTest network
    // await regtestUtils.broadcast(tx.toHex());
}

run();