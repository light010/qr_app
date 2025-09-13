/**
 * @fileoverview Service Bootstrap - Dependency Injection Configuration
 * 
 * ROOT CAUSE SOLUTION: Eliminates tight coupling by configuring all services
 * with proper dependency injection. Main app goes from 11 direct instantiations
 * to container-managed dependencies with full inversion of control.
 */

/**
 * Service Bootstrap for Dependency Injection Setup
 * Configures all services with proper dependencies and lifecycle management
 * 
 * @class ServiceBootstrap
 */
class ServiceBootstrap {
    constructor() {
        this.container = new ServiceContainer();
        this.registrar = new ServiceRegistrar(this.container);
    }
    
    /**
     * Bootstrap all application services with dependency injection
     * ROOT CAUSE FIX: Eliminates tight coupling through proper DI configuration
     * 
     * @returns {ServiceContainer} Configured service container
     */
    bootstrap() {
        console.log('🚀 Bootstrapping WORLDCLASS service architecture...');
        
        // Register core infrastructure services (no dependencies)
        this.registerInfrastructure();
        
        // Register business logic services (with dependencies) 
        this.registerBusinessServices();
        
        // Register presentation layer services (with dependencies)
        this.registerPresentationServices();
        
        // Register integration services (with dependencies)
        this.registerIntegrationServices();
        
        console.log('✅ Service bootstrap complete - WORLDCLASS architecture ready');
        console.log('📊 Registered services:', this.container.getServiceNames().join(', '));
        
        return this.container;
    }
    
    /**
     * Register core infrastructure services (no dependencies)
     */
    registerInfrastructure() {
        // Config service (foundation)
        this.container.register('config', () => window.AppConfig, true);
        
        // UI Manager (DOM abstraction layer)
        this.container.register('ui', UIManager, true);
        
        // Storage Manager (persistence layer) 
        this.container.register('storage', PersistentStorageManager, true);
        
        // QR Scanner Engine (core scanning logic with protocol bridge)
        this.container.register('scannerEngine', QRScannerEngine, true);
        
        // Data Processor (decompression/decryption)
        this.container.register('dataProcessor', DataProcessor, true);
        
        // Theme Manager (presentation layer)
        this.container.register('theme', ThemeManager, true);
        
        // Camera Manager (hardware abstraction)
        this.container.register('camera', CameraManager, true);
    }
    
    /**
     * Register business logic services (with dependencies)
     */
    registerBusinessServices() {
        // Retry Manager (with config dependency)
        this.container.register('retry', (deps) => {
            const config = deps.config?.get('retry') || {};
            return new RetryManager(config);
        }, true, ['config']);
        
        // Chunk Manager (with UI, Storage, Retry dependencies)
        this.container.register('chunks', (deps) => {
            return new ChunkManager(deps.ui, deps.storage, deps.retry);
        }, true, ['ui', 'storage', 'retry']);
        
        // Audio Manager (with UI dependency) 
        this.container.register('audio', (deps) => {
            return new AudioManager(deps.ui);
        }, true, ['ui']);
    }
    
    /**
     * Register presentation layer services (with dependencies)
     */
    registerPresentationServices() {
        // File Preview System (with UI dependency)
        this.container.register('preview', (deps) => {
            return new FilePreviewSystem(deps.ui);
        }, true, ['ui']);
        
        // Camera UI (factory function with delayed initialization)
        this.container.register('cameraUI', (deps) => {
            // Return a factory function since CameraUI needs DOM elements
            return () => new CameraUI(deps.camera, {
                videoElement: deps.ui.elements.app.video,
                overlayElement: deps.ui.elements.scanner.overlay, 
                torchButton: deps.ui.elements.controls.flashBtn
            });
        }, true, ['camera', 'ui']);
    }
    
    /**
     * Register integration services (with dependencies)  
     */
    registerIntegrationServices() {
        // Main Application (with all dependencies)
        this.container.register('app', (deps) => {
            return new WorldClassQRScanner(deps);
        }, true, [
            'ui', 'scannerEngine', 'storage', 'retry', 'chunks',
            'theme', 'camera', 'cameraUI', 'dataProcessor', 
            'preview', 'audio', 'config'
        ]);
    }
    
    /**
     * Initialize all services in proper dependency order
     * 
     * @returns {Promise<void>}
     */
    async initializeServices() {
        console.log('🔧 Initializing services in dependency order...');
        
        // Get main app instance (will trigger dependency chain initialization)
        const app = this.container.get('app');
        
        // Initialize services that have async initialization
        const asyncServices = ['storage', 'scannerEngine', 'camera', 'dataProcessor', 'audio'];
        
        for (const serviceName of asyncServices) {
            const service = this.container.get(serviceName);
            if (service && typeof service.initialize === 'function') {
                console.log(`🔧 Initializing ${serviceName}...`);
                await service.initialize();
            }
        }
        
        // Initialize the main application
        if (app && typeof app.initialize === 'function') {
            console.log('🔧 Initializing main application...');
            await app.initialize();
        }
        
        console.log('✅ All services initialized successfully');
        return app;
    }
    
    /**
     * Get dependency graph for debugging
     * 
     * @returns {Object} Service dependency graph
     */
    getDependencyGraph() {
        return this.container.getDependencyGraph();
    }
    
    /**
     * Dispose of all services gracefully
     * 
     * @returns {Promise<void>}
     */
    async dispose() {
        await this.container.dispose();
    }
}

// Export for ES6 modules
export { ServiceBootstrap };