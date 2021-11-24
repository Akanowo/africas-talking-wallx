const Joi = require('joi');

const requestSchema = Joi.object({
	sessionId: Joi.string().required(),
	serviceCode: Joi.string().required(),
	networkCode: Joi.string().required(),
	phoneNumber: Joi.string().required(),
	text: Joi.string().required().allow(''),
});

module.exports = {
	requestSchema,
};
