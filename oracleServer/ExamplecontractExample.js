const ID = require('./identification');
module.exports.contract = (BobId, salt, callback) => {
    const dunbarsNumber = 150; 
    ID.checkExists(BobId, salt, (result, err) => {
        if (err) callback('', err + ' Contract error: Not allowed (BobId does not exist)');
        ID.inThisGenesisCircle(BobId, salt, (circleId, err) => {
            if (err) callback('', err + ' Contract error:  Not allowed (BobId already in this Circleinstance) ' + circleId);
            else if (circleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Contract error: Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId);
            else callback();
        });
    });
}
