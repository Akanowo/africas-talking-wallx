const Session = require('./models/session');
const utils = require('./utils');
const API = require('./utils/api');

const api = new API();

class Menu {
	constructor(phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	authenticatedMenu(res) {
		const text = `CON Choose an option
		1. Wallet
		2. Thrift Savings
		3. Raise a fund
		4. Report an issue`;

		utils.sendResponse(res, text);
	}

	walletMenu(res) {
		utils.sendResponse(res, `END To be implemented`);
	}

	thriftSavingsMenu(res) {
		utils.sendResponse(res, `END To be implemented`);
	}

	raiseAFundMenu(res) {
		utils.sendResponse(res, `END To be implemented`);
	}

	reportIssueMeu(res) {
		utils.sendResponse(res, `END To be implemented`);
	}

	registerMenu(res) {
		utils.sendResponse(res, `END To be implemented`);
	}

	/**
	 *
	 * @param {Array<string>} textArray
	 * @returns
	 */
	async loginMenu(textArray, reqBody, res) {
		const count = textArray.length;
		const { sessionId, phoneNumber } = reqBody;

		if (count === 1) {
			utils.sendResponse(res, `CON Enter your username`);
			return;
		} else if (count === 2) {
			utils.sendResponse(res, `CON Enter your password`);
			return;
		} else if (count === 3) {
			const data = {
				username: textArray[1],
				password: textArray[2],
			};

			const response = await api.login(data);

			if (response.access && response.refresh) {
				// update session
				const updatedSession = await Session.findOneAndUpdate(
					{ sessionId, phoneNumber },
					{ accessToken: response.access, refreshToken: response.refresh },
					{ runValidators: true, new: true }
				);

				if (updatedSession) {
					utils.sendResponse(res, `CON 99. Go to main menu`);
					return;
				} else {
					utils.sendResponse(res, `END An error occured! Please try again`);
				}
			}

			utils.sendResponse(res, `END ${response.detail}`);
		}
	}

	middleware(text) {
		return this.goBack(this.goToMainMenu(text));
	}

	/**
	 *
	 * @param {string} text
	 */
	goBack(text) {
		// split text
		let splitText = text.split('*');
		while (splitText.find((x) => x === utils.GO_BACK)) {
			// get index of go back string
			const goBackTextIndex = splitText.findIndex((x) => x === utils.GO_BACK);

			// remove from array
			splitText.splice(goBackTextIndex, 1);
		}

		return splitText.join('*');
	}

	/**
	 *
	 * @param {string} text
	 */
	goToMainMenu(text) {
		// split text
		let splitText = text.split('*');

		// get index of go to main menu string
		for (let choice of splitText) {
			if (choice === utils.GO_TO_MAIN_MENU) {
				const choiceIndex = splitText.findIndex((x) => x === choice);
				splitText.splice(0, choiceIndex + 1);
			}
		}
		return splitText.join('*');
	}
}

module.exports = Menu;
