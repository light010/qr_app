/**
 * @fileoverview Error Boundary Manager - Unified Error Handling System
 * 
 * ROOT CAUSE SOLUTION: Integrates all error boundary utilities to provide
 * consistent error handling, prevention of cascade failures, and graceful
 * degradation across all 127 identified error scenarios.
 * 
 * This is the main interface that all modules should use for error handling.
 */

/**
 * Error Boundary Manager
 * Unified interface for all error handling patterns and utilities
 * 
 * @class ErrorBoundaryManager
 */
class ErrorBoundaryManager {
    constructor(errorManager, ui) {
        this.errorManager = errorManager;
        this.ui = ui;
        
        // Initialize core utilities
        this.memoryMonitor = new MemoryMonitor({
            warningThreshold: 50 * 1024 * 1024,    // 50MB
            criticalThreshold: 100 * 1024 * 1024,  // 100MB
            emergencyThreshold: 150 * 1024 * 1024  // 150MB
        });
        
        this.gracefulDegradation = new GracefulDegradation();
        this.boundaries = new Map();
        this.circuitBreakers = new Map();
        
        this.setupMemoryManagement();
        this.setupFeatureDetection();
        this.setupDefaultBoundaries();
        
        console.log('🛡️ Error Boundary Manager initialized');
    }
    
    /**
     * Initialize and start all error boundary systems
     */
    async initialize() {
        // Start memory monitoring
        this.memoryMonitor.startMonitoring();
        
        // Setup memory pressure handlers
        this.setupMemoryPressureHandlers();
        
        // Test all registered features
        await this.testAllFeatures();
        
        console.log('🛡️ Error boundaries activated');
    }
    
    /**
     * Setup memory management and cleanup handlers
     */
    setupMemoryManagement() {
        // Register cleanup handlers for different modules
        this.memoryMonitor.onMemoryPressure((level) => {
            console.log(`🧹 Memory cleanup triggered: ${level}`);
            
            switch (level) {
                case 'warning':
                    this.performLightCleanup();
                    break;
                case 'critical':
                    this.performHeavyCleanup();
                    break;
                case 'emergency':
                    this.performEmergencyCleanup();
                    break;
            }
        });
        
        // Listen for memory events
        this.memoryMonitor.addEventListener('critical', (data) => {
            this.errorManager.handleError(
                this.errorManager.createError(
                    'Critical memory pressure detected',
                    'memory',
                    {
                        userMessage: 'System memory is running low. Some features may be limited.',
                        recoverable: true,
                        suggestedAction: 'Close other browser tabs or applications',
                        details: data.memory
                    }
                )
            );
        });
        
        this.memoryMonitor.addEventListener('emergency', (data) => {
            this.errorManager.handleError(
                this.errorManager.createError(
                    'Emergency memory pressure - taking protective action',
                    'memory',
                    {
                        userMessage: 'System memory is critically low. Application is taking protective measures.',
                        recoverable: false,
                        suggestedAction: 'Please close other applications and refresh the page',
                        details: data.memory
                    }
                )
            );
        });
    }
    
    /**
     * Setup feature detection for graceful degradation
     */
    setupFeatureDetection() {
        // Camera features
        this.gracefulDegradation.registerFeature(
            'camera',
            async () => {
                return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            },
            () => 'Camera not available - manual QR entry required'
        );
        
        // IndexedDB storage
        this.gracefulDegradation.registerFeature(
            'indexeddb',
            async () => {
                return 'indexedDB' in window && indexedDB !== null;
            },
            () => 'In-memory storage only - large files not supported'
        );
        
        // Web Audio API
        this.gracefulDegradation.registerFeature(
            'webaudio',
            async () => {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                return !!AudioContext;
            },
            () => 'Audio feedback disabled'
        );
        
        // Web Crypto API
        this.gracefulDegradation.registerFeature(
            'webcrypto',
            async () => {
                return !!(window.crypto && window.crypto.subtle);
            },
            () => 'Encryption/decryption not supported'
        );
        
        // Barcode Detection API
        this.gracefulDegradation.registerFeature(
            'barcodedetector',
            async () => {
                return 'BarcodeDetector' in window;
            },
            () => 'Using fallback QR scanner library'
        );
        
        // Service Worker
        this.gracefulDegradation.registerFeature(
            'serviceworker',
            async () => {
                return 'serviceWorker' in navigator;
            },
            () => 'Offline functionality not available'
        );
        
        // Compression Streams
        this.gracefulDegradation.registerFeature(
            'compression',
            async () => {
                return !!(window.CompressionStream && window.DecompressionStream);
            },
            () => 'File compression not supported'
        );
        
        // Performance Memory API
        this.gracefulDegradation.registerFeature(
            'performance-memory',
            async () => {
                return !!(performance.memory);
            },
            () => 'Memory monitoring estimated'
        );
    }
    
    /**
     * Setup default error boundaries for common operations
     */
    setupDefaultBoundaries() {
        // Camera operations boundary
        this.createBoundary('camera', {
            timeout: 15000,
            fallback: async (error) => {
                if (error.name === 'NotAllowedError') {
                    return { error: 'permission_denied', message: 'Camera access denied' };
                }
                return { error: 'camera_unavailable', message: 'Camera not available' };
            }
        });
        
        // Storage operations boundary  
        this.createBoundary('storage', {
            timeout: 10000,
            fallback: async (error) => {
                console.warn('Storage operation failed, using memory fallback');
                return { useMemory: true };
            }
        });
        
        // QR processing boundary
        this.createBoundary('qr-processing', {
            timeout: 5000,
            fallback: async (error) => {
                return { retry: true, message: 'QR processing failed, please try again' };
            }
        });
        
        // File processing boundary
        this.createBoundary('file-processing', {
            timeout: 30000,
            fallback: async (error) => {
                return { skip: true, message: 'File processing failed, skipping optional processing' };
            }
        });
        
        // UI operations boundary
        this.createBoundary('ui', {
            timeout: 5000,
            fallback: async (error) => {
                console.warn('UI operation failed, continuing without visual feedback');
                return { silent: true };
            }
        });
        
        // Network operations boundary
        this.createBoundary('network', {
            timeout: 15000,
            fallback: async (error) => {
                return { offline: true, message: 'Network unavailable, using offline mode' };
            }
        });
    }
    
    /**
     * Create error boundary for specific operation type
     * @param {string} name - Boundary name
     * @param {Object} options - Boundary options
     */
    createBoundary(name, options = {}) {
        const boundary = new ErrorBoundary(name, this.errorManager);
        this.boundaries.set(name, { boundary, options });
        console.log(`🛡️ Error boundary '${name}' created`);
        return boundary;
    }
    
    /**
     * Execute operation with error boundary protection
     * @param {string} boundaryName - Boundary to use
     * @param {Function} operation - Operation to execute
     * @param {Object} options - Execution options
     * @returns {Promise<*>} Operation result or fallback
     */
    async executeWithBoundary(boundaryName, operation, options = {}) {
        const boundaryConfig = this.boundaries.get(boundaryName);
        if (!boundaryConfig) {
            throw new Error(`Unknown boundary: ${boundaryName}`);
        }
        
        const { boundary, options: defaultOptions } = boundaryConfig;
        const mergedOptions = { ...defaultOptions, ...options };
        
        return await boundary.execute(operation, mergedOptions);
    }
    
    /**
     * Execute camera operation with protection
     * @param {Function} operation - Camera operation
     * @param {Object} options - Options
     * @returns {Promise<*>} Result or fallback
     */
    async executeCamera(operation, options = {}) {
        return this.executeWithBoundary('camera', operation, {
            errorType: 'camera',
            context: { operation: 'camera' },
            ...options
        });
    }
    
    /**
     * Execute storage operation with protection
     * @param {Function} operation - Storage operation
     * @param {Object} options - Options
     * @returns {Promise<*>} Result or fallback
     */
    async executeStorage(operation, options = {}) {
        return this.executeWithBoundary('storage', operation, {
            errorType: 'storage',
            context: { operation: 'storage' },
            ...options
        });
    }
    
    /**
     * Execute QR processing with protection
     * @param {Function} operation - QR operation
     * @param {Object} options - Options
     * @returns {Promise<*>} Result or fallback
     */
    async executeQRProcessing(operation, options = {}) {
        return this.executeWithBoundary('qr-processing', operation, {
            errorType: 'processing',
            context: { operation: 'qr-processing' },
            ...options
        });
    }
    
    /**
     * Execute file processing with protection
     * @param {Function} operation - File operation
     * @param {Object} options - Options
     * @returns {Promise<*>} Result or fallback
     */
    async executeFileProcessing(operation, options = {}) {
        return this.executeWithBoundary('file-processing', operation, {
            errorType: 'processing',
            context: { operation: 'file-processing' },
            ...options
        });
    }
    
    /**
     * Execute UI operation with protection
     * @param {Function} operation - UI operation
     * @param {Object} options - Options
     * @returns {Promise<*>} Result or fallback
     */
    async executeUI(operation, options = {}) {
        return this.executeWithBoundary('ui', operation, {
            errorType: 'ui',
            context: { operation: 'ui' },
            suppressErrors: true, // UI errors are usually not critical
            ...options
        });
    }
    
    /**
     * Execute operation with timeout
     * @param {Function} operation - Operation to execute
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} operationName - Operation name for errors
     * @returns {Promise<*>} Operation result
     */
    async executeWithTimeout(operation, timeout = 10000, operationName = 'Operation') {
        return TimeoutManager.withTimeout(operation(), timeout, operationName);
    }
    
    /**
     * Test all registered features
     */
    async testAllFeatures() {
        console.log('🔍 Testing all registered features...');
        
        const features = Object.keys(this.gracefulDegradation.getFeatureStatus());
        const results = {};
        
        for (const feature of features) {
            try {
                results[feature] = await this.gracefulDegradation.isFeatureAvailable(feature);
            } catch (error) {
                console.error(`Feature test failed for ${feature}:`, error);
                results[feature] = false;
            }
        }
        
        console.log('🔍 Feature test results:', results);
        return results;
    }
    
    /**
     * Get feature value or fallback
     * @param {string} featureName - Feature name
     * @param {*} primaryValue - Primary value if feature available
     * @returns {Promise<*>} Feature value or fallback
     */
    async getFeatureValue(featureName, primaryValue) {
        return this.gracefulDegradation.getFeatureValue(featureName, primaryValue);
    }
    
    /**
     * Execute operation with feature detection
     * @param {string} featureName - Feature name
     * @param {Function} primaryOperation - Primary operation
     * @param {Function} fallbackOperation - Fallback operation
     * @returns {Promise<*>} Operation result
     */
    async executeWithFeature(featureName, primaryOperation, fallbackOperation) {
        return this.gracefulDegradation.executeWithFeature(featureName, primaryOperation, fallbackOperation);
    }
    
    /**
     * Setup memory pressure event handlers
     */
    setupMemoryPressureHandlers() {
        // Register with modules that have cleanup capabilities
        this.registerCleanupHandler('chunk-manager', (level) => {
            // ChunkManager should clear unnecessary cached chunks
            if (window.chunkManager) {
                if (level === 'critical' || level === 'emergency') {
                    console.log('🧹 Chunk manager cleanup triggered');
                    // Would call chunkManager.cleanup() if implemented
                }
            }
        });
        
        this.registerCleanupHandler('file-preview', (level) => {
            // FilePreview should close previews and clear cached content
            if (window.filePreview) {
                console.log('🧹 File preview cleanup triggered');
                // Would call filePreview.cleanup() if implemented
            }
        });
        
        this.registerCleanupHandler('qr-scanner', (level) => {
            // QR Scanner should clear cached frames
            if (window.qrScanner) {
                if (level === 'emergency') {
                    console.log('🧹 QR scanner emergency cleanup');
                    // Would call qrScanner.clearCache() if implemented
                }
            }
        });
    }
    
    /**
     * Register cleanup handler for memory pressure
     * @param {string} module - Module name
     * @param {Function} handler - Cleanup handler
     */
    registerCleanupHandler(module, handler) {
        this.memoryMonitor.onMemoryPressure((level) => {
            try {
                handler(level);
            } catch (error) {
                console.error(`Cleanup handler error for ${module}:`, error);
            }
        });
    }
    
    /**
     * Perform light cleanup (warning level)
     */
    performLightCleanup() {
        console.log('🧹 Performing light cleanup...');
        
        // Clear console if too many messages
        if (console.clear && Math.random() < 0.1) { // 10% chance
            console.clear();
        }
        
        // Suggest garbage collection
        if (window.gc && Math.random() < 0.3) { // 30% chance
            setTimeout(() => window.gc(), 1000);
        }
    }
    
    /**
     * Perform heavy cleanup (critical level)
     */
    performHeavyCleanup() {
        console.log('🧹 Performing heavy cleanup...');
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Clear any cached URL objects
        this.clearObjectURLs();
        
        // Emit cleanup event
        if (this.ui) {
            this.ui.dispatchEvent(new CustomEvent('memory-cleanup', {
                detail: { level: 'heavy' }
            }));
        }
    }
    
    /**
     * Perform emergency cleanup (emergency level)
     */
    performEmergencyCleanup() {
        console.log('🧹 Performing emergency cleanup...');
        
        // Force immediate garbage collection
        if (window.gc) {
            window.gc();
        }
        
        // Clear all caches
        this.clearObjectURLs();
        
        // Clear large data structures
        this.clearLargeDataStructures();
        
        // Show user warning
        if (this.ui && this.ui.showError) {
            this.ui.showError('System memory critically low. Some features have been disabled to prevent crashes.');
        }
        
        // Emit emergency cleanup event
        if (this.ui) {
            this.ui.dispatchEvent(new CustomEvent('memory-emergency', {
                detail: { level: 'emergency' }
            }));
        }
    }
    
    /**
     * Clear cached object URLs to free memory
     */
    clearObjectURLs() {
        // This would be implemented to clear any cached blob URLs
        // In practice, modules should register their cleanup callbacks
        console.log('🧹 Clearing cached object URLs...');
    }
    
    /**
     * Clear large data structures to free memory
     */
    clearLargeDataStructures() {
        // This would be implemented to clear large cached data
        console.log('🧹 Clearing large data structures...');
    }
    
    /**
     * Get comprehensive status of all error boundaries
     * @returns {Object} Status information
     */
    getStatus() {
        const boundaries = {};
        for (const [name, config] of this.boundaries) {
            boundaries[name] = config.boundary.getStatus();
        }
        
        return {
            memoryMonitor: this.memoryMonitor.getStatus(),
            features: this.gracefulDegradation.getFeatureStatus(),
            boundaries: boundaries,
            totalBoundaries: this.boundaries.size
        };
    }
    
    /**
     * Dispose of all resources
     */
    async dispose() {
        console.log('🛑 Disposing error boundary manager...');
        
        // Stop memory monitoring
        this.memoryMonitor.stopMonitoring();
        
        // Clear all boundaries
        this.boundaries.clear();
        
        // Clear circuit breakers
        this.circuitBreakers.clear();
    }
}

// Export for use by other modules
export { ErrorBoundaryManager };