const constants = require('../oracleServer/constants');
var mongoose = require('mongoose');
 
var CirclesOnClientSchema = mongoose.Schema({
    newUTXO: String, 
    version: {type: String, default: constants.VERSION},
    instanceCircles: String,
    pubkey: String,
    Id: String,
    salt: String,
    saltedHashedIdentification: String,
});
 
var CirclesOnClient = mongoose.model('CirclesOnClient', CirclesOnClientSchema);
 
module.exports = CirclesOnClient;