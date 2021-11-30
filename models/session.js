const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const sessionSchema = new Schema({
	sessionId: {
		type: String,
		required: [1, 'session id is required'],
	},
	phoneNumber: {
		type: String,
		required: [1, 'session phone number is required'],
	},
	accessToken: String,
	refreshToken: String,
	userID: String,
	identityLogo: String,
});

module.exports = model('Session', sessionSchema);
