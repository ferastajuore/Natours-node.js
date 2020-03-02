const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
	console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
	console.log(err.name, err.message);
	process.exit(1);
});

dotenv.config({ path: './config.env' }); // Read var from file to saved in nodejs environment variables
const app = require('./app');

// conneact to the MONGOOSE Remotely
const DB = process.env.DATABASE_REMOTLE.replace(
	'<PASSWORD>',
	process.env.DATABASE_PASSWORD
);

mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useUnifiedTopology: true
	})
	.then(() => console.log('DB connaction successful!'));

// Connact To the MONGOOSE Local
// const DB = process.env.DATABASE_LOCAL;
// mongoose
// 	.connect(DB, {
// 		useNewUrlParser: true,
// 		useCreateIndex: true,
// 		useFindAndModify: false,
// 		useUnifiedTopology: true
// 	})
// 	.then(() => console.log('DB connaction successful'));

// LISTEN ON PORT
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
	console.log(`Server is running on port ${port}...`);
});

process.on('unhandledRejection', err => {
	console.log('UNHANDLED REJECTION! 💥 Shutting down...');
	console.log(err.name, err, message);
	server.close(() => {
		process.exit(1);
	});
});
