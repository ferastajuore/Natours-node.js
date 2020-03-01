import axios from 'axios';
import { showAlert } from './alert';
const stripe = Stripe('pk_test_suX203we1fjtYTzhochYfexL00NofRZmZd');

export const bookTour = async tourId => {
	try {
		// 1) get checkout session from API
		const session = await axios(
			`/api/v1/bookings/checkout-session/${tourId}`
		);

		// 2) Create checkout from + chanre credit card
		await stripe.redirectToCheckout({
			sessionId: session.data.session.id
		});
	} catch (err) {
		console.log(err);
		showAlert('error', err);
	}
};
