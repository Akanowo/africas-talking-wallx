const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
	const conn = await mongoose.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		// useFindAndModify: false,
		// useCreateIndex: true,
		useUnifiedTopology: true,
	});

	logger.info(`MongoDB connected: ${conn.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;
