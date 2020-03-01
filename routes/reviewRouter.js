const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const router = express.Router({ mergeParams: true });

// Router Reviews

// Protoect All routes after this middleware
router.use(authController.protect);

router
	.route('/')
	.get(reviewController.getAllReview)
	.post(
		authController.protect,
		authController.restrictTo('user'),
		reviewController.setTourUserId,
		reviewController.createReview
	);

router
	.route('/:id')
	.get(reviewController.getReview)
	.patch(
		authController.restrictTo('user', 'admin'),
		reviewController.updateReview
	)
	.delete(
		authController.restrictTo('user', 'admin'),
		reviewController.deleteReview
	);

module.exports = router;
