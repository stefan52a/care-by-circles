const constants = require('../constants');
const fs = require('fs');
const bitcoin = require('bitcoinjs-lib');
const regtestClient = require('regtest-client'); /// seee https://github.com/bitcoinjs/regtest-client
// const e = require('express');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1';
//e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;

async function run() {

    // Make only one mongodb connection per session:  BY TOM:
    var db;
    global.CirclesCollection;
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, async function (err, database) {
        if (err) throw err;

        db = database.db("carebycircles");
        CirclesCollection = db.collection("circles");

        const axios = require('axios')
        const prompt = require('prompt-sync')({ sigint: true })
        const bip32 = require('bip32');
        const bip39 = require('bip39');

        const axiosInstance = axios.create({
            baseURL: 'http://localhost:3000/api/',
            timeout: 10000
        });


        // const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
        const AliceClientSignTxID = bitcoin.ECPair.fromWIF(
            'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS', ///// TODO KEEP SECRET
            regtest,
        );
        const AliceId = '+31-6-233787929'

        const BobaClientSignTxID = bitcoin.ECPair.fromWIF(
            'cU4suhCk1LDHEksGRen2293CmZE1GdfSA4V4A6GmwZvmVRC7Vpvu', ///// TODO KEEP SECRET
            regtest,
        );
        const BobId = '+31-6-231610011'
        const BobPubkey = BobaClientSignTxID.publicKey.toString('hex');

        // const path = "m/0'/0/0"
        // var mnemonic = 'praise you muffin enable lion neck crumble super myself grocery license ghost'  //id
        // // mnemonic = 'lion neck crumble super myself grocery license ghost praise you muffin enable'  //newId
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
        answ="o"
        stop = false
        while (!stop) {
            stop = true
            if (answ === "a") {

                axiosInstance.post('/oracleGetAirdrop', {
                    // generate another pubkey from a WIF
                    AlicePubkey: AliceClientSignTxID.publicKey.toString('hex'),
                    AliceId: '+31-6-233787929',
                })
                    .then(function (response) {
                        console.log(response.data);
                        const circleID = response.data.CircleId;//store them persistent on client
                        const psbt = response.data.psbt;//store them persistent on client, this should still fromhex, tobase64  (e.g. with cyberchef)
                    })
                    .catch(function (error) {
                        console.log(error.message);
                    });
                stop = true
            } else if (answ === "o") {
                stop = true

                //should be stored in persistent storage, in this example we use mongodb:
                CirclesCollection.find({ "saltedHashedIdentification": AliceId,  "version": constants.VERSION  }).toArray(function (err, circles) {
                    if (err) { return console.log("", "Something went terribly wrong: " + err) }
                    if (circles.length != 1) { return console.log("", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!, maybe your forget to create a Circle first") }
                    // addressToUnlock=circles[0].BTCaddress;
                    const addressToUnlock = circles[0].addressToUnlock

                    const filenameContract = '../ExamplecontractExample.js';
                    fs.readFile(filenameContract, 'utf8', function (err, contract) {
                        if (err) throw err;
                        console.log('OK: ' + filenameContract);
                        console.log(contract)
                        axiosInstance.post('/oraclePleaseSignTx', {
                            AliceId: AliceId,
                            pubkeyInUTXO: circles[0].pubKey,
                            txId: circles[0].txId,//get txID from persistent storage on client
                            AliceNewPubkey: AliceClientSignTxID.publicKey.toString('hex'),

                            BobId: BobId,
                            circleId: circles[0].instanceCircles,//get circleID from persistent storage on client
                            BobPubkey: BobPubkey,

                            // http://www.lifewithalacrity.com/2004/03/the_dunbar_numb.html
                            contract: contract.trim().replace(/\s+/g, ' '),
                        })
                            .then(async function (response) {

                                // for bitcoin-cli decodepsbt use the psbt fromhex then to base64 (e.g. with cyberchef)

                                const psbt = bitcoin.Psbt.fromHex(response.data.PSBT);
                                // const psbt = bitcoin.Psbt.fromHex(response.data.PSBT);

                                // https://bitcoin.stackexchange.com/a/93436/45311

                                // ************ sign input by client *************
                                psbt.signInput(0, AliceClientSignTxID)

                                // ************** finalizing inputs **************

                                psbt.data.inputs.forEach((input, index) => {

                                    // sign regular inputs that can be simply signed
                                    if (!input.redeemScript && !input.witnessScript) {
                                        psbt.finalizeInput(index)
                                    }

                                    // for p2sh or p2wsh script inputs
                                    if (input.redeemScript || input.witnessScript) {
                                        psbt.finalizeInput(
                                            index,
                                            input.redeemScript
                                        )
                                    }
                                })

                                // ************** make tx **************

                                const tx = psbt.extractTransaction()

                                const virtualSize = tx.virtualSize()
                                const txid = tx.getId()
                                const hex = tx.toHex()

                                console.log('tx virtualSize:', virtualSize)
                                console.log('tx txid:', txid)
                                console.log('tx hex:', hex)

                                // // build and broadcast to the Bitcoin RegTest network
                                await regtestUtils.broadcast(hex);

                                console.log(txid)

                                axiosInstance.post('/GiveTxIdToOracle', {
                                    instanceCircles: circleID,
                                    id: BobPubkey,

                                    txId: txid,
                                }
                                ).then(function (response) {
                                    console.log(response.data);
                                })
                                    .catch(function (error) {
                                        console.log(error.message);
                                    });
                            })
                            .catch(function
                                (error) {
                                console.log(error.message);
                            });
                    });
                });
            } else {
                answ = prompt('(a)irdrop or ask (o)racle to sign?')
            }
        }
    })
}


run();