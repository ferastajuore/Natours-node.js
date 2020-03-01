import axios from 'axios';
import { showAlert } from './alert';

// Type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
	try {
		const url =
			type === 'password'
				? 'http://localhost:3000/api/v1/users/updateMyPassword'
				: 'http://localhost:3000/api/v1/users/updateMe';

		const res = await axios({
			method: 'PATCH',
			url,
			data: data
		});

		if (res.data.status === 'success') {
			showAlert('success', 'Data updated successfully!');
		}
	} catch (error) {
		showAlert('error', error.response.data.message);
	}
};
