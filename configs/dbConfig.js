const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
	let conn;
	try {
		conn = await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			// useFindAndModify: false,
			// useCreateIndex: true,
			useUnifiedTopology: true,
		});
	} catch (error) {
		logger.error(error);
		console.log('DB connection failed'.red.inverse);
		return;
	}

	logger.info(`MongoDB connected: ${conn.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;
