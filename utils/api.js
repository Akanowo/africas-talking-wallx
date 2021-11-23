const utils = require('../utils');
const axios = require('axios').default;

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
		let config = {};

		if (auth) {
			config.headers = {
				Authorization: `Bearer ${auth.accessToken}`,
			};
		}

		let response;
		try {
			response = await (await axios.post(url, data, config)).data;
		} catch (error) {
			console.log(error);
			if (error.response && error.response.data) {
				response = error.response.data;
			} else {
				response = { detail: 'An error occured!' };
			}
		}

		return response;
	}
}

module.exports = API;
