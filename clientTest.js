axios = require ('axios')

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/api/',
    timeout: 1000,
    // headers: {'X-Custom-Header': 'foobar'}
  });

axiosInstance.post('/oraclePleaseSignTx', {
    newId: '+31-6-233397929',
    contract: "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
  })
  .then(function (response) {
    console.log(response);
    console.log(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
// assert.strictEqual(psbt.validateSignaturesOfAllInputs(), true);
	// psbt.finalizeAllInputs();

	// const tx = psbt.extractTransaction();

	// // build and broadcast to the Bitcoin RegTest network
	// await regtestUtils.broadcast(tx.toHex());
