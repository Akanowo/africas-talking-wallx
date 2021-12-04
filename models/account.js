const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const accountSchema = new Schema({
	sessionId: String,
	account_number: String,
	account_code: String,
	account_name: String,
});

module.exports = model('Account', accountSchema);
