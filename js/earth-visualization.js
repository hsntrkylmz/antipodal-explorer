class EarthVisualizer {
    constructor(container) {
        console.log('EarthVisualizer constructor called');
        
        // If container is a string, get the element by selector
        if (typeof container === 'string') {
            this.container = document.querySelector(container);
        } else {
            this.container = container;
        }
        
        if (!this.container) {
            console.error('Container not found');
            return;
        }
        
        // UI elements - will be connected in app.js
        this.progressBar = null;
        this.statusText = null;
        
        // Initialize properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.earth = null;
        this.clouds = null;
        this.markerGroups = {};
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isAnimating = false;
        this.traveler = null;
        this.trails = [];
        
        // Animation variables
        this.earthRadius = 100;
        this.animationFrameId = null;
        
        // Debug flag
        this.debug = true;
        
        // Load textures and initialize scene
        this.loadTextures()
            .then(() => {
                this.initScene();
                this.createEarth();
                this.createClouds();
                this.createLighting();
                this.animate();
                
                // Setup event listeners after everything is initialized
                this.setupEventListeners();
            })
            .catch(error => {
                console.error('Error loading textures:', error);
                this.container.innerHTML = `
                    <div style="color: white; text-align: center; padding: 20px;">
                        <p>Error initializing 3D Earth: ${error.message}</p>
                        <p>Please try using a different browser with WebGL support.</p>
                    </div>
                `;
            });
    }
    
    // Initialize the scene, camera, renderer and controls
    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.z = 3;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.rotateSpeed = 0.5;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.enablePan = false;
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 5;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }
    
    log(message) {
        if (this.debug) {
            console.log(`[EarthVisualizer] ${message}`);
        }
    }
    
    // Create a realistic Earth with actual texture maps
    createEarth() {
        console.log('Creating Earth object for visualization');
        
        // Create Earth geometry with higher detail
        const radius = 1.0; // Unit radius for easier calculations
        const earthGeometry = new THREE.SphereGeometry(radius, 64, 64);
        
        // Create material with realistic Earth properties
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: this.textures.earthMap,
            bumpMap: this.textures.earthBumpMap,
            bumpScale: 0.05,
            specularMap: this.textures.earthSpecularMap,
            specular: new THREE.Color(0x333333),
            shininess: 15
        });
        
        // Create Earth mesh
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);
        
        console.log('Earth object created:', this.earth);
        
        // FIXED: Ensure we're using correct radius size across the app
        this.earthRadius = radius; 
        
        // Add star field background to enhance the space ambiance
        this.addStarField();
        
        return this.earth;
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
            size: 0.01,
            transparent: true,
            sizeAttenuation: true
        });
        
        const starField = new THREE.Points(starsGeometry, starMaterial);
        this.scene.add(starField);
    }
    
    // Create cloud layer
    createClouds() {
        // Create clouds layer
        const cloudsGeometry = new THREE.SphereGeometry(this.earthRadius * 1.01, 64, 64);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
            map: this.textures.cloudsMap,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        this.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        this.scene.add(this.clouds);
        
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
    }
    
    // Create lighting for the scene
    createLighting() {
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
    }
    
    // Load textures
    loadTextures() {
        return new Promise((resolve, reject) => {
            try {
                // Check that THREE is properly loaded
                if (typeof THREE === 'undefined') {
                    console.error('THREE is not defined. Make sure THREE.js is loaded before initializing the EarthVisualizer.');
                    throw new Error('THREE.js library not loaded properly');
                }
                
                const textureLoader = new THREE.TextureLoader();
                textureLoader.crossOrigin = "Anonymous";
                
                // Initialize empty texture placeholders
                this.textures = {
                    earthMap: null,
                    earthBumpMap: null,
                    earthSpecularMap: null,
                    cloudsMap: null
                };
                
                // Use reliable CDN-hosted texture maps with fallbacks
                const textureURLs = {
                    earthMap: [
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-blue-marble.jpg',
                        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
                        'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg'
                    ],
                    earthBumpMap: [
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-topology.png',
                        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg'
                    ],
                    earthSpecularMap: [
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-water.png',
                        'https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.jpg'
                    ],
                    cloudsMap: [
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-clouds.png',
                        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_2048.jpg',
                        'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg'
                    ]
                };
                
                // Debug flag for texture loading
                console.log('Starting to load textures with THREE.TextureLoader...');
                
                // Count of successfully loaded textures
                let loadedCount = 0;
                const totalTextures = Object.keys(textureURLs).length;
                
                // Function to try loading a texture from multiple URLs
                const tryLoadingTexture = (key, urlIndex = 0) => {
                    // If we've tried all URLs for this texture
                    if (urlIndex >= textureURLs[key].length) {
                        console.error(`Failed to load ${key} after trying all URLs`);
                        // Create a placeholder colored texture
                        const canvas = document.createElement('canvas');
                        canvas.width = 256;
                        canvas.height = 256;
                        const ctx = canvas.getContext('2d');
                        
                        // Different colors for different texture types
                        const colors = {
                            earthMap: '#1565C0',
                            earthBumpMap: '#555555',
                            earthSpecularMap: '#AAAAAA',
                            cloudsMap: '#FFFFFF'
                        };
                        
                        ctx.fillStyle = colors[key] || '#AAAAAA';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Add some text to indicate this is a fallback
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('Texture Not Available', canvas.width/2, canvas.height/2);
                        
                        // Create texture from canvas
                        const texture = new THREE.CanvasTexture(canvas);
                        this.textures[key] = texture;
                        
                        loadedCount++;
                        console.log(`Created fallback texture for ${key} (${loadedCount}/${totalTextures})`);
                        
                        if (loadedCount === totalTextures) {
                            console.log('All textures loaded using fallbacks where needed');
                            resolve();
                        }
                        return;
                    }
                    
                    const url = textureURLs[key][urlIndex];
                    console.log(`Attempting to load ${key} from ${url}`);
                    
                    textureLoader.load(
                        url,
                        (texture) => {
                            // Success
                            this.textures[key] = texture;
                            loadedCount++;
                            console.log(`Loaded texture: ${key} from ${url} (${loadedCount}/${totalTextures})`);
                            
                            if (loadedCount === totalTextures) {
                                console.log('All textures loaded successfully');
                                resolve();
                            }
                        },
                        // Progress callback
                        (xhr) => {
                            console.log(`${key} ${Math.round((xhr.loaded / xhr.total) * 100)}% loaded`);
                        },
                        // Error callback
                        (error) => {
                            console.warn(`Failed to load texture ${key} from ${url}:`, error);
                            // Try the next URL
                            tryLoadingTexture(key, urlIndex + 1);
                        }
                    );
                };
                
                // Start loading all textures
                for (const key of Object.keys(textureURLs)) {
                    tryLoadingTexture(key);
                }
            } catch (error) {
                console.error('Error in loadTextures:', error);
                reject(error);
            }
        });
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
        
        // FIXED: Properly track markers with the markerGroups object
        if (this.markerGroups[markerID]) {
            this.scene.remove(this.markerGroups[markerID]);
            // Dispose geometries and materials to avoid memory leaks
            this.markerGroups[markerID].traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        // Create a marker group
        const markerGroup = new THREE.Group();
        markerGroup.name = markerID;
        
        // Pin style marker with pin head and stem
        const pinHeadGeometry = new THREE.SphereGeometry(0.05, 16, 16);
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
        const stemLength = 0.08;
        const pinStemGeometry = new THREE.CylinderGeometry(0.01, 0.03, stemLength, 8);
        const pinStem = new THREE.Mesh(pinStemGeometry, pinMaterial);
        
        // Position the stem to point from the surface to the pinhead
        const stemPosition = position.clone().sub(direction.multiplyScalar(stemLength/2));
        pinStem.position.copy(stemPosition);
        
        // Orient the stem to point outward from the center of the Earth
        pinStem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        
        markerGroup.add(pinStem);
        
        // Add a glowing halo effect
        const haloGeometry = new THREE.RingGeometry(0.06, 0.09, 32);
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
        label.scale.set(0.2, 0.1, 1);
        markerGroup.add(label);
        
        // Add debug info
        console.log(`Marker ${markerID} at: lat=${lat}, lng=${lng}, pos=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
        
        // FIXED: Store in markerGroups and add to scene
        this.markerGroups[markerID] = markerGroup;
        this.scene.add(markerGroup);
        
        // For backward compatibility - maintain old references
        if (markerID === 'start-marker') {
            this.startMarker = markerGroup;
            
            // Only focus on starting point marker
            if (shouldFocus) {
                this.focusOnLocation(position, 1500);
            }
        } else if (markerID === 'end-marker') {
            this.endMarker = markerGroup;
            // Don't automatically focus on end marker until animation
        }
        
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
        const segments = 50; // Reduced for better performance
        
        // Add points for a curved path through the Earth
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
            // Create a curved path that goes through the center of the Earth
            if (i <= segments / 2) {
                // First half: from start to center
                const segmentT = i / (segments / 2);
                // Curve downward toward center
                const point = new THREE.Vector3();
                
                // Linear interpolation to center
                point.x = (1 - segmentT) * startPos.x;
                point.y = (1 - segmentT) * startPos.y;
                point.z = (1 - segmentT) * startPos.z;
                
                points.push(point);
            } else {
                // Second half: from center to end
                const segmentT = (i - segments / 2) / (segments / 2);
                const point = new THREE.Vector3();
                
                // Linear interpolation from center
                point.x = segmentT * endPos.x;
                point.y = segmentT * endPos.y;
                point.z = segmentT * endPos.z;
                
                points.push(point);
            }
        }
        
        // Create the path group
        const pathGroup = new THREE.Group();
        
        // Create a tube geometry for a tunnel effect
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, 2.5, 8, false);
        
        // Create a glowing tunnel material
        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        pathGroup.add(tube);
        
        // Add dotted line for better visibility
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 3,
            gapSize: 1,
            linewidth: 1
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.computeLineDistances(); // Required for dashed lines
        pathGroup.add(line);
        
        // Add key glow points at start, middle, and end
        const keyPoints = [0, Math.floor(segments/2), segments];
        
        keyPoints.forEach(index => {
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
    focusOnMarker(markerType) {
        console.log(`Attempting to focus on marker: ${markerType}`);
        
        // FIXED: Handle both old marker ID format and new format
        const markerID = markerType.endsWith('-marker') ? markerType : `${markerType}-marker`;
        
        if (!this.markerGroups[markerID]) {
            console.warn(`Marker ${markerID} not found for focusing`);
            return;
        }
        
        const markerGroup = this.markerGroups[markerID];
        
        // Find the pin head in the marker group (sphere at index 0)
        let markerPosition;
        if (markerGroup.children.length > 0) {
            const pinHead = markerGroup.children.find(child => 
                child.geometry && child.geometry.type === 'SphereGeometry');
                
            if (pinHead) {
                markerPosition = new THREE.Vector3();
                pinHead.getWorldPosition(markerPosition);
                console.log(`Found marker position from pin head: ${markerPosition.x.toFixed(2)}, ${markerPosition.y.toFixed(2)}, ${markerPosition.z.toFixed(2)}`);
            }
        }
        
        // If we couldn't find the pin head, use the group's position
        if (!markerPosition) {
            markerPosition = new THREE.Vector3();
            markerGroup.getWorldPosition(markerPosition);
            console.log(`Using marker group position: ${markerPosition.x.toFixed(2)}, ${markerPosition.y.toFixed(2)}, ${markerPosition.z.toFixed(2)}`);
        }
        
        // Scale the position out slightly to get a good view
        const direction = markerPosition.clone().normalize();
        const cameraDistance = this.earthRadius * 1.8;
        const targetPosition = direction.multiplyScalar(cameraDistance);
        
        console.log(`Moving camera to: ${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}`);
        
        // Animate camera to this position
        this.animateCameraToPosition(targetPosition, 1000, () => {
            console.log(`Successfully focused on ${markerID}`);
        });
    }
    
    // Add a new method for setting up event listeners
    setupEventListeners() {
        console.log('Setting up event listeners for globe clicks');
        
        // Add click event listener to the renderer's canvas
        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.isAnimating) {
                console.log('Ignoring click during animation');
                return;
            }
            
            console.log('Globe clicked');
            
            // Get canvas-relative mouse coordinates
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            console.log('Mouse coords:', this.mouse.x, this.mouse.y);
            
            // FIXED: Create a temporary raycaster for this specific click
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(this.mouse, this.camera);
            
            // Cast ray against ALL objects in the scene that are meshes
            const meshes = [];
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh && 
                    object !== this.traveler && 
                    !this.markerGroups['start-marker']?.children.includes(object) && 
                    !this.markerGroups['end-marker']?.children.includes(object)) {
                    meshes.push(object);
                }
            });
            
            // Log all detected meshes for debugging
            console.log('Detected meshes for raycasting:', meshes.length);
            
            // Intersect with any mesh in the scene
            const intersects = raycaster.intersectObjects(meshes);
            console.log('Intersections found:', intersects.length);
            
            // If something was clicked
            if (intersects.length > 0) {
                // Get the intersection point
                const point = intersects[0].point.clone().normalize();
                
                // Convert to latitude and longitude
                const lat = Math.asin(point.y) * (180 / Math.PI);
                const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
                
                console.log('Clicked position:', lat, lng);
                
                // Set the start marker at the clicked location
                this.setMarkerPosition('start-marker', lat, lng, true);
                
                // Calculate antipodal point
                const antiLat = -lat;
                let antiLng = lng + 180;
                if (antiLng > 180) antiLng -= 360;
                
                // Set the end marker at the antipodal point
                this.setMarkerPosition('end-marker', antiLat, antiLng, false);
                
                // Dispatch a custom event with the location data for app.js to use
                const locationEvent = new CustomEvent('location-selected', {
                    detail: {
                        start: { lat, lng },
                        end: { lat: antiLat, lng: antiLng }
                    }
                });
                console.log('Dispatching location-selected event');
                this.container.dispatchEvent(locationEvent);
                
                // FIXED: Add visual feedback for successful click
                this.showClickFeedback(intersects[0].point);
                
                return true;
            } else {
                console.log('No intersection with Earth objects');
                return false;
            }
        });
        
        // Add hover effect to show cursor change when hovering over the earth
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (this.isAnimating) return;
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // FIXED: Use the same broad raycasting approach for consistency
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(this.mouse, this.camera);
            
            const meshes = [];
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh && 
                    object !== this.traveler && 
                    !this.markerGroups['start-marker']?.children.includes(object) && 
                    !this.markerGroups['end-marker']?.children.includes(object)) {
                    meshes.push(object);
                }
            });
            
            const intersects = raycaster.intersectObjects(meshes);
            
            if (intersects.length > 0) {
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.renderer.domElement.style.cursor = 'default';
            }
        });
    }
    
    // ADDED: Visual feedback for successful click
    showClickFeedback(position) {
        // Create a small sphere at the clicked position
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        
        const feedback = new THREE.Mesh(geometry, material);
        feedback.position.copy(position);
        this.scene.add(feedback);
        
        // Create expanding ring
        const ringGeometry = new THREE.RingGeometry(0.05, 0.07, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.lookAt(0, 0, 0); // Face toward center
        this.scene.add(ring);
        
        // Animate and remove
        let scale = 1;
        let opacity = 0.8;
        
        const expandRing = () => {
            scale += 0.08;
            opacity -= 0.03;
            
            ring.scale.set(scale, scale, scale);
            ringMaterial.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(expandRing);
            } else {
                this.scene.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
            }
        };
        
        expandRing();
        
        // Remove feedback after animation
        setTimeout(() => {
            this.scene.remove(feedback);
            feedback.geometry.dispose();
            feedback.material.dispose();
        }, 500);
    }
}

// Wait for DOM to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Earth visualizer');
    
    // FIXED: Check for WebGL compatibility first
    if (!isWebGLAvailable()) {
        showWebGLError();
        return;
    }
    
    // Global error handler for THREE.js issues
    window.handleThreeJsError = function() {
        console.error('THREE.js runtime error detected');
        const container = document.querySelector('.earth-visualization');
        if (container) {
            container.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px;">
                    <p>Error: THREE.js encountered a runtime error.</p>
                    <p>Please try refreshing the page or use a different browser.</p>
                    <button id="reload-threejs" style="padding: 10px 20px; margin-top: 15px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Reload Earth Viewer
                    </button>
                </div>
            `;
            
            // Add reload button functionality
            const reloadBtn = document.getElementById('reload-threejs');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', function() {
                    location.reload();
                });
            }
        }
    };
    
    // Check if THREE is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded!');
        const container = document.querySelector('.earth-visualization');
        if (container) {
            container.innerHTML = `
                <div style="color: white; text-align: center; padding: 20px;">
                    <p>Error: THREE.js library failed to load.</p>
                    <p>Please check your internet connection and try refreshing the page.</p>
                    <p>If the problem persists, try a different browser with WebGL support.</p>
                    <button id="reload-threejs" style="padding: 10px 20px; margin-top: 15px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Reload Earth Viewer
                    </button>
                </div>
            `;
            
            // Add reload button functionality
            const reloadBtn = document.getElementById('reload-threejs');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', function() {
                    location.reload();
                });
            }
        }
        return;
    }
    
    try {
        // Try to create a WebGL renderer to test WebGL support
        const testRenderer = new THREE.WebGLRenderer();
        testRenderer.dispose();
        
        // FIXED: Delay creation of global instance to ensure THREE.js is fully loaded
        setTimeout(() => {
            // Create global instance for other scripts to use
            // Note: This is a fallback. The app.js should create its own instance.
            const container = document.querySelector('.earth-visualization');
            if (container && !window.earthVisualizer) {
                window.earthVisualizer = new EarthVisualizer(container);
                console.log('Created global Earth visualizer instance');
            }
        }, 200);
    } catch (error) {
        console.error('WebGL initialization error:', error);
        showWebGLError(error.message);
    }
});

// FIXED: Helper functions for WebGL detection and error handling
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

function showWebGLError(message = '') {
    const container = document.querySelector('.earth-visualization');
    if (container) {
        container.innerHTML = `
            <div style="color: white; text-align: center; padding: 20px;">
                <p>Error initializing WebGL: ${message || 'Your browser may not support WebGL'}</p>
                <p>Please try using a different browser with WebGL support.</p>
                <p>Check that hardware acceleration is enabled in your browser settings.</p>
                <button id="reload-threejs" style="padding: 10px 20px; margin-top: 15px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
        
        // Add reload button functionality
        const reloadBtn = document.getElementById('reload-threejs');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', function() {
                location.reload();
            });
        }
    }
}