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
            
            // Add OrbitControls for manual rotation
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.minDistance = 150;
            this.controls.maxDistance = 500;
            this.controls.rotateSpeed = 0.5;
            this.controls.enabled = false; // Initially disabled until location is selected
            
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
        } else {
            this.endMarker = markerGroup;
        }
        
        this.scene.add(markerGroup);
        
        // When we set the first marker (start location), enable controls
        if (markerID === 'start-marker') {
            // Initially enable controls for user interaction
            this.toggleAutoRotation(true);
        }
        
        // Focus camera on the marker location if requested
        if (shouldFocus) {
            this.focusOnLocation(position, 1500);
        }
        
        return position;
    }
    
    // Focus camera on a specific location on the globe
    focusOnLocation(position, duration = 1000) {
        // Calculate an optimal camera position to view this location
        const cameraDirection = position.clone().normalize();
        const cameraDistance = this.earthRadius * 1.8; // Distance from Earth center
        const targetCameraPosition = cameraDirection.multiplyScalar(cameraDistance);
        
        // Zoom to this position
        this.animateCameraTo(targetCameraPosition, new THREE.Vector3(0, 0, 0), duration);
        
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
    
    // Easing function for smoother animations
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
        const segments = 40; // More segments for smoother curve
        
        // Add points for a curved path through the Earth
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
            // Create a curved path that goes through the center of the Earth
            // Use a quadratic curve for a more natural drilling path
            if (i <= segments / 2) {
                // First half: from start to center
                const segmentT = i / (segments / 2);
                // Curve downward toward center
                const centerPoint = new THREE.Vector3(0, 0, 0);
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
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, 1.5, 8, false);
        const tubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            emissive: 0xffff00,
            emissiveIntensity: 0.3
        });
        
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        pathGroup.add(tube);
        
        // Add dotted line for better visibility
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 3,
            gapSize: 1,
            linewidth: 2
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.computeLineDistances(); // Required for dashed lines
        pathGroup.add(line);
        
        // Store and add to scene
        this.digLine = pathGroup;
        this.scene.add(pathGroup);
        
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
        
        // Set markers without automatic focusing (we'll control camera manually)
        this.setMarkerPosition('start-marker', startLat, startLng, false);
        this.setMarkerPosition('end-marker', endLat, endLng, false);
        
        // Disable controls during animation
        const controlsWereEnabled = this.controls.enabled;
        this.controls.enabled = false;
        
        // Store camera position for later restoration
        const initialCameraPosition = this.camera.position.clone();
        const initialCameraQuaternion = this.camera.quaternion.clone();
        
        // Get start and end positions
        const startPos = this.latLngTo3d(startLat, startLng, this.earthRadius);
        const endPos = this.latLngTo3d(endLat, endLng, this.earthRadius);
        
        // Draw dig path
        const pathPoints = this.drawDigPath(startLat, startLng, endLat, endLng);
        
        // First focus on the start position
        this.focusOnLocation(startPos.clone().multiplyScalar(1.05), 1500);
        
        // Wait for initial focus to complete before starting journey
        setTimeout(() => {
            // Create a traveling sphere that moves along the path
            const travellerGeometry = new THREE.SphereGeometry(3, 32, 32);
            const travellerMaterial = new THREE.MeshPhongMaterial({
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 0.7,
                shininess: 20
            });
            
            const traveller = new THREE.Mesh(travellerGeometry, travellerMaterial);
            this.scene.add(traveller);
            
            // Add a glowing trail behind the traveller
            const trailGeometry = new THREE.SphereGeometry(2, 16, 16);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            
            // Store trails for animation
            const trails = [];
            const maxTrails = 10;
            
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
                        // Remove traveller and trails
                        this.scene.remove(traveller);
                        trails.forEach(trail => this.scene.remove(trail));
                        
                        // Focus on the destination point
                        this.focusOnLocation(endPos.clone().multiplyScalar(1.05), 1500);
                        
                        // Update UI
                        if (this.progressBar) this.progressBar.style.width = '100%';
                        if (this.statusText) this.statusText.textContent = 'Arrived at your antipodal point!';
                        
                        // Show the destination info
                        const endLocation = document.getElementById('end-location');
                        if (endLocation) endLocation.classList.remove('hidden');
                        
                        const resetBtn = document.getElementById('reset-btn');
                        if (resetBtn) resetBtn.classList.remove('hidden');
                        
                        // Re-enable controls after a delay
                        setTimeout(() => {
                            this.controls.enabled = controlsWereEnabled;
                            this.isAnimating = false;
                        }, 2000);
                        
                    }, 500);
                    
                    return;
                }
                
                // Update traveller position
                traveller.position.copy(pathPoints[pathIndex]);
                
                // Add trail effects
                if (pathIndex % 3 === 0 && pathIndex > 0) {
                    const trail = new THREE.Mesh(trailGeometry, trailMaterial.clone());
                    trail.position.copy(pathPoints[pathIndex - 1]);
                    trail.userData.creationTime = Date.now();
                    trail.userData.initialOpacity = 0.7;
                    trails.push(trail);
                    this.scene.add(trail);
                    
                    // Limit number of trails
                    if (trails.length > maxTrails) {
                        const oldestTrail = trails.shift();
                        this.scene.remove(oldestTrail);
                    }
                }
                
                // Update existing trails (fade out)
                trails.forEach(trail => {
                    const age = Date.now() - trail.userData.creationTime;
                    const opacity = Math.max(0, trail.userData.initialOpacity - (age / 2000));
                    trail.material.opacity = opacity;
                    trail.scale.multiplyScalar(0.98); // Shrink trail over time
                });
                
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
                
                // Camera follows journey at key points
                // First quarter: look at interior
                if (pathIndex === Math.floor(pathPoints.length * 0.25)) {
                    const targetPos = pathPoints[Math.floor(pathPoints.length * 0.5)].clone();
                    const cameraPos = new THREE.Vector3().subVectors(targetPos, pathPoints[pathIndex]).normalize();
                    cameraPos.multiplyScalar(this.earthRadius * 0.8).add(targetPos);
                    
                    this.animateCameraTo(cameraPos, new THREE.Vector3(0, 0, 0), 3000);
                }
                // At Earth center: begin moving toward destination
                else if (pathIndex === Math.floor(pathPoints.length * 0.5)) {
                    const endDirection = endPos.clone().normalize();
                    const cameraDist = this.earthRadius * 0.8;
                    const cameraOffset = endDirection.clone().multiplyScalar(-cameraDist);
                    
                    this.animateCameraTo(cameraOffset, new THREE.Vector3(0, 0, 0), 3000);
                }
                // Three-quarter point: prepare to emerge
                else if (pathIndex === Math.floor(pathPoints.length * 0.75)) {
                    const endDirection = endPos.clone().normalize();
                    const cameraOffset = endDirection.clone().multiplyScalar(-this.earthRadius * 1.2);
                    
                    this.animateCameraTo(cameraOffset, endPos, 2000);
                }
                
                // Increment path index
                pathIndex++;
                
                // Continue animation
                setTimeout(animateDigging, 120);
            };
            
            // Start animation after a delay to allow initial camera focus
            setTimeout(animateDigging, 1800);
            
        }, 1800); // Wait for initial camera movement to complete
    }
    
    // Animate camera to a position and lookAt target
    animateCameraTo(targetPosition, targetLookAt, duration = 1000) {
        const startPosition = this.camera.position.clone();
        const startRotation = this.camera.quaternion.clone();
        
        // Create a dummy camera to calculate the target rotation
        const dummyCamera = this.camera.clone();
        dummyCamera.position.copy(targetPosition);
        dummyCamera.lookAt(targetLookAt);
        const targetRotation = dummyCamera.quaternion.clone();
        
        const startTime = Date.now();
        
        const updateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const easedProgress = this.easeInOutCubic(progress);
            
            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
            
            // Interpolate rotation using quaternions
            THREE.Quaternion.slerp(startRotation, targetRotation, this.camera.quaternion, easedProgress);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(updateCamera);
            }
        };
        
        updateCamera();
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