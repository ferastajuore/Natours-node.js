export const displayMap = locations => {
	mapboxgl.accessToken =
		'pk.eyJ1IjoiZmVyYXN0YWp1b3JlIiwiYSI6ImNrNzN2ZXRubTAyNDYzbHBhZzFvZHkzb3YifQ.7VU9G3uIp-dNwLD8OlpbJA';
	const map = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/ferastajuore/ck73vkqba25du1it82k47h1yd',
		scrollZoom: false
		// center: [-118.244064, 34.027674],
		// zoom: 4
	});

	const bounds = new mapboxgl.LngLatBounds();

	locations.forEach(loc => {
		// Create bounds
		const el = document.createElement('div');
		el.className = 'marker';

		// Add marker
		new mapboxgl.Marker({
			element: el,
			anchor: 'bottom'
		})
			.setLngLat(loc.coordinates)
			.addTo(map);

		// Add popup
		new mapboxgl.Popup({
			offset: 30
		})
			.setLngLat(loc.coordinates)
			.setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
			.addTo(map);

		// Extend map bounds to include current location
		bounds.extend(loc.coordinates);
	});

	map.fitBounds(bounds, {
		padding: {
			top: 200,
			bottom: 150,
			left: 100,
			right: 100
		}
	});
};
