// Test file for verifying Earth visualizer initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Test script loaded, checking THREE.js availability');
    
    // Check if THREE is defined
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded!');
        document.body.innerHTML = '<div style="color: red; padding: 20px;">THREE.js not loaded!</div>';
        return;
    }
    
    console.log('THREE.js is loaded correctly');
    
    // Try creating a simple scene and renderer to verify WebGL works
    try {
        console.log('Testing WebGL renderer creation');
        const testScene = new THREE.Scene();
        const testCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Try to create a renderer
        const testRenderer = new THREE.WebGLRenderer();
        testRenderer.setSize(100, 100); // Small size for testing
        
        // Create a small test object
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        testScene.add(cube);
        
        // Render a frame to test
        testRenderer.render(testScene, testCamera);
        
        console.log('WebGL test successful - rendering works!');
        
        // Clean up
        testRenderer.dispose();
        geometry.dispose();
        material.dispose();
        
    } catch (error) {
        console.error('WebGL test failed:', error);
        document.body.innerHTML = '<div style="color: red; padding: 20px;">WebGL test failed: ' + error.message + '</div>';
        return;
    }
    
    // Report success
    console.log('All tests passed - THREE.js and WebGL are functioning correctly');
    document.body.innerHTML = '<div style="color: green; padding: 20px;">THREE.js and WebGL are functioning correctly!</div>';
}); 