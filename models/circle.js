const mongoose = require('mongoose');

// Circle Schema
const cicrlesSchema = mongoose.Schema({
	circleInstance:{
		type: String,
		required: true
	},
	identity:{
		type: String,
		required: true
	},
	contract:{
		type: String,
		required: true
	},
	UTXO:{
		type: String,
		required: true
	},
	create_date:{
		type: Date,
		default: Date.now
	}
});

const Circles = module.exports = mongoose.model('Circles', circlesSchema);

// Get Circles
module.exports.getCircles = (callback, limit) => {
	Circle.find(callback).limit(limit);
}

// Get Circle
module.exports.getCircleById = (id, callback) => {
	Circle.findById(id, callback);
}

// Add Circle
module.exports.addCircle = (Circle, callback) => {
	Circle.create(Circle, callback);
}

// Update Circle
module.exports.updateCircle = (id, Circle, options, callback) => {
	var query = {_id: id};
	var update = {
		circleInstance: Circle.circleInstance,
		identity: Circle.identity,
		contract: Circle.contract,
		UTXO: Circle.UTXO
	}
	Circle.findOneAndUpdate(query, update, options, callback);
}

// Delete Circle
module.exports.removeCircle = (id, callback) => {
	var query = {_id: id};
	Circle.remove(query, callback);
}
