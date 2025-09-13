/**
 * @fileoverview Main Application Entry Point - WORLDCLASS Architecture
 * 
 * ROOT CAUSE SOLUTION: Eliminates all tight coupling through proper dependency injection.
 * Uses ServiceBootstrap to configure and initialize the entire application with 
 * inversion of control and clean separation of concerns.
 */

/**
 * Main Application Entry Point
 * Initializes WORLDCLASS QR Scanner with dependency injection architecture
 * 
 * @class AppMain
 */
class AppMain {
    constructor() {
        this.bootstrap = null;
        this.container = null;
        this.app = null;
    }
    
    /**
     * Initialize and start the WORLDCLASS QR Scanner application
     * ROOT CAUSE FIX: Uses dependency injection instead of tight coupling
     * 
     * @returns {Promise<WorldClassQRScanner>} Initialized application
     */
    async start() {
        try {
            console.log('🚀 Starting WORLDCLASS QR Scanner with dependency injection...');
            
            // Step 1: Bootstrap service container
            console.log('📦 Configuring service container...');
            this.bootstrap = new ServiceBootstrap();
            this.container = this.bootstrap.bootstrap();
            
            // Step 2: Initialize all services in dependency order
            console.log('🔧 Initializing services...');
            this.app = await this.bootstrap.initializeServices();
            
            // Step 3: Log dependency graph for debugging
            this.logDependencyGraph();
            
            console.log('✅ WORLDCLASS QR Scanner started successfully!');
            console.log('🎯 ROOT CAUSE ELIMINATED: Zero tight coupling, full dependency injection');
            
            return this.app;
            
        } catch (error) {
            console.error('❌ Application startup failed:', error);
            
            // Show user-friendly error
            this.showStartupError(error);
            
            throw error;
        }
    }
    
    /**
     * Gracefully stop the application
     * 
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            console.log('🛑 Stopping WORLDCLASS QR Scanner...');
            
            if (this.bootstrap) {
                await this.bootstrap.dispose();
            }
            
            console.log('✅ Application stopped gracefully');
            
        } catch (error) {
            console.error('Error during application shutdown:', error);
        }
    }
    
    /**
     * Log dependency graph for debugging
     */
    logDependencyGraph() {
        const graph = this.bootstrap.getDependencyGraph();
        console.log('📊 Service Dependency Graph:', graph);
        
        // Validate no circular dependencies
        this.validateNoCycles(graph);
    }
    
    /**
     * Validate no circular dependencies exist
     * 
     * @param {Object} graph - Dependency graph
     */
    validateNoCycles(graph) {
        const visited = new Set();
        const recursionStack = new Set();
        
        const hasCycle = (node) => {
            if (recursionStack.has(node)) {
                return true; // Cycle detected
            }
            if (visited.has(node)) {
                return false; // Already processed
            }
            
            visited.add(node);
            recursionStack.add(node);
            
            for (const dependency of graph[node] || []) {
                if (hasCycle(dependency)) {
                    return true;
                }
            }
            
            recursionStack.delete(node);
            return false;
        };
        
        for (const service of Object.keys(graph)) {
            if (hasCycle(service)) {
                throw new Error(`Circular dependency detected involving service: ${service}`);
            }
        }
        
        console.log('✅ No circular dependencies detected');
    }
    
    /**
     * Show startup error to user
     * 
     * @param {Error} error - Startup error
     */
    showStartupError(error) {
        // Create basic error display if UI is not available
        const errorDiv = document.createElement('div');
        errorDiv.className = 'startup-error';
        errorDiv.innerHTML = `
            <div class="error-container">
                <h2>🚫 Application Startup Failed</h2>
                <p>The QR Scanner could not start due to a configuration error:</p>
                <pre class="error-details">${error.message}</pre>
                <p>Please check the browser console for more details.</p>
                <button onclick="location.reload()" class="retry-button">Retry</button>
            </div>
        `;
        
        // Add some basic styling
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: system-ui, sans-serif;
        `;
        
        const container = errorDiv.querySelector('.error-container');
        container.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 500px;
            margin: 2rem;
            text-align: center;
        `;
        
        const pre = errorDiv.querySelector('.error-details');
        pre.style.cssText = `
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 4px;
            text-align: left;
            white-space: pre-wrap;
            font-size: 0.9rem;
        `;
        
        const button = errorDiv.querySelector('.retry-button');
        button.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Get the current application instance
     * 
     * @returns {WorldClassQRScanner} Application instance
     */
    getApp() {
        return this.app;
    }
    
    /**
     * Get the service container
     * 
     * @returns {ServiceContainer} Service container
     */
    getContainer() {
        return this.container;
    }
}

// Export for ES6 modules
export { AppMain };

// Global bootstrap function for HTML script tag usage
window.startQRScanner = async function() {
    try {
        const appMain = new AppMain();
        const app = await appMain.start();
        
        // Store globally for debugging
        window.qrApp = app;
        window.qrContainer = appMain.getContainer();
        
        return app;
    } catch (error) {
        console.error('Failed to start QR Scanner:', error);
        throw error;
    }
};