class EarthVisualizer {
    constructor(container = '.earth-visualization') {
        // Ensure THREE is loaded before proceeding
        if (typeof THREE === 'undefined') {
            console.error('THREE.js not loaded! Cannot initialize EarthVisualizer.');
            if (typeof container === 'string') {
                const containerEl = document.querySelector(container);
                if (containerEl) {
                    containerEl.innerHTML = `
                        <div style="color: white; text-align: center; padding: 20px;">
                            <p>Error: THREE.js library is not loaded.</p>
                            <p>Please check your internet connection and try again.</p>
                            <button onclick="window.location.reload()" 
                                    style="padding: 10px 20px; margin-top: 15px; background-color: #3498db; color: white; 
                                    border: none; border-radius: 5px; cursor: pointer;">
                                Reload Page
                            </button>
                        </div>
                    `;
                }
            }
            return;
        }
        
        this.log('Initializing Earth Visualizer');
        this.debug = true; // Enable logging for troubleshooting
        
        // Get container element
        if (typeof container === 'string') {
            this.container = document.querySelector(container);
        } else {
            this.container = container;
        }
        
        if (!this.container) {
            console.error('Could not find container element:', container);
            return;
        }
        
        // Check if WebGL is available
        if (!this.isWebGLAvailable()) {
            this.showWebGLError();
            return;
        }
        
        // Display loading message
        this.showLoading();
        
        // Set up basic properties
        this.earthRadius = 1.0;
        this.markerGroups = {};
        this.isAnimating = false;
        this.travelerSpeed = 0.005;
        this.digPathSegments = 50;
        this.lastAnimateTime = 0;
        this.rotationSpeed = 0.0005;
        this.tunnelMeshes = [];
        
        // Prepare variables for animation
        this.startMarker = null;
        this.endMarker = null;
        this.digPath = null;
        this.travelerMesh = null;
        
        try {
            // Create the scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
            
            // Create the camera
            this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.01, 1000);
            this.camera.position.z = 3;
            
            // Create the renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.container.appendChild(this.renderer.domElement);
            
            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0x333333);
            this.scene.add(ambientLight);
            
            // Add directional light (sun)
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 3, 5);
            this.scene.add(directionalLight);
            
            // Create mouse object for raycasting
            this.mouse = new THREE.Vector2();
            
            // First create stars background
            this.createStarField();
            
            // Load textures and create Earth with better error handling
            this.loadTextures()
                .then(() => {
                    this.log('Textures loaded, creating Earth');
                    // Continue initialization regardless of texture loading result
                    this.createEarth();
                    this.createClouds();
                    this.setupControls();
                    this.setupInteractions();
                    this.setupEventListeners();
                    this.hideLoading();
                    
                    // Start animation loop
                    this.animate();
                })
                .catch(error => {
                    console.error('Error in texture loading process:', error);
                    // Still try to create Earth with fallbacks
                    this.log('Attempting to create Earth with fallbacks after texture error');
                    this.createEarth();
                    this.setupControls();
                    this.setupInteractions();
                    this.setupEventListeners();
                    this.hideLoading();
                    
                    // Start animation loop
                    this.animate();
                });
                
            // Handle window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
        } catch (error) {
            console.error('Error initializing EarthVisualizer:', error);
            this.showLoadingError();
        }
    }
    
    // Create a star field background
    createStarField() {
        try {
            const starsGeometry = new THREE.BufferGeometry();
            const starsMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.02,
                transparent: true,
                opacity: 0.8,
                sizeAttenuation: true
            });
            
            // Create 2000 stars positioned randomly in a sphere
            const radius = 30;
            const starsCount = 2000;
            const positions = new Float32Array(starsCount * 3);
            
            for (let i = 0; i < starsCount; i++) {
                const i3 = i * 3;
                
                // Random position on a sphere (not completely uniform but good enough)
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;
                const r = radius * (0.5 + Math.random() * 0.5); // Vary distance
                
                positions[i3] = r * Math.sin(theta) * Math.cos(phi);
                positions[i3 + 1] = r * Math.sin(theta) * Math.sin(phi);
                positions[i3 + 2] = r * Math.cos(theta);
            }
            
            starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            this.stars = new THREE.Points(starsGeometry, starsMaterial);
            this.scene.add(this.stars);
            this.log('Created star field background');
        } catch (error) {
            console.warn('Could not create star field:', error);
            // Not critical, continue without stars
        }
    }
    
    // Set up controls for camera
    setupControls() {
        try {
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
            this.log('Camera controls initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize controls:', error);
            // Create a simple controls alternative if OrbitControls fails
            this.setupSimpleControls();
            return false;
        }
    }
    
    // Simple controls alternative if OrbitControls fails
    setupSimpleControls() {
        this.log('Setting up simple controls fallback');
        this.simpleControls = {
            enabled: true,
            autoRotate: true,
            update: () => {
                // Simple autorotation fallback
                if (this.simpleControls.autoRotate && this.earth) {
                    this.earth.rotation.y += 0.002;
                }
            }
        };
        // Use this as controls
        this.controls = this.simpleControls;
    }
    
    // Check if WebGL is available
    isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (error) {
            return false;
        }
    }
    
    // Show WebGL error message
    showWebGLError() {
        this.container.innerHTML = `
            <div style="color: white; text-align: center; padding: 20px;">
                <h3>WebGL Not Available</h3>
                <p>Your browser or device doesn't support WebGL, which is required for 3D Earth visualization.</p>
                <p>Please try using a modern browser like Chrome, Firefox, or Edge.</p>
                <button onclick="window.location.reload()" 
                        style="padding: 10px 20px; margin-top: 15px; background-color: #3498db; color: white; 
                        border: none; border-radius: 5px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
    
    // Display loading indicator
    showLoading() {
        // Remove any existing loading message
        const existingLoader = this.container.querySelector('.earth-loader');
        if (existingLoader) existingLoader.remove();
        
        // Create loading message
        const loader = document.createElement('div');
        loader.className = 'earth-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <div class="loader-text">Loading Earth...</div>
        `;
        
        // Style the loader
        const style = document.createElement('style');
        style.textContent = `
            .earth-loader {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                font-family: Arial, sans-serif;
                z-index: 1000;
            }
            
            .loader-spinner {
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 5px solid #3498db;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loader-text {
                font-size: 16px;
            }
        `;
        
        // Add to container
        document.head.appendChild(style);
        this.container.appendChild(loader);
    }
    
    // Hide loading indicator
    hideLoading() {
        const loader = this.container.querySelector('.earth-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                loader.remove();
            }, 500);
        }
    }
    
    // Show loading error with retry button
    showLoadingError() {
        // Remove any existing loading message
        const existingLoader = this.container.querySelector('.earth-loader');
        if (existingLoader) existingLoader.remove();
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'earth-loader';
        errorDiv.innerHTML = `
            <div class="loader-text error">Failed to load Earth textures</div>
            <button class="retry-button">Retry</button>
        `;
        
        // Style the error
        const style = document.createElement('style');
        style.textContent = `
            .earth-loader .error {
                color: #e74c3c;
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 20px;
            }
            
            .retry-button {
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.3s;
            }
            
            .retry-button:hover {
                background: #2980b9;
            }
        `;
        
        // Add to container
        document.head.appendChild(style);
        this.container.appendChild(errorDiv);
        
        // Add retry event
        const retryButton = errorDiv.querySelector('.retry-button');
        retryButton.addEventListener('click', () => {
            errorDiv.remove();
            this.showLoading();
            
            // Reload textures and try again
            this.loadTextures()
                .then(() => {
                    this.createEarth();
                    this.createClouds();
                    this.setupControls();
                    this.setupInteractions();
                    this.hideLoading();
                    
                    // Start animation loop
                    this.animate();
                })
                .catch(error => {
                    console.error('Error reloading textures:', error);
                    this.showLoadingError();
                });
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
    
    // Create the Earth with detailed textures
    createEarth() {
        this.log('Creating Earth mesh');
        
        try {
            // Create a sphere geometry for the Earth
            const geometry = new THREE.SphereGeometry(this.earthRadius, 64, 64);
            
            // Check if texture is loaded
            if (!this.textures || !this.textures.earthMap) {
                console.warn("Earth textures not loaded properly, using simple color material");
                // Create a simple material with a blue color as fallback
                const material = new THREE.MeshPhongMaterial({
                    color: 0x1565C0,
                    specular: new THREE.Color(0x111111),
                    shininess: 10
                });
                
                this.earth = new THREE.Mesh(geometry, material);
                this.earthMesh = this.earth;
                this.scene.add(this.earth);
                
                // Add a simple atmosphere effect
                const atmosphereGeometry = new THREE.SphereGeometry(this.earthRadius * 1.03, 32, 32);
                const atmosphereMaterial = new THREE.MeshPhongMaterial({
                    color: 0x4a8fdb,
                    transparent: true,
                    opacity: 0.2,
                    side: THREE.BackSide
                });
                
                const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
                this.earth.add(atmosphere);
                
                this.log('Earth created with fallback material');
                return true;
            }
            
            // Create material with texture and bump mapping
            const material = new THREE.MeshPhongMaterial({
                map: this.textures.earthMap,
                bumpMap: this.textures.earthBumpMap,
                bumpScale: 0.05,
                specularMap: this.textures.earthSpecMap,
                specular: new THREE.Color(0x333333),
                shininess: 15,
            });
            
            // Create the Earth mesh
            this.earth = new THREE.Mesh(geometry, material);
            this.earthMesh = this.earth; // For consistency in references
            
            // Add to scene
            this.scene.add(this.earth);
            
            this.log('Earth created successfully');
            return true;
        } catch (error) {
            console.error('Error creating Earth:', error);
            
            // Create a very simple fallback Earth as last resort
            try {
                const simpleGeometry = new THREE.SphereGeometry(this.earthRadius, 32, 32);
                const simpleMaterial = new THREE.MeshBasicMaterial({ color: 0x0077be });
                
                this.earth = new THREE.Mesh(simpleGeometry, simpleMaterial);
                this.earthMesh = this.earth;
                this.scene.add(this.earth);
                
                this.log('Created simple fallback Earth after error');
                return true;
            } catch (fallbackError) {
                console.error('Could not create fallback Earth:', fallbackError);
                this.showLoadingError();
                return false;
            }
        }
    }
    
    // Create cloud layer around the Earth
    createClouds() {
        this.log('Creating cloud layer');
        
        try {
            // Check if Earth exists
            if (!this.earth) {
                throw new Error("Earth mesh must be created before clouds");
            }
            
            // Create a slightly larger sphere for clouds
            const geometry = new THREE.SphereGeometry(this.earthRadius * 1.01, 64, 64);
            
            // Check if cloud texture is loaded
            if (!this.textures || !this.textures.cloudsMap) {
                console.warn("Cloud textures not loaded properly, creating simplified clouds");
                
                // Create a simple cloud effect with a semi-transparent white material
                const material = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.NormalBlending
                });
                
                this.clouds = new THREE.Mesh(geometry, material);
                this.scene.add(this.clouds);
                
                // Add some random cloud patches as separate geometries
                // This creates a more interesting cloud effect without textures
                const addCloudPatches = () => {
                    for (let i = 0; i < 10; i++) {
                        // Random position on sphere surface
                        const phi = Math.random() * Math.PI * 2;
                        const theta = Math.random() * Math.PI;
                        const radius = this.earthRadius * 1.02;
                        
                        const x = radius * Math.sin(theta) * Math.cos(phi);
                        const y = radius * Math.sin(theta) * Math.sin(phi);
                        const z = radius * Math.cos(theta);
                        
                        // Create a small sphere for the cloud patch
                        const patchGeometry = new THREE.SphereGeometry(
                            radius * (0.05 + Math.random() * 0.05), 8, 8
                        );
                        const patchMaterial = new THREE.MeshPhongMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.3 + Math.random() * 0.3,
                            side: THREE.DoubleSide
                        });
                        
                        const patch = new THREE.Mesh(patchGeometry, patchMaterial);
                        patch.position.set(x, y, z);
                        
                        // Add to clouds object
                        this.clouds.add(patch);
                    }
                };
                
                addCloudPatches();
                
                this.log('Simplified clouds created successfully');
                return true;
            }
            
            // Create semi-transparent cloud material with the texture
            const material = new THREE.MeshPhongMaterial({
                map: this.textures.cloudsMap,
                transparent: true,
                opacity: 0.8,
                blending: THREE.NormalBlending
            });
            
            // Create the clouds mesh
            this.clouds = new THREE.Mesh(geometry, material);
            
            // Add to scene
            this.scene.add(this.clouds);
            
            this.log('Clouds created successfully');
            return true;
        } catch (error) {
            console.error('Error creating clouds:', error);
            // Don't show error for clouds, just log it
            return false;
        }
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
                    earthSpecMap: null,
                    cloudsMap: null
                };
                
                // Create fallback textures immediately to ensure we always have something
                this.createFallbackTextures();
                
                console.log('Created fallback textures as safety net');
                
                // Use reliable CDN sources first, then local fallbacks 
                const textureURLs = {
                    earthMap: [
                        'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
                        'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-blue-marble.jpg',
                        'assets/textures/earth_daymap.jpg'
                    ],
                    earthBumpMap: [
                        'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-topology.png',
                        'assets/textures/earth_normal.jpg'
                    ],
                    earthSpecMap: [
                        'https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.jpg',
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-water.png',
                        'assets/textures/earth_specular.jpg'
                    ],
                    cloudsMap: [
                        'https://threejs.org/examples/textures/planets/earth_clouds_2048.jpg',
                        'https://unpkg.com/three-globe@2.24.4/example/img/earth-clouds.png',
                        'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg',
                        'assets/textures/earth_clouds.png'
                    ]
                };
                
                // Debug flag for texture loading
                console.log('Starting to load textures with THREE.TextureLoader...');
                
                // Count of successfully loaded textures
                let loadedCount = 0;
                const totalTextures = Object.keys(textureURLs).length;
                
                // Function to try loading a texture from multiple URLs
                const tryLoadingTexture = (key, urlIndex = 0) => {
                    // If we've tried all URLs for this texture, use the fallback
                    if (urlIndex >= textureURLs[key].length) {
                        console.warn(`Using fallback for ${key} after trying all URLs`);
                        // Already created fallback textures at initialization
                        loadedCount++;
                        
                        if (loadedCount === totalTextures) {
                            console.log('All textures loaded (some using fallbacks)');
                            resolve();
                        }
                        return;
                    }
                    
                    const url = textureURLs[key][urlIndex];
                    console.log(`Attempting to load ${key} from ${url}`);
                    
                    textureLoader.load(
                        url,
                        (texture) => {
                            // Success - replace fallback
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
                            console.warn(`Failed to load texture ${key} from ${url}:`, error.message || error);
                            // Try the next URL
                            tryLoadingTexture(key, urlIndex + 1);
                        }
                    );
                };
                
                // Create default fallback textures upfront
                for (const key of Object.keys(this.textures)) {
                    tryLoadingTexture(key);
                }
            } catch (error) {
                console.error('Error in loadTextures:', error);
                // Don't reject, use fallbacks instead
                this.createFallbackTextures();
                resolve();
            }
        });
    }
    
    // Create fallback textures for when loading fails
    createFallbackTextures() {
        const keys = ['earthMap', 'earthBumpMap', 'earthSpecMap', 'cloudsMap'];
        
        for (const key of keys) {
            if (!this.textures[key]) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;  // Increased for better detail
                canvas.height = 256; // Standard map projection ratio
                const ctx = canvas.getContext('2d');
                
                if (key === 'earthMap') {
                    // Create a more Earth-like texture with continents
                    this.createEarthMapFallback(ctx, canvas.width, canvas.height);
                } else if (key === 'cloudsMap') {
                    // Create cloud-like pattern
                    this.createCloudsFallback(ctx, canvas.width, canvas.height);
                } else if (key === 'earthBumpMap') {
                    // Create a bumpmap with some terrain-like features
                    this.createBumpMapFallback(ctx, canvas.width, canvas.height);
                } else if (key === 'earthSpecMap') {
                    // Create a specular map with oceans more reflective than land
                    this.createSpecMapFallback(ctx, canvas.width, canvas.height);
                }
                
                // Create texture from canvas
                const texture = new THREE.CanvasTexture(canvas);
                if (key === 'earthMap') {
                    texture.encoding = THREE.sRGBEncoding;
                }
                this.textures[key] = texture;
            }
        }
    }
    
    // Create a simple Earth-like texture with continents
    createEarthMapFallback(ctx, width, height) {
        // Base ocean color
        ctx.fillStyle = '#0077be';
        ctx.fillRect(0, 0, width, height);
        
        // Function to draw a continent-like shape
        const drawContinent = (x, y, size, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            
            // Draw a random blob shape for the continent
            const points = 12;
            const angleStep = (Math.PI * 2) / points;
            
            for (let i = 0; i < points; i++) {
                const angle = i * angleStep;
                const radius = size * (0.5 + Math.random() * 0.5);
                const pointX = x + Math.cos(angle) * radius;
                const pointY = y + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(pointX, pointY);
                } else {
                    ctx.lineTo(pointX, pointY);
                }
            }
            
            ctx.closePath();
            ctx.fill();
        };
        
        // Draw some continents
        // North America
        drawContinent(width * 0.2, height * 0.3, width * 0.15, '#4C9B6C');
        
        // South America
        drawContinent(width * 0.3, height * 0.6, width * 0.1, '#4C9B6C');
        
        // Europe/Africa
        drawContinent(width * 0.5, height * 0.4, width * 0.12, '#CDA658');
        
        // Asia
        drawContinent(width * 0.7, height * 0.35, width * 0.15, '#7C9968');
        
        // Australia
        drawContinent(width * 0.8, height * 0.65, width * 0.08, '#B0946D');
        
        // Antarctica 
        drawContinent(width * 0.5, height * 0.85, width * 0.15, '#E8E8E8');
        
        // Add some noise for texture
        this.addNoiseToCanvas(ctx, width, height, 10);
    }
    
    // Create a cloud texture
    createCloudsFallback(ctx, width, height) {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw cloud clusters
        ctx.fillStyle = '#FFFFFF';
        
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 20 + Math.random() * 40;
            
            // Cloud cluster made of several overlapping circles
            for (let j = 0; j < 5; j++) {
                const offsetX = (Math.random() - 0.5) * size;
                const offsetY = (Math.random() - 0.5) * size;
                const radius = size * (0.3 + Math.random() * 0.4);
                
                ctx.beginPath();
                ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
                
                // Vary opacity for more realistic clouds
                ctx.globalAlpha = 0.1 + Math.random() * 0.4;
                ctx.fill();
            }
        }
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
    }
    
    // Create a bump map texture
    createBumpMapFallback(ctx, width, height) {
        // Base height
        ctx.fillStyle = '#555555';
        ctx.fillRect(0, 0, width, height);
        
        // Draw some mountain ranges as lighter areas
        ctx.fillStyle = '#AAAAAA';
        
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = 20 + Math.random() * 60;
            
            // Draw a random mountainous shape
            ctx.beginPath();
            
            const points = 8 + Math.floor(Math.random() * 5);
            const angleStep = (Math.PI * 2) / points;
            
            for (let j = 0; j < points; j++) {
                const angle = j * angleStep;
                const radius = size * (0.5 + Math.random() * 0.5);
                const pointX = x + Math.cos(angle) * radius;
                const pointY = y + Math.sin(angle) * radius;
                
                if (j === 0) {
                    ctx.moveTo(pointX, pointY);
                } else {
                    ctx.lineTo(pointX, pointY);
                }
            }
            
            ctx.closePath();
            ctx.fill();
        }
        
        // Add noise for texture
        this.addNoiseToCanvas(ctx, width, height, 30);
    }
    
    // Create a specular map texture (oceans reflective, land less so)
    createSpecMapFallback(ctx, width, height) {
        // Create Earth-like pattern first (reuse the code)
        this.createEarthMapFallback(ctx, width, height);
        
        // Now apply a filter to make water reflective (bright) and land less so (dark)
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // If blue channel is dominant, it's water
            if (data[i+2] > data[i] && data[i+2] > data[i+1]) {
                // Water is reflective (bright)
                data[i] = data[i+1] = data[i+2] = 200;
            } else {
                // Land is less reflective (dark)
                data[i] = data[i+1] = data[i+2] = 30;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Add noise to canvas for more interesting textures
    addNoiseToCanvas(ctx, width, height, intensity = 30) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * intensity - intensity/2;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
        }
        
        ctx.putImageData(imageData, 0, 0);
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
        
        // Clean up existing marker if it exists
        if (this.markerGroups[markerID]) {
            this.scene.remove(this.markerGroups[markerID]);
            // Properly dispose geometries and materials to avoid memory leaks
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
        
        // Determine marker properties based on type
        const isStartMarker = markerID === 'start-marker';
        const pinColor = isStartMarker ? 0x00ff00 : 0xff0000;
        const labelText = isStartMarker ? 'Start' : 'Destination';
        
        // Create pin head with glow effect
        const pinHeadGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const pinMaterial = new THREE.MeshPhongMaterial({
            color: pinColor,
            emissive: pinColor,
            emissiveIntensity: 0.5,
            shininess: 30
        });
        
        const pinHead = new THREE.Mesh(pinHeadGeometry, pinMaterial);
        pinHead.position.copy(position);
        markerGroup.add(pinHead);
        
        // Add a glow effect around the pin head
        const glowGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: pinColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        markerGroup.add(glow);
        
        // Create pin stem (pointing into the Earth)
        const stemLength = 0.08;
        const pinStemGeometry = new THREE.CylinderGeometry(0.01, 0.02, stemLength, 8);
        const pinStem = new THREE.Mesh(pinStemGeometry, pinMaterial);
        
        // Calculate stem position and orientation
        const direction = position.clone().normalize();
        const stemPosition = position.clone().sub(direction.clone().multiplyScalar(stemLength/2));
        pinStem.position.copy(stemPosition);
        
        // Orient stem to point toward Earth center
        pinStem.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0), 
            direction.clone()
        );
        
        markerGroup.add(pinStem);
        
        // Add a circular halo around the marker
        const haloGeometry = new THREE.RingGeometry(0.06, 0.09, 32);
        const haloMaterial = new THREE.MeshBasicMaterial({
            color: pinColor,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        halo.position.copy(position);
        
        // Make halo face the camera
        halo.lookAt(this.camera.position);
        
        // Add event to update halo orientation on camera change
        const updateHaloOrientation = () => {
            halo.lookAt(this.camera.position);
        };
        
        // Store the function so we can remove it later
        halo.userData.updateOrientation = updateHaloOrientation;
        
        // Add event listener to camera movement
        if (this.controls) {
            this.controls.addEventListener('change', updateHaloOrientation);
        }
        
        markerGroup.add(halo);
        
        // Create text label
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Draw label with background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border
        context.strokeStyle = pinColor;
        context.lineWidth = 3;
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        
        // Draw text
        context.fillStyle = isStartMarker ? '#00ff00' : '#ff0000';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(labelText, canvas.width / 2, canvas.height / 2);
        
        // Create sprite
        const labelTexture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true
        });
        
        const label = new THREE.Sprite(labelMaterial);
        
        // Position label above the marker
        const labelPos = position.clone().multiplyScalar(1.2);
        label.position.copy(labelPos);
        label.scale.set(0.2, 0.1, 1);
        
        // Make label face the camera
        const updateLabelOrientation = () => {
            label.position.copy(position.clone().multiplyScalar(1.2));
        };
        
        // Store the function so we can remove it later
        label.userData.updateOrientation = updateLabelOrientation;
        
        // Add event listener for camera movement
        if (this.controls) {
            this.controls.addEventListener('change', updateLabelOrientation);
        }
        
        markerGroup.add(label);
        
        // Log marker creation
        console.log(`Created marker ${markerID} at: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
        
        // Store in markerGroups and add to scene
        this.markerGroups[markerID] = markerGroup;
        this.scene.add(markerGroup);
        
        // Pulse the marker when first created
        this.pulseMarker(markerID, 0.8);
        
        // For compatibility with old code
        if (isStartMarker) {
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
        // Store the camera's current values
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
            this.controls.autoRotate = false;
        }
        
        // Animation function
        const updateCamera = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use smoother easing function
            const ease = this.easeOutCubic(progress);
            
            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, ease);
            
            // Interpolate rotation using quaternion slerp
            this.camera.quaternion.slerpQuaternions(startRotation, endQuat, ease);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(updateCamera);
            } else {
                // Add a small delay before re-enabling controls for smoother experience
                setTimeout(() => {
                    // Re-enable controls after animation
                    if (this.controls) {
                        this.controls.enabled = true;
                    }
                    
                    // Call the callback function if provided
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                }, 200);
            }
        };
        
        // Start animation
        updateCamera();
    }
    
    // Helper functions for camera transitions
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    easeOutElastic(t) {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
    
    // Draw path between start and end points through the Earth
    drawDigPath(startLat, startLng, endLat, endLng) {
        this.log(`Drawing dig path from ${startLat.toFixed(2)}, ${startLng.toFixed(2)} to ${endLat.toFixed(2)}, ${endLng.toFixed(2)}`);
        
        // Use marker positions if coordinates not provided
        if (startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
            // Check if markers exist
            if (!this.markerGroups['start-marker'] || !this.markerGroups['end-marker']) {
                console.error('Cannot draw path - markers not set');
                return null;
            }
            
            // Find marker positions
            let startPos = null, endPos = null;
            
            // Get the first mesh in each marker group for position
            this.markerGroups['start-marker'].traverse((object) => {
                if (!startPos && object.isMesh) {
                    startPos = object.position.clone();
                }
            });
            
            this.markerGroups['end-marker'].traverse((object) => {
                if (!endPos && object.isMesh) {
                    endPos = object.position.clone();
                }
            });
            
            if (!startPos || !endPos) {
                console.error('Cannot find marker positions');
                return null;
            }
            
            console.log('Using marker positions for path:', 
                         startPos.x.toFixed(2), startPos.y.toFixed(2), startPos.z.toFixed(2),
                         endPos.x.toFixed(2), endPos.y.toFixed(2), endPos.z.toFixed(2));
                         
            // Remove existing path if any
            if (this.digLine) {
                this.scene.remove(this.digLine);
                this.digLine.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
                this.digLine = null;
            }
            
            // Create points for the path (adapt the existing array method)
            const points = [];
            const segments = 50; // Reduced for better performance
            
            // Create points for a curved path through the Earth
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                
                // Create a curved path that goes through the center of the Earth
                if (i <= segments / 2) {
                    // First half: from start to center
                    const segmentT = i / (segments / 2);
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
            
            // Create the curve
            this.digPath = new THREE.CatmullRomCurve3(points);
            
            // Create the path mesh
            this.createPathMesh(points);
            
            return this.digPath;
        } else {
            // Original method using lat/lng coordinates
            // Remove existing path if any
            if (this.digLine) {
                this.scene.remove(this.digLine);
                this.digLine.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
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
            
            // Create the curve
            this.digPath = new THREE.CatmullRomCurve3(points);
            
            // Create the path mesh
            this.createPathMesh(points);
            
            return this.digPath;
        }
    }
    
    // Create the path mesh for visualization
    createPathMesh(points) {
        // Create the path group
        const pathGroup = new THREE.Group();
        
        // Create a tube geometry for a tunnel effect
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.025, 8, false);
        
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
        const keyPoints = [0, Math.floor(points.length/2), points.length-1];
        
        keyPoints.forEach(index => {
            if (index < points.length) {
                const glowGeometry = new THREE.SphereGeometry(0.03, 16, 16);
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
    }
    
    // Start the journey animation between the two markers
    startJourneyAnimation() {
        this.log('Starting journey animation');
        
        if (!this.markerGroups['start-marker'] || !this.markerGroups['end-marker']) {
            this.log('Error: Need both start and end markers to animate the journey');
            return false;
        }
        
        // Already animating
        if (this.isAnimating) {
            this.log('Animation already in progress');
            return false;
        }
        
        // Set animation flag
        this.isAnimating = true;
        
        // Update status
        this.updateStatusMessage('Preparing for the journey...', 0);
        
        // Create the dig path between markers
        this.drawDigPath();
        
        // Get start position
        let startPosition;
        this.markerGroups['start-marker'].traverse((object) => {
            if (!startPosition && object.isMesh) {
                startPosition = object.position.clone();
            }
        });
        
        // Focus on starting position
        this.focusOnMarker('start-marker', 1500);
        
        // Start journey animation sequence
        setTimeout(() => {
            this.updateStatusMessage('Starting the dig...', 10);
            
            // Create traveler (digging sphere)
            this.createTraveler();
            
            // Start at the beginning of the path
            this.travelerProgress = 0;
            
            // Move camera to a good angle to view the journey start
            const cameraPosition = startPosition.clone().multiplyScalar(1.8);
            const cameraTarget = startPosition.clone();
            
            // Animate camera to starting position
            this.animateCameraToPosition(cameraPosition, cameraTarget, 2000, () => {
                // Start the digging animation
                this.updateStatusMessage('Digging through the Earth...', 20);
                
                // Look at Earth center when halfway through
                setTimeout(() => {
                    const halfwayProgress = 0.5;
                    setTimeout(() => {
                        this.updateStatusMessage('Approaching the Earth\'s core...', 40);
                        
                        // Move camera to see Earth's interior
                        const centerDirection = new THREE.Vector3(0, 1, 0);
                        const interiorView = centerDirection.clone().multiplyScalar(1.8);
                        this.animateCameraToPosition(interiorView, new THREE.Vector3(0, 0, 0), 3000);
                    }, this.getTimeForProgress(halfwayProgress / 2));
                    
                    // Halfway point - look at center
                    setTimeout(() => {
                        this.updateStatusMessage('Passing through the Earth\'s core...', 50);
                        
                        // Move camera to center view
                        const sideDirection = new THREE.Vector3(1, 0.5, 0.5).normalize();
                        const centerView = sideDirection.clone().multiplyScalar(1.5);
                        this.animateCameraToPosition(centerView, new THREE.Vector3(0, 0, 0), 2000);
                    }, this.getTimeForProgress(halfwayProgress));
                    
                    // Approaching destination
                    setTimeout(() => {
                        this.updateStatusMessage('Approaching destination...', 75);
                        
                        // Move camera to prepare for emergence
                        let endPosition;
                        this.markerGroups['end-marker'].traverse((object) => {
                            if (!endPosition && object.isMesh) {
                                endPosition = object.position.clone();
                            }
                        });
                        
                        if (endPosition) {
                            // Position camera to watch the traveler emerge
                            const approachDirection = endPosition.clone().normalize();
                            const approachPosition = approachDirection.multiplyScalar(1.8);
                            this.animateCameraToPosition(approachPosition, endPosition, 3000);
                        }
                    }, this.getTimeForProgress(halfwayProgress * 1.5));
                }, 2000);
            });
        }, 1500);
        
        return true;
    }
    
    // Calculate time for a specific progress point in the animation
    getTimeForProgress(progress) {
        // Total animation time estimate based on traveler speed
        const totalAnimationTime = (1 / this.travelerSpeed) * 16.67; // ms
        return totalAnimationTime * progress;
    }
    
    // Create the digging traveler (sphere that moves along the path)
    createTraveler() {
        this.log('Creating traveler sphere');
        
        // Remove existing traveler if any
        if (this.travelerMesh) {
            this.scene.remove(this.travelerMesh);
            if (this.travelerMesh.geometry) this.travelerMesh.geometry.dispose();
            if (this.travelerMesh.material) this.travelerMesh.material.dispose();
        }
        
        // Create a glowing sphere for the traveler
        const travelerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const travelerMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.8,
            shininess: 30
        });
        
        this.travelerMesh = new THREE.Mesh(travelerGeometry, travelerMaterial);
        
        // Create a glowing effect around the traveler
        const glowGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.travelerMesh.add(glow);
        
        // Add a trail effect
        this.trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        // Start with an empty trail
        this.trailMesh = new THREE.Mesh(
            new THREE.TubeGeometry(this.digPath, this.digPathSegments, 0.01, 8, false, 0, 0),
            this.trailMaterial
        );
        
        // Add to scene
        this.scene.add(this.travelerMesh);
        this.scene.add(this.trailMesh);
        
        // Initialize traveler at the start of the path
        const startPoint = this.digPath.getPointAt(0);
        this.travelerMesh.position.copy(startPoint);
        
        this.log('Traveler created');
    }
    
    // Complete the journey animation
    completeJourneyAnimation() {
        if (!this.isAnimating) return;
        
        this.log('Completing journey animation');
        this.isAnimating = false;
        
        // Update UI
        this.updateStatusMessage('Journey complete!', 100);
        
        // Focus on the destination marker
        setTimeout(() => {
            this.focusOnMarker('end-marker', 2000);
            
            // Cleanup animation objects after a delay
            setTimeout(() => {
                this.cleanupJourneyAnimation();
            }, 3000);
        }, 1000);
    }
    
    // Clean up animation objects
    cleanupJourneyAnimation() {
        this.log('Cleaning up journey animation');
        
        // Keep tunnel visible but remove traveler and trail
        if (this.travelerMesh) {
            this.scene.remove(this.travelerMesh);
            if (this.travelerMesh.geometry) this.travelerMesh.geometry.dispose();
            if (this.travelerMesh.material) this.travelerMesh.material.dispose();
            this.travelerMesh = null;
        }
        
        if (this.trailMesh) {
            this.scene.remove(this.trailMesh);
            if (this.trailMesh.geometry) this.trailMesh.geometry.dispose();
            if (this.trailMesh.material) this.trailMesh.material.dispose();
            this.trailMesh = null;
        }
        
        // Dispatch event that journey is complete
        const event = new CustomEvent('journey-completed');
        this.container.dispatchEvent(event);
    }
    
    // Update journey progress bar and status message
    updateJourneyProgress(progress) {
        // Update progress percentage (0-100)
        const percentage = Math.round(progress * 100);
        
        // Update progress bar if available
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
            this.progressBar.setAttribute('aria-valuenow', percentage);
        }
        
        // Update status message based on progress
        if (percentage < 10) {
            this.updateStatusMessage('Starting the dig...', percentage);
        } else if (percentage < 40) {
            this.updateStatusMessage('Digging through the Earth\'s crust...', percentage);
        } else if (percentage < 50) {
            this.updateStatusMessage('Approaching the Earth\'s core...', percentage);
        } else if (percentage < 60) {
            this.updateStatusMessage('Passing through the Earth\'s core...', percentage);
        } else if (percentage < 90) {
            this.updateStatusMessage('Traveling through the mantle...', percentage);
        } else if (percentage < 100) {
            this.updateStatusMessage('Almost there!', percentage);
        } else {
            this.updateStatusMessage('Journey complete!', 100);
        }
    }
    
    // Update the status message element
    updateStatusMessage(message, progress = -1) {
        this.log(`Status update: ${message} (${progress}%)`);
        
        // Update status text if available
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        
        // Also update progress bar if a value is provided
        if (progress >= 0 && this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
            this.progressBar.setAttribute('aria-valuenow', progress);
        }
        
        // Dispatch a status update event
        const event = new CustomEvent('status-update', {
            detail: { message, progress }
        });
        this.container.dispatchEvent(event);
    }
    
    // Set progress bar element reference
    setProgressBar(element) {
        this.progressBar = element;
    }
    
    // Set status text element reference
    setStatusText(element) {
        this.statusText = element;
    }
    
    // Main animation loop
    animate() {
        // Calculate time delta for smooth animation
        const now = performance.now();
        let deltaTime = 0;
        
        if (this.lastAnimateTime > 0) {
            deltaTime = (now - this.lastAnimateTime) / 1000; // Convert to seconds
        }
        
        this.lastAnimateTime = now;
        
        // Request the next frame first to ensure smooth animation
        requestAnimationFrame(this.animate.bind(this));
        
        // Skip if earth not initialized yet
        if (!this.earth) return;
        
        // Rotate Earth and clouds if controls are enabled and not animating camera
        if (this.controls && !this.controls.autoRotate && !this.isCameraAnimating) {
            // Apply rotation based on delta time for consistent speed
            this.earth.rotation.y += this.rotationSpeed * deltaTime * 60; // Normalize to 60fps
            
            if (this.clouds) {
                // Clouds rotate slightly faster than Earth
                this.clouds.rotation.y += this.rotationSpeed * 1.1 * deltaTime * 60;
            }
        }
        
        // Update controls if available
        if (this.controls) {
            this.controls.update();
        }
        
        // Animate digging traveler if animation is active
        if (this.isAnimating && this.travelerMesh) {
            this.updateDiggingAnimation(deltaTime);
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    // Update digging animation with time delta
    updateDiggingAnimation(deltaTime) {
        if (!this.digPath || !this.travelerProgress || !this.travelerMesh) return;
        
        // Calculate new position with adjusted speed
        this.travelerProgress += this.travelerSpeed * deltaTime * 60; // Normalize to 60fps
        
        // Clamp progress to prevent going beyond the path end
        if (this.travelerProgress > 1) {
            this.travelerProgress = 1;
        }
        
        // Check if animation completed
        if (this.travelerProgress >= 1) {
            this.completeJourneyAnimation();
            return;
        }
        
        // Get current position along the path
        const position = this.digPath.getPointAt(this.travelerProgress);
        this.travelerMesh.position.copy(position);
        
        // Get next point along the path to orient the traveler
        const lookAtPoint = this.digPath.getPointAt(Math.min(this.travelerProgress + 0.01, 1));
        this.travelerMesh.lookAt(lookAtPoint);
        
        // Update the trail effect if enabled
        if (this.trailMesh && this.trailMaterial) {
            // Make the trail more visible as the journey progresses
            const trailOpacity = Math.min(0.8, this.travelerProgress * 1.5);
            this.trailMaterial.opacity = trailOpacity;
            
            // Extend the trail to the current position
            const trailLength = this.travelerProgress;
            this.trailMesh.geometry = new THREE.TubeGeometry(
                this.digPath,
                this.digPathSegments,
                0.03, // tube radius
                8, // tubular segments
                false, // closed
                0, // start
                trailLength // end
            );
        }
        
        // Update journey progress bar and status if available
        this.updateJourneyProgress(this.travelerProgress);
    }
    
    // Update the window resize event
    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        
        // Update camera aspect ratio
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    // Utility function for logging with timestamp
    log(message) {
        const timestamp = new Date().toISOString().substr(11, 8);
        console.log(`[${timestamp}] [EarthVisualizer] ${message}`);
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
    animateCameraToPosition(targetPosition, targetLookAt, duration = 1000, callback = null) {
        // Store current camera properties
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        
        // Calculate animation parameters
        const startTime = performance.now();
        const endTime = startTime + duration;
        
        // Disable controls during animation
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Set flag to prevent Earth rotation during camera animation
        this.isCameraAnimating = true;
        
        // Animation function
        const animateCamera = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in-out function for smoother animation
            const easeProgress = progress < 0.5 ? 
                2 * progress * progress : 
                -1 + (4 - 2 * progress) * progress;
            
            // Interpolate camera position
            this.camera.position.lerpVectors(
                startPosition,
                targetPosition,
                easeProgress
            );
            
            // Interpolate camera target
            this.controls.target.lerpVectors(
                startTarget,
                targetLookAt,
                easeProgress
            );
            
            // Update controls
            this.controls.update();
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                // Animation complete - restore controls
                if (this.controls) {
                    this.controls.enabled = true;
                }
                
                this.isCameraAnimating = false;
                
                // Execute callback if provided
                if (callback && typeof callback === 'function') {
                    callback();
                }
            }
        };
        
        // Start animation
        animateCamera();
    }
    
    // Focus on a specific marker by ID with animation
    focusOnMarker(markerID, duration = 1000) {
        const markerGroup = this.markerGroups[markerID];
        
        if (!markerGroup) {
            this.log(`Error: Marker "${markerID}" not found`);
            return false;
        }
        
        // Get marker position
        let markerPosition;
        
        // Find first mesh in the group to get position
        markerGroup.traverse((object) => {
            if (!markerPosition && object.isMesh) {
                markerPosition = object.position.clone();
            }
        });
        
        if (!markerPosition) {
            this.log(`Error: Could not find position for marker "${markerID}"`);
            return false;
        }
        
        // Calculate position to view the marker from a good angle
        const cameraDistance = 2.5;
        const cameraTarget = markerPosition.clone();
        
        // Position slightly offset from the direct line to the center
        const offsetDirection = markerPosition.clone().normalize();
        const cameraPosition = markerPosition.clone().add(
            offsetDirection.multiplyScalar(cameraDistance - 1)
        );
        
        // Ensure we're not inside the Earth
        if (cameraPosition.length() < this.earthRadius) {
            cameraPosition.normalize().multiplyScalar(this.earthRadius * 1.5);
        }
        
        // Animate camera to focus position
        this.animateCameraToPosition(cameraPosition, cameraTarget, duration, () => {
            // Pulse the marker when focus is complete
            this.pulseMarker(markerID);
        });
        
        return true;
    }
    
    // Focus camera on a specific 3D position
    focusOnLocation(position, duration = 1000) {
        if (!position) {
            this.log('Error: Invalid position for camera focus');
            return false;
        }
        
        // Calculate new camera position
        const cameraDistance = 2.0;
        const direction = position.clone().normalize();
        const cameraPosition = direction.clone().multiplyScalar(cameraDistance);
        
        // Animate camera to the new position
        this.animateCameraToPosition(cameraPosition, position, duration);
        
        return true;
    }
    
    // Reset camera to default view
    resetCamera(animate = true) {
        const defaultPosition = new THREE.Vector3(0, 0, 3);
        const defaultTarget = new THREE.Vector3(0, 0, 0);
        
        if (animate) {
            this.animateCameraToPosition(defaultPosition, defaultTarget);
        } else {
            this.camera.position.copy(defaultPosition);
            this.controls.target.copy(defaultTarget);
            this.controls.update();
        }
        
        // Enable auto-rotate for the default view
        if (this.controls) {
            this.controls.autoRotate = true;
        }
    }
    
    // Add a pulsing effect to the marker for better visibility
    pulseMarker(markerID, scale = 1.0) {
        const markerGroup = this.markerGroups[markerID];
        if (!markerGroup) return;
        
        // Find the halo/ring element
        const halo = markerGroup.children.find(child => 
            child.geometry && child.geometry.type === 'RingGeometry');
            
        if (!halo) return;
        
        // Store original scale
        const originalScale = halo.scale.clone();
        
        // Animate scale
        let pulseTime = 0;
        const pulseDuration = 2000; // 2 seconds
        const pulseAnimation = () => {
            pulseTime += 16; // Approx 60fps
            const t = pulseTime / pulseDuration;
            
            if (t < 1) {
                // Sin wave for smooth pulsing (0.8 to 1.5 range)
                const pulseScale = 0.8 + 0.7 * Math.sin(t * Math.PI * 4);
                halo.scale.set(pulseScale * scale, pulseScale * scale, pulseScale * scale);
                
                requestAnimationFrame(pulseAnimation);
            } else {
                // Restore original scale
                halo.scale.copy(originalScale);
            }
        };
        
        pulseAnimation();
    }
    
    // Add a new method for setting up event listeners
    setupEventListeners() {
        console.log('Setting up event listeners for globe clicks');
        
        // Track click and drag events to distinguish between clicks and drags
        let isDragging = false;
        let clickStartTime = 0;
        
        this.renderer.domElement.addEventListener('mousedown', () => {
            isDragging = false;
            clickStartTime = Date.now();
        });
        
        this.renderer.domElement.addEventListener('mousemove', () => {
            // Consider dragging if mouse moves during a click
            if (Date.now() - clickStartTime > 100) {
                isDragging = true;
            }
        });
        
        // Add click event listener to the renderer's canvas
        this.renderer.domElement.addEventListener('click', (event) => {
            // Ignore if we're dragging the globe
            if (isDragging) {
                console.log('Ignoring click because user was dragging');
                return;
            }
            
            if (this.isAnimating) {
                console.log('Ignoring click during animation');
                return;
            }
            
            console.log('Globe clicked, checking for Earth intersection');
            
            // Get canvas-relative mouse coordinates
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            console.log('Mouse coords:', mouse.x, mouse.y);
            
            // Create a raycaster for this specific click
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            
            // Make sure Earth exists
            if (!this.earth) {
                console.error('Earth mesh not found for raycasting');
                return;
            }
            
            // Debug: List all objects in the scene to verify Earth is there
            console.log('Scene contains these objects:');
            this.scene.traverse(object => {
                if (object.isMesh) {
                    console.log(' - Mesh:', object.name || 'unnamed mesh', object.uuid);
                }
            });
            
            // Try to get direct reference to Earth mesh first
            let earthMesh = this.earth;
            
            // Check if Earth is complex with child objects
            if (this.earth.children && this.earth.children.length > 0) {
                // Try to find the main sphere mesh
                this.earth.traverse(object => {
                    if (object.isMesh && object.geometry && 
                        object.geometry.type === 'SphereGeometry') {
                        earthMesh = object;
                    }
                });
            }
            
            console.log('Using Earth mesh for intersection:', earthMesh.uuid);
            
            // Intersect only with the Earth mesh
            const intersects = raycaster.intersectObject(earthMesh, false);
            console.log('Intersections found:', intersects.length);
            
            // If Earth was clicked
            if (intersects.length > 0) {
                // Get the intersection point and normalize to get direction from center
                const point = intersects[0].point.clone().normalize();
                
                // Convert to latitude and longitude
                const lat = Math.asin(point.y) * (180 / Math.PI);
                const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
                
                console.log('Clicked position:', lat.toFixed(4), lng.toFixed(4));
                
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
                
                // Show visual feedback for successful click
                this.showClickFeedback(intersects[0].point);
                
                return true;
            } else {
                console.log('No intersection with Earth mesh - trying with clouds or entire scene');
                
                // Try clouds next
                if (this.clouds) {
                    const cloudIntersects = raycaster.intersectObject(this.clouds, false);
                    if (cloudIntersects.length > 0) {
                        console.log('Intersection with clouds found');
                        // Process as if Earth was clicked directly
                        const point = cloudIntersects[0].point.clone().normalize();
                        
                        // Convert to latitude and longitude
                        const lat = Math.asin(point.y) * (180 / Math.PI);
                        const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
                        
                        // Set markers and dispatch event as above
                        this.setMarkerPosition('start-marker', lat, lng, true);
                        
                        const antiLat = -lat;
                        let antiLng = lng + 180;
                        if (antiLng > 180) antiLng -= 360;
                        
                        this.setMarkerPosition('end-marker', antiLat, antiLng, false);
                        
                        const locationEvent = new CustomEvent('location-selected', {
                            detail: {
                                start: { lat, lng },
                                end: { lat: antiLat, lng: antiLng }
                            }
                        });
                        this.container.dispatchEvent(locationEvent);
                        
                        // Show feedback
                        this.showClickFeedback(cloudIntersects[0].point);
                        return true;
                    }
                }
                
                // Last resort: try all objects in the scene
                const allIntersects = raycaster.intersectObjects(this.scene.children, true);
                console.log('All scene intersections:', allIntersects.length);
                
                if (allIntersects.length > 0) {
                    // Filter to only consider objects that could be the Earth or clouds
                    const validIntersects = allIntersects.filter(i => {
                        return i.object.geometry && 
                               i.object.geometry.type === 'SphereGeometry';
                    });
                    
                    if (validIntersects.length > 0) {
                        console.log('Found valid intersection with a sphere in scene');
                        const point = validIntersects[0].point.clone().normalize();
                        
                        // Process as above
                        const lat = Math.asin(point.y) * (180 / Math.PI);
                        const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
                        
                        // Set markers and dispatch
                        this.setMarkerPosition('start-marker', lat, lng, true);
                        
                        const antiLat = -lat;
                        let antiLng = lng + 180;
                        if (antiLng > 180) antiLng -= 360;
                        
                        this.setMarkerPosition('end-marker', antiLat, antiLng, false);
                        
                        const locationEvent = new CustomEvent('location-selected', {
                            detail: {
                                start: { lat, lng },
                                end: { lat: antiLat, lng: antiLng }
                            }
                        });
                        this.container.dispatchEvent(locationEvent);
                        
                        // Show feedback
                        this.showClickFeedback(validIntersects[0].point);
                        return true;
                    }
                }
                
                console.log('No valid intersection found');
                return false;
            }
        });
        
        // Add hover effect to show cursor change when hovering over the earth
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (this.isAnimating) return;
            
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Use simplified approach for hover detection too
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            
            // Intersect with all objects that could be considered "Earth"
            const objectsToCheck = [];
            if (this.earth) objectsToCheck.push(this.earth);
            if (this.clouds) objectsToCheck.push(this.clouds);
            
            const intersects = raycaster.intersectObjects(objectsToCheck, true);
            
            if (intersects.length > 0) {
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.renderer.domElement.style.cursor = 'default';
            }
        });
    }
    
    // Visual feedback for successful click
    showClickFeedback(position) {
        // Create a small pulse at the clicked position
        const geometry = new THREE.SphereGeometry(0.03, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        
        const feedback = new THREE.Mesh(geometry, material);
        feedback.position.copy(position);
        this.scene.add(feedback);
        
        // Create multiple expanding rings for better visual feedback
        const createRing = (size, delay) => {
            setTimeout(() => {
                const ringGeometry = new THREE.RingGeometry(0.03, 0.05, 32);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.position.copy(position);
                
                // Make ring face the camera
                ring.lookAt(this.camera.position);
                this.scene.add(ring);
                
                // Animate and remove
                let scale = 1;
                let opacity = 0.8;
                
                const expandRing = () => {
                    scale += 0.06;
                    opacity -= 0.02;
                    
                    ring.scale.set(scale, scale, scale);
                    ringMaterial.opacity = opacity;
                    
                    if (opacity > 0) {
                        requestAnimationFrame(expandRing);
                    } else {
                        this.scene.remove(ring);
                        ring.geometry.dispose();
                        ringMaterial.dispose();
                    }
                };
                
                expandRing();
            }, delay);
        };
        
        // Create multiple rings with delays for a ripple effect
        createRing(0.05, 0);
        createRing(0.06, 150);
        createRing(0.08, 300);
        
        // Add a bright flash that quickly fades out
        const flashGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Animate flash
        let flashOpacity = 0.9;
        const fadeFlash = () => {
            flashOpacity -= 0.1;
            flashMaterial.opacity = flashOpacity;
            
            if (flashOpacity > 0) {
                requestAnimationFrame(fadeFlash);
            } else {
                this.scene.remove(flash);
                flash.geometry.dispose();
                flashMaterial.dispose();
            }
        };
        
        fadeFlash();
        
        // Remove main feedback after a short delay
        setTimeout(() => {
            this.scene.remove(feedback);
            feedback.geometry.dispose();
            material.dispose();
        }, 800);
    }
    
    // Handle interactions with Earth and markers
    setupInteractions() {
        this.log('Setting up Earth interactions');
        
        // Raycaster for detecting clicks
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Hover state tracking
        this.hoveredObject = null;
        this.originalMaterialColor = null;
        this.isMouseDown = false;
        
        // Add event listeners
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.container.addEventListener('click', this.onClick.bind(this));
        
        // Touch support for mobile
        this.container.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.container.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Add cursor style to container
        this.container.style.cursor = 'grab';
    }
    
    // Convert screen coordinates to normalized device coordinates
    getNormalizedMousePosition(event) {
        const rect = this.container.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        const y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
        return { x, y };
    }
    
    // Mouse move handler
    onMouseMove(event) {
        // Update cursor position
        const pos = this.getNormalizedMousePosition(event);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        
        // Don't do hover effects during animation or when dragging
        if (this.isAnimating || this.isMouseDown) return;
        
        // Update cursor and check for hoverable objects
        this.checkHoverObjects();
    }
    
    // Mouse down handler
    onMouseDown(event) {
        this.isMouseDown = true;
        this.container.style.cursor = 'grabbing';
    }
    
    // Mouse up handler
    onMouseUp(event) {
        this.isMouseDown = false;
        this.container.style.cursor = 'grab';
    }
    
    // Handle clicks on Earth and markers
    onClick(event) {
        // Don't handle clicks during animation
        if (this.isAnimating) return;
        
        const pos = this.getNormalizedMousePosition(event);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        
        // Update the raycaster with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for intersections with markers first (higher priority)
        const markerObjects = [];
        Object.values(this.markerGroups).forEach(group => {
            group.traverse(child => {
                if (child.isMesh) markerObjects.push(child);
            });
        });
        
        const markerIntersects = this.raycaster.intersectObjects(markerObjects);
        
        if (markerIntersects.length > 0) {
            // Find which marker was clicked
            let markerID = null;
            Object.entries(this.markerGroups).forEach(([id, group]) => {
                if (group.getObjectById(markerIntersects[0].object.id)) {
                    markerID = id;
                }
            });
            
            if (markerID) {
                this.log(`Clicked on marker: ${markerID}`);
                this.focusOnMarker(markerID);
                // Pulse the marker when clicked
                this.pulseMarker(markerID);
                
                // Dispatch a custom event
                const event = new CustomEvent('marker-clicked', { 
                    detail: { markerID } 
                });
                this.container.dispatchEvent(event);
                return;
            }
        }
        
        // If no marker was clicked, check for Earth clicks
        const earthIntersects = this.raycaster.intersectObject(this.earth);
        
        if (earthIntersects.length > 0) {
            const point = earthIntersects[0].point;
            
            // Convert to latitude/longitude
            const latLng = this.pointToLatLng(point);
            
            this.log(`Clicked on Earth at lat: ${latLng.lat.toFixed(2)}, lng: ${latLng.lng.toFixed(2)}`);
            
            // Dispatch a custom event
            const event = new CustomEvent('earth-clicked', { 
                detail: { 
                    lat: latLng.lat, 
                    lng: latLng.lng,
                    point: point
                }
            });
            this.container.dispatchEvent(event);
        }
    }
    
    // Handle touch start
    onTouchStart(event) {
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            // Convert touch to mouse event
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            
            this.onMouseDown(mouseEvent);
        }
    }
    
    // Handle touch end
    onTouchEnd(event) {
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        this.onMouseUp({});
        
        // Only handle taps (clicks)
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            // Convert touch to mouse event
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            
            this.onClick(mouseEvent);
        }
    }
    
    // Check for objects under the mouse cursor and update hover state
    checkHoverObjects() {
        // Update the raycaster with the current mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // First check for interactions with markers
        const markerObjects = [];
        Object.values(this.markerGroups).forEach(group => {
            group.traverse(child => {
                if (child.isMesh) markerObjects.push(child);
            });
        });
        
        // Check for intersections with markers (more important)
        const markerIntersects = this.raycaster.intersectObjects(markerObjects);
        
        // Then check for interactions with the Earth
        const earthIntersects = this.raycaster.intersectObject(this.earth);
        
        // Restore previous hovered object's material if any
        if (this.hoveredObject && this.originalMaterialColor) {
            this.hoveredObject.material.emissive.setHex(this.originalMaterialColor);
            this.hoveredObject = null;
            this.originalMaterialColor = null;
            
            // Reset cursor
            this.container.style.cursor = 'grab';
        }
        
        // Check for marker intersections first (higher priority)
        if (markerIntersects.length > 0) {
            const object = markerIntersects[0].object;
            this.hoveredObject = object;
            
            // Only store original color if it has an emissive property
            if (object.material && object.material.emissive) {
                this.originalMaterialColor = object.material.emissive.getHex();
                
                // Highlight object with lighter color
                const newColor = object.material.color.getHex();
                object.material.emissive.setHex(newColor);
                
                // Change cursor to indicate clickable
                this.container.style.cursor = 'pointer';
                return;
            }
        }
        
        // If no marker interaction, check for Earth interactions
        if (earthIntersects.length > 0) {
            // Change cursor to indicate Earth is clickable
            this.container.style.cursor = 'crosshair';
            return;
        }
    }
    
    // Convert 3D point to latitude & longitude
    pointToLatLng(point) {
        // Normalize the point to get a direction from the center
        const direction = point.clone().normalize();
        
        // Calculate latitude (-90 to 90) and longitude (-180 to 180)
        const lat = 90 - Math.acos(direction.y) * (180 / Math.PI);
        let lng = Math.atan2(direction.z, direction.x) * (180 / Math.PI);
        
        // Adjust longitude to match standard mapping (-180 to 180)
        if (lng > 180) lng -= 360;
        
        return { lat, lng };
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