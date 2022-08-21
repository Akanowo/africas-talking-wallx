const https = require('https');
const utils = require('../utils');
const axios = require('axios').default;
const logger = require('../configs/logger');
const Account = require('../models/account');

class API {
	constructor() {
		this.BASE_URI = utils.BASE_URI;
	}

	/**
	 *
	 * @param {{}} data
	 * @returns
	 */
	async sendPostRequest(data, endpoint, auth) {
		const url = `${this.BASE_URI}${endpoint}`;
		const httpsAgent = new https.Agent({ rejectUnauthorized: false });
		let config = {
			httpsAgent,
		};

		if (auth) {
			config.headers = {
				Authorization: `Bearer ${auth.accessToken}`,
			};
		}

		let response;
		try {
			response = await (await axios.post(url, data, config)).data;
		} catch (error) {
			if (error.response && error.response.data) {
				response = error.response.data;
				logger.error(error.response.data);
			} else {
				response = { detail: 'An error occured!' };
				logger.error(error.message);
			}
		}

		return response;
	}

	async sendGetRequest(endpoint, auth) {
		const url = `${this.BASE_URI}/${endpoint}`;
		const httpsAgent = new https.Agent({ rejectUnauthorized: false });
		let config = {
			httpsAgent,
		};

		if (auth) {
			config.headers = {
				Authorization: `Bearer ${auth.accessToken}`,
			};
		}

		let response;
		try {
			response = await (await axios.get(url, config)).data;
		} catch (error) {
			if (error.response && error.response.data) {
				response = error.response.data;
				logger.error(error.response.data);
			} else {
				response = { detail: 'An error occured!' };
				logger.error(error.message);
			}
		}

		return response;
	}

	async verifyDetails(type, number, data) {
		const url = `${
			utils.VERIFYME_BASE_URI
		}/v1/verifications/identities/${type.toLowerCase()}/${number}`;
		const config = {
			headers: {
				Authorization: `Bearer ${process.env.VERIFYME_LIVE_SECRET}`,
			},
		};
		let response;
		try {
			response = await (await axios.post(url, data, config)).data;
		} catch (error) {
			if (error.response && error.response.data) {
				error.response.data.timestamp = new Date();
				response = error.response.data;
				logger.error(error.response.data);
			} else {
				console.log(error.stack);
				response = { detail: 'An error occured!' };
				logger.error(error.message);
			}
		}
		return response;
	}

	async fetchBanks() {
		const url = 'https://api.paystack.co/bank';
		const response = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
			},
		});

		return response.data.data;
	}

	async verifyBankDetails(data, sessionId) {
		const url = `https://api.paystack.co/bank/resolve?account_number=${data.account_number}&bank_code=${data.code}`;
		let response;
		try {
			response = await axios.get(url, {
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
				},
			});
		} catch (error) {
			logger.error(error);
			response = false;
		}

		if (!response) {
			return false;
		}

		if (response.data.status) {
			// store account details in db
			const accountDetails = {
				sessionId,
				account_number: data.account_number,
				account_code: data.code,
				account_name: response.data.account_name,
			};
			const account = await Account.create(accountDetails);
			return response.data.data;
		}

		return false;
	}
}

module.exports = API;
