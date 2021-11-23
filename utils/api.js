const utils = require('../utils');
const axios = require('axios').default;

class API {
	constructor() {
		this.BASE_URI = utils.BASE_URI;
	}

	/**
	 *
	 * @param {{
	 * username: string,
	 * password: string
	 * }} data
	 * @returns
	 */
	async login(data) {
		const endpoint = '/api/token/';
		const url = `${this.BASE_URI}${endpoint}`;

		let loginResponse;
		try {
			loginResponse = await (await axios.post(url, data)).data;
		} catch (error) {
			console.log(error);
			if (error.response && error.response.data) {
				loginResponse = error.response.data;
			} else {
				loginResponse = { detail: 'An error occured!' };
			}
		}

		return loginResponse;
	}
}

module.exports = API;
