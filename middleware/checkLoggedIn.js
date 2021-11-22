const Session = require('../models/session');
const asyncHandler = require('./async');

module.exports = asyncHandler(async (req, res, next) => {
	const { sessionId, phoneNumber } = req.body;

	// find user session in db
	const session = await Session.findOne({ sessionId, phoneNumber });

	if (!session) {
		// create session
		const newSession = await Session.create({ sessionId, phoneNumber });
		if (newSession) {
			req.authentication = false;
			return next();
		}
	}

	if (session && session.accessToken && session.refreshToken) {
		req.authentication = {
			accessToken: session.accessToken,
			refreshToken: session.refreshToken,
		};
		return next();
	}

	req.authentication = false;
	next();
});
