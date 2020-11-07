const ID = require('./identification');
module.exports.contract = (circleId, BobId, salt, callback) => {
    const dunbarsNumber = 150; 
    ID.checkExists(BobId, salt, (result, err) => {
        if (err) callback('', err + ' Contract error: Not allowed (BobId does not exist)');
        ID.inThisGenesisCircle(circleId, BobId, salt, (Circle, nrOfMembers,  err) => {
            if (err) callback('', err + ' Contract error:  Not allowed (BobId already in this Circleinstance) ' + circleId);
            else if (nrOfMembers >= dunbarsNumber) callback('', err + ' Contract error: Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids), it now has ' + nrOfMembers);
            else callback();
        });
    });
}
