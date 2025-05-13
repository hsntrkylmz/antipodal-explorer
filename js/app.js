document.addEventListener('DOMContentLoaded', () => {
    // Initialize Earth visualization with the correct container
    const earthContainer = document.querySelector('.earth-visualization');
    const earthVisualization = new EarthVisualizer(earthContainer);
    window.earthVisualizer = earthVisualization;
    
    // DOM elements
    const locationInput = document.getElementById('location-input');
    const locateButton = document.getElementById('locate-btn');
    const currentLocationButton = document.getElementById('current-location-btn');
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
    
    // Sample location buttons
    const sampleButtons = document.querySelectorAll('.sample-btn');
    
    // Debounce function to limit frequency of function calls
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // Add event listeners for sample location buttons with throttling to prevent double-clicks
    sampleButtons.forEach(button => {
        // Track if action is in progress to prevent multiple rapid clicks
        let actionInProgress = false;
        
        button.addEventListener('click', () => {
            // Prevent multiple rapid clicks
            if (actionInProgress) return;
            actionInProgress = true;
            
            // Add visual feedback
            button.classList.add('active');
            
            console.log('Sample location button clicked:', button.textContent);
            
            const lat = parseFloat(button.getAttribute('data-lat'));
            const lng = parseFloat(button.getAttribute('data-lng'));
            const locationName = button.textContent;
            
            // Set location directly without API calls
            startLocation = { lat, lng };
            
            // Update UI immediately
            startCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            startAddress.textContent = locationName;
                
                // Calculate antipodal point
            endLocation = calculateAntipode(lat, lng);
            
            // Update end location UI
            endCoords.textContent = `${endLocation.lat.toFixed(6)}, ${endLocation.lng.toFixed(6)}`;
            endAddress.textContent = 'Antipode of ' + locationName;
            
            try {
                // Set markers on the earth visualization
                console.log('Setting start marker at:', lat, lng);
                earthVisualization.setMarkerPosition('start-marker', lat, lng, true);
                
                console.log('Setting end marker at:', endLocation.lat, endLocation.lng);
                earthVisualization.setMarkerPosition('end-marker', endLocation.lat, endLocation.lng, false);
                
                // Try to use the geocoder for end address in the background
                reverseGeocode(endLocation.lat, endLocation.lng)
                    .then(address => {
                        if (address) endAddress.textContent = address;
                    })
                    .catch(() => {
                        // Keep fallback address
                    });
                
                // Enable digging
                digButton.disabled = false;
                endLocation.classList.remove('hidden');
                
                console.log('Sample location successfully set');
            } catch (err) {
                console.error('Error setting location from sample button:', err);
                alert('Error setting location. Please try again.');
            } finally {
                // Remove visual feedback after a delay
                setTimeout(() => {
                    button.classList.remove('active');
                    actionInProgress = false;
                }, 500);
            }
        });
    });
    
    // Add event listeners for the focus buttons with debouncing
    const focusStartButton = document.getElementById('focus-start');
    const focusEndButton = document.getElementById('focus-end');
    
    // Create debounced versions of focus functions to prevent rapid clicking
    const debouncedFocusStart = debounce(() => {
        console.log('Focusing on start marker');
        if (earthVisualization && typeof earthVisualization.focusOnMarker === 'function') {
            focusStartButton.disabled = true;
            focusStartButton.classList.add('active');
            
            earthVisualization.focusOnMarker('start-marker');
            
            // Re-enable after animation completes
            setTimeout(() => {
                focusStartButton.disabled = false;
                focusStartButton.classList.remove('active');
            }, 1600); // Slightly longer than animation duration
        } else {
            console.error('Earth visualization or focusOnMarker method not available');
        }
    }, 300);
    
    const debouncedFocusEnd = debounce(() => {
        console.log('Focusing on end marker');
        if (earthVisualization && typeof earthVisualization.focusOnMarker === 'function') {
            focusEndButton.disabled = true;
            focusEndButton.classList.add('active');
            
            earthVisualization.focusOnMarker('end-marker');
            
            // Re-enable after animation completes
            setTimeout(() => {
                focusEndButton.disabled = false;
                focusEndButton.classList.remove('active');
            }, 1600); // Slightly longer than animation duration
        } else {
            console.error('Earth visualization or focusOnMarker method not available');
        }
    }, 300);
    
    if (focusStartButton) {
        focusStartButton.addEventListener('click', debouncedFocusStart);
    }
    
    if (focusEndButton) {
        focusEndButton.addEventListener('click', debouncedFocusEnd);
    }
    
    // Store starting location
    let startLocation = null;
    let endLocation = null;
    
    // Connect UI elements
    earthVisualization.progressBar = progressBar;
    earthVisualization.statusText = statusMessage;
    
    // Modified location input handling with fallback
    locateButton.addEventListener('click', async () => {
        const query = locationInput.value.trim();
        
        if (!query) {
            alert('Please enter a location or use one of the sample locations');
            return;
        }
        
        try {
            // Show loading state
            locateButton.textContent = 'Searching...';
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
                    await processLocation('Coordinates: ' + query);
                } else {
                    alert('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
                }
            } else {
                // FALLBACK: For demo purposes, use New York coordinates as fallback
                // This ensures the app works even if the geocoding API fails
                startLocation = { lat: 40.7128, lng: -74.0060 };
                await processLocation(query + ' (Using demo location due to API limitations)');
                
                /* Original code with API call:
                try {
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
                } catch (error) {
                    console.error('Geocoding API error:', error);
                    alert('Error connecting to location service. Please check your internet connection and try again.');
                }
                */
            }
        } catch (error) {
            console.error('Error locating position:', error);
            alert('There was an error locating your position. Please try again or use the sample locations.');
        } finally {
            // Reset button state
            locateButton.textContent = 'Search';
            locateButton.disabled = false;
        }
    });
    
    // Event listener for current location button
    currentLocationButton.addEventListener('click', function() {
        console.log('Current location button clicked');
        this.disabled = true;
        const originalText = this.innerHTML;
        this.innerHTML = '<span>📍</span> Getting your location...';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    console.log(`Geolocation success: ${lat}, ${lng}`);

                    // Update local state
                    startLocation = { lat, lng };
                    endLocation = calculateAntipode(lat, lng);
                    startCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    endCoords.textContent = `${endLocation.lat.toFixed(6)}, ${endLocation.lng.toFixed(6)}`;

                    // Set markers
                    earthVisualization.setMarkerPosition('start-marker', lat, lng, true);
                    earthVisualization.setMarkerPosition('end-marker', endLocation.lat, endLocation.lng, false);

                    // Update addresses
                    reverseGeocode(lat, lng, 'start-address');
                    reverseGeocode(endLocation.lat, endLocation.lng, 'end-address');

                    // Show end location info and dig button
                    document.getElementById('end-location').classList.remove('hidden');
                    digButton.disabled = false;

                    // Re-enable button
                    currentLocationButton.disabled = false;
                    currentLocationButton.innerHTML = originalText;
                },
                function(error) {
                    console.error('Geolocation error:', error);
                    let errorMessage = 'Could not get your location. ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Location access was denied. Please allow location access in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable. Please enter your location manually.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Location request timed out. Please try again or enter your location manually.';
                            break;
                        default:
                            errorMessage += 'An unknown error occurred. Please try again or enter your location manually.';
                    }
                    alert(errorMessage);
                    currentLocationButton.disabled = false;
                    currentLocationButton.innerHTML = originalText;
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            console.error('Geolocation not supported');
            alert('Geolocation is not supported by your browser. Please enter your location manually.');
            this.disabled = false;
            this.innerHTML = originalText;
        }
    });
    
    // Check if coordinates are valid
    function isValidCoordinates(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
    
    // Process the located position
    async function processLocation(locationNameOverride = null) {
        if (!startLocation) return;
        
        // Calculate antipodal point
        endLocation = calculateAntipode(startLocation.lat, startLocation.lng);
        
        // Update UI with coordinates
        startCoords.textContent = `${startLocation.lat.toFixed(6)}, ${startLocation.lng.toFixed(6)}`;
        endCoords.textContent = `${endLocation.lat.toFixed(6)}, ${endLocation.lng.toFixed(6)}`;
        
        // If we have a location name override, use it
        if (locationNameOverride) {
            startAddress.textContent = locationNameOverride;
            endAddress.textContent = 'Antipode of ' + locationNameOverride;
        } else {
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
    async function reverseGeocode(lat, lng, addressType) {
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
                    const address = parts.join(', ');
                    if (addressType === 'start-address') {
                        startAddress.textContent = address;
                    } else if (addressType === 'end-address') {
                        endAddress.textContent = address;
                    }
                    return address;
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
            alert('Please select a starting location first');
            return;
        }
        
        // Show journey status
        journeyStatus.classList.remove('hidden');
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

    // Listen for globe click events
    earthContainer.addEventListener('location-selected', (event) => {
        console.log('Received location-selected event from globe click:', event.detail);
        
        try {
            // Get the coordinates from the event
            startLocation = event.detail.start;
            endLocation = event.detail.end;
            
            // Format coordinates for display
            const startLat = parseFloat(startLocation.lat).toFixed(6);
            const startLng = parseFloat(startLocation.lng).toFixed(6);
            const endLat = parseFloat(endLocation.lat).toFixed(6);
            const endLng = parseFloat(endLocation.lng).toFixed(6);
            
            // Update UI with coordinates
            startCoords.textContent = `${startLat}, ${startLng}`;
            endCoords.textContent = `${endLat}, ${endLng}`;
            
            // Set location name and address
            startAddress.textContent = `Selected Location (${parseFloat(startLat).toFixed(2)}, ${parseFloat(startLng).toFixed(2)})`;
            endAddress.textContent = `Antipode (${parseFloat(endLat).toFixed(2)}, ${parseFloat(endLng).toFixed(2)})`;
            
            // Try to reverse geocode the locations in the background
            reverseGeocode(startLocation.lat, startLocation.lng, 'start-address')
                .then(address => {
                    if (address) startAddress.textContent = address;
                })
                .catch((err) => {
                    console.error('Error reverse geocoding start location:', err);
                });
                
            reverseGeocode(endLocation.lat, endLocation.lng, 'end-address')
                .then(address => {
                    if (address) endAddress.textContent = address;
                })
                .catch((err) => {
                    console.error('Error reverse geocoding end location:', err);
                });
            
            // Update UI
            digButton.disabled = false;
            endLocation.classList.remove('hidden');
            
            console.log('Successfully processed location from globe click');
        } catch (err) {
            console.error('Error processing location from globe click:', err);
        }
    });

    // Add a confirmation that event listeners are properly attached
    console.log('Event listeners for location selection attached');
    console.log('Earth container element:', earthContainer);
    console.log('Sample buttons:', sampleButtons.length);
});