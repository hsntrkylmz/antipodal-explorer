class EarthVisualizer {
    constructor(container = null) {
        console.log('EarthVisualizer constructor called');
        
        // DOM elements
        if (container) {
            this.container = container;
        } else {
            this.container = document.querySelector('.earth-visualization');
        }
        console.log('Container found:', this.container);
        
        // UI elements - will be connected in app.js
        this.progressBar = null;
        this.statusText = null;
        
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
                2000
            );
            this.camera.position.z = 300;
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Set correct color encoding
            if (this.renderer.outputEncoding !== undefined) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }
            
            // Clear container before appending
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            
            this.container.appendChild(this.renderer.domElement);
            
            // Initialize controls
            this.initControls();
            
            // Improved lighting for better realism
            // Ambient light (overall illumination)
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            this.scene.add(ambientLight);
            
            // Main directional light (sunlight)
            const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
            sunLight.position.set(1.5, 0.5, 1);
            this.scene.add(sunLight);
            
            // Add a subtle blue light from the opposite side (earth-shine)
            const backLight = new THREE.DirectionalLight(0x4466aa, 0.4);
            backLight.position.set(-1, -0.2, -1);
            this.scene.add(backLight);
            
            // Create a realistic Earth
            this.createSimpleEarth();
            
            // Add window resize handler
            window.addEventListener('resize', () => {
                this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
            });
            
            // Start animation loop
            this.animate();
            
            this.log('3D Earth initialized successfully with realistic approach');
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
    
    // Initialize controls
    initControls() {
        // Setup OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // An animation loop is required when either damping or auto-rotation is enabled
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 120;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI;
        // this.controls.enabled = false; // Initially disabled
        this.controls.autoRotate = true; // Auto-rotation for an interactive feel
        this.controls.autoRotateSpeed = 0.5; // Slower rotation
    }
    
    // Create a realistic Earth with actual texture maps
    createSimpleEarth() {
        this.log('Creating realistic Earth with texture maps...');
        
        // Create Earth geometry with higher detail
        const earthGeometry = new THREE.SphereGeometry(this.earthRadius, 64, 64);
        
        // Earth texture maps from NASA/public sources
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = "Anonymous";
        
        // Use reliable CDN-hosted texture maps
        const earthTextures = {
            map: 'https://unpkg.com/three-globe@2.24.4/example/img/earth-blue-marble.jpg',
            bumpMap: 'https://unpkg.com/three-globe@2.24.4/example/img/earth-topology.png',
            specularMap: 'https://unpkg.com/three-globe@2.24.4/example/img/earth-water.png',
            cloudsMap: 'https://unpkg.com/three-globe@2.24.4/example/img/earth-clouds.png'
        };
        
        // Create material with realistic Earth properties
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load(earthTextures.map, 
                () => this.log('Earth texture loaded successfully'), 
                undefined, 
                err => console.error('Failed to load Earth texture:', err)),
            bumpMap: textureLoader.load(earthTextures.bumpMap, 
                () => this.log('Bump map loaded successfully'), 
                undefined, 
                err => console.error('Failed to load bump map:', err)),
            bumpScale: 0.8,
            specularMap: textureLoader.load(earthTextures.specularMap, 
                () => this.log('Specular map loaded successfully'), 
                undefined, 
                err => console.error('Failed to load specular map:', err)),
            specular: new THREE.Color(0x666666),
            shininess: 15
        });
        
        // Create Earth mesh
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);
        
        // Create clouds layer
        const cloudsGeometry = new THREE.SphereGeometry(this.earthRadius * 1.01, 64, 64);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load(earthTextures.cloudsMap,
                () => this.log('Clouds texture loaded successfully'),
                undefined,
                err => console.error('Failed to load clouds texture:', err)),
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        this.scene.add(clouds);
        
        // Add slow rotation to clouds
        this.clouds = clouds;
        
        // Add a subtle glow effect (atmosphere)
        const atmosphereGeometry = new THREE.SphereGeometry(this.earthRadius * 1.02, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x5599ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
        
        // Add star field background
        this.addStarField();
    }
    
    // Add a star field to enhance the space ambiance
    addStarField() {
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // Random positions for stars
            positions[i * 3] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
            
            // Random sizes for stars
            sizes[i] = Math.random() * 2;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            sizeAttenuation: true
        });
        
        const starField = new THREE.Points(starsGeometry, starMaterial);
        this.scene.add(starField);
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
    
    // Set marker at a specific lat,lng position and focus on it
    setMarkerPosition(markerID, lat, lng, shouldFocus = true) {
        this.log(`Setting marker ${markerID} at position ${lat.toFixed(2)}, ${lng.toFixed(2)}`);
        const position = this.latLngTo3d(lat, lng, this.earthRadius * 1.02);
        
        // Check if marker already exists, remove it if it does
        if (markerID === 'start-marker' && this.startMarker) {
            this.scene.remove(this.startMarker);
        } else if (markerID === 'end-marker' && this.endMarker) {
            this.scene.remove(this.endMarker);
        }
        
        // Create a marker group
        const markerGroup = new THREE.Group();
        
        // Pin style marker with pin head and stem
        const pinHeadGeometry = new THREE.SphereGeometry(3, 16, 16);
        const pinColor = markerID === 'start-marker' ? 0x00ff00 : 0xff0000;
        const pinMaterial = new THREE.MeshPhongMaterial({
            color: pinColor,
            emissive: pinColor,
            emissiveIntensity: 0.5,
            shininess: 30
        });
        
        const pinHead = new THREE.Mesh(pinHeadGeometry, pinMaterial);
        pinHead.position.copy(position);
        markerGroup.add(pinHead);
        
        // Pin stem (cone pointing to the surface)
        const direction = position.clone().normalize();
        const stemLength = 8;
        const pinStemGeometry = new THREE.CylinderGeometry(0.5, 2, stemLength, 8);
        const pinStem = new THREE.Mesh(pinStemGeometry, pinMaterial);
        
        // Position the stem to point from the surface to the pinhead
        const stemPosition = position.clone().sub(direction.multiplyScalar(stemLength/2));
        pinStem.position.copy(stemPosition);
        
        // Orient the stem to point outward from the center of the Earth
        pinStem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        
        markerGroup.add(pinStem);
        
        // Add a glowing halo effect
        const haloGeometry = new THREE.RingGeometry(5, 8, 32);
        const haloMaterial = new THREE.MeshBasicMaterial({
            color: pinColor,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        halo.position.copy(position);
        halo.lookAt(0, 0, 0); // Face toward the center of the Earth
        markerGroup.add(halo);
        
        // Add label
        const labelText = markerID === 'start-marker' ? 'Start' : 'Destination';
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Draw label text
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = markerID === 'start-marker' ? '#00ff00' : '#ff0000';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(labelText, canvas.width / 2, canvas.height / 2);
        
        // Create label texture and sprite
        const labelTexture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true
        });
        
        const label = new THREE.Sprite(labelMaterial);
        label.position.copy(position.clone().multiplyScalar(1.1));
        label.scale.set(20, 10, 1);
        markerGroup.add(label);
        
        // Add debug info
        console.log(`Marker ${markerID} at: lat=${lat}, lng=${lng}, pos=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
        
        // Store reference and add to scene
        if (markerID === 'start-marker') {
            this.startMarker = markerGroup;
            
            // Only focus on starting point marker
            if (shouldFocus) {
                this.focusOnLocation(position, 1500);
            }
        } else {
            this.endMarker = markerGroup;
            // Don't automatically focus on end marker until animation
        }
        
        this.scene.add(markerGroup);
        
        return position;
    }
    
    // Focus camera on a specific location on the globe
    focusOnLocation(position, duration = 1000, callback) {
        // Calculate an optimal camera position to view this location
        const cameraDirection = position.clone().normalize();
        const cameraDistance = this.earthRadius * 1.8; // Distance from Earth center
        const targetCameraPosition = cameraDirection.multiplyScalar(cameraDistance);
        
        // Zoom to this position
        this.animateCameraTo(targetCameraPosition, new THREE.Vector3(0, 0, 0), duration, callback);
        
        // Temporarily disable controls during animation
        const controlsWereEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        // Re-enable controls after animation if they were enabled before
        if (controlsWereEnabled) {
            setTimeout(() => {
                this.controls.enabled = true;
            }, duration + 100);
        }
    }
    
    // Animate camera to a position and lookAt target
    animateCameraTo(targetPosition, targetLookAt, duration = 1000, callback) {
        const startPosition = this.camera.position.clone();
        const startRotation = this.camera.quaternion.clone();
        
        // Store the start time
        const startTime = Date.now();
        
        // Calculate end rotation
        const endQuat = new THREE.Quaternion();
        const tempCamera = this.camera.clone();
        tempCamera.position.copy(targetPosition);
        tempCamera.lookAt(targetLookAt);
        endQuat.copy(tempCamera.quaternion);
        
        // Disable controls during camera animation
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Animation function
        const updateCamera = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smoother animation
            const ease = this.easeInOutCubic(progress);
            
            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, ease);
            
            // Interpolate rotation using quaternion slerp
            this.camera.quaternion.slerpQuaternions(startRotation, endQuat, ease);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(updateCamera);
            } else {
                // Re-enable controls after animation
                if (this.controls) {
                    setTimeout(() => {
                        this.controls.enabled = true;
                    }, 100);
                }
                
                // Call the callback function if provided
                if (callback && typeof callback === 'function') {
                    callback();
                }
            }
        };
        
        // Start animation
        updateCamera();
    }
    
    // Helper function for camera transitions (cubic easing function)
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Draw path between start and end points through the Earth
    drawDigPath(startLat, startLng, endLat, endLng) {
        this.log(`Drawing dig path from ${startLat.toFixed(2)}, ${startLng.toFixed(2)} to ${endLat.toFixed(2)}, ${endLng.toFixed(2)}`);
        
        // Remove existing path if any
        if (this.digLine) {
            this.scene.remove(this.digLine);
            this.digLine = null;
        }
        
        const startPos = this.latLngTo3d(startLat, startLng, this.earthRadius);
        const endPos = this.latLngTo3d(endLat, endLng, this.earthRadius);
        
        // Create a curve through the Earth
        const points = [];
        const segments = 60; // More segments for smoother curve
        
        // Add points for a curved path through the Earth
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
            // Create a curved path that goes through the center of the Earth
            // Use a quadratic curve for a more natural drilling path
            if (i <= segments / 2) {
                // First half: from start to center
                const segmentT = i / (segments / 2);
                // Curve downward toward center
                const point = new THREE.Vector3();
                
                // Quadratic interpolation: start -> center
                point.x = (1 - segmentT) * (1 - segmentT) * startPos.x + 2 * (1 - segmentT) * segmentT * 0 + segmentT * segmentT * 0;
                point.y = (1 - segmentT) * (1 - segmentT) * startPos.y + 2 * (1 - segmentT) * segmentT * 0 + segmentT * segmentT * 0;
                point.z = (1 - segmentT) * (1 - segmentT) * startPos.z + 2 * (1 - segmentT) * segmentT * 0 + segmentT * segmentT * 0;
                
                points.push(point);
            } else {
                // Second half: from center to end
                const segmentT = (i - segments / 2) / (segments / 2);
                const point = new THREE.Vector3();
                
                // Quadratic interpolation: center -> end
                point.x = (1 - segmentT) * (1 - segmentT) * 0 + 2 * (1 - segmentT) * segmentT * 0 + segmentT * segmentT * endPos.x;
                point.y = (1 - segmentT) * (1 - segmentT) * 0 + 2 * (1 - segmentT) * segmentT * 0 + segmentT * segmentT * endPos.y;
                point.z = (1 - segmentT) * (1 - segmentT) * 0 + 2 * (1 - segmentT) * segmentT * 0 + segmentT * segmentT * endPos.z;
                
                points.push(point);
            }
        }
        
        // Create the path group
        const pathGroup = new THREE.Group();
        
        // Create a tube geometry for a more realistic tunnel effect
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, 2.0, 12, false);
        
        // Create a glowing tunnel material
        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            emissive: 0xffff00,
            emissiveIntensity: 0.4,
            shininess: 30
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        pathGroup.add(tube);
        
        // Add inner tube for more glow effect
        const innerTubeGeometry = new THREE.TubeGeometry(curve, segments, 1.0, 8, false);
        const innerTubeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide,
        });
        
        const innerTube = new THREE.Mesh(innerTubeGeometry, innerTubeMaterial);
        pathGroup.add(innerTube);
        
        // Add dotted line for better visibility
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 5,
            gapSize: 3,
            linewidth: 2
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.computeLineDistances(); // Required for dashed lines
        pathGroup.add(line);
        
        // Add glow effect at key points along the path
        const glowPoints = [
            0, // Start
            Math.floor(segments * 0.25), // Quarter way
            Math.floor(segments * 0.5), // Middle
            Math.floor(segments * 0.75), // Three quarters
            segments // End
        ];
        
        glowPoints.forEach(index => {
            if (index < points.length) {
                const glowGeometry = new THREE.SphereGeometry(3, 16, 16);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.7
                });
                
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.copy(points[index]);
                pathGroup.add(glow);
            }
        });
        
        // Store and add to scene
        this.digLine = pathGroup;
        this.scene.add(pathGroup);
        
        return points;
    }
    
    // Animate the journey through Earth
    startJourneyAnimation(startLat, startLng, endLat, endLng) {
        this.log(`Starting journey animation from (${startLat}, ${startLng}) to (${endLat}, ${endLng})`);
        
        // Set animation state to active
        this.isAnimating = true;
        
        // Create the dig path first for better visualization
        const points = this.drawDigPath(startLat, startLng, endLat, endLng);
        
        // Store camera position for restoration later
        this.initialCameraPosition = this.camera.position.clone();
        this.initialCameraQuaternion = this.camera.quaternion.clone();
        
        // Disable controls during animation
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Stop auto-rotation
        this.autoRotate = false;
        this.controls.autoRotate = false;
        
        // First, focus on the start position before beginning the journey
        this.focusOnLocation(this.latLngTo3d(startLat, startLng, this.earthRadius), 1500, () => {
            // Update UI message
            this.updateStatusMessage("Beginning to dig...");
            
            // Create a traveling sphere to represent our journey
            this.createTraveler();
            
            // Path animation variables
            let pathIndex = 0;
            const pathSpeed = 60 / points.length; // Complete journey in about 60 frames
            let trailPoints = [];
            let lastTrailAddTime = 0;
            
            // Create a group for trails
            if (!this.trailGroup) {
                this.trailGroup = new THREE.Group();
                this.scene.add(this.trailGroup);
            } else {
                // Clear existing trails
                while (this.trailGroup.children.length) {
                    const trail = this.trailGroup.children[0];
                    trail.geometry.dispose();
                    trail.material.dispose();
                    this.trailGroup.remove(trail);
                }
            }
            
            // Animation function for the journey
            const animateJourney = () => {
                if (!this.isAnimating) return;
                
                // Update path position
                if (pathIndex < points.length) {
                    // Update traveler position
                    if (this.traveler) {
                        this.traveler.position.copy(points[pathIndex]);
                    }
                    
                    // Add trail point periodically
                    const now = Date.now();
                    if (now - lastTrailAddTime > 100) { // Add a trail point every 100ms
                        lastTrailAddTime = now;
                        trailPoints.push(points[pathIndex].clone());
                        
                        // Update trail visualization
                        if (trailPoints.length > 1) {
                            this.updateTrail(trailPoints);
                        }
                    }
                    
                    // Update UI message based on journey progress
                    const progress = Math.floor((pathIndex / points.length) * 100);
                    
                    if (progress < 10) {
                        this.updateStatusMessage("Drilling through the Earth's crust...");
                    } else if (progress < 30) {
                        this.updateStatusMessage("Passing through the upper mantle...");
                    } else if (progress < 45) {
                        this.updateStatusMessage("Traveling through the lower mantle...");
                    } else if (progress < 50) {
                        this.updateStatusMessage("Approaching the outer core...");
                    } else if (progress === 50) {
                        this.updateStatusMessage("Reached the Earth's core!");
                        
                        // At the center, pause briefly and take a wider view
                        this.animateCameraToPosition(
                            new THREE.Vector3(0, 0, 350), // Move camera out for a wider view
                            1000, // Duration
                            () => {
                                // Continue journey after pause
                                setTimeout(() => {
                                    this.updateStatusMessage("Continuing journey through the inner core...");
                                }, 500);
                            }
                        );
                    } else if (progress < 70) {
                        this.updateStatusMessage("Leaving the Earth's core...");
                    } else if (progress < 90) {
                        this.updateStatusMessage("Passing through the lower mantle...");
                    } else {
                        this.updateStatusMessage("Almost there! Drilling through the crust...");
                    }
                    
                    // Camera animation at key points
                    if (pathIndex === Math.floor(points.length * 0.25)) {
                        // Quarter way - show the Earth's interior
                        const targetPosition = points[pathIndex].clone().multiplyScalar(1.5);
                        this.animateCameraToPosition(targetPosition, 1000);
                    } else if (pathIndex === Math.floor(points.length * 0.5)) {
                        // Half way - at the center
                        const targetPosition = new THREE.Vector3(0, 0, 200);
                        this.animateCameraToPosition(targetPosition, 1000);
                    } else if (pathIndex === Math.floor(points.length * 0.75)) {
                        // Three quarters - preparing to emerge
                        const targetPosition = points[pathIndex].clone().multiplyScalar(1.5);
                        this.animateCameraToPosition(targetPosition, 1000);
                    }
                    
                    // Increment path index
                    pathIndex += pathSpeed;
                    
                    // Ensure we don't exceed the array length
                    if (pathIndex >= points.length) {
                        pathIndex = points.length - 1;
                    }
                    
                    // Continue animation if not at the end
                    if (pathIndex < points.length - 1) {
                        requestAnimationFrame(animateJourney);
                    } else {
                        // At the end of the path
                        this.updateStatusMessage("Reached destination!");
                        
                        // Focus on the destination point
                        const endPosition = this.latLngTo3d(endLat, endLng, this.earthRadius);
                        this.focusOnLocation(endPosition, 1500, () => {
                            // Enable controls after animation
                            if (this.controls) {
                                this.controls.enabled = true;
                            }
                            
                            // Animation is complete
                            this.isAnimating = false;
                            
                            // Show completion message
                            this.updateStatusMessage("Journey complete! You've reached the antipodal point.");
                            
                            // Leave the traveler at the end position
                            // Hide it after a few seconds
                            setTimeout(() => {
                                if (this.traveler) {
                                    this.scene.remove(this.traveler);
                                    this.traveler = null;
                                }
                            }, 3000);
                        });
                    }
                }
            };
            
            // Start the journey animation
            animateJourney();
        });
    }
    
    // Create a traveling sphere to represent our journey
    createTraveler() {
        // Remove existing traveler if any
        if (this.traveler) {
            this.scene.remove(this.traveler);
        }
        
        const travelerGeometry = new THREE.SphereGeometry(3.5, 32, 32);
        const travelerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        
        this.traveler = new THREE.Mesh(travelerGeometry, travelerMaterial);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(5, 32, 32);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                c: { type: "f", value: 0.3 },
                p: { type: "f", value: 5.0 },
                glowColor: { type: "c", value: new THREE.Color(0xffff00) },
                viewVector: { type: "v3", value: this.camera.position }
            },
            vertexShader: `
                uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                void main() {
                    vec3 vNormal = normalize(normal);
                    vec3 vNormel = normalize(viewVector);
                    intensity = pow(c - dot(vNormal, vNormel), p);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying float intensity;
                void main() {
                    gl_FragColor = vec4(glowColor, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.traveler.add(glow);
        
        this.scene.add(this.traveler);
        return this.traveler;
    }
    
    // Update the trail visualization
    updateTrail(points) {
        // Remove old trail
        for (let i = this.trailGroup.children.length - 1; i >= 0; i--) {
            const trail = this.trailGroup.children[i];
            this.trailGroup.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        }
        
        // Create new trail with current points
        if (points.length > 1) {
            const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const trailMaterial = new THREE.LineBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.7,
                linewidth: 2,
            });
            
            const trail = new THREE.Line(trailGeometry, trailMaterial);
            this.trailGroup.add(trail);
        }
    }
    
    // Update UI status message
    updateStatusMessage(message) {
        if (this.statusText) {
            // Use the statusText reference passed from app.js
            this.statusText.textContent = message;
            
            // Update progress bar if available
            if (this.progressBar) {
                // Get progress value from message if possible
                const progressMatch = message.match(/(\d+)%/);
                if (progressMatch && progressMatch[1]) {
                    const progress = parseInt(progressMatch[1]);
                    this.progressBar.style.width = `${progress}%`;
                }
            }
        } else {
            // Fallback to direct DOM access
            const statusEl = document.getElementById('status-message');
            if (statusEl) {
                statusEl.textContent = message;
            }
        }
        
        // Log for debugging
        this.log(`Status: ${message}`);
    }
    
    // Animation loop
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Update orbit controls if enabled
        if (this.controls) {
            this.controls.update();
        }
        
        // Auto-rotate Earth and clouds when controls are disabled
        if (this.earth && !this.controls.enabled) {
            this.earth.rotation.y += 0.0005;
        }
        
        if (this.clouds) {
            // Clouds always rotate slightly, even when Earth rotation is controlled by user
            this.clouds.rotation.y += 0.0003;
            
            // When Earth is auto-rotating, clouds rotate faster
            if (!this.controls.enabled) {
                this.clouds.rotation.y += 0.0004;
            }
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // Toggle between auto-rotation and manual control
    toggleAutoRotation(enabled) {
        if (this.controls) {
            this.controls.enabled = enabled;
            this.log(`${enabled ? 'Enabled' : 'Disabled'} manual rotation controls`);
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
        
        // Reset camera to default position
        const defaultCameraPosition = new THREE.Vector3(0, 0, 300);
        this.animateCameraTo(defaultCameraPosition, new THREE.Vector3(0, 0, 0), 1500);
        
        // Reset Earth rotation with animation
        if (this.earth) {
            const targetRotation = 0;
            const startRotation = this.earth.rotation.y;
            const duration = 1000;
            const startTime = Date.now();
            
            const animateReset = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);
                
                // Use easing for smoother animation
                const easedProgress = this.easeInOutCubic(progress);
                this.earth.rotation.y = startRotation + (targetRotation - startRotation) * easedProgress;
                
                if (progress < 1) {
                    requestAnimationFrame(animateReset);
                }
            };
            
            animateReset();
        }
        
        // Disable manual controls and resume auto-rotation
        if (this.controls) {
            this.toggleAutoRotation(false);
        }
    }
    
    // Animate camera to specific position
    animateCameraToPosition(targetPosition, duration = 1000, callback) {
        // Calculate target look at (always look at Earth center)
        const targetLookAt = new THREE.Vector3(0, 0, 0);
        
        // Call the main camera animation function
        this.animateCameraTo(targetPosition, targetLookAt, duration, callback);
    }
    
    // Focus on a specific marker (start or end)
    focusOnMarker(markerType = 'start') {
        if (!this.startMarker && !this.endMarker) {
            this.log('No markers to focus on');
            return;
        }
        
        let markerPosition;
        
        if (markerType === 'start' && this.startMarker) {
            // Find the marker head in the group (first sphere)
            const pinHead = this.startMarker.children.find(child => 
                child.geometry && child.geometry.type === 'SphereGeometry');
            
            if (pinHead) {
                markerPosition = pinHead.position.clone();
            } else {
                // Fallback to using the group position
                markerPosition = new THREE.Vector3();
                this.startMarker.getWorldPosition(markerPosition);
            }
        } else if (markerType === 'end' && this.endMarker) {
            // Find the marker head in the group (first sphere)
            const pinHead = this.endMarker.children.find(child => 
                child.geometry && child.geometry.type === 'SphereGeometry');
            
            if (pinHead) {
                markerPosition = pinHead.position.clone();
            } else {
                // Fallback to using the group position
                markerPosition = new THREE.Vector3();
                this.endMarker.getWorldPosition(markerPosition);
            }
        } else {
            // Fallback to whatever marker exists
            const marker = this.startMarker || this.endMarker;
            markerPosition = new THREE.Vector3();
            marker.getWorldPosition(markerPosition);
        }
        
        this.log(`Found marker position: ${markerPosition.x.toFixed(2)}, ${markerPosition.y.toFixed(2)}, ${markerPosition.z.toFixed(2)}`);
        
        // Scale the position out slightly to get a good view
        const direction = markerPosition.clone().normalize();
        const cameraDistance = this.earthRadius * 1.8;
        const scaledPosition = direction.multiplyScalar(cameraDistance);
        
        // Animate camera to this position
        this.animateCameraToPosition(scaledPosition, 1500, () => {
            this.log(`Focused on ${markerType} marker`);
        });
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
    // Note: This is a fallback. The app.js should create its own instance.
    const container = document.querySelector('.earth-visualization');
    if (container && !window.earthVisualizer) {
        window.earthVisualizer = new EarthVisualizer(container);
        console.log('Created global Earth visualizer instance');
    }
});