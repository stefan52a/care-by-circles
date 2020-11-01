const constants = require('../constants');
var mongoose = require('mongoose');
 
var CirclesSchema = mongoose.Schema({
    version: {type: String, default: constants.VERSION},
    instanceCircles: String,
    saltedHashedIdentification: String,
    psbt: String,//should be given by user instead of stored
    txId: String,//should be given by user instead of stored
    pubKey: String, //should be given by user instead of stored
    addressToUnlock: String,   //can be derived
    contract: String,//should be given by user insteda of stored
    // UTXO: String, // Buffer,
    redeem: String,
    payment: String,
    creationDate: { 
        type: Date,
        default: Date.now
    }
});
 
var Circles = mongoose.model('Circles', CirclesSchema);
 
module.exports = Circles;