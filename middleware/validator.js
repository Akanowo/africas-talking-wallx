const { requestSchema } = require('../models/joi');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const utils = require('../utils');

module.exports = asyncHandler(async (req, res, next) => {
	// validate text
	const textSplit = req.body.text.split('*');

	for (let string of textSplit) {
		if (textSplit.length > 1 && string === '') {
			const error = new ErrorResponse('END Please enter a value', 400);
			utils.terminateSession(req.body.sessionId);
			return next(error);
		}
	}

	try {
		await requestSchema.validateAsync(req.body);
		next();
	} catch (error) {
		error.statusCode = 400;
		next(error);
	}
});
