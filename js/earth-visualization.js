class EarthVisualizer {
    constructor() {
        this.earth = document.querySelector('.earth');
        this.startMarker = document.getElementById('start-marker');
        this.endMarker = document.getElementById('end-marker');
        this.digPath = document.getElementById('dig-path');
        
        this.earthRadius = this.earth.offsetWidth / 2;
        this.rotationAngle = 0;
        this.isAnimating = false;
        
        // Bind methods
        this.setMarkerPosition = this.setMarkerPosition.bind(this);
        this.drawDigPath = this.drawDigPath.bind(this);
        this.startJourneyAnimation = this.startJourneyAnimation.bind(this);
        this.rotateTo = this.rotateTo.bind(this);
    }
    
    // Convert latitude and longitude to position on the globe
    setMarkerPosition(marker, lat, lng) {
        // Adjust longitude for the earth texture
        const adjustedLng = lng + 180;
        
        // Convert latitude and longitude to x,y coordinates on the sphere
        const x = (adjustedLng / 360) * 100;
        const y = ((90 - lat) / 180) * 100;
        
        // Position the marker
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.style.display = 'block';
    }
    
    // Draw path between start and end points
    drawDigPath(startLat, startLng, endLat, endLng) {
        // Adjust longitudes for the earth texture
        const adjustedStartLng = startLng + 180;
        const adjustedEndLng = endLng + 180;
        
        // Convert to x,y coordinates
        const startX = (adjustedStartLng / 360) * 100;
        const startY = ((90 - startLat) / 180) * 100;
        const endX = (adjustedEndLng / 360) * 100;
        const endY = ((90 - endLat) / 180) * 100;
        
        // Calculate center of the earth
        const centerX = 50;
        const centerY = 50;
        
        // Calculate angles for start and end points
        const startAngle = Math.atan2(startY - centerY, startX - centerX);
        const endAngle = Math.atan2(endY - centerY, endX - centerX);
        
        // Set path position and dimensions
        this.digPath.style.left = `${centerX}%`;
        this.digPath.style.top = `${centerY}%`;
        this.digPath.style.width = `${this.earthRadius}px`;
        this.digPath.style.transformOrigin = 'left center';
        
        // Calculate rotation angle
        const rotationAngle = (startAngle * 180 / Math.PI);
        this.digPath.style.transform = `rotate(${rotationAngle}deg)`;
        
        // Show the path
        this.digPath.style.opacity = '0';
    }
    
    // Rotate earth to show the starting point
    rotateTo(lat, lng, duration = 1000) {
        // Adjust longitude for the earth texture
        const adjustedLng = lng + 180;
        
        // Calculate rotation angles
        const xRotation = -lat;
        const yRotation = -adjustedLng + 90; // Adjust to center at 0,0
        
        return new Promise(resolve => {
            // Apply rotation
            this.earth.style.transition = `transform ${duration/1000}s ease-out`;
            this.earth.style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
            
            // Resolve promise after animation completes
            setTimeout(resolve, duration);
        });
    }
    
    // Animate the journey through the Earth
    async startJourneyAnimation(startLat, startLng, endLat, endLng) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        const journeyProgress = document.getElementById('journey-progress-bar');
        const journeyStatusText = document.getElementById('journey-status-text');
        const steps = [
            { progress: 0, status: "Preparing to dig..." },
            { progress: 10, status: "Starting to dig..." },
            { progress: 25, status: "Penetrating the Earth's crust..." },
            { progress: 40, status: "Passing through the upper mantle..." },
            { progress: 50, status: "Reaching the lower mantle..." },
            { progress: 65, status: "Approaching the outer core..." },
            { progress: 75, status: "Navigating through molten magma..." },
            { progress: 85, status: "Crossing the inner core..." },
            { progress: 95, status: "Ascending towards the surface..." },
            { progress: 100, status: "Arrived at your antipodal point!" }
        ];
        
        // First rotate to show the starting point
        await this.rotateTo(startLat, startLng);
        
        // Reveal the dig path
        this.digPath.style.opacity = '1';
        
        // Animate journey progress
        for (let i = 0; i < steps.length; i++) {
            journeyProgress.style.width = `${steps[i].progress}%`;
            journeyStatusText.textContent = steps[i].status;
            
            // When halfway, start rotating to the end point
            if (steps[i].progress === 50) {
                await this.rotateTo(endLat, endLng, 2000);
            }
            
            // Wait before next step
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Animation complete
        document.getElementById('journey-animation').classList.add('completed');
        document.getElementById('end-location').classList.remove('hidden');
        document.getElementById('reset-btn').classList.remove('hidden');
        
        this.isAnimating = false;
    }
    
    // Reset the earth visualization
    reset() {
        this.earth.style.transform = 'rotateX(0deg) rotateY(0deg)';
        this.startMarker.style.display = 'none';
        this.endMarker.style.display = 'none';
        this.digPath.style.opacity = '0';
        this.isAnimating = false;
    }
}

// Create earth visualizer instance
const earthVisualizer = new EarthVisualizer();