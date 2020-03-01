const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./heandlerFactory');
const AppError = require('../utils/appError');

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

// UPLOADE Tour MULTEPUL PHOTOS
exports.uploadeTourPhoto = uploade.fields([
	{ name: 'imageCover', maxCount: 1 },
	{ name: 'images', maxCount: 3 }
]);

exports.resizeTourPhoto = catchAsync(async (req, res, next) => {
	if (!req.files.imageCover || !req.files.images) return next();

	// cover image
	req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
	await sharp(req.files.imageCover[0].buffer)
		.resize(2000, 1333)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/tours/${req.body.imageCover}`);

	// images
	req.body.images = [];

	await Promise.all(
		req.files.images.map(async (file, i) => {
			const filename = `tour-${req.params.id}-${Date.now()}-${i +
				1}.jpeg`;

			await sharp(file.buffer)
				.resize(2000, 1333)
				.toFormat('jpeg')
				.jpeg({ quality: 90 })
				.toFile(`public/img/tours/${filename}`);

			req.body.images.push(filename);
		})
	);

	next();
});

// Middelwer
exports.aliasTopTours = (req, res, next) => {
	req.query.limit = '5';
	req.query.sort = '-ratingsAverage,price';
	req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
	next();
};

exports.getAllTours = factory.getAll(Tour); // GET ALL TOURS API
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // READ ID => API
exports.createTour = factory.createOne(Tour); // POST API
exports.updateTour = factory.updateOne(Tour); // UPDATE API
exports.deleteTour = factory.deleteOne(Tour); // DELETE API

exports.getTourState = catchAsync(async (req, res, next) => {
	const state = await Tour.aggregate([
		{
			$match: { ratingsAverage: { $gte: 4.5 } }
		},
		{
			$group: {
				_id: { $toUpper: '$difficulty' },
				numTours: { $sum: 1 },
				numRatings: { $sum: '$ratingsQuantity' },
				avgRating: { $avg: '$ratingsAverage' },
				avgPrice: { $avg: '$price' },
				minPrice: { $min: '$price' },
				maxPrice: { $max: '$price' }
			}
		},
		{
			$sort: { avgPrice: 1 }
		}
		// {
		// 	$match: { _id: { $ne: 'EASY' } }
		// }
	]);

	res.status(200).json({
		status: 'success',
		data: {
			state
		}
	});
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
	const year = req.params.year * 1; // 2021
	const plan = await Tour.aggregate([
		{
			$unwind: '$startDates' //seberate array of date
		},
		{
			$match: {
				// select fields
				startDates: {
					$gte: new Date(`${year}-01-01`),
					$lte: new Date(`${year}-12-31`)
				}
			}
		},
		{
			$group: {
				// show result
				_id: { $month: '$startDates' },
				numTourStarts: { $sum: 1 },
				tours: { $push: '$name' }
			}
		},
		{
			$addFields: { month: '$_id' } // add new Filelds
		},
		{
			$project: { _id: 0 } // remove _id if set 1 => not removed
		},
		{
			$sort: { numTourStarts: -1 } // sort by descending -1 for 1 sort by ascending
		},
		{
			$limit: 12
		}
	]);

	res.status(200).json({
		status: 'success',
		data: {
			plan
		}
	});
});

// /tours-within/233/center/-40,55/unit/mi
// /tours-within/:distance/center/:latlng/unit/:unit
exports.getToursWithin = catchAsync(async (req, res, next) => {
	const { distance, latlng, unit } = req.params;
	const [lat, lng] = latlng.split(',');

	const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

	if (!lat || !lng) {
		return next(
			new AppError(
				'Pleaze provide latitutr and longitude in the format lag,lng.',
				400
			)
		);
	}

	const tours = await Tour.find({
		startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
	});

	// console.log(distance, latlng, unit);

	res.status(200).json({
		status: 'success',
		results: tours.length,
		data: {
			data: tours
		}
	});
});

exports.getDistances = catchAsync(async (req, res, next) => {
	const { latlng, unit } = req.params;
	const [lat, lng] = latlng.split(',');

	// if unit === miles ? 1 meter to miles = 0.000621371192 ? 1km = 0.001
	const multiplier = unit === 'mi' ? 0.000621371192 : 0.001;

	if (!lat || !lng) {
		return next(
			new AppError(
				'Pleaze provide latitutr and longitude in the format lag,lng.',
				400
			)
		);
	}

	const distances = await Tour.aggregate([
		{
			$geoNear: {
				near: {
					type: 'Point',
					coordinates: [lng * 1, lat * 1]
				},
				distanceField: 'distance',
				distanceMultiplier: multiplier
			}
		},
		{
			$project: {
				distance: 1,
				name: 1
			}
		}
	]);

	res.status(200).json({
		status: 'success',
		data: {
			data: distances
		}
	});
});
