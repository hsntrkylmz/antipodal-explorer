class EarthVisualizer {
    constructor() {
        console.log('EarthVisualizer constructor called');
        
        // DOM elements
        this.container = document.querySelector('.earth-visualization');
        console.log('Container found:', this.container);
        
        this.progressBar = document.getElementById('journey-progress-bar');
        this.statusText = document.getElementById('journey-status-text');
        
        // Three.js variables
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.startMarker = null;
        this.endMarker = null;
        this.digLine = null;
        
        // Animation variables
        this.earthRadius = 100;
        this.isAnimating = false;
        this.animationFrameId = null;
        
        // Debug flag
        this.debug = true;
        
        // Initialize the 3D scene
        this.init();
    }
    
    log(message) {
        if (this.debug) {
            console.log(`[EarthVisualizer] ${message}`);
        }
    }
    
    init() {
        this.log('Initializing 3D Earth with simple approach...');
        
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                45, 
                this.container.offsetWidth / this.container.offsetHeight, 
                0.1, 
                1000
            );
            this.camera.position.z = 300;
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true
            });
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
            
            // Clear container before appending
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            
            this.container.appendChild(this.renderer.domElement);
            
            // Add simple lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            this.scene.add(directionalLight);
            
            // Create a simple Earth
            this.createSimpleEarth();
            
            // Start animation loop
            this.animate();
            
            this.log('3D Earth initialized successfully with simple approach');
        } catch (error) {
            console.error('Error initializing Earth:', error);
            this.container.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px;">
                    <p>Error initializing 3D Earth: ${error.message}</p>
                    <p>Please try using a different browser with WebGL support.</p>
                </div>
            `;
        }
    }
    
    // Create a simple Earth with procedural textures
    createSimpleEarth() {
        // Create a simple earth with gradient colors
        const earthGeometry = new THREE.SphereGeometry(this.earthRadius, 32, 32);
        
        // Create a canvas for the texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with gradient blue (water)
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#1e4877'); // dark blue at poles
        bgGradient.addColorStop(0.5, '#4584b4'); // medium blue at equator
        bgGradient.addColorStop(1, '#1e4877'); // dark blue at poles again
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add random land masses (green)
        ctx.fillStyle = '#55AA55';
        
        // Draw some continents
        // Africa + Europe
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.5, canvas.height * 0.4, 150, 180, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Americas
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.3, canvas.height * 0.5, 100, 200, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Asia + Australia
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.7, canvas.height * 0.5, 180, 160, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Antarctica
        ctx.fillStyle = '#EEEEEE';
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.5, canvas.height * 0.85, 120, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Create the texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create the Earth material and mesh
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: texture,
            shininess: 5
        });
        
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);
        
        // Add a glowing atmosphere
        const atmosphereGeometry = new THREE.SphereGeometry(this.earthRadius * 1.025, 32, 32);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
    }
    
    // Convert latitude and longitude to 3D position on the globe
    latLngTo3d(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        return new THREE.Vector3(x, y, z);
    }
    
    // Set marker at a specific lat,lng position
    setMarkerPosition(markerID, lat, lng) {
        this.log(`Setting marker ${markerID} at position ${lat.toFixed(2)}, ${lng.toFixed(2)}`);
        const position = this.latLngTo3d(lat, lng, this.earthRadius * 1.01);
        
        // Check if marker already exists, remove it if it does
        if (markerID === 'start-marker' && this.startMarker) {
            this.scene.remove(this.startMarker);
        } else if (markerID === 'end-marker' && this.endMarker) {
            this.scene.remove(this.endMarker);
        }
        
        // Create a new marker
        const markerGeometry = new THREE.SphereGeometry(3, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: markerID === 'start-marker' ? 0x00ff00 : 0xff0000
        });
        
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);
        
        // Store reference and add to scene
        if (markerID === 'start-marker') {
            this.startMarker = marker;
        } else {
            this.endMarker = marker;
        }
        
        this.scene.add(marker);
    }
    
    // Draw path between start and end points through the Earth
    drawDigPath(startLat, startLng, endLat, endLng) {
        this.log(`Drawing dig path from ${startLat.toFixed(2)}, ${startLng.toFixed(2)} to ${endLat.toFixed(2)}, ${endLng.toFixed(2)}`);
        
        // Remove existing path if any
        if (this.digLine) {
            this.scene.remove(this.digLine);
        }
        
        const startPos = this.latLngTo3d(startLat, startLng, this.earthRadius);
        const endPos = this.latLngTo3d(endLat, endLng, this.earthRadius);
        
        // Create a curve through the Earth
        const points = [];
        
        // Add points for a curved path through the Earth
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const point = new THREE.Vector3().lerpVectors(startPos, endPos, t);
            
            // Scale the point to stay slightly inside the Earth
            if (i > 0 && i < 20) {
                const distToCenter = point.length();
                const centerFactor = Math.min(1, this.earthRadius * 0.6 / distToCenter);
                point.multiplyScalar(centerFactor);
            }
            
            points.push(point);
        }
        
        // Create geometry from points
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create line material
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2
        });
        
        // Create line
        this.digLine = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(this.digLine);
        
        return points;
    }
    
    // Start the digging journey animation
    startJourneyAnimation(startLat, startLng, endLat, endLng) {
        this.log('Starting journey animation');
        
        if (this.isAnimating) {
            this.log('Animation already in progress');
            return;
        }
        
        this.isAnimating = true;
        
        // Set markers
        this.setMarkerPosition('start-marker', startLat, startLng);
        this.setMarkerPosition('end-marker', endLat, endLng);
        
        // Draw dig path
        const pathPoints = this.drawDigPath(startLat, startLng, endLat, endLng);
        
        // Create a traveling sphere that moves along the path
        const travellerGeometry = new THREE.SphereGeometry(5, 16, 16);
        const travellerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00
        });
        
        const traveller = new THREE.Mesh(travellerGeometry, travellerMaterial);
        this.scene.add(traveller);
        
        // Start at the beginning of the path
        let pathIndex = 0;
        if (pathPoints[0]) {
            traveller.position.copy(pathPoints[0]);
        }
        
        // Update UI
        if (this.progressBar) this.progressBar.style.width = '0%';
        if (this.statusText) this.statusText.textContent = 'Starting to dig...';
        
        // Animation function
        const animateDigging = () => {
            if (pathIndex >= pathPoints.length) {
                // Animation complete
                setTimeout(() => {
                    this.scene.remove(traveller);
                    this.isAnimating = false;
                    
                    // Update UI
                    if (this.progressBar) this.progressBar.style.width = '100%';
                    if (this.statusText) this.statusText.textContent = 'Arrived at your antipodal point!';
                    
                    // Show the destination info
                    const endLocation = document.getElementById('end-location');
                    if (endLocation) endLocation.classList.remove('hidden');
                    
                    const resetBtn = document.getElementById('reset-btn');
                    if (resetBtn) resetBtn.classList.remove('hidden');
                }, 500);
                
                return;
            }
            
            // Update traveller position
            traveller.position.copy(pathPoints[pathIndex]);
            
            // Update progress
            const progress = Math.floor((pathIndex / (pathPoints.length - 1)) * 100);
            if (this.progressBar) this.progressBar.style.width = `${progress}%`;
            
            // Update status text
            if (this.statusText) {
                if (progress < 25) {
                    this.statusText.textContent = 'Penetrating the Earth\'s crust...';
                } else if (progress < 50) {
                    this.statusText.textContent = 'Passing through the mantle...';
                } else if (progress < 75) {
                    this.statusText.textContent = 'Crossing through the core...';
                } else {
                    this.statusText.textContent = 'Approaching the surface...';
                }
            }
            
            // Increment path index
            pathIndex++;
            
            // Continue animation
            setTimeout(animateDigging, 150);
        };
        
        // Start animation
        animateDigging();
    }
    
    // Animation loop
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Slowly rotate earth
        if (this.earth) {
            this.earth.rotation.y += 0.002;
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // Reset the earth visualization
    reset() {
        this.log('Resetting Earth visualization');
        
        // Remove markers
        if (this.startMarker) {
            this.scene.remove(this.startMarker);
            this.startMarker = null;
        }
        
        if (this.endMarker) {
            this.scene.remove(this.endMarker);
            this.endMarker = null;
        }
        
        // Remove path
        if (this.digLine) {
            this.scene.remove(this.digLine);
            this.digLine = null;
        }
        
        // Reset animation state
        this.isAnimating = false;
    }
}

// Wait for DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Earth visualizer');
    
    // Check if THREE is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded!');
        const container = document.querySelector('.earth-visualization');
        if (container) {
            container.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px;">
                    <p>Error: THREE.js library failed to load.</p>
                    <p>Please check your internet connection and try again.</p>
                </div>
            `;
        }
        return;
    }
    
    // Create global instance for other scripts to use
    window.earthVisualizer = new EarthVisualizer();
});