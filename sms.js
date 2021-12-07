const twilioClient = require('twilio')(
	process.env.TWILO_SID,
	process.env.TWILO_AUTH_TOKEN
);

class SMS {
	constructor() {
		this.phoneNumber = process.env.TWILO_PHONE;
	}

	async send(to, text) {
		const sendData = {
			body: text,
			to,
			from: this.phoneNumber,
		};

		const response = await twilioClient.messages.create(sendData);
		if (!response.sid) {
			return false;
		}
		return response;
	}
}

module.exports = SMS;
