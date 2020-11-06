//https://developer.ibm.com/languages/node-js/tutorials/learn-nodejs-unit-testing-in-nodejs/
var assert = require('chai').assert;
var expect = require('chai').expect;
var describe = require('mocha').describe;

const transactions = require('../oracleServer/transactions');

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const bitcoin = require('bitcoinjs-lib');
const psbtHelper = require('../oracleServer/psbtHelper');
const regtestClient = require('regtest-client'); /// seee https://github.com/bitcoinjs/regtest-client
const { DH_UNABLE_TO_CHECK_GENERATOR } = require('constants');
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = process.env.APIURL || 'http://localhost:8080/1'; //e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;

// Make only one mongodb connection per session:  BY TOM:
global.CirclesCollection;

const axios = require('axios')
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/api/',
    // baseURL: 'https://www.carebycircle.com/api',
    timeout: 10000
});


var MongoClient = require('mongodb').MongoClient;
const AliceClientSignTxID = bitcoin.ECPair.fromWIF(
    'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS',
    regtest,
);
const AliceId = '+31-6-233787929'

axiosInstance.post('/oracleGetAirdrop', {
    // generate another pubkey from a WIF
    AlicePubkey: AliceClientSignTxID.publicKey.toString('hex'),  //Alice wants to receive the airdrop towards this pubkey , client (HD wallet?) should remember this as long as it contains tokens, or client could do scan of blockchain
    AliceId: AliceId,
})
    .then(function (response) {
        console.log(response.data);
        const circleID = response.data.Circle;//store circleID persistent on client

        describe('Transaction.js utilities:', function () {
            describe('testing contract correctness (i.e. the right hash)', () => {
                const pubkeyOfUTXO = AliceClientSignTxID.publicKey.toString('hex')
                filename = __dirname + '/ExamplecontractExample.js';
                it('should succeed with the right contract', (done) => {
                    fs.readFile(filename, 'utf8', (err, contractFromFile) => {
                        if (err) {
                            console.log(err)
                            done()
                        }
                        const contract = contractFromFile.trim().replace(/\s+/g, ' ')
                        // Make only one mongodb connection per session:  BY TOM:
                        // Initialize connection once
                        MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
                            if (err) throw err;
                            db = database.db("scratch");
                            CirclesCollection = db.collection("circles");
                            transactions.PubScriptToUnlockContainsAHashOfContract(AliceId, pubkeyOfUTXO, addressOfUTXO, contract, circleID, (err) => {
                                if (err) {
                                    console.log(err)
                                    expect(false).to.equal(true);
                                    done()
                                }
                                expect(true).to.equal(true);
                                done()
                            }

                            );
                        });
                    });
                });
                it('should faill with the wrong contract', (done) => {
                    contractFromFile = fs.readFile(filename, 'utf8', (err, contractFromFile) => {
                        if (err) throw "no contractfile";
                        const contract = contractFromFile.trim().replace(/\s+/g, ' ')
                        // Make only one mongodb connection per session:  BY TOM:
                        // Initialize connection once
                        MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
                            if (err) throw err;
                            db = database.db("scratch");
                            CirclesCollection = db.collection("circles");

                            transactions.PubScriptToUnlockContainsAHashOfContract(AliceId, pubkeyOfUTXO, addressOfUTXO, contract + "randomstuff", circleID, (err) => {
                                if (err) {
                                    expect(false).to.equal(false);
                                    done()
                                }
                                expect(true).to.equal(false);
                                done()
                            });
                        })


                    })
                })
            })
        })
    })
