const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const errorHandler = require('./controllers/errorController');
const tourRoute = require('./routes/tourRouter');
const userRoute = require('./routes/userRouter');
const reviewRoute = require('./routes/reviewRouter');
const bookingRoute = require('./routes/bookingRouter');
const viewRoute = require('./routes/viewRouter');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) Global Middeleware
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP Headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev')); // Extract logs
}

// Limit requests from same API
const limiter = rateLimit({
	max: 100, // number of request for sending IP
	windowMs: 60 * 60 * 1000, // 1H restart send request
	message: 'Too many requests from this IP, Please try again in an hour!'
});

// useing for all router start with /api
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// cookie parser
app.use(cookieParser());

// Data sanititzation against NoSQL query injection
app.use(mongoSanitize());

// Data sanititzation against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
	hpp({
		whitelist: [
			'duration',
			'ratingsAverage',
			'ratingsQuantity',
			'maxGroupSize',
			'difficulty',
			'price'
		]
	})
);

// Test middleware
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	// console.log(req.cookies);
	next();
});

// Route

app.use('/', viewRoute);
app.use('/api/v1/tours', tourRoute);
app.use('/api/v1/users', userRoute);
app.use('/api/v1/bookings', bookingRoute);
app.use('/api/v1/reviews', reviewRoute);

// Route if url is not exist
app.all('*', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;
