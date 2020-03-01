const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

//- GET OVERVIEW
exports.getOverview = catchAsync(async (req, res, next) => {
	const tours = await Tour.find();

	res.status(200).render('overview', {
		title: 'All Tours',
		tours
	});
});

//- GET TOUR
exports.getTour = catchAsync(async (req, res, next) => {
	// 1) Get data, for the reqested tour (includeing reviews and guides)
	const tour = await Tour.findOne({ slug: req.params.slug }).populate({
		path: 'reviews',
		fields: 'review rating user'
	});

	if (!tour) {
		return next(new AppError('There is no tour with this name', 404));
	}

	// 2) Build template
	// 3) Render template using data from 1)

	res.status(200).render('tour', {
		title: `${tour.name} Tour`,
		tour
	});
});

//- LOGIN
exports.getLoginForm = (req, res) => {
	res.status(200).render('login', {
		title: 'Login you account'
	});
};

exports.getSignupForm = (req, res) => {
	res.status(200).render('signup', {
		title: 'Signup you account'
	});
};

exports.getAccount = (req, res) => {
	res.status(200).render('account', {
		title: 'You Account'
	});
};

exports.updateUserData = catchAsync(async (req, res) => {
	const updateUser = await User.findByIdAndUpdate(
		req.user.id,
		{
			name: req.body.name,
			email: req.body.email
		},
		{
			new: true,
			runValidators: true
		}
	);

	res.status(200).render('account', {
		title: 'You Account',
		user: updateUser
	});
});

exports.getMyBooking = catchAsync(async (req, res, next) => {
	const bookings = await Booking.find({ user: req.user.id });

	const tourId = bookings.map(el => el.tour);
	const tours = await Tour.find({ _id: { $in: tourId } });

	res.status(200).render('overview', {
		title: 'My Booking',
		tours
	});
});
