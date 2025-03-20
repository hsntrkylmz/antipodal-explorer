document.addEventListener('DOMContentLoaded', () => {
    // Initialize Earth visualization
    const earthVisualization = new EarthVisualizer(document.getElementById('earth-container'));
    
    // DOM elements
    const locationInput = document.getElementById('location-input');
    const locateButton = document.getElementById('locate-btn');
    const digButton = document.getElementById('dig-btn');
    const resetButton = document.getElementById('reset-btn');
    const startCoords = document.getElementById('start-coords');
    const startAddress = document.getElementById('start-address');
    const endCoords = document.getElementById('end-coords');
    const endAddress = document.getElementById('end-address');
    const endLocation = document.getElementById('end-location');
    const statusMessage = document.getElementById('status-message');
    const journeyStatus = document.querySelector('.journey-status');
    const progressBar = document.querySelector('.progress');
    
    // Add event listeners for the focus buttons
    const focusStartButton = document.getElementById('focus-start');
    const focusEndButton = document.getElementById('focus-end');
    
    if (focusStartButton) {
        focusStartButton.addEventListener('click', () => {
            earthVisualization.focusOnMarker('start');
        });
    }
    
    if (focusEndButton) {
        focusEndButton.addEventListener('click', () => {
            earthVisualization.focusOnMarker('end');
        });
    }
    
    // Store starting location
    let startLocation = null;
    let endLocation = null;
    
    // Connect UI elements
    earthVisualization.progressBar = progressBar;
    earthVisualization.statusText = statusMessage;
    
    // Location input handling
    locateButton.addEventListener('click', async () => {
        const query = locationInput.value.trim();
        
        if (!query) {
            alert('Please enter a location');
            return;
        }
        
        try {
            // Show loading state
            locateButton.textContent = 'Locating...';
            locateButton.disabled = true;
            
            // Check if it's coordinates format (lat, lng)
            const coordsFormat = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
            const match = query.match(coordsFormat);
            
            if (match) {
                // Parse as coordinates
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                
                if (isValidCoordinates(lat, lng)) {
                    startLocation = { lat, lng };
                    await processLocation();
                } else {
                    alert('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
                }
            } else {
                // Use geocoding API to find location
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const result = data[0];
                    startLocation = {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon)
                    };
                    await processLocation();
                } else {
                    alert('Location not found. Please try a different search term.');
                }
            }
        } catch (error) {
            console.error('Error locating position:', error);
            alert('There was an error locating your position. Please try again.');
        } finally {
            // Reset button state
            locateButton.textContent = 'Locate Me';
            locateButton.disabled = false;
        }
    });
    
    // Check if coordinates are valid
    function isValidCoordinates(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
    
    // Process the located position
    async function processLocation() {
        if (!startLocation) return;
        
        // Calculate antipodal point
        endLocation = calculateAntipode(startLocation.lat, startLocation.lng);
        
        // Update UI with coordinates
        startCoords.textContent = `${startLocation.lat.toFixed(6)}, ${startLocation.lng.toFixed(6)}`;
        endCoords.textContent = `${endLocation.lat.toFixed(6)}, ${endLocation.lng.toFixed(6)}`;
        
        // Try to get address information
        try {
            const startAddressInfo = await reverseGeocode(startLocation.lat, startLocation.lng);
            startAddress.textContent = startAddressInfo || 'Unknown location';
            
            const endAddressInfo = await reverseGeocode(endLocation.lat, endLocation.lng);
            endAddress.textContent = endAddressInfo || 'Unknown location';
        } catch (error) {
            console.error('Error getting address:', error);
            startAddress.textContent = 'Address lookup failed';
            endAddress.textContent = 'Address lookup failed';
        }
        
        // Set markers on the Earth
        earthVisualization.setMarkerPosition('start-marker', startLocation.lat, startLocation.lng, true);
        earthVisualization.setMarkerPosition('end-marker', endLocation.lat, endLocation.lng, false);
        
        // Update UI
        digButton.disabled = false;
        endLocation.classList.remove('hidden');
    }
    
    // Calculate antipodal point (opposite side of the Earth)
    function calculateAntipode(lat, lng) {
        // Antipode latitude is the negative of the original latitude
        const antipodalLat = -lat;
        
        // Antipode longitude is 180° opposite (plus or minus 180°)
        let antipodalLng = lng + 180;
        if (antipodalLng > 180) antipodalLng -= 360;
        
        return { lat: antipodalLat, lng: antipodalLng };
    }
    
    // Reverse geocode coordinates to get location name
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
            const data = await response.json();
            
            if (data.error) {
                // Likely ocean or uninhabited area
                return 'Ocean or uninhabited area';
            }
            
            if (data.address) {
                // Construct address from components
                const parts = [];
                
                // Add city, town, or village
                if (data.address.city) parts.push(data.address.city);
                else if (data.address.town) parts.push(data.address.town);
                else if (data.address.village) parts.push(data.address.village);
                
                // Add state or region
                if (data.address.state) parts.push(data.address.state);
                else if (data.address.region) parts.push(data.address.region);
                
                // Add country
                if (data.address.country) parts.push(data.address.country);
                
                if (parts.length > 0) {
                    return parts.join(', ');
                }
            }
            
            return data.display_name || 'Unknown location';
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }
    
    // Start the digging journey
    digButton.addEventListener('click', () => {
        if (!startLocation || !endLocation) {
            alert('Please set your location first');
            return;
        }
        
        // Update UI
        journeyStatus.classList.remove('hidden');
        digButton.disabled = true;
        resetButton.classList.remove('hidden');
        
        // Start the animation
        earthVisualization.startJourneyAnimation(
            startLocation.lat,
            startLocation.lng,
            endLocation.lat,
            endLocation.lng
        );
    });
    
    // Reset button
    resetButton.addEventListener('click', () => {
        // Reset Earth visualization
        earthVisualization.reset();
        
        // Reset UI
        startLocation = null;
        endLocation = null;
        startCoords.textContent = 'Not set';
        startAddress.textContent = 'Not set';
        endCoords.textContent = 'Not set';
        endAddress.textContent = 'Not set';
        endLocation.classList.add('hidden');
        resetButton.classList.add('hidden');
        digButton.disabled = true;
        journeyStatus.classList.add('hidden');
        
        // Clear input
        locationInput.value = '';
    });
});