const ID = require('./identification');
module.exports.contract = (newId, callback) => {
    const dunbarsNumber = 150; // The maximum number of 'real' people the human brain can 'handle' in a Circle or tribe
    ID.checkExists(newId, (err) => {
        if (err) callback('', err + ' Not allowed (newId does not exist)');
        ID.hasGenesisCircle(newId, (err, circleId) => {
            if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId)
            else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId)
            else callback(PSBT); // FTM pretend id not to have a Circle
        });
    });
}
