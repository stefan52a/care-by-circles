const mongoose = require('mongoose')
// const { Connection } = require('./lib/Connection.js')
const Circles = require('./lib/Circles');
// Checkexists does this by returning a message with a random Hash256 (H256), towards the telephone number of id and 
// let that user id send H256 back to the server by posting endpoint validateMyId(Id, H256), which returns:
// 	Not allowed (H256 does not belong to the id)
// Or 	Succeeded
module.exports.checkExists = (id, callback) => {
    callback(); //for the moment always exists //identity determnined by his telephone number
}

module.exports.hasGenesisCircle = (id, callback) => {
    // if (hasCircle(id))
    // {
    //     callback("abracadabraCirkel");
    // }
    // else
    // {
    callback("abracadabraCirkel", "fout");// FTM pretend id not to have a Circle
    // }
}

module.exports.noGenesisCircle = (id, callback) => {
    // Connect to Mongoose
    CirclesCollection.find({ "saltedHashedIdentification": id }).toArray(function (err, circles) {
        if (err) { return callback(err, "NotFound") }
        if (circles.length == 0) return callback("No circles assigned to a user!")
        if (circles.length != 1) return callback("Something went wrong terribly: more circles assigned to a user!", "more than 1 Circle")
        else return callback(circles[0].instanceCircles, "exactly 1 Circle already exists");
    })
}
