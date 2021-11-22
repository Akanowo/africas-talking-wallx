const express = require('express');
require('dotenv').config({ path: './configs/.env' });
require('colors');
const Menu = require('./menu');
const utils = require('./utils');
const asyncHandler = require('./middleware/async');
const errorHandler = require('./middleware/errorHandler');
const validator = require('./middleware/validator');
const dbConfig = require('./configs/dbConfig');
const checkIsLoggedIn = require('./middleware/checkLoggedIn');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

dbConfig();

const PORT = process.env.PORT || 3000;

app.post(
	'/ussd',
	validator,
	checkIsLoggedIn,
	asyncHandler(
		/**
		 *
		 * @param {{body: {
		 * sessionId: string,
		 * serviceCode: string,
		 * phoneNumber: string,
		 * text: string
		 * }}} req
		 * @param {*} res
		 */
		async (req, res) => {
			let { sessionId, serviceCode, phoneNumber, text } = req.body;

			const { authentication } = req;

			const menu = new Menu(phoneNumber);
			text = menu.middleware(text);

			let response = '';

			console.log('text: ', text);

			if (text === '' && authentication) {
				menu.authenticatedMenu(res);
			} else if (text === '' && !authentication) {
				// This is the first request.
				// handle login & registration
				response = `CON Welcome to Wallx.
		1. Register
		2. Login
		`;
				utils.sendResponse(res, response);
			} else if (!authentication && text !== '') {
				// text is not empty and user is not logged in
				const textSplit = text.split('*');
				switch (textSplit[0]) {
					case '1':
						menu.registerMenu(res);
						break;
					case '2':
						menu.loginMenu(textSplit, req.body, res);
						break;
					default:
						utils.sendResponse(res, `END Invalid Choice. Please try again`);
				}
			} else {
				// user is authenticated and string is not empty
				menu.authenticatedMenu(res);
			}
		}
	)
);

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`App started on port ${PORT}`);
});
