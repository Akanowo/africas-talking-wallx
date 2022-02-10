const uniqid = require('uniqid');
const logger = require('./configs/logger');
const Account = require('./models/account');
const Session = require('./models/session');
const utils = require('./utils');
const API = require('./utils/api');
const SMS = require('./sms');
const { getSession, createSession, updateSession } = require('./utils/session');

const api = new API();

class Menu {
	constructor(phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	authenticatedMenu(res) {
		const text = `CON Welcome to Wallx Africa. Choose an option\n\n1. Wallet\n2. Thrift Savings\n3. Raise A Fund\n4. Report An Issue`;

		utils.sendResponse(res, text);
	}

	async walletMenu(req, res, textArray) {
		const count = textArray.length;
		if (count === 1) {
			const text = `CON Choose an option\n1. Create a Wallx Account\n2. Transfer to Wallx\n3. Transfer to Bank\n4. Buy Airtime\n5. Check Wallet Balance\n98. Go Back\n99. Go To Main Menu`;
			utils.sendResponse(res, text);
		} else {
			if (textArray[1] === '1') {
				// register the user

				textArray.splice(0, 1);
				await this.registerMenu(req, res, textArray);
				return;
			}

			// login the user
			await this.loginMenu(textArray, req, res);
			// get session details
			if (count >= 4) {
				const session = await getSession(req);
				req.authentication = {
					accessToken: session.accessToken,
					refreshToken: session.refreshToken,
					userID: session.userID,
					loggedInPhone: session.loggedInPhone,
				};
				if (!session) {
					utils.sendResponse(res, `END An error occured`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				if (textArray[1] === '2') {
					this.collectTransferToWallxFields(req, res, textArray);
				} else if (textArray[1] === '3') {
					this.collectTransferToBankFields(req, res, textArray);
				} else if (textArray[1] === '4') {
					this.collectBuyAirtimeFields(req, res, textArray);
				} else if (textArray[1] === '5') {
					this.checkWalletBalance(req, res, textArray);
				} else {
					utils.sendResponse(res, `END Invalid Choice`);
					utils.terminateSession(req.body.sessionId);
				}
			}
		}
	}

	async collectTransferToWallxFields(req, res, textArray) {
		const count = textArray.length;
		if (count === 4) {
			utils.sendResponse(res, `CON Enter reciever wallet id`);
		}

		if (count === 5) {
			utils.sendResponse(res, `CON Enter amount`);
		}

		if (count === 6) {
			utils.sendResponse(res, `CON Enter wallet pin`);
		}

		if (count === 7) {
			const data = {
				userID: req.authentication.userID,
				recieverwalletId: textArray[4],
				amount: textArray[5],
				walletpin: textArray[6],
				description: '',
				transactiontype: 'wallet',
				commission: 0,
				currency: 'NGN',
			};

			console.log('reqest data:', data);

			const response = await api.sendPostRequest(
				data,
				'/customertransaction/',
				req.authentication
			);
			logger.info(response);
			if (response.status) {
				utils.sendResponse(res, `END ${response.message}`);
				utils.terminateSession(req.body.sessionId);

				// Get wallet balance
				const walletBalance = await api.sendGetRequest(
					`/customerwalletbalance/?userid=${req.authentication.userID}`,
					req.authentication
				);
				if (walletBalance.status) {
					// send sms
					const sms = new SMS();
					const smsText = `Wallx Debit\nNGN${
						textArray[5]
					}\nDesc: WALLET TO WALLET TRANSFER\nBalance:\nNGN: ${new Intl.NumberFormat(
						'en-NG',
						{ currency: 'NGN', style: 'currency' }
					).format(walletBalance.data.NGN)}\nUSD: ${new Intl.NumberFormat(
						'en-US',
						{ currency: 'USD', style: 'currency' }
					).format(walletBalance.data.USD)}`;
					const smsResponse = await sms.send(
						req.authentication.loggedInPhone,
						smsText
					);
					if (smsResponse) {
						logger.info(smsResponse);
						console.log('message sent: ', smsResponse);
					} else {
						logger.error({
							message: 'message sending failed',
							error: smsResponse,
						});
					}
				}
			} else {
				utils.sendResponse(
					res,
					`END ${response.message || response.detail || 'An error occured'}`
				);
				utils.terminateSession(req.body.sessionId);
			}
		}
	}

	async collectTransferToBankFields(req, res, textArray) {
		const count = textArray.length;
		console.log(count);
		let text = '';

		if (count === 4) {
			utils.sendResponse(res, `CON Enter Amount`);
			return;
		}

		if (count === 5) {
			utils.sendResponse(res, `CON Enter Account Number`);
			return;
		}

		if (count === 6) {
			// fetch banks
			const banks = await api.fetchBanks();

			const banksToShow = banks.map((x) => x.name);
			console.log(banksToShow);
			for (let i = 0; i < banksToShow.length; i++) {
				text += `${i + 1} ${banksToShow[i]}\n`;
			}

			utils.sendResponse(
				res,
				'CON Select a bank \n' + text + '98. Go Back\n99. Go To Main Menu'
			);
		} else {
			const lastItem = Number.parseInt(textArray[count - 1]);
			const banks = await api.fetchBanks();

			const selectedBank = banks[lastItem - 1];
			if (selectedBank) {
				console.log(selectedBank);
				const verificationData = {
					account_number: textArray[5],
					code: selectedBank.code,
				};

				const response = await api.verifyBankDetails(
					verificationData,
					req.body.sessionId
				);

				if (!response) {
					utils.sendResponse(
						res,
						'END Could not resolve account name. Check parameters or try again'
					);
					utils.terminateSession(req.body.sessionId);
					return;
				}

				text = `CON Account Number: ${response.account_number}\nAccount Name: ${response.account_name}\n\nEnter wallet pin`;

				utils.sendResponse(res, text);
			} else {
				const accountDetails = await Account.findOne({
					accountNumber: textArray[5],
				});
				const commission = await api.sendGetRequest(
					`/chargedetails/?chargetype=nairatransfer&amount=${textArray[4]}`
				);
				const sessionDetails = await getSession(req);
				console.log(sessionDetails);
				const data = {
					userID: sessionDetails.userID,
					account_bank: accountDetails.account_code,
					account_number: textArray[5],
					amount: textArray[4],
					walletpin: textArray[count - 1],
					description: '',
					transactiontype: 'bank',
					commission: commission.data,
					currency: 'NGN',
				};

				console.log('API DATA: ', data);

				const response = await api.sendPostRequest(
					data,
					'/customertransaction/',
					req.authentication
				);
				if (!response.status) {
					utils.sendResponse(
						res,
						'END ' +
							`${response.detail || response.message || 'An error occured'}`
					);
					utils.terminateSession(req.body.sessionId);
					return;
				}

				utils.sendResponse(res, `END Transfer successful`);
				utils.terminateSession(req.body.sessionId);

				// Get wallet balance
				const walletBalance = await api.sendGetRequest(
					`/customerwalletbalance/?userid=${req.authentication.userID}`,
					req.authentication
				);
				if (walletBalance.status) {
					// send sms
					const sms = new SMS();
					const smsText = `Wallx Debit\nNGN${
						textArray[4]
					}\nDesc: WALLET TO BANK TRANSFER\nBalance:\nNGN: ${new Intl.NumberFormat(
						'en-NG',
						{ currency: 'NGN', style: 'currency' }
					).format(walletBalance.data.NGN)}\nUSD: ${new Intl.NumberFormat(
						'en-US',
						{ currency: 'USD', style: 'currency' }
					).format(walletBalance.data.USD)}`;
					const smsResponse = await sms.send(
						req.authentication.loggedInPhone,
						smsText
					);
					if (smsResponse) {
						logger.info(smsResponse);
						console.log('message sent: ', smsResponse);
					} else {
						logger.error({
							message: 'message sending failed',
							error: smsResponse,
						});
					}
				}
				console.log('wallet balance: ', walletBalance);
			}
		}
	}

	async collectBuyAirtimeFields(req, res, textArray) {
		const count = textArray.length;
		if (count === 4) {
			utils.sendResponse(res, `CON Enter phone number to recharge, eg 070xxxx`);
		}

		if (count === 5) {
			utils.sendResponse(res, `CON Enter amount`);
		}

		if (count === 6) {
			const data = {
				userID: req.authentication.userID,
				country: 'NG',
				customer: `${textArray[4].replace('0', '+234')}`,
				amount: Number.parseInt(textArray[5]),
				recurrence: 'ONCE',
				biller_name: 'AIRTIME',
				reference: `${utils.generateRandomNumber()}`,
				method: 'wallet',
			};

			console.log(data);

			const response = await api.sendPostRequest(
				data,
				'/purchasebill/',
				req.authentication
			);
			if (response.status) {
				utils.sendResponse(res, `END ${response.message}`);
				logger.info(response);
				utils.terminateSession(req.body.sessionId);

				// Get wallet balance
				const walletBalance = await api.sendGetRequest(
					`/customerwalletbalance/?userid=${req.authentication.userID}`,
					req.authentication
				);
				if (walletBalance.status) {
					// send sms
					const sms = new SMS();
					const smsText = `Wallx Debit\nNGN${
						textArray[5]
					}\nDesc: AIRTIME PURCHACE\nBalance:\nNGN: ${new Intl.NumberFormat(
						'en-NG',
						{ currency: 'NGN', style: 'currency' }
					).format(walletBalance.data.NGN)}\nUSD: ${new Intl.NumberFormat(
						'en-US',
						{ currency: 'USD', style: 'currency' }
					).format(walletBalance.data.USD)}`;
					const smsResponse = await sms.send(
						req.authentication.loggedInPhone,
						smsText
					);
					if (smsResponse) {
						logger.info(smsResponse);
						console.log('message sent: ', smsResponse);
					} else {
						logger.error({
							message: 'message sending failed',
							error: smsResponse,
						});
					}
				}
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
			`END Your wallet balance is\nNGN: ${new Intl.NumberFormat('en-NG', {
				currency: 'NGN',
				style: 'currency',
			}).format(response.data.NGN)}\nUSD: ${new Intl.NumberFormat('en-US', {
				currency: 'USD',
				style: 'currency',
			}).format(response.data.USD)}`
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
				`CON Select one\n1. Check Your Profile Information\n2. Check Saving Status`
			);
		}

		if (count === 3) {
			const response = await api.sendGetRequest(
				`/agentcustomerdetails/?walletID=${textArray[1]}`
			);
			let text = '';
			if (response.status) {
				if (textArray[2] === '1') {
					text = `Customer ID: ${response.data.userid}\nName: ${response.data.fullname}\nDescription: ${response.data.description}\nLocation: ${response.data.location}\nStart Date: ${response.data.startdate}\nNext of Kin: ${response.data.nextofkin}\nNext of Kin's Phone Number: ${response.data.nextofkinphone}\nAmount: ${response.data.amount}\nPayment Frequency: ${response.data.frequency}`;
				}

				if (textArray[2] === '2') {
					text = `Total Received: ${new Intl.NumberFormat('en-NG', {
						style: 'currency',
						currency: 'NGN',
					}).format(
						response.totalrecieved
					)}\nTotal Disbursed: ${new Intl.NumberFormat('en-NG', {
						style: 'currency',
						currency: 'NGN',
					}).format(
						response.totaldisbursed
					)}\nAvailable Balance: ${new Intl.NumberFormat('en-NG', {
						style: 'currency',
						currency: 'NGN',
					}).format(response.totalrecieved - response.totaldisbursed)}`;
				}
				console.log(text);
				utils.sendResponse(res, `END ${text}`);
				utils.terminateSession(req.body.sessionId);
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
			const details = {
				username: process.env.ADMIN_USER,
				password: process.env.ADMIN_PWD,
			};
			const tokenResponse = await api.sendPostRequest(
				details,
				'/api/token/',
				req.authentication
			);
			const sessionUpdate = await updateSession(req, {
				accessToken: tokenResponse.access,
				refreshToken: tokenResponse.refresh,
			});
			console.log(sessionUpdate);
			if (sessionUpdate) {
				const apiResult = await api.sendGetRequest(
					`/crowdcontributionmodule/?id=${textArray[1]}`,
					sessionUpdate
				);
				console.log(apiResult);
				if (!apiResult.status) {
					utils.sendResponse(res, `END ${apiResult.detail}`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				// if (apiResult.data.length === 0) {
				// 	utils.sendResponse(res, `END Campaign does not exist`);
				// 	utils.terminateSession(req.body.sessionId);
				// 	return;
				// }
				const campaign = apiResult.data[0];
				if (!campaign) {
					utils.sendResponse(res, `END Campaign does not exist`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				text = `CON Group Name: ${campaign.groupname.toUpperCase()}\n1. Donate\n2. Check contribution status`;
				utils.sendResponse(res, text);
			} else {
				utils.sendResponse(res, `END An error occured`);
				return;
			}
		}

		if (count === 3) {
			// donate
			if (textArray[2] === '1') {
				text = `CON Donate From\n1. Wallet\n2. Generate Link`;
				utils.sendResponse(res, text);
			} else if (textArray[2] === '2') {
				// contribution status
				const sessionDetails = await getSession(req);
				const apiResult = await api.sendGetRequest(
					`/crowdcontributionmodule/?id=${textArray[1]}`,
					sessionDetails
				);
				console.log(apiResult);
				if (!apiResult.status) {
					utils.sendResponse(res, `END ${apiResult.detail}`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				const campaign = apiResult.data.data[0];
				text = `END Group Name: ${campaign.groupname.toUpperCase()}\nCreator: ${
					campaign.creatorname
				}\nDescription: ${campaign.groupdecription}\nStart date: ${
					campaign.startdate
				}\nEnd date: ${campaign.enddate}\nTotal donations: ${
					campaign.numberofdonors
				}\nCampaign Target: ${new Intl.NumberFormat('en-NG', {
					currency: 'NGN',
					style: 'currency',
				}).format(
					campaign.target
				)}\nTotal Contributions: ${new Intl.NumberFormat('en-NG', {
					currency: 'NGN',
					style: 'currency',
				}).format(campaign.totalcontribution)}`;
				utils.sendResponse(res, text);
				utils.terminateSession(req.body.sessionId);
			} else {
				// invalid choice
				utils.sendResponse('END Invalid choice');
				utils.terminateSession(req.body.sessionId);
			}
		}

		if (count === 4) {
			if (textArray[3] === '1') {
				// login user
				textArray.splice(0, count - 2);
				this.loginMenu(textArray, req, res);
			} else if (textArray[3] === '2') {
				const sessionDetails = await getSession(req);
				// get campaign details
				const apiResult = await api.sendGetRequest(
					`/crowdcontributionmodule/?id=${textArray[1]}`,
					sessionDetails
				);
				if (!apiResult.status) {
					utils.sendResponse(res, `END ${apiResult.detail}`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				const campaign = apiResult.data[0];
				// generate link
				campaign.groupname = campaign.groupname.replace(' ', '%20');
				const link = `https://crowdfunding.wallx.co/${campaign.groupname}/${textArray[1]}`;
				console.log(link);
				utils.sendResponse(
					res,
					`END A payment link would be sent to you via SMS`
				);
				utils.terminateSession(req.body.sessionId);
			} else {
				// invalid choice
				utils.terminateSession(req.body.sessionId);
				utils.sendResponse(res, `END Invalid choice`);
			}
		}

		if (count === 5) {
			textArray.splice(0, count - 3);
			this.loginMenu(textArray, req, res);
		}

		if (count === 6) {
			textArray.splice(0, count - 4);
			await this.loginMenu(textArray, req, res);
			utils.sendResponse(res, `CON Enter Amount`);
		}

		if (count === 7) {
			const sessionDetails = await getSession(req);
			const apiResult = await api.sendGetRequest(
				`/crowdcontributionmodule/?id=${textArray[1]}`,
				sessionDetails
			);
			console.log(apiResult);
			if (!apiResult.status) {
				utils.sendResponse(res, `END ${apiResult.detail}`);
				utils.terminateSession(req.body.sessionId);
				return;
			}
			const campaign = apiResult.data[0];
			text = `CON Group Name: ${campaign.groupname.toUpperCase()}
			Amount: ${textArray[6]}
			
			Enter wallet pin`;
			utils.sendResponse(res, text);
		}

		if (count === 8) {
			// send request
			const sessionDetails = await getSession(req);
			const data = {
				groupID: textArray[1],
				memberID: sessionDetails.userID,
				walletpin: textArray[7],
				amount: Number.parseInt(textArray[6]),
				transactionreference: uniqid(),
				transactiondate: `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`,
				paymentmethod: 'wallet',
				currency: 'NGN',
			};

			const response = await api.sendPostRequest(
				data,
				'/contributiontransaction/',
				sessionDetails
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
			text = `CON Select a category\n1 Wallets( Transactions, Bank, Airtime)\n2 Report a Fraud\n3 Contribution Issues\n4 Speak to our representative\n98 Go Back`;
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

		if (count === 3) {
			// login the user
			textArray.splice(0, count - 2);
			await this.loginMenu(textArray, req, res);
		}

		if (count === 4) {
			// continue login process
			textArray.splice(0, count - 3);
			await this.loginMenu(textArray, req, res);
		}

		if (count === 5) {
			// continue login process and send data to backend
			textArray.splice(0, count - 4);
			await this.loginMenu(textArray, req, res);

			const sessionDetails = await getSession(req);
			const data = {
				userID: sessionDetails.userID,
				reviewtype: options[textArray[0]],
				review: textArray[1],
			};

			console.log(data);

			const response = await api.sendPostRequest(
				data,
				'/customercomplaint/',
				sessionDetails
			);

			if (response.status) {
				utils.sendResponse(res, `END Complaint made successfully`);
				utils.terminateSession(req.body.sessionId);
				// send sms
				const sms = new SMS();
				const smsText = `Thank you for reaching out to us. Our customer support team will respond to you within 24 hours.\nRegards,\nWallx Team`;
				const smsResponse = await sms.send(
					sessionDetails.loggedInPhone,
					smsText
				);
				if (smsResponse) {
					logger.info(smsResponse);
					console.log('message sent: ', smsResponse);
				} else {
					logger.error({
						message: 'message sending failed',
						error: smsResponse,
					});
				}
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
			text = `CON Register with\n1. ${options['1']}\n2. ${options['2']}\n99. Go To Main Menu`;

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
			const verificationData = {
				firstname: textArray[3],
				lastname: textArray[4],
				phone: textArray[6],
				dob: textArray[5],
			};

			console.log(verificationData);
			const response = await api.verifyDetails(
				options[textArray[1]],
				// '10000000001',
				textArray[2],
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
				utils.sendResponse(
					res,
					`END Incorrect ${options[textArray[1]]} or ${
						options[textArray[1]]
					} data incorrect`
				);
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
				// send sms
				console.log('sending sms');
				const sms = new SMS();
				const smsText = `Thank you for registering with Wallx. You can now use all the USSD features with your account details.\nVisit the playstore or appstore and download our app.`;
				const smsResponse = await sms.send(
					req.authentication.loggedInPhone,
					smsText
				);
				if (smsResponse) {
					logger.info(smsResponse);
					console.log('message sent: ', smsResponse);
				} else {
					logger.error({
						message: 'message sending failed',
						error: smsResponse,
					});
				}
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
		console.log(textArray);
		const count = textArray.length;
		if (count === 2) {
			utils.sendResponse(res, `CON Enter your phone number`);
			return;
		} else if (count === 3) {
			utils.sendResponse(res, `CON Enter your password`);
			return;
		} else if (count === 4) {
			const data = {
				username: textArray[2],
				password: textArray[3],
			};
			const endpoint = `/merchant/?username=${data.username}&password=${data.password}&role=customer`;

			const response = await api.sendGetRequest(endpoint, req.authentication);

			console.log(response);

			if (response.status) {
				// update session
				const updatedSession = await updateSession(req, {
					accessToken: response.token,
					refreshToken: response.refresh,
					userID: response.data.id,
					loggedInPhone: response.data.phonenumber.replace('0', '+234'),
				});

				if (!updatedSession) {
					utils.sendResponse(res, `END An error occured! Please try again`);
					utils.terminateSession(req.body.sessionId);
					return;
				}
				return;
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
			splitText.splice(choiceIndex - 1, 2);
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
