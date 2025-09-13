/**
 * @fileoverview Service Container for Dependency Injection
 * 
 * ROOT CAUSE SOLUTION: Reduces high coupling in qr-scanner-app.js by implementing
 * dependency injection pattern. Main app went from 11 direct dependencies to 
 * container-managed dependencies.
 * 
 * Implements the IServiceContainer interface defined in interfaces.js
 */

/**
 * Service Container for Dependency Injection
 * Manages module dependencies and reduces coupling
 * 
 * @class ServiceContainer
 * @implements {IServiceContainer}
 */
class ServiceContainer {
    constructor() {
        /** @type {Map<string, {factory: Function|Object, singleton: boolean, instance?: Object}>} */
        this.services = new Map();
        
        /** @type {Map<string, Object>} */
        this.instances = new Map();
        
        /** @type {Set<string>} */
        this.initializing = new Set();
        
        this.eventBus = new EventTarget();
    }
    
    /**
     * Register a service with the container
     * @param {string} name - Service name/identifier
     * @param {Function|Object} service - Service factory function or instance
     * @param {boolean} [singleton=true] - Whether to create singleton instance
     * @param {string[]} [dependencies=[]] - Service dependencies
     */
    register(name, service, singleton = true, dependencies = []) {
        if (this.services.has(name)) {
            throw new Error(`Service '${name}' is already registered`);
        }
        
        this.services.set(name, {
            factory: service,
            singleton,
            dependencies: dependencies || []
        });
        
        console.log(`📦 Service '${name}' registered (singleton: ${singleton})`);
    }
    
    /**
     * Get service instance by name
     * @param {string} name - Service name
     * @returns {Object} Service instance
     */
    get(name) {
        // Check for circular dependency
        if (this.initializing.has(name)) {
            throw new Error(`Circular dependency detected for service '${name}'`);
        }
        
        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
        }
        
        // Return existing singleton instance
        if (serviceConfig.singleton && this.instances.has(name)) {
            return this.instances.get(name);
        }
        
        // Create new instance
        this.initializing.add(name);
        
        try {
            const instance = this.createInstance(name, serviceConfig);
            
            if (serviceConfig.singleton) {
                this.instances.set(name, instance);
            }
            
            this.initializing.delete(name);
            
            // Emit service created event
            this.eventBus.dispatchEvent(new CustomEvent('serviceCreated', {
                detail: { name, instance, singleton: serviceConfig.singleton }
            }));
            
            return instance;
        } catch (error) {
            this.initializing.delete(name);
            throw new Error(`Failed to create service '${name}': ${error.message}`);
        }
    }
    
    /**
     * Create service instance with dependency injection
     * @param {string} name - Service name
     * @param {Object} serviceConfig - Service configuration
     * @returns {Object} Service instance
     */
    createInstance(name, serviceConfig) {
        const { factory, dependencies } = serviceConfig;
        
        // Resolve dependencies first
        const resolvedDependencies = {};
        for (const depName of dependencies) {
            resolvedDependencies[depName] = this.get(depName);
        }
        
        // Create instance
        if (typeof factory === 'function') {
            // Factory function - inject dependencies as constructor params or first argument
            if (factory.prototype && factory.prototype.constructor === factory) {
                // Constructor function - create instance with new
                const depArray = dependencies.map(dep => resolvedDependencies[dep]);
                return new factory(...depArray);
            } else {
                // Factory function - call with dependencies object
                return factory(resolvedDependencies, this);
            }
        } else {
            // Direct instance
            return factory;
        }
    }
    
    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean} Whether service exists
     */
    has(name) {
        return this.services.has(name);
    }
    
    /**
     * Get list of registered service names
     * @returns {string[]} Service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }
    
    /**
     * Get service dependency graph
     * @returns {Object} Dependency graph
     */
    getDependencyGraph() {
        const graph = {};
        for (const [name, config] of this.services) {
            graph[name] = config.dependencies || [];
        }
        return graph;
    }
    
    /**
     * Initialize all registered services (for eager loading)
     * @returns {Promise<void>}
     */
    async initializeAll() {
        console.log('🚀 Initializing all services...');
        
        const serviceNames = this.getServiceNames();
        const initialized = [];
        
        for (const name of serviceNames) {
            try {
                const instance = this.get(name);
                
                // Call initialize method if it exists
                if (instance && typeof instance.initialize === 'function') {
                    await instance.initialize();
                }
                
                initialized.push(name);
                console.log(`✅ Service '${name}' initialized`);
            } catch (error) {
                console.error(`❌ Failed to initialize service '${name}':`, error);
                throw error;
            }
        }
        
        console.log(`✅ All services initialized: ${initialized.join(', ')}`);
    }
    
    /**
     * Clear all services and instances
     */
    clear() {
        this.instances.clear();
        this.services.clear();
        this.initializing.clear();
        console.log('🧹 Service container cleared');
    }
    
    /**
     * Dispose of all services (call dispose if available)
     * @returns {Promise<void>}
     */
    async dispose() {
        console.log('🛑 Disposing services...');
        
        const disposed = [];
        for (const [name, instance] of this.instances) {
            try {
                if (instance && typeof instance.dispose === 'function') {
                    await instance.dispose();
                }
                disposed.push(name);
            } catch (error) {
                console.error(`Error disposing service '${name}':`, error);
            }
        }
        
        this.clear();
        console.log(`🛑 Services disposed: ${disposed.join(', ')}`);
    }
    
    /**
     * Add event listener for container events
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addEventListener(event, handler) {
        this.eventBus.addEventListener(event, handler);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    removeEventListener(event, handler) {
        this.eventBus.removeEventListener(event, handler);
    }
}

/**
 * Service Registration Helper
 * Provides fluent API for service registration
 */
class ServiceRegistrar {
    constructor(container) {
        this.container = container;
    }
    
    /**
     * Register UI provider service
     * @param {Function|Object} factory - UI provider factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    ui(factory) {
        this.container.register('ui', factory, true);
        return this;
    }
    
    /**
     * Register camera provider service
     * @param {Function|Object} factory - Camera provider factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    camera(factory) {
        this.container.register('camera', factory, true);
        return this;
    }
    
    /**
     * Register audio provider service
     * @param {Function|Object} factory - Audio provider factory
     * @param {string[]} dependencies - Service dependencies
     * @returns {ServiceRegistrar} This instance for chaining
     */
    audio(factory, dependencies = ['ui']) {
        this.container.register('audio', factory, true, dependencies);
        return this;
    }
    
    /**
     * Register chunk processor service
     * @param {Function|Object} factory - Chunk processor factory
     * @param {string[]} dependencies - Service dependencies
     * @returns {ServiceRegistrar} This instance for chaining
     */
    chunks(factory, dependencies = ['ui', 'storage', 'retry']) {
        this.container.register('chunks', factory, true, dependencies);
        return this;
    }
    
    /**
     * Register storage provider service
     * @param {Function|Object} factory - Storage provider factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    storage(factory) {
        this.container.register('storage', factory, true);
        return this;
    }
    
    /**
     * Register retry manager service
     * @param {Function|Object} factory - Retry manager factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    retry(factory) {
        this.container.register('retry', factory, true);
        return this;
    }
    
    /**
     * Register file preview service
     * @param {Function|Object} factory - File preview factory
     * @param {string[]} dependencies - Service dependencies
     * @returns {ServiceRegistrar} This instance for chaining
     */
    preview(factory, dependencies = ['ui']) {
        this.container.register('preview', factory, true, dependencies);
        return this;
    }
    
    /**
     * Register data processor service
     * @param {Function|Object} factory - Data processor factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    dataProcessor(factory) {
        this.container.register('dataProcessor', factory, true);
        return this;
    }
    
    /**
     * Register QR scanner service
     * @param {Function|Object} factory - QR scanner factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    scanner(factory) {
        this.container.register('scanner', factory, true);
        return this;
    }
    
    /**
     * Register theme manager service
     * @param {Function|Object} factory - Theme manager factory
     * @returns {ServiceRegistrar} This instance for chaining
     */
    theme(factory) {
        this.container.register('theme', factory, true);
        return this;
    }
}

// Export for ES6 modules
export { ServiceContainer, ServiceRegistrar };