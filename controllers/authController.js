const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const singToken = id => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN
	});
};

const createSendToken = (user, stateCode, res) => {
	const token = singToken(user._id);

	const cookieOptions = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true
	};

	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
	res.cookie('jwt', token, cookieOptions);

	// Remove password from the output
	user.password = undefined;

	res.status(stateCode).json({
		status: 'success',
		token,
		data: {
			user
		}
	});
};

exports.signup = catchAsync(async (req, res, next) => {
	const newUser = await User.create({
		name: req.body.name,
		email: req.body.email,

		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
		passwordChangedAt: req.body.passwordChangedAt
	});

	const url = `${req.protocol}://${req.get('host')}/me`;
	await new Email(newUser, url).sendWelcome();

	// const newUser = await User.create(req.body);
	createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	//1) Check if email and password exist
	if (!email || !password) {
		return next(new AppError('Please provide email and password!', 400));
	}

	//2) Check if user exists && password is correct
	const user = await User.findOne({ email }).select('+password');

	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError('Incorrect email or password', 401));
	}

	//3) IF everything ok, send token to client
	createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
	res.cookie('jwt', 'logout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true
	});

	res.status(200).json({ status: 'seccess' });
};

exports.protect = catchAsync(async (req, res, next) => {
	//1) Getting token and check if is exists
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	}

	if (!token) {
		return next(
			new AppError(
				'You are not logged in! Please log in to get access.',
				401
			)
		);
	}

	//2) Verification token
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	//3) Check if user still exists
	const currentUsre = await User.findById(decoded.id);

	if (!currentUsre) {
		return next(
			new AppError(
				'The User belonging to this token dose longer exist.',
				401
			)
		);
	}

	//4) check if user changed password after the token was issued
	if (currentUsre.changedPasswordAfter(decoded.iat)) {
		return next(
			new AppError(
				'User recently changed password! Please login again.',
				401
			)
		);
	}

	// GRANT Access to Protected route
	req.user = currentUsre;
	res.locals.user = currentUsre;
	next();
});

exports.isLoggedIn = async (req, res, next) => {
	if (req.cookies.jwt) {
		try {
			// 1) Verify token
			const decoded = await promisify(jwt.verify)(
				req.cookies.jwt,
				process.env.JWT_SECRET
			);

			// 2) Check if user still exists
			const currentUsre = await User.findById(decoded.id);

			if (!currentUsre) {
				return next();
			}

			// 3) check if user changed password after the token was issued
			if (currentUsre.changedPasswordAfter(decoded.iat)) {
				return next();
			}

			// THERE IS A LOGGED IN USER
			res.locals.user = currentUsre;
			return next();
		} catch (err) {
			return next();
		}
	}
	next();
};

exports.restrictTo = (...role) => {
	// return Middelware
	return (req, res, next) => {
		// roles ['admin, 'lead-guide']. role = 'user'

		if (!role.includes(req.user.role)) {
			return next(
				new AppError(
					'You do not have permission to perform this action',
					403
				)
			);
		}

		next();
	};
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
	//1) Get user based on posted email
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new AppError('There is no user with email address'));
	}

	//2) Generate the randome reset token
	const resetToken = user.createPasswordResetToken();
	// turn off validation
	await user.save({
		validateBeforeSave: false
	});

	// 3) Send it to user's email
	try {
		const resetURL = `${req.protocol}://${req.get(
			'host'
		)}/api/v1/users/resetPassword/${resetToken}`;

		await new Email(user, resetURL).sendPasswordReset();

		res.status(200).json({
			status: 'success',
			message: 'Token sent to email!'
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(
			new AppError(
				'There was an error sending the email. Try again later!'
			),
			500
		);
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// 1) Get user based on the token (encrept token)
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() }
	});

	// 2) If token has not expired, and there is user, set the new password
	if (!user) {
		return next(new AppError('Token is invalid or hash expired', 400));
	}

	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;

	await user.save();

	// 3) Update changedPasswordAt property for the user

	// 4) Log the user in, send JWT
	createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
	// 1) Get user from collection ( is comeing auth and asced for password)
	const user = await User.findById(req.user.id).select('+password');

	// 2) Check if POSTed current password is correct
	if (
		!(await user.correctPassword(req.body.passwordCurrent, user.password))
	) {
		return next(new AppError('Your current password is wrong.', 401));
	}

	// 3) If so, update password
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	await user.save();

	// user.findByIdAndUdate will (NOT) work as intended!

	// 4) Log user in, send JWT
	createSendToken(user, 200, res);
});
