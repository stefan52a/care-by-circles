var mongoose = require('mongoose');
 
var CirclesSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    instanceCircles: String,
    saltedHashedIdentification: String,
    contract: String,
    UTXO: String, // Buffer,
    creationDate: { 
        type: Date,
        default: Date.now
    }
});
 
var Circles = mongoose.model('Circles', CirclesSchema);
 
module.exports = Circles;