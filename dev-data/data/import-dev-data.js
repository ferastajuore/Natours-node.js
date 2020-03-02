const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');
dotenv.config({ path: './config.env' });

// conneact to the MONGOOSE Local
// const DB = process.env.DATABASE_LOCAL;
// mongoose
// 	.connect(DB, {
// 		useNewUrlParser: true,
// 		useCreateIndex: true,
// 		useFindAndModify: false
// 	})
// 	.then(() => console.log('DB connaction successful!'));

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

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'UTF-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'UTF-8'));
const reviews = JSON.parse(
	fs.readFileSync(`${__dirname}/reviews.json`, 'UTF-8')
);

// IMPORT DATA TO DB
const importData = async () => {
	try {
		await Tour.create(tours);
		await User.create(users, { validateBeforeSave: false });
		await Review.create(reviews);
		console.log('Data successfully loaded!');
	} catch (err) {
		console.log(err);
	}
	process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
	try {
		await Tour.deleteMany();
		await User.deleteMany();
		await Review.deleteMany();
		console.log('Data successfully deleted!');
	} catch (err) {
		console.log(err);
	}
	process.exit();
};

if (process.argv[2] === '--import') {
	importData();
} else if (process.argv[2] === '--delete') {
	deleteData();
}

// console.log(process.argv);
