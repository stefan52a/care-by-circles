const axios = require('axios')
const bitcoin = require('bitcoinjs-lib');
// // Generate a pub and priv key:
// ///////////////////////////////
// const aClientTx = bitcoin.ECPair.fromWIF(
// 	'cUHDh7RGFBgZPUGAFkKhxS4uRkLT22fHXC9N75KnKaDyDxYKRhar',  ///// TODO KEEP SECRET
// 	regtest,
// );
// const pubkey = aClientTx.publicKey.toString('hex');
// // const privkey = aClientTx.privateKey.toString('hex');

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/api/',
    timeout: 10000
});

axiosInstance.post('/oracleGetAirdrop', {
    pubkey: "02cd1e024ea5660dfe4c44221ad32e96d9bf57151d7105d90070c5b56f9df59e5e", // privkey c7de4d9656c800300591d3a2868fc5c22d6cd65d5a3670727de6897814e324b8
    id: '+31-6-233797929'
})
    .then(function (response) {
         console.log(response.data);
    })
    .catch (function (error) {
        console.log(error.message);
    });

// axiosInstance.post('/oraclePleaseSignTx', {
//         id: '+31-6-233797929',
//     newId: '+31-6-231610011',
//     contract: "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
// })
//     .then(function (response) {
//         const PSBT = response.data;
//         psbt
// 		.signInput(0, aClientTx)
//     })
//     .catch(function (error) {
//         console.log(error.stack);
//     });





// assert.strictEqual(psbt.validateSignaturesOfAllInputs(), true);
	// psbt.finalizeAllInputs();

	// const tx = psbt.extractTransaction();

	// // build and broadcast to the Bitcoin RegTest network
	// await regtestUtils.broadcast(tx.toHex());
