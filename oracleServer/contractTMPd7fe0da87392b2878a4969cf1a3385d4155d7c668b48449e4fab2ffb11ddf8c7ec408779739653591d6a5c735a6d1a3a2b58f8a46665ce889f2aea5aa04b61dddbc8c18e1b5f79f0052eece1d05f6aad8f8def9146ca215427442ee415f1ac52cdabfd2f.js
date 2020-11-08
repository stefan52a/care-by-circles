const ID = require('./identification');
const AsyncLock = require('async-lock');
const constants = require('./constants');
const key = "only 1 by 1";
// Specify timeout
module.exports.contract = (circleId, BobId, salt, callback) => {
    const dunbarsNumber = 150;
    ID.checkExists(BobId, salt, (result, err) => {
        if (err) callback('', err + ' Contract error: Not allowed (BobId does not exist)');
        const lock = new AsyncLock( { timeout: constants.LOCK_TIMEOUT, maxPending: constants.LOCK_MAX_PENDING });
        lock.acquire(key, function(done) { /// we donot want the concurrency problem that 2 or more pocesses check wheter total member of a Circle are > 150, whereby you possibly can exceed 150
            // async work
            ID.inThisGenesisCircle(circleId, BobId, salt, (Circle, nrOfMembers, fault) => {
                if (fault) callback('', fault + ' Contract error:  Not allowed (Id already in this Circleinstance) ' + circleId);
                else if (nrOfMembers >= dunbarsNumber) callback('', 'Contract error: Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids), it now has ' + nrOfMembers);
                else callback();
            });
        }, function(error, ret) {
            // timed out error will be returned here if lock not acquired in given time
            if (error) { callback('', error + ' Contract error:  time out error, lock not acquired in given time ' + ret); }
            // Handle too much pending error
            if (error) { return callback('', error + ' Contract error:  too much pending error, while acquiring lock in given time ' + ret); }
        });
       // lock released
    });
}
