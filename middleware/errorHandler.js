const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
	let error = { ...err };

	error.message = err.message;

	console.log(err.stack);
	console.log(err.name);

	if (err.name === 'CastError') {
		const message = `Resource with id ${error.value} not found`;
		error = new ErrorResponse(message, 404);
	}

	res.status(error.statusCode || 500).json({
		success: false,
		error: error.message || 'Server Error',
	});
};

module.exports = errorHandler;
