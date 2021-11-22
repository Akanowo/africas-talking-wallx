module.exports.GO_BACK = '98';

module.exports.GO_TO_MAIN_MENU = '99';

module.exports.sendResponse = (res, text) => {
	res.setHeader('Content-Type', 'text/plain');
	res.send(text);
};
