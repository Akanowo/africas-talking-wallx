const Session = require('./models/session');

module.exports.GO_BACK = '98';

module.exports.GO_TO_MAIN_MENU = '99';

module.exports.BASE_URI = 'https://prodapi.wallx.co/API';

module.exports.VERIFYME_BASE_URI = `https://vapi.verifyme.ng`;

module.exports.VERIFYME_TEST_NUMBER = '10000000001';

module.exports.sendResponse = (res, text) => {
	res.setHeader('Content-Type', 'text/plain');
	res.send(text);
};

module.exports.terminateSession = async (sessionId) => {
	const terminatedSession = await Session.findOneAndDelete({ sessionId });

	if (terminatedSession) {
		console.log('session terminated');
	}
};
