const mongoose = require('mongoose')
const { Connection } = require('./lib/Connection.js')
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
    mongoose.connect('mongodb://localhost/carebycircles', { useNewUrlParser: true, useUnifiedTopology: true  });

    var connection = mongoose.connection;
    // connection.on('error', callback("Something went wrong: " + 'connection error:'));
    connection.once('open', function () {
        connection.db.collection("circles", function (err, Circles) {
            Circles.find({ "saltedHashedIdentification": id }).toArray(function (err, circles) {
                connection.close()
                if (err) { return callback(err, "NotFound") }
                if (circles.length == 0) return callback("No circles assigned to a user!")
                if (circles.length != 1) return callback("Something went wrong terribly: more circles assigned to a user!","more than 1 Circle")
                else return callback(circles[0].instanceCircles,"exactly 1 Circle");
            })
        });

    });


    // Connection.db.then(client => client.db('carebycircles').collection('Circles').find({ saltedHashedIdentification: id }).toArray(function (err, circles) {
    //     if (err) { callback(err, "NotFound") }
    //     if (circles.length != 1) callback(err, "Something went wrong terribly: more circles assigned to a user!")
    //     else callback(circles[0].instanceCircles);
    // }))

    // Connection.db.collection('Circles').find({saltedHashedIdentification: id})
    // .then(circles => 
    //     {   
    //         if (circles.length != 1) callback (err, "Something went wrong terribly: more circles assigned to a user!")
    //         else callback(circles[0].instanceCircles);
    //     })
    // .catch(err => callback (err, "NotFound"))
    // var connection = mongoose.connection;
    // connection.on('error', console.error.bind(console, 'connection error:'));
    // connection.once('open', function () {
    //     connection.db.collection("Circles", function(err, Circles){
    //         Circles.find({saltedHashedIdentification: id}).toArray(function(err, data){  //todo salt and hash the id
    //             if (err) callback (err, "NotFound");
    //             console.log(data); // it will print your collection data
    //             callback(data.instanceCircles);
    //         })
    //     });

    // });
}