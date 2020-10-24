var mongoose = require('mongoose');
 
var CirclesSchema = mongoose.Schema({
    instanceCircles: String,
    saltedHashedIdentification: String,
    txId: String,//should be given by user instead of stored
    pubKey: String, //should be given by user instead of stored
    addressToUnlock: String,   //can be derived
    contract: String,//should be given by user insteda of stored
    // UTXO: String, // Buffer,
    creationDate: { 
        type: Date,
        default: Date.now
    }
});
 
var Circles = mongoose.model('Circles', CirclesSchema);
 
module.exports = Circles;