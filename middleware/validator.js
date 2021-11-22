const { requestSchema } = require('../models/joi');
const asyncHandler = require('../middleware/async');

module.exports = asyncHandler(async (req, res, next) => {
	await requestSchema.validateAsync(req.body);
	next();
});
