const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./heandlerFactory');

// MULTER STORAGE IN DISK
// const mullterStorage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, 'public/img/users');
// 	},
// 	filename: (req, file, cb) => {
// 		const ext = file.mimetype.split('/')[1];
// 		cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
// 	}
// });

// MULTER STORAGE IN MEMORY
const multerStorage = multer.memoryStorage();

// MULTER FILTERING
const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(
			new AppError('Not an image! Please uploade only images.', 400),
			false
		);
	}
};

const uploade = multer({ storage: multerStorage, fileFilter: multerFilter });

// UPLOADE USER PHOTO
exports.uploadeUserPhoto = uploade.single('photo');

// RESIZE USER PHOTO
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
	if (!req.file) return next();

	req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

	await sharp(req.file.buffer)
		.resize(500, 500)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/users/${req.file.filename}`);

	next();
});

const filterObj = (obj, ...allowedFields) => {
	// LOOP IN OBJECT
	const newObj = {};
	Object.keys(obj).forEach(el => {
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});

	return newObj;
};

// Get Courent user
exports.getMe = (req, res, next) => {
	req.params.id = req.user.id;
	next();
};

// Update Courent user
exports.updateMe = catchAsync(async (req, res, next) => {
	// 1) Create error if user POSTed password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(
			new AppError(
				'This route is not for password update. Please use /updateMyPassword.',
				400
			)
		);
	}

	// 2) Filtered out unwanted fields names that are not allowed
	const filteredBody = filterObj(req.body, 'name', 'email');
	if (req.file) filteredBody.photo = req.file.filename;

	// 3) Update user document
	const updatedUser = await User.findByIdAndUpdate(
		req.user.id,
		filteredBody,
		{
			new: true,
			runValidators: true
		}
	);

	// SEND RESPONSE
	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser
		}
	});
});

// Delete Courent user
exports.deleteMe = catchAsync(async (req, res, next) => {
	await User.findByIdAndUpdate(req.user.id, {
		active: false
	});

	res.status(204).json({
		status: 'success',
		data: null
	});
});

exports.createUser = (req, res) => {
	res.status(500).json({
		status: 'error',
		message: 'This route is not yet defined! Please Signup instead'
	});
};

// GET ALL USERS
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

// DO NOT update password with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
