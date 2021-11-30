const uniqid = require('uniqid');
const logger = require('./configs/logger');
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

	walletMenu(req, res, textArray) {
		const count = textArray.length;
		if (count === 1) {
			const text = `CON Choose an option
			1. Transfer to Wallx
			2. Transfer to Bank
			3. Buy Airtime
			4. Check Wallet Balance
			98. Go Back
			99. Go To Main Menu`;
			utils.sendResponse(res, text);
		} else {
			if (textArray[1] === '1') {
				this.collectTransferToWallxFields(req, res, textArray);
			} else if (textArray[1] === '2') {
				utils.sendResponse(res, `END To be implemented`);
			} else if (textArray[1] === '3') {
				this.collectBuyAirtimeFields(req, res, textArray);
			} else if (textArray[1] === '4') {
				this.checkWalletBalance(req, res, textArray);
			} else {
				utils.sendResponse(res, `END Invalid Choice`);
				utils.terminateSession(req.body.sessionId);
			}
		}
	}

	async collectTransferToWallxFields(req, res, textArray) {
		const count = textArray.length;
		if (count === 2) {
			utils.sendResponse(res, `CON Enter reciever wallet id`);
		}

		if (count === 3) {
			utils.sendResponse(res, `CON Enter amount`);
		}

		if (count === 4) {
			utils.sendResponse(res, `CON Enter wallet pin`);
		}

		if (count === 5) {
			const data = {
				userID: '128',
				recieverwalletId: textArray[2],
				amount: textArray[3],
				walletpin: textArray[4],
				description: '',
				transactiontype: 'wallet',
				commission: '50',
				currency: 'NGN',
			};

			const response = await api.sendPostRequest(
				data,
				'/customertransaction/',
				req.authentication
			);
			logger.info(response);
			if (response.status) {
				utils.sendResponse(res, `END ${response.message}`);
				utils.terminateSession(req.body.sessionId);
				// TODO: send sms
			} else {
				utils.sendResponse(
					res,
					`END ${response.message || response.detail || 'An error occured'}`
				);
				utils.terminateSession(req.body.sessionId);
			}
		}
	}

	async collectBuyAirtimeFields(req, res, textArray) {
		const count = textArray.length;
		if (count === 2) {
			utils.sendResponse(res, `CON Enter phone number, eg 070xxxx`);
		}

		if (count === 3) {
			utils.sendResponse(res, `CON Enter amount`);
		}

		if (count === 4) {
			const data = {
				userID: req.authentication.userID,
				country: 'NG',
				customer: `234${textArray[2]}`,
				amount: Number.parseInt(textArray[3]),
				recurrence: 'ONCE',
				biller_name: 'AIRTIME',
				reference: 'rave-16141368372',
				userID: 1,
				method: 'wallet',
			};

			const response = await api.sendPostRequest(
				data,
				'/purchasebill/',
				req.authentication
			);
			if (response.status) {
				utils.sendResponse(res, `END ${response.message}`);
				logger.info(response);
				utils.terminateSession(req.body.sessionId);
				// TODO: send sms
			} else {
				utils.sendResponse(
					res,
					`END ${response.message || response.detail || 'An error occured'}`
				);
				logger.info(response);
				utils.terminateSession(req.body.sessionId);
			}
		}
	}

	async checkWalletBalance(req, res, textArray) {
		const response = await api.sendGetRequest(
			`/customerwalletbalance/?userid=${req.authentication.userID}`,
			req.authentication
		);
		console.log(response);
		if (!response.status) {
			utils.sendResponse(
				res,
				`END ${response.detail || response.message || 'An error occured'}`
			);
			utils.terminateSession(req.body.sessionId);
			return;
		}

		utils.sendResponse(
			res,
			`END Your wallet balance is
		NGN: ${response.data.NGN}
		USD: ${response.data.USD}`
		);
		utils.terminateSession(req.body.sessionId);
	}

	async thriftSavingsMenu(req, res, textArray) {
		const count = textArray.length;
		if (count === 1) {
			utils.sendResponse(res, `CON Enter Customer ID`);
		}

		if (count === 2) {
			utils.sendResponse(
				res,
				`CON Select one
			1. Check Your Profile Information
			2. Check Saving Status`
			);
		}

		if (count === 3) {
			const response = await api.sendGetRequest(
				`/agentcustomerdetails/?walletID=${textArray[1]}`
			);
			console.log(response);
			if (response.status) {
				let smsData;
				if (textArray[2] === '1') {
					smsData = {
						text: `
						Customer ID: ${response.data.userid}
						Name: ${response.data.fullname}
						Description: ${response.data.description}
						Location: ${response.data.location}
						Start Date: ${response.data.startdate}
						Next of Kin: ${response.data.nextofkin}
						Next of Kin's Phone Number: ${response.data.nextofkinphone}
						Amount: ${response.data.amount}
						Payment Frequency: ${response.data.frequency}`,
					};
				}
				if (textArray[2] === '2') {
					smsData = {
						text: `
						Total Received: ${response.data.totalrecieved}
						Total Disbursed: ${response.data.totaldisbursed}
						Available Balance: ${response.data.totalrecieved - response.data.totaldisbursed}
						`,
					};
				}
				console.log(smsData);
				utils.sendResponse(res, `END ${smsData.text}`);
				utils.terminateSession(req.body.sessionId);
				// TODO: Send sms to user
				return;
			}

			utils.sendResponse(
				res,
				`END ${response.detail || response.message || 'An error occured'}`
			);
			utils.terminateSession(req.body.sessionId);
		}
	}

	async raiseAFundMenu(req, res, textArray) {
		const count = textArray.length;
		let text = '';

		if (count === 1) {
			text = `CON Enter Campaign id`;
			utils.sendResponse(res, text);
		}

		if (count === 2) {
			// get campaign details
			const apiResult = await api.sendGetRequest(
				`/crowdcontributionmodule/?id=${textArray[1]}`,
				req.authentication
			);
			console.log(apiResult);
			if (!apiResult.status) {
				utils.sendResponse(res, `END ${apiResult.detail}`);
				utils.terminateSession(req.body.sessionId);
				return;
			}
			const campaign = apiResult.data[0];
			text = `CON Group Name: ${campaign.groupname.toUpperCase()}
			1. Donate
			2. Check contribution status`;
			utils.sendResponse(res, text);
		}

		if (count === 3) {
			if (textArray[2] === '1') {
				// donate
				utils.sendResponse(res, `CON Enter amount`);
			} else if (textArray[2] === '2') {
				// contribution status
				const apiResult = await api.sendGetRequest(
					`/crowdcontributionmodule/?id=${textArray[1]}`,
					req.authentication
				);
				console.log(apiResult);
				if (!apiResult.status) {
					utils.sendResponse(res, `END ${apiResult.detail}`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				const campaign = apiResult.data[0];
				text = `END Group Name: ${campaign.groupname.toUpperCase()}
				Creator: ${campaign.creatorname}
				Description: ${campaign.groupdecription}
				Start date: ${campaign.startdate}
				End date: ${campaign.enddate}
				Amount per person: ${campaign.amountperperson}
				Total Contributions: ${campaign.totalcontribution}`;
				utils.sendResponse(res, text);
				utils.terminateSession(req.body.sessionId);
			} else {
				// invalid choice
				utils.terminateSession(req.body.sessionId);
				utils.sendResponse(res, `END Invalid choice`);
			}
		}

		if (count === 4) {
			const apiResult = await api.sendGetRequest(
				`/crowdcontributionmodule/?id=${textArray[1]}`,
				req.authentication
			);
			console.log(apiResult);
			if (!apiResult.status) {
				utils.sendResponse(res, `END ${apiResult.detail}`);
				utils.terminateSession(req.body.sessionId);
				return;
			}
			const campaign = apiResult.data[0];
			text = `CON Group Name: ${campaign.groupname.toUpperCase()}
			Amount: ${textArray[3]}
			
			Enter wallet pin`;
			utils.sendResponse(res, text);
		}

		if (count === 5) {
			// send request
			const data = {
				groupID: textArray[1],
				memberID: 1,
				walletpin: textArray[4],
				amount: Number.parseInt(textArray[2]),
				transactionreference: uniqid(),
				transactiondate: `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`,
				paymentmethod: 'wallet',
				currency: 'NGN',
			};

			const response = await api.sendPostRequest(
				data,
				'/contributiontransaction/',
				req.authentication
			);
			if (!response.status) {
				utils.sendResponse(
					res,
					`END ${response.detail || response.message || 'An error occured'}`
				);
				utils.terminateSession(req.body.sessionId);
				return;
			}

			utils.sendResponse(res, `END Transaction successful`);
			utils.terminateSession(req.body.sessionId);
		}
	}

	async reportIssueMeu(req, res, textArray) {
		const count = textArray.length;
		let text = '';
		const options = {
			1: 'wallet',
			2: 'fraud',
			3: 'contribution',
			4: 'speakToRepresentative',
		};

		if (count === 1) {
			text = `CON Select a category
			1 Wallets( Transactions, Bank, Airtime)
			2 Report a Fraud
			3 Contribution Issues
			4 Speak to our representative
			98 Go Back`;
			utils.sendResponse(res, text);
		}

		if (count === 2) {
			const choice = textArray[1];
			if (!options[choice]) {
				utils.terminateSession(req.body.sessionId);
				utils.sendResponse(res, `END Invalid choice`);
				return;
			}

			utils.sendResponse(res, `CON Enter complaint`);
		}

		if (count == 3) {
			const data = {
				userID: req.authentication.userID,
				reviewtype: options[textArray[1]],
				review: textArray[2],
			};

			const response = await api.sendPostRequest(
				data,
				'/customercomplaint/',
				req.authentication
			);

			if (response.status) {
				utils.sendResponse(res, `END Complaint made successfully`);
				utils.terminateSession(req.body.sessionId);
				return;
			}

			utils.terminateSession(req.body.sessionId);
			utils.sendResponse(
				res,
				`END ${response.detail || response.message || `An error occured`}`
			);
		}
	}

	async registerMenu(req, res, textArray) {
		const count = textArray.length;
		const options = { 1: 'BVN', 2: 'NIN' };
		let text = '';

		if (count === 1) {
			text = `CON Register with
			1. ${options['1']}
			2. ${options['2']}
			99. Go To Main Menu`;

			utils.sendResponse(res, text);
		}

		if (count === 2) {
			const choice = textArray[1];
			text = `CON Enter ${options[choice]}`;
			if (!options[choice]) {
				utils.sendResponse(res, `END Invalid choice`);
				utils.terminateSession(req.body.sessionId);
				return;
			}

			utils.sendResponse(res, text);
		}

		if (count === 3) {
			text = `CON Enter First Name`;
			utils.sendResponse(res, text);
		}
		if (count === 4) {
			text = `CON Enter Last Name`;
			utils.sendResponse(res, text);
		}
		if (count === 5) {
			text = `CON Enter Date of Birth (dd-mm-yyyy)`;
			utils.sendResponse(res, text);
		}
		if (count === 6) {
			text = `CON Enter phone number (080xxxxxx)`;
			utils.sendResponse(res, text);
		}

		if (count === 7) {
			// verify bvn
			// TODO: Change static data to user's data in production
			const verificationData = {
				firstname: 'John',
				lastname: 'Doe',
				phone: '080000000000',
				dob: options[textArray[1]] === 'BVN' ? '04-04-1944' : '09-04-1997',
			};
			const response = await api.verifyDetails(
				options[textArray[1]],
				'10000000001',
				// textArray[2],
				verificationData
			);
			console.log(response);
			if (response.status === 'success') {
				// validate bvn response against entered details
				if (
					verificationData.firstname.toLowerCase() !==
						response.data.firstname.toLowerCase() ||
					verificationData.lastname.toLowerCase() !==
						response.data.lastname.toLowerCase()
				) {
					utils.terminateSession(req.body.sessionId);
					utils.sendResponse(
						res,
						`END Fistname or lastname does not match bvn data`
					);
					return;
				}
				if (
					verificationData.dob.toLowerCase() !==
						response.data.birthdate.toLowerCase() ||
					verificationData.phone.toLowerCase() !==
						response.data.phone.toLowerCase()
				) {
					utils.terminateSession(req.body.sessionId);
					utils.sendResponse(
						res,
						`END Date of Birth or phone number does not match bvn data`
					);
					return;
				}

				// update user details with picture
				let userUpdate;
				try {
					userUpdate = await Session.findOneAndUpdate(
						{
							sessionId: req.body.sessionId,
							phoneNumber: req.body.phoneNumber,
						},
						{ identityLogo: response.data.photo },
						{ runValidators: true }
					);
				} catch (error) {
					logger.info(error.stack);
					utils.sendResponse(res, `END An error occured`);
					utils.terminateSession(req.body.sessionId);
					return;
				}

				// collect password and wallet pin
				text = `CON Enter your email address`;
				utils.sendResponse(res, text);
			} else {
				utils.terminateSession(req.body.sessionId);
				utils.sendResponse(res, `END Incorrect ${options[textArray[1]]}`);
			}
		}

		if (count === 8) {
			utils.sendResponse(res, `CON Create your password`);
			return;
		}

		if (count === 9) {
			utils.sendResponse(res, `CON Create your wallet pin`);
			return;
		}

		if (count === 10) {
			// send otp
			const response = await api.sendGetRequest(
				`/getotp?phone=${textArray[6]}`,
				req.authentication
			);
			if (response.status) {
				utils.sendResponse(res, `CON Enter the OTP sent to ${textArray[6]}`);
				return;
			}

			utils.terminateSession(req.body.sessionId);
			utils.sendResponse(
				res,
				`END ${response.detail || response.message || `An error occured`}`
			);
		}

		if (count === 11) {
			// fetch user details
			const userDetails = await Session.findOne({
				sessionId: req.body.sessionId,
				phoneNumber: req.body.phoneNumber,
			}).select('identityLogo');

			console.log('fetched user details', userDetails);

			// split dob
			const splitDob = textArray[5].split('-');
			const swapDob = `${splitDob[2]}-${splitDob[1]}-${splitDob[0]}`;
			console.log(swapDob);
			const data = {
				businessname: '',
				userpassword: `${textArray[8]}`,
				emailaddress: `${textArray[7]}`,
				phonenumber: `${textArray[6]}`,
				accountname: `${textArray[3]} ${textArray[4]}`,
				role: 'customer',
				wallexpin: `${textArray[9]}`,
				dob: swapDob,
				currency: 'NGN',
				bvn: options[textArray[1]] === 'BVN' ? textArray[2] : '',
				nin: options[textArray[1]] === 'NIN' ? textArray[2] : '',
				otp: `${textArray[10]}`,
				identitylogo: userDetails.identityLogo,
			};

			const response = await api.sendPostRequest(
				data,
				'/merchant/',
				req.authentication
			);

			console.log(response);

			if (response.status) {
				utils.sendResponse(
					res,
					`END Complaint made successfuly. You will be contacted within 24 hours`
				);
				logger.info(response);
				utils.terminateSession(req.body.sessionId);
				// TODO: send sms
			} else {
				utils.sendResponse(
					res,
					`END ${response.message || response.detail || 'An error occured'}`
				);
				logger.info(response);
				utils.terminateSession(req.body.sessionId);
			}

			console.log(data);
			utils.sendResponse(res, `END To be implemented`);
			utils.terminateSession(req.body.sessionId);
		}
	}

	/**
	 *
	 * @param {Array<string>} textArray
	 * @returns
	 */
	async loginMenu(textArray, req, res) {
		const count = textArray.length;
		const { sessionId, phoneNumber } = req.body;

		if (count === 1) {
			utils.sendResponse(res, `CON Enter your phone number`);
			return;
		} else if (count === 2) {
			utils.sendResponse(res, `CON Enter your password`);
			return;
		} else if (count === 3) {
			const data = {
				username: textArray[1],
				password: textArray[2],
			};
			const endpoint = `/merchant/?username=${data.username}&password=${data.password}&role=customer`;

			const response = await api.sendGetRequest(endpoint, req.authentication);

			console.log(response);

			if (response.status) {
				// update session
				const updatedSession = await Session.findOneAndUpdate(
					{ sessionId, phoneNumber },
					{
						accessToken: response.token,
						refreshToken: response.refresh,
						userID: response.data.id,
					},
					{ runValidators: true, new: true }
				);

				if (updatedSession) {
					utils.sendResponse(res, `CON 99. Go to main menu`);
					return;
				} else {
					utils.sendResponse(res, `END An error occured! Please try again`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
			}

			utils.sendResponse(
				res,
				`END ${response.detail || response.message || `An error occured`}`
			);
			utils.terminateSession(req.body.sessionId);
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
		// get index of go to main menu string
		while (splitText.find((x) => x === utils.GO_BACK)) {
			const choiceIndex = splitText.findIndex((x) => x === utils.GO_BACK);
			splitText.splice(choiceIndex - 1, choiceIndex + 1);
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
			const choiceIndex = splitText.findIndex(
				(x) => x === utils.GO_TO_MAIN_MENU
			);
			splitText.splice(0, choiceIndex + 1);
		}
		return splitText.join('*');
	}
}

module.exports = Menu;
