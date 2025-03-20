class EarthVisualizer {
    constructor() {
        // DOM elements
        this.container = document.querySelector('.earth-visualization');
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
        this.controls = null;
        
        // Animation variables
        this.earthRadius = 100;
        this.isAnimating = false;
        this.animationFrameId = null;
        
        // Debug flag
        this.debug = true;
        
        // Initialize the 3D scene
        this.init();
        
        // Bind methods
        this.setMarkerPosition = this.setMarkerPosition.bind(this);
        this.drawDigPath = this.drawDigPath.bind(this);
        this.startJourneyAnimation = this.startJourneyAnimation.bind(this);
        this.rotateTo = this.rotateTo.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    log(message) {
        if (this.debug) {
            console.log(`[EarthVisualizer] ${message}`);
        }
    }
    
    init() {
        this.log('Initializing 3D Earth...');
        
        // Create scene
        this.scene = new THREE.Scene();
        
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
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Clear container before appending
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        this.container.appendChild(this.renderer.domElement);
        
        // Add OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 150;
        this.controls.maxDistance = 500;
        
        // Create lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(500, 0, 200);
        this.scene.add(sunLight);
        
        // Create Earth
        this.createEarth();
        
        // Add window resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        });
        
        // Start animation loop
        this.animate();
        
        this.log('3D Earth initialized successfully');
    }
    
    createEarth() {
        this.log('Creating Earth...');
        
        // Load Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        // URLs for Earth textures (using Three.js examples)
        const earthMapUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';
        const earthBumpUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg';
        const earthSpecUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg';
        
        // Create Earth sphere with proper error handling
        const earthGeometry = new THREE.SphereGeometry(this.earthRadius, 64, 64);
        
        try {
            const earthMaterial = new THREE.MeshPhongMaterial({
                map: textureLoader.load(
                    earthMapUrl,
                    undefined,
                    undefined,
                    error => console.error('Error loading Earth map texture:', error)
                ),
                bumpMap: textureLoader.load(
                    earthBumpUrl,
                    undefined,
                    undefined,
                    error => console.error('Error loading Earth bump texture:', error)
                ),
                bumpScale: 0.5,
                specularMap: textureLoader.load(
                    earthSpecUrl,
                    undefined,
                    undefined,
                    error => console.error('Error loading Earth specular texture:', error)
                ),
                specular: new THREE.Color(0x333333),
                shininess: 15
            });
            
            this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
            this.scene.add(this.earth);
            this.log('Earth created successfully');
        } catch (error) {
            console.error('Failed to create Earth:', error);
            
            // Fallback to a basic colored sphere if textures fail
            const fallbackMaterial = new THREE.MeshPhongMaterial({
                color: 0x2233ff,
                shininess: 15
            });
            
            this.earth = new THREE.Mesh(earthGeometry, fallbackMaterial);
            this.scene.add(this.earth);
            this.log('Created fallback Earth sphere');
        }
        
        // Add a subtle atmosphere glow
        const atmosphereGeometry = new THREE.SphereGeometry(this.earthRadius * 1.03, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.1,
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
            this.log('Removing existing start marker');
            this.scene.remove(this.startMarker);
            if (this.startMarker.halo) this.scene.remove(this.startMarker.halo);
        } else if (markerID === 'end-marker' && this.endMarker) {
            this.log('Removing existing end marker');
            this.scene.remove(this.endMarker);
            if (this.endMarker.halo) this.scene.remove(this.endMarker.halo);
        }
        
        // Create a new marker
        const markerGeometry = new THREE.SphereGeometry(2.5, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: markerID === 'start-marker' ? 0x1e88e5 : 0xff4081
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
        
        // Add a pulsing effect to the marker (halo)
        const haloGeometry = new THREE.SphereGeometry(5, 16, 16);
        const haloMaterial = new THREE.MeshBasicMaterial({
            color: markerID === 'start-marker' ? 0x1e88e5 : 0xff4081,
            transparent: true,
            opacity: 0.3
        });
        
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        halo.position.copy(position);
        marker.halo = halo;
        
        this.scene.add(halo);
        
        // For debugging - add axes helper
        if (this.debug) {
            const axesHelper = new THREE.AxesHelper(10);
            marker.add(axesHelper);
        }
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
        const midPoint = new THREE.Vector3(0, 0, 0); // Center of the Earth
        
        const points = [];
        const segments = 50;
        
        // Create points along the curve from start to end through Earth's center
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
            // First half of the journey (start to center)
            if (i <= segments / 2) {
                const segT = i / (segments / 2);
                const point = new THREE.Vector3().lerpVectors(startPos, midPoint, segT);
                points.push(point);
            } 
            // Second half (center to end)
            else {
                const segT = (i - segments / 2) / (segments / 2);
                const point = new THREE.Vector3().lerpVectors(midPoint, endPos, segT);
                points.push(point);
            }
        }
        
        // Create geometry from points
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create line material
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff4081,
            opacity: 0.7,
            transparent: true,
            visible: false
        });
        
        // Create line
        this.digLine = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(this.digLine);
        
        return points;
    }
    
    // Rotate the Earth to show a specific point
    rotateTo(lat, lng, duration = 1000) {
        this.log(`Rotating Earth to ${lat.toFixed(2)}, ${lng.toFixed(2)}`);
        
        // Disable controls during rotation
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        const targetPosition = this.latLngTo3d(lat, lng, this.earthRadius);
        const startRotation = {
            x: this.earth.rotation.x,
            y: this.earth.rotation.y,
            z: this.earth.rotation.z
        };
        
        // Calculate the quaternions for smooth rotation
        const startQuaternion = new THREE.Quaternion().copy(this.earth.quaternion);
        
        // Calculate the target rotation that would place the point facing the camera
        const dummyEarth = new THREE.Object3D();
        dummyEarth.position.copy(this.earth.position);
        
        // Add a point at the target position
        const dummyPoint = new THREE.Object3D();
        dummyPoint.position.copy(targetPosition.normalize().multiplyScalar(this.earthRadius));
        dummyEarth.add(dummyPoint);
        
        // Make the dummy earth face the camera with the point
        const cameraDir = new THREE.Vector3(0, 0, 1);
        const targetDir = dummyPoint.position.clone().normalize();
        
        dummyEarth.quaternion.setFromUnitVectors(targetDir, cameraDir);
        const targetQuaternion = dummyEarth.quaternion.clone();
        
        // Reset to original rotation
        this.earth.rotation.set(startRotation.x, startRotation.y, startRotation.z);
        this.earth.quaternion.copy(startQuaternion);
        
        const startTime = Date.now();
        
        return new Promise(resolve => {
            const animate = () => {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                
                // Interpolate rotation
                THREE.Quaternion.slerp(
                    startQuaternion,
                    targetQuaternion,
                    this.earth.quaternion,
                    progress
                );
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Re-enable controls
                    if (this.controls) {
                        this.controls.enabled = true;
                    }
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    // Animate the journey through the Earth
    async startJourneyAnimation(startLat, startLng, endLat, endLng) {
        this.log('Starting journey animation');
        
        if (this.isAnimating) {
            this.log('Animation already in progress, returning');
            return;
        }
        
        this.isAnimating = true;
        
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
        
        try {
            // First rotate to show the starting point
            await this.rotateTo(startLat, startLng);
            
            // Make path visible
            if (this.digLine) {
                this.digLine.material.visible = true;
            }
            
            // Create a traveling sphere that moves along the path
            const travellerGeometry = new THREE.SphereGeometry(4, 16, 16);
            const travellerMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 1
            });
            
            const traveller = new THREE.Mesh(travellerGeometry, travellerMaterial);
            this.scene.add(traveller);
            
            // Get path points
            const pathPoints = this.drawDigPath(startLat, startLng, endLat, endLng);
            
            // Animate through steps
            for (let i = 0; i < steps.length; i++) {
                this.log(`Journey step ${i+1}/${steps.length}: ${steps[i].status}`);
                
                // Update progress UI
                this.progressBar.style.width = `${steps[i].progress}%`;
                this.statusText.textContent = steps[i].status;
                
                // Calculate traveller position along the path
                const pathIndex = Math.floor((steps[i].progress / 100) * (pathPoints.length - 1));
                if (pathPoints[pathIndex]) {
                    traveller.position.copy(pathPoints[pathIndex]);
                }
                
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
            
            // Clean up
            setTimeout(() => {
                this.scene.remove(traveller);
            }, 2000);
            
        } catch (error) {
            console.error('Error during journey animation:', error);
        } finally {
            this.isAnimating = false;
        }
    }
    
    // Animation loop
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        
        // Update orbit controls if enabled
        if (this.controls) {
            this.controls.update();
        }
        
        // Slowly rotate earth when not animating
        if (!this.isAnimating && this.earth && !this.controls.enabled) {
            this.earth.rotation.y += 0.001;
        }
        
        // Pulse the marker halos
        if (this.startMarker && this.startMarker.halo) {
            const scale = 1 + 0.2 * Math.sin(Date.now() * 0.005);
            this.startMarker.halo.scale.set(scale, scale, scale);
        }
        
        if (this.endMarker && this.endMarker.halo) {
            const scale = 1 + 0.2 * Math.sin(Date.now() * 0.005 + Math.PI);
            this.endMarker.halo.scale.set(scale, scale, scale);
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
            if (this.startMarker.halo) this.scene.remove(this.startMarker.halo);
            this.startMarker = null;
        }
        
        if (this.endMarker) {
            this.scene.remove(this.endMarker);
            if (this.endMarker.halo) this.scene.remove(this.endMarker.halo);
            this.endMarker = null;
        }
        
        // Remove path
        if (this.digLine) {
            this.scene.remove(this.digLine);
            this.digLine = null;
        }
        
        // Reset animation state
        this.isAnimating = false;
        
        // Re-enable controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }
}

// Create earth visualizer instance
console.log('Creating Earth visualizer instance');
const earthVisualizer = new EarthVisualizer();