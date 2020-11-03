//Handy:  https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line

const constants = require('./oracleServer/constants');
const fs = require('fs');
const bitcoin = require('bitcoinjs-lib');
const ID = require('./oracleServer/identification');
const psbtHelper = require('./oracleServer/psbtHelper');
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

        const BobClientSignTxID = bitcoin.ECPair.fromWIF(
            'cU4suhCk1LDHEksGRen2293CmZE1GdfSA4V4A6GmwZvmVRC7Vpvu', ///// TODO KEEP SECRET
            regtest,
        );
        const BobId = '+31-6-231610011'
        const BobPubkey = BobClientSignTxID.publicKey.toString('hex');

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
 // force update MTP  (Merkle Tree Proof?)
    await regtestUtils.mine(11);

  const hashType = bitcoin.Transaction.SIGHASH_ALL;

        // var answ = prompt('(a)irdrop or ask (o)racle to sign?')
        answ = "a"
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
                CirclesCollection.find({ "saltedHashedIdentification": AliceId, "version": constants.VERSION }).toArray(async function (err, circles) {
                    if (err) { return console.log("", "Something went terribly wrong: " + err) }
                    if (circles.length != 1) { return console.log("", "Something went terribly wrong: no or more than 1 circles assigned to a user, in the function when checking the contract hash!, maybe your forget to create a Circle first") }
                    // addressToUnlock=circles[0].BTCaddress;
                    const addressToUnlock = circles[0].addressToUnlock
                    const unspents = await regtestUtils.unspents(addressToUnlock)
                    const unspentToUnlock = unspents.filter(x => x.txId === bitcoin.Transaction.fromHex(circles[0].txId).getId());

                    const filenameContract = './oracleServer/ExamplecontractExample.js';
                    fs.readFile(filenameContract, 'utf8', function (err, contract) {
                        if (err) throw err;
                        // console.log('OK: ' + filenameContract);
                        // console.log(contract)
                        const AliceNewPubkey = AliceClientSignTxID.publicKey.toString('hex')
                        axiosInstance.post('/oraclePleaseSignTx', {
                            AliceId: AliceId,
                            pubkeyInUTXO: circles[0].pubKey,
                            // txId: circles[0].txId,//get txID from persistent storage on client
                            AliceNewPubkey: AliceNewPubkey,

                            BobId: BobId,
                            circleId: circles[0].instanceCircles,//get circleID from persistent storage on client
                            BobPubkey: BobPubkey,

                            // http://www.lifewithalacrity.com/2004/03/the_dunbar_numb.html
                            contract: contract.trim().replace(/\s+/g, ' '),
                        })
                            .then(async function (response) {


                                ////////////////////////////
                                //To combine signatures in parallel see:
                                ////////////////////////////
                                // Let's show a new feature with PSBT.
                                // We can have multiple signers sign in parrallel and combine them.
                                ////////////////////////////
                                // https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
                                //////////////////////////////
                                // each signer imports
                                // const Oracle = bitcoin.Psbt.fromBase64(psbtBaseText); //the Oracle
                                const psbtFromOracleForAliceToSign = bitcoin.Psbt.fromBase64(response.data.psbtBaseText, {network: regtest});//Alice = me

                                // Alice and Oracle signs their input with the respective private keys
                                // signInput and signInputAsync are better
                                // (They take the input index explicitly as the first arg)
                                // Oracle.signAllInputs(alice1.keys[0]);
                                psbtFromOracleForAliceToSign.signAllInputs(AliceClientSignTxID);//alice2.keys[0]);  


                                // If your signer object's sign method returns a promise, use the following
                                // await Alice.signAllInputsAsync(alice2.keys[0])

                                // encode to send back to combiner (Oracle and Alice are not near each other)
                                // const s1text = Oracle.toBase64();
                                // const psbtSignedByAliceText = psbtFromOracleForAliceToSign.toBase64();

                                // const OracleFinal = bitcoin.Psbt.fromBase64(response.data.psbtSignedByOracleBaseText);
                                // const Alicefinal =  psbtFromOracleForAliceToSign;//bitcoin.Psbt.fromBase64(psbtSignedByAliceText);

                                psbtFromOracleForAliceToSign.combine(bitcoin.Psbt.fromBase64(response.data.psbtSignedByOracleBaseText, {network: regtest}));

                                // Finalizer wants to check all signatures are valid before finalizing.
                                // If the finalizer wants to check for specific pubkeys, the second arg
                                // can be passed. See the first multisig example below.
//                                if (!psbtFromOracleForAliceToSign.validateSignaturesOfInput(0)) { console.log("input 0 hasn't a valid signmature"); return }
//                                if (!psbtFromOracleForAliceToSign.validateSignaturesOfInput(1)) { console.log("input 1 hasn't a valid signmature"); return }

                                // This step it new. Since we separate the signing operation and
                                // the creation of the scriptSig and witness stack, we are able to
                                // psbtFromOracleForAliceToSign.finalizeAllInputs()//psbtHelper.p2mscGetFinalScripts);
                                // psbtFromOracleForAliceToSign.finalizeInput(0, psbtHelper.p2mscGetFinalScripts) 

                                console.log('\npsbt can be decoded with "  bitcoin-cli -regtest decodepsbt ', psbtFromOracleForAliceToSign.toBase64() + '   "')

                                // Mine 10 blocks, returns an Array of the block hashes
                                // the above psbt will confirm
                                // await regtestUtils.mine(10);
                                // build and broadcast our RegTest network
                                await regtestUtils.broadcast(psbtFromOracleForAliceToSign.extractTransaction().toHex());
                                // to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839

                                // for bitcoin-cli decodepsbt use the psbt fromhex then to base64 (e.g. with cyberchef)


                                // const inputDataToUnlockALiceTransaction = await psbtHelper.getInputData(unspentToUnlock[0], paymentToUnlock, false, 'p2sh', regtestUtils)  //todo find out which indexe to take
                                // psbt.addInput(inputDataToUnlockALiceTransaction)  //should result in :    'Can not modify transaction, signatures exist.'

                                // https://bitcoin.stackexchange.com/a/93436/45311






                                // //////////////////////////////////////////////
                                // ///TODODOD thsi needs to be done on Oracle serevr!!!, becasue we donto want the cleint to detremine the outputs!
                                // /////////////////////////////////////////////
                                // const oracleSignTx = bitcoin.ECPair.fromWIF( //todo bip32 HD derivation
                                //     'cTsrZtbGTamSLAQVbLfv3takw97x28FKEmVmCfSkebDoeQ3547jV', ///// TODO KEEP SECRET
                                //     regtest,
                                // );
                                // const oracleBurnTx = bitcoin.ECPair.fromWIF(
                                //     'cRs1KTufxBpY4wcexxaQEULA4CFT3hKTqENEy7KZtpR5mqKeijwU',  ///// TODO KEEP SECRET
                                //     regtest,
                                // );
                                // // todo get miner's fee from a servce
                                // // ftm take satoshis:
                                // const minersFee = 6100;
                                // const dustSatoshis = 547;

                                // var satoshisToUnlock = 0;
                                // var voutIndex
                                // for (voutIndex = 0; voutIndex < unspentToUnlock.length; voutIndex++) {
                                //     const sat = unspentToUnlock[unspentToUnlock[voutIndex].vout].value
                                //     if (sat > dustSatoshis) {
                                //         satoshisToUnlock = sat  //TODO ATM there is exactly 1 output greater than dust+1, 
                                //         //which is Alice's value, find out another way???
                                //         break
                                //     }
                                // }
                                // const p2shOutputLockGoesBackToAlice = await ID.createAddressLockedWithCirclesScript(AliceNewPubkey, contract, oracleSignTx, oracleBurnTx, regtest)
                                // const p2shOutputLockGoesToBob = await ID.createAddressLockedWithCirclesScript(BobPubkey, contract, oracleSignTx, oracleBurnTx, regtest)

                                // psbt.addOutput({
                                //     // address: bitcoin.address.toOutputScript(p2shOutputLockGoesBackToAlice.address, regtest),// regtestUtils.RANDOM_ADDRESS,
                                //     address: p2shOutputLockGoesBackToAlice.address,// regtestUtils.RANDOM_ADDRESS,
                                //     // address: regtestUtils.RANDOM_ADDRESS,
                                //     value: (satoshisToUnlock - dustSatoshis - minersFee), //maybe can estmate by bcli analyzepsbt by adding output first then analyze then make psbt anew with estimated fee
                                //     //   "estimated_feerate" : feerate   (numeric, optional) Estimated feerate of the final signed transaction in BTC/kB. Shown only if all UTXO slots in the PSBT have been filled.
                                // })
                                //     .addOutput({
                                //         address: p2shOutputLockGoesToBob.address,
                                //         value: dustSatoshis,  //547  =  1 more than dust https://bitcoin.stackexchange.com/a/76157/45311
                                //     })
                                // // no change output!
                                // //////////////////////////////////////////////
                                // ///TODODOD thsi needs to be done on Oracle serevr!!!, becasue we donto want the cleint to detremine the outputs!
                                // /////////////////////////////////////////////


                                //https://github.com/bitcoinjs/bitcoinjs-lib/issues/1142
                                // https://github.com/bitcoinjs/bitcoinjs-lib/pull/1271    they conclude to move forward on BIP174:   psbt


                                // // ************ sign input by client *************
                                // psbt.signInput(0, AliceClientSignTxID)
                                // // give error if signature failed
                                // if (!psbt.validateSignaturesOfInput(0)) {
                                //     return callback("", 'Signature validation failed for input index ' + 0)
                                // }
                                // // ************** finalizing inputs **************

                                // // This is an example of using the finalizeInput second parameter to
                                // // define how you finalize the inputs, allowing for any type of script.
                                // psbt.finalizeInput(0, psbtHelper.getFinalScripts) // See getFinalScripts below


                                // psbt.data.inputs.forEach((input, index) => {

                                //     // sign regular inputs that can be simply signed
                                //     if (!input.redeemScript && !input.witnessScript) {
                                //         psbt.finalizeInput(index)
                                //     }

                                //     // for p2sh or p2wsh script inputs
                                //     if (input.redeemScript || input.witnessScript) {
                                //         psbt.finalizeInput(
                                //             index,
                                //             input.redeemScript
                                //         )
                                //     }
                                // })

                                // ************** make tx **************

                                // const tx = psbt.extractTransaction()

                                // const virtualSize = tx.virtualSize()
                                // const txid = tx.getId()
                                // const hex = tx.toHex()

                                // console.log('tx virtualSize:', virtualSize)
                                // console.log('tx txid:', txid)
                                // console.log('tx hex:', hex)
                                // console.log('psbt hex:', psbt.toHex())


                                // // build and broadcast to the Bitcoin RegTest network
                                // await regtestUtils.broadcast(psbt.extractTransaction().toHex());

                                // console.log(txid)

                                // axiosInstance.post('/GiveTxIdToOracle', {
                                //     instanceCircles: circleID,
                                //     id: BobPubkey,

                                //     txId: txid,
                                // }
                                // ).then(function (response) {
                                //     console.log(response.data);
                                // })
                                //     .catch(function (error) {
                                //         console.log(error.message);
                                //     });
                            })
                            .catch(function
                                (error) {
                                console.log(error);
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