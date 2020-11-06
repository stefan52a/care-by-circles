//Handy:  https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line

const fs = require('fs');
const bitcoin = require('bitcoinjs-lib');
const psbtHelper = require('./oracleServer/psbtHelper');
const regtestClient = require('regtest-client'); /// seee https://github.com/bitcoinjs/regtest-client
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1'; //e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;

async function run() {
    const axios = require('axios')
    const axiosInstance = axios.create({
        baseURL: 'http://localhost:3000/api/',
        // baseURL: 'https://www.carebycircle.com/api',
        timeout: 10000
    });
    // const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
    const AliceClientSignTxID = bitcoin.ECPair.fromWIF(  /// should be  a HD wallet
        'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS', ///// TODO KEEP SECRET
        regtest,
    );
    const AliceId = '+31-6-233787929'
    const BobClientSignTxID = bitcoin.ECPair.fromWIF(  /// should be  a HD wallet
        'cU4suhCk1LDHEksGRen2293CmZE1GdfSA4V4A6GmwZvmVRC7Vpvu', ///// TODO KEEP SECRET
        regtest,
    );
    const BobId = '+31-6-231610011'

    //HD wallet?:
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

    axiosInstance.post('/oracleGetAirdrop', {
        // generate another pubkey from a WIF
        AlicePubkey: AliceClientSignTxID.publicKey.toString('hex'),  //Alice wants to receive the airdrop towards this pubkey , client (HD wallet?) should remember (persistent storage)
                                                                    //  this as long as it contains tokens, or client could do scan of blockchain
        AliceId: '+31-6-233787929',
        salt: '8sda898933h8ih321i989d89as',  // a fixed random string used to one-way hash your personal data, if you change this number your id cannot (it will be pseudomous) be associated with any data stored on decentral storage
    })
        .then(function (response) {
            console.log(response.data);
            const circleID = response.data.Circle;//store circleID persistent on client
            const addressOfUTXO= response.data.addressOfUTXO; //store addressOfUTXO persistent on client
            //Now ALice will let Bob in her circle:
            const filenameContract = './oracleServer/ExamplecontractExample.js';
            fs.readFile(filenameContract, 'utf8',  function (err, contract) {
                if (err) throw err;
                const AliceNewPubkey = AliceClientSignTxID.publicKey.toString('hex')
                axiosInstance.post('/oraclePleaseSignTx', {
                    contract: contract.trim().replace(/\s+/g, ' '),  // http://www.lifewithalacrity.com/2004/03/the_dunbar_numb.html

                    circleId: circleID,//get circleID from persistent storage on client

                    AliceId: AliceId,
                    pubkeyInUTXO: AliceClientSignTxID.publicKey.toString('hex'),// get pubkey of UTXO from client persistent storage
                    addressOfUTXO: addressOfUTXO , //get addressOfUTXO from persistent storage on client
                    AliceNewPubkey: AliceNewPubkey,

                    BobId: BobId,
                    BobPubkey: BobClientSignTxID.publicKey.toString('hex')
                })
                    .then(async function (response) {
                        ////////////////////////////
                        //To combine signatures in parallel, see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
                        ////////////////////////////
                        // With PSBT, we can have multiple signers sign in parrallel and combine them.
                        ////////////////////////////
                        // each signer imports & signs Psbt.fromBase64(psbtBaseText)
                        const psbt_from_Oracle_for_Alice_to_sign = bitcoin.Psbt.fromBase64(response.data.psbtBaseText, { network: regtest });//Alice = me
                        // signInput and signInputAsync are better (They take the input index explicitly as the first arg)
                         psbt_from_Oracle_for_Alice_to_sign.signAllInputs(AliceClientSignTxID);
                        // If your signer object's sign method returns a promise, use the following
                        // await Alice.signAllInputsAsync(alice2.keys[0])

                        // encode to send back to combiner (Oracle and Alice are not near each other)
                        psbt_from_Oracle_for_Alice_to_sign.combine(bitcoin.Psbt.fromBase64(response.data.psbtSignedByOracleBaseText, { network: regtest }));

                        // Finalizer wants to check all signatures are valid before finalizing.
                        //                                if (!psbtFromOracleForAliceToSign.validateSignaturesOfInput(0)) { console.log("input 0 hasn't a valid signmature"); return }
                        //                                if (!psbtFromOracleForAliceToSign.validateSignaturesOfInput(1)) { console.log("input 1 hasn't a valid signmature"); return }

                        // This step is new. Since we separate the signing operation and
                        // the creation of the scriptSig and witness stack, we are able to
                        psbt_from_Oracle_for_Alice_to_sign.finalizeInput(0, psbtHelper.getFinalScripts2)

                        // Mine 10 blocks, returns an Array of the block hashes
                        // the above psbt will confirm
                         regtestUtils.mine(10);
                        // build and broadcast to our RegTest network
                        regtestUtils.broadcast(psbt_from_Oracle_for_Alice_to_sign.extractTransaction().toHex());
                        // to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839
                        // for bitcoin-cli decodepsbt use the psbt fromhex then to base64 (e.g. with cyberchef)
                        console.log('\npsbt can be decoded with "  bitcoin-cli -regtest decodepsbt ', psbt_from_Oracle_for_Alice_to_sign.toBase64() + '   "')//fromhex, tobase64  (e.g. with cyberchef)

                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        // await regtestUtils.verify({
                        //     txId: AliceClientSignTxID,
                        //     address: AliceNewPubkey,
                        //     vout: 0,
                        //     value: 7e4,
                        // });
                        //////////////////////////////////////////////////////////////////////todo
                        //cleanup so we can restart: THIS endpoint will be REMOVED, Just here for testing:
                        axiosInstance.post('/startFresh', {
                            circleId: circleID,
                            AliceId: '+31-6-233787929',
                        })
                            .then(function (response) {
                                console.log(response.data);
                                console.log({ error: "none" })
                            })
                            .catch(function (error) {
                                console.log(JSON.stringify(error))
                                if (error.response) console.log("\n" + JSON.stringify(error.response.data))
                            });
                    })
                    .catch(function (error) {
                        console.log(JSON.stringify(error))
                        if (error.response) console.log("\n" + JSON.stringify(error.response.data))
                    });

            }).catch(function (error) {
                console.log(JSON.stringify(error))
                if (error.response) console.log("\n" + JSON.stringify(error.response.data))
            });
        }).catch(function (error) {
            console.log(JSON.stringify(error))
            if (error.response) console.log("\n" + JSON.stringify(error.response.data))
        });
}
run();