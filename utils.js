const Nodecache = require('node-cache');

const Account = require('./models/account');
const Session = require('./models/session');

const cache = new Nodecache();

module.exports.GO_BACK = '98';

module.exports.GO_TO_MAIN_MENU = '99';

module.exports.NEXT = '97';

module.exports.BASE_URI = 'https://prodapi.wallx.co/API';

module.exports.VERIFYME_BASE_URI = `https://vapi.verifyme.ng`;

module.exports.VERIFYME_TEST_NUMBER = '10000000001';

module.exports.cache = cache;

function generateRandomNumber() {
	const numbers = '1234567890';
	let reference = '';
	for (let i = 0; i < 11; i++) {
		const randNum = Math.floor(Math.random() * 10);
		reference += numbers[randNum];
	}

	return reference;
}

module.exports.generateRandomNumber = generateRandomNumber;

module.exports.sendResponse = (res, text) => {
	res.setHeader('Content-Type', 'text/plain');
	res.send(text);
};

module.exports.terminateSession = async (sessionId) => {
	const terminatedSession = await Session.findOneAndDelete({ sessionId });
	const deletedAccounts = await Account.deleteMany({ sessionId });

	if (terminatedSession) {
		console.log('session terminated');
	}
};
