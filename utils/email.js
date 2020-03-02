const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');
const pug = require('pug');

module.exports = class email {
	constructor(user, url) {
		this.to = user.email;
		this.firstName = user.name.split(' ')[0];
		this.url = url;
		this.from = `Feras Tajuore <${process.env.EMAIL_FROM}>`;
	}

	// 1) Create a tansport
	newTransport() {
		return nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
			auth: {
				user: process.env.EMAIL_USERNAME,
				pass: process.env.EMAIL_PASSWORD
			}
		});
	}

	// Send the actual email
	async send(template, subject) {
		// 1) Render HTML based on a pug template
		const html = pug.renderFile(
			`${__dirname}/../views/email/${template}.pug`,
			{
				firstName: this.firstName,
				url: this.url,
				subject
			}
		);

		// 2) Define the email options
		const mailOptions = {
			from: this.from,
			to: this.to,
			subject,
			html,
			text: htmlToText.fromString(html)
		};

		// 3) Actually send the email
		await this.newTransport().sendMail(mailOptions);
	}

	async sendWelcome() {
		await this.send('welcome', 'Welcome to the Natours Family!');
	}

	async sendPasswordReset() {
		await this.send(
			'resetPassword',
			'Your password reset token (valid for only 10 minutes)'
		);
	}
};
