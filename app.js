const express = require('express');
require('dotenv').config({ path: './configs/.env' });
require('colors');
const Menu = require('./menu');
const utils = require('./utils');
const asyncHandler = require('./middleware/async');
const errorHandler = require('./middleware/errorHandler');
const validator = require('./middleware/validator');
const dbConfig = require('./configs/dbConfig');
const logger = require('./configs/logger');
const helmet = require('helmet');
const { createSession } = require('./utils/session');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV.trim() === 'production') {
	app.use(helmet());
}

dbConfig();

const PORT = process.env.PORT || 3000;

app.post(
	'/ussd',
	validator,
	//checkIsLoggedIn,
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
			const createdSession = await createSession(req);
			let { sessionId, serviceCode, phoneNumber, text } = req.body;

			const menu = new Menu(phoneNumber);
			text = menu.middleware(text);

			let response = '';

			if (text === '') {
				menu.authenticatedMenu(res);
			} else {
				// user is authenticated and string is not empty
				const textSplit = text.split('*');
				switch (textSplit[0]) {
					case '1':
						menu.walletMenu(req, res, textSplit);
						break;
					case '2':
						menu.thriftSavingsMenu(req, res, textSplit);
						break;
					case '3':
						menu.raiseAFundMenu(req, res, textSplit);
						break;
					case '4':
						menu.reportIssueMeu(req, res, textSplit);
						break;
					default:
						utils.sendResponse(res, `END Invalid Choice. Please try again`);
						utils.terminateSession(sessionId);
				}
			}
		}
	)
);

app.use(errorHandler);

app.listen(PORT, () => {
	logger.info(`App started on port ${PORT}`);
});
