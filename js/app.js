document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const locationPermissionBtn = document.getElementById('location-permission-btn');
    const startJourneyBtn = document.getElementById('start-journey-btn');
    const resetBtn = document.getElementById('reset-btn');
    const currentLocationDiv = document.getElementById('current-location');
    const locationCoordinatesDiv = document.getElementById('location-coordinates');
    const journeyAnimationDiv = document.getElementById('journey-animation');
    const endLocationDiv = document.getElementById('end-location');
    
    // Location data
    let userLocation = null;
    let antipodalLocation = null;
    
    // Initialize app
    init();
    
    function init() {
        // Add event listeners
        locationPermissionBtn.addEventListener('click', requestLocationPermission);
        startJourneyBtn.addEventListener('click', startJourney);
        resetBtn.addEventListener('click', resetApp);
        
        // Check if geolocation is available
        if (!navigator.geolocation) {
            updateLocationStatus('Geolocation is not supported by your browser');
            locationPermissionBtn.disabled = true;
        }
    }
    
    // Request location permission
    function requestLocationPermission() {
        locationPermissionBtn.disabled = true;
        locationPermissionBtn.textContent = 'Locating...';
        
        navigator.geolocation.getCurrentPosition(
            position => {
                // Success
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Calculate antipodal point
                antipodalLocation = calculateAntipode(userLocation.lat, userLocation.lng);
                
                // Display locations
                displayLocationInfo(userLocation, antipodalLocation);
                
                // Update UI
                currentLocationDiv.classList.add('hidden');
                locationCoordinatesDiv.classList.remove('hidden');
                startJourneyBtn.classList.remove('hidden');
                
                // Set markers on the globe
                earthVisualizer.setMarkerPosition(
                    document.getElementById('start-marker'), 
                    userLocation.lat, 
                    userLocation.lng
                );
                
                earthVisualizer.setMarkerPosition(
                    document.getElementById('end-marker'),
                    antipodalLocation.lat,
                    antipodalLocation.lng
                );
                
                // Draw path
                earthVisualizer.drawDigPath(
                    userLocation.lat, 
                    userLocation.lng,
                    antipodalLocation.lat,
                    antipodalLocation.lng
                );
            },
            error => {
                // Error
                console.error('Error getting location:', error);
                locationPermissionBtn.disabled = false;
                locationPermissionBtn.textContent = 'Share My Location';
                
                let errorMessage = 'Unable to retrieve your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access was denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'The request to get location timed out';
                        break;
                }
                
                updateLocationStatus(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    // Calculate antipodal point (opposite side of the Earth)
    function calculateAntipode(lat, lng) {
        const antipodalLat = -lat;
        let antipodalLng = lng + 180;
        
        // Normalize longitude to -180 to 180
        if (antipodalLng > 180) {
            antipodalLng -= 360;
        }
        
        return {
            lat: antipodalLat,
            lng: antipodalLng
        };
    }
    
    // Display location information
    async function displayLocationInfo(start, end) {
        // Display start location
        document.getElementById('start-lat').textContent = start.lat.toFixed(6);
        document.getElementById('start-lng').textContent = start.lng.toFixed(6);
        
        // Display end location
        document.getElementById('end-lat').textContent = end.lat.toFixed(6);
        document.getElementById('end-lng').textContent = end.lng.toFixed(6);
        
        // Get location names using reverse geocoding
        try {
            const startAddress = await reverseGeocode(start.lat, start.lng);
            const endAddress = await reverseGeocode(end.lat, end.lng);
            
            document.getElementById('start-address').textContent = startAddress;
            document.getElementById('end-address').textContent = endAddress;
        } catch (error) {
            console.error('Error with geocoding:', error);
            document.getElementById('start-address').textContent = 'Location name unavailable';
            document.getElementById('end-address').textContent = 'Location name unavailable';
        }
    }
    
    // Reverse geocode coordinates to get location name
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
            const data = await response.json();
            
            if (data.error) {
                return 'Ocean or Unknown Location';
            }
            
            if (data.address) {
                // Create location name from available address parts
                const parts = [];
                
                if (data.address.city) parts.push(data.address.city);
                else if (data.address.town) parts.push(data.address.town);
                else if (data.address.village) parts.push(data.address.village);
                
                if (data.address.state || data.address.state_district) {
                    parts.push(data.address.state || data.address.state_district);
                }
                
                if (data.address.country) parts.push(data.address.country);
                
                if (parts.length > 0) {
                    return parts.join(', ');
                } else {
                    return data.display_name || 'Unknown Location';
                }
            }
            
            return data.display_name || 'Unknown Location';
        } catch (error) {
            console.error('Geocoding error:', error);
            return 'Location name unavailable';
        }
    }
    
    // Start journey animation
    function startJourney() {
        if (!userLocation || !antipodalLocation) return;
        
        // Update UI
        startJourneyBtn.classList.add('hidden');
        journeyAnimationDiv.classList.remove('hidden');
        
        // Start animation
        earthVisualizer.startJourneyAnimation(
            userLocation.lat, 
            userLocation.lng,
            antipodalLocation.lat,
            antipodalLocation.lng
        );
    }
    
    // Reset application
    function resetApp() {
        // Reset UI
        currentLocationDiv.classList.remove('hidden');
        locationCoordinatesDiv.classList.add('hidden');
        journeyAnimationDiv.classList.add('hidden');
        endLocationDiv.classList.add('hidden');
        startJourneyBtn.classList.add('hidden');
        resetBtn.classList.add('hidden');
        
        // Reset location permission button
        locationPermissionBtn.disabled = false;
        locationPermissionBtn.textContent = 'Share My Location';
        
        // Reset progress bar and status
        document.getElementById('journey-progress-bar').style.width = '0';
        document.getElementById('journey-status-text').textContent = 'Preparing to dig...';
        
        // Reset earth visualization
        earthVisualizer.reset();
        
        // Clear location data
        userLocation = null;
        antipodalLocation = null;
    }
    
    // Update location status
    function updateLocationStatus(message) {
        const locationMessage = document.createElement('p');
        locationMessage.textContent = message;
        locationMessage.style.color = 'var(--warning-color)';
        
        // Replace existing status or add new one
        const existingStatus = currentLocationDiv.querySelector('p:not(:first-child)');
        if (existingStatus) {
            currentLocationDiv.replaceChild(locationMessage, existingStatus);
        } else {
            currentLocationDiv.appendChild(locationMessage);
        }
    }
});