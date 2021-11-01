const express = require('express');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

app.post('/ussd', (req, res) => {
	const { sessionId, serviceCode, phoneNumber, text } = req.body;

	let response = '';

	if (text == '') {
		// This is the first request. Note how we start the response with CON
		response = `CON What would you like to check
    1. My account
    2. My phone number`;
	} else if (text == '1') {
		// Business logic for first level response
		response = `CON Choose account information you want to view
    1. Account number`;
	} else if (text == '2') {
		// Business logic for first level response
		// This is a terminal request. Note how we start the response with END
		response = `END Your phone number is ${phoneNumber}`;
	} else if (text == '1*1') {
		// This is a second level response where the user selected 1 in the first instance
		const accountNumber = '0236648122';
		// This is a terminal request. Note how we start the response with END
		response = `END Your account number is ${accountNumber}`;
	}

	res.setHeader('Content-Type', 'text/plain');
	res.send(response);
});

app.listen(PORT, () => {
	console.log(`App started on port ${PORT}`);
});
