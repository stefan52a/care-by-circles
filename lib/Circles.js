var mongoose = require('mongoose');
 
var CirclesSchema = mongoose.Schema({
    instanceCircles: String,
    saltedHashedIdentification: String,
    txId: String,
    pubKey: String,
    contract: String,
    UTXO: String, // Buffer,
    creationDate: { 
        type: Date,
        default: Date.now
    }
});
 
var Circles = mongoose.model('Circles', CirclesSchema);
 
module.exports = Circles;