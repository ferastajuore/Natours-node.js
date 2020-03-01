const express = require('express');
const viewsContoller = require('../controllers/viewsContoller');
const authController = require('../controllers/authController');
const bookingContorller = require('../controllers/bookingController');
const router = express.Router();

router.get(
	'/',
	bookingContorller.createBookingCheckout,
	authController.isLoggedIn,
	viewsContoller.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsContoller.getTour);
router.get('/login', authController.isLoggedIn, viewsContoller.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewsContoller.getSignupForm);
router.get('/me', authController.protect, viewsContoller.getAccount);
router.get('/my-bookings', authController.protect, viewsContoller.getMyBooking);

router.post(
	'/submit-user-data',
	authController.protect,
	viewsContoller.updateUserData
);

module.exports = router;
