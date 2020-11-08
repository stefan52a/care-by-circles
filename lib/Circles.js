const constants = require('../oracleServer/constants');
var mongoose = require('mongoose');
 
var CirclesSchema = mongoose.Schema({
    version: {type: String, default: constants.VERSION},
    instanceCircles: String,
    saltedHashedIdentification: String,
});
 
var Circles = mongoose.model('Circles', CirclesSchema);
 
module.exports = Circles;