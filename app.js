const express = require('express');
const Menu = require('./menu');
const utils = require('./utils');
const asyncHandler = require('./middleware/async');
const errorHandler = require('./middleware/errorHandler');
const validator = require('./middleware/validator');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

app.post(
	'/ussd',
	validator,
	asyncHandler(async (req, res) => {
		let { sessionId, serviceCode, phoneNumber, text } = req.body;

		let isLoggedIn = false;
		let token = '';

		const menu = new Menu(phoneNumber);
		text = menu.middleware(text);

		let response = '';

		console.log('text: ', text);

		if (text === '') {
			// This is the first request. Note how we start the response with CON
			// handle login
			response = `CON Welcome to Wallx.
		1. Register
		2. Login
		`;
			utils.sendResponse(res, response);
		} else if (!isLoggedIn) {
			// Business logic
			const textSplit = text.split('*');
			switch (textSplit[0]) {
				case '1':
					menu.registerMenu(res);
					break;
				case '2':
					menu.loginMenu(textSplit, res);
					break;
				default:
					utils.sendResponse(res, `END Invalid Choice. Please try again`);
			}
		}
	})
);

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`App started on port ${PORT}`);
});
