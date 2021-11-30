const logger = require('../configs/logger');

const errorHandler = (err, req, res, next) => {
	let error = { ...err };

	error.message = err.message;

	logger.error(error.stack);

	res.setHeader('Content-Type', 'text/plain');
	res
		.status(error.statusCode || 500)
		.send(error.statusCode ? error.message : 'END An error occured');
};

module.exports = errorHandler;
