const { requestSchema } = require('../models/joi');
const asyncHandler = require('../middleware/async');

module.exports = asyncHandler(async (req, res, next) => {
	try {
		await requestSchema.validateAsync(req.body);
		next();
	} catch (error) {
		error.statusCode = 400;
		next(error);
	}
});
