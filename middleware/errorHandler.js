const errorHandler = (err, req, res, next) => {
	let error = { ...err };

	error.message = err.message;

	console.log(err.stack);
	console.log(err.name);

	res.setHeader('Content-Type', 'text/plain');
	res.status(error.statusCode || 500).send(error.message || 'An error occured');
};

module.exports = errorHandler;
