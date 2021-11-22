const utils = require('./utils');

class Menu {
	constructor(phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	registerMenu(res) {
		utils.sendResponse(res, `END To be implemented`);
	}

	/**
	 *
	 * @param {Array<string>} textArray
	 * @returns
	 */
	loginMenu(textArray, res) {
		console.log(textArray);
		const count = textArray.length;

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
			console.log('Login Data: ', data);
		}
		utils.sendResponse(res, `END Login successful`);
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
			console.log('Hello');
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
		while (splitText.find((x) => x === utils.GO_TO_MAIN_MENU)) {
			const mainMenuStringIndex = splitText.findIndex(
				(x) => x === utils.GO_TO_MAIN_MENU
			);
			// remove from array and reassign into array
			splitText = splitText.slice(0, mainMenuStringIndex);
		}
		return splitText.join('*');
	}
}

module.exports = Menu;
