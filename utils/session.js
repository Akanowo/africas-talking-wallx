const Session = require('../models/session');
const asyncHandler = require('../middleware/async');
const logger = require('../configs/logger');

module.exports.createSession = async (req) => {
	console.log(req.body);
	const { sessionId, phoneNumber } = req.body;

	// find session
	const sessionExists = await Session.findOne({ sessionId, phoneNumber });

	if (sessionExists) {
		return;
	}

	// create session
	let newSession;
	try {
		newSession = await Session.create({ sessionId, phoneNumber });
	} catch (error) {
		logger.error(error);
		newSession = false;
	}

	return newSession;
};

module.exports.getSession = async (req) => {
	const { sessionId, phoneNumber } = req.body;

	// find Session
	let session;
	try {
		session = await Session.findOne({ sessionId, phoneNumber });
	} catch (error) {
		logger.error(error);
		session = false;
	}
	if (!session) {
		logger.error({ message: 'session does not exist' });
		session = false;
	}

	return session;
};

module.exports.updateSession = async (req, update) => {
	const { sessionId, phoneNumber } = req.body;

	// find Session and update
	let session;
	try {
		session = await Session.findOneAndUpdate(
			{ sessionId, phoneNumber },
			{ ...update },
			{ runValidators: true, new: true }
		);
	} catch (error) {
		logger.error(error);
		session = false;
	}

	if (!session) {
		logger.error({ message: 'session does not exist' });
		session = false;
	}

	return session;
};
