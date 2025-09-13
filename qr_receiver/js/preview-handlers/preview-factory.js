/**
 * @fileoverview Preview Factory - Plugin-Based Preview System Factory
 * 
 * ROOT CAUSE SOLUTION: Replaces monolithic switch statement in FilePreviewSystem
 * with extensible factory pattern that dynamically selects appropriate handler.
 * 
 * This enables WORLDCLASS extensibility where new file types can be registered
 * at runtime without modifying existing code.
 */

/**
 * Preview Factory
 * Factory class that manages and routes files to appropriate preview handlers
 * 
 * @class PreviewFactory
 */
class PreviewFactory {
    constructor() {
        /** @type {Map<string, BasePreviewHandler>} Registered preview handlers */
        this.handlers = new Map();
        
        /** @type {Array<string>} Handler registration order */
        this.handlerOrder = [];
        
        /** @type {Object} Performance metrics */
        this.metrics = {
            totalPreviews: 0,
            successfulPreviews: 0,
            failedPreviews: 0,
            handlerUsage: new Map()
        };
        
        console.log('🏭 Preview Factory initialized');
        
        // Register default handlers
        this.registerDefaultHandlers();
    }
    
    /**
     * Register default preview handlers
     */
    registerDefaultHandlers() {
        // Import and register all default handlers
        // Order matters - more specific handlers should be registered first
        
        try {
            // Register handlers in order of specificity
            this.registerHandler('image', new ImagePreviewHandler());
            this.registerHandler('text', new TextPreviewHandler());
            this.registerHandler('code', new CodePreviewHandler());
            this.registerHandler('audio', new AudioPreviewHandler());
            this.registerHandler('video', new VideoPreviewHandler());
            this.registerHandler('document', new DocumentPreviewHandler());
            this.registerHandler('archive', new ArchivePreviewHandler());
            
            console.log(`✅ Registered ${this.handlers.size} default preview handlers`);
        } catch (error) {
            console.error('❌ Failed to register default handlers:', error);
        }
    }
    
    /**
     * Register a preview handler
     * @param {string} name - Handler name
     * @param {BasePreviewHandler} handler - Handler instance
     */
    registerHandler(name, handler) {
        if (!handler || typeof handler.generatePreview !== 'function') {
            throw new Error(`Invalid handler: ${name}`);
        }
        
        // Validate handler extends BasePreviewHandler
        if (!(handler instanceof BasePreviewHandler)) {
            console.warn(`Handler ${name} does not extend BasePreviewHandler`);
        }
        
        this.handlers.set(name, handler);
        this.handlerOrder.push(name);
        this.metrics.handlerUsage.set(name, 0);
        
        console.log(`📁 Registered preview handler: ${name} (${handler.constructor.name})`);
    }
    
    /**
     * Unregister a preview handler
     * @param {string} name - Handler name
     */
    unregisterHandler(name) {
        const handler = this.handlers.get(name);
        if (handler) {
            // Cleanup handler resources
            handler.cleanup();
            
            this.handlers.delete(name);
            this.handlerOrder = this.handlerOrder.filter(h => h !== name);
            this.metrics.handlerUsage.delete(name);
            
            console.log(`🗑️ Unregistered preview handler: ${name}`);
        }
    }
    
    /**
     * Find best handler for file
     * @param {string} mimeType - File MIME type
     * @param {string} filename - Filename
     * @param {number} fileSize - File size in bytes
     * @returns {Object|null} Best handler with metadata
     */
    findBestHandler(mimeType, filename, fileSize) {
        let bestHandler = null;
        let bestScore = 0;
        let bestName = null;
        
        // Test each handler in registration order
        for (const name of this.handlerOrder) {
            const handler = this.handlers.get(name);
            
            if (handler.canHandle(mimeType, filename, fileSize)) {
                const priority = handler.getPriority(mimeType, filename);
                
                if (priority > bestScore) {
                    bestScore = priority;
                    bestHandler = handler;
                    bestName = name;
                }
            }
        }
        
        if (bestHandler) {
            return {
                handler: bestHandler,
                name: bestName,
                score: bestScore,
                capabilities: bestHandler.getCapabilities()
            };
        }
        
        return null;
    }
    
    /**
     * Check if file can be previewed
     * @param {string} mimeType - File MIME type
     * @param {string} filename - Filename
     * @param {number} fileSize - File size in bytes
     * @returns {boolean} Whether file can be previewed
     */
    canPreview(mimeType, filename, fileSize) {
        return this.findBestHandler(mimeType, filename, fileSize) !== null;
    }
    
    /**
     * Generate preview for file
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const startTime = performance.now();
        this.metrics.totalPreviews++;
        
        try {
            // Find appropriate handler
            const handlerInfo = this.findBestHandler(
                context.mimeType,
                context.filename,
                context.fileSize
            );
            
            if (!handlerInfo) {
                throw new Error(`No handler available for ${context.mimeType} (${context.filename})`);
            }
            
            console.log(`🎯 Using ${handlerInfo.name} handler for ${context.filename} (score: ${handlerInfo.score})`);
            
            // Update usage metrics
            const currentUsage = this.metrics.handlerUsage.get(handlerInfo.name) || 0;
            this.metrics.handlerUsage.set(handlerInfo.name, currentUsage + 1);
            
            // Generate preview using selected handler
            const result = await handlerInfo.handler.safePreview(context);
            
            // Add factory metadata to result
            result.factory = {
                handlerName: handlerInfo.name,
                handlerScore: handlerInfo.score,
                processingTime: performance.now() - startTime
            };
            
            if (result.success) {
                this.metrics.successfulPreviews++;
                console.log(`✅ Preview generated successfully using ${handlerInfo.name} handler`);
            } else {
                this.metrics.failedPreviews++;
                console.log(`⚠️ Preview generation failed in ${handlerInfo.name} handler:`, result.error);
            }
            
            return result;
            
        } catch (error) {
            this.metrics.failedPreviews++;
            console.error('❌ Preview factory error:', error);
            
            // Return fallback error result
            return {
                success: false,
                error: error.message,
                factory: {
                    handlerName: 'none',
                    handlerScore: 0,
                    processingTime: performance.now() - startTime
                },
                element: this.createUnsupportedPreview(context, error),
                cleanup: [],
                resources: {}
            };
        }
    }
    
    /**
     * Create unsupported file preview
     * @param {PreviewContext} context - Preview context
     * @param {Error} error - Error that occurred
     * @returns {HTMLElement} Unsupported preview element
     */
    createUnsupportedPreview(context, error) {
        const container = document.createElement('div');
        container.className = 'preview-unsupported';
        
        const fileSize = this.formatBytes(context.fileSize);
        const extension = this.extractExtension(context.filename);
        
        container.innerHTML = `
            <div class="unsupported-content">
                <div class="unsupported-icon">❓</div>
                <div class="unsupported-title">Preview Not Available</div>
                <div class="unsupported-details">
                    <div class="file-info">
                        <strong>File:</strong> ${this.escapeHtml(context.filename)}<br>
                        <strong>Type:</strong> ${context.mimeType}<br>
                        <strong>Size:</strong> ${fileSize}<br>
                        <strong>Extension:</strong> ${extension || 'None'}
                    </div>
                    <div class="error-info">
                        <strong>Reason:</strong> ${this.escapeHtml(error.message)}
                    </div>
                    <div class="suggestions">
                        <h4>Suggestions:</h4>
                        <ul>
                            <li>Download the file to view with appropriate software</li>
                            <li>Check if the file format is supported</li>
                            <li>Verify the file is not corrupted</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        return container;
    }
    
    /**
     * Get list of supported file types
     * @returns {Object} Supported types by handler
     */
    getSupportedTypes() {
        const supportedTypes = {
            mimeTypes: new Set(),
            extensions: new Set(),
            handlers: {}
        };
        
        for (const [name, handler] of this.handlers) {
            const capabilities = handler.getCapabilities();
            
            // Add to global sets
            capabilities.mimeTypes.forEach(type => supportedTypes.mimeTypes.add(type));
            capabilities.extensions.forEach(ext => supportedTypes.extensions.add(ext));
            
            // Store handler-specific info
            supportedTypes.handlers[name] = {
                mimeTypes: capabilities.mimeTypes,
                extensions: capabilities.extensions,
                maxFileSize: capabilities.maxFileSize,
                features: capabilities.features
            };
        }
        
        // Convert sets to arrays
        supportedTypes.mimeTypes = Array.from(supportedTypes.mimeTypes);
        supportedTypes.extensions = Array.from(supportedTypes.extensions);
        
        return supportedTypes;
    }
    
    /**
     * Get factory statistics
     * @returns {Object} Factory statistics
     */
    getStatistics() {
        const handlerStats = {};
        for (const [name, count] of this.metrics.handlerUsage) {
            const handler = this.handlers.get(name);
            handlerStats[name] = {
                usage: count,
                capabilities: handler ? handler.getCapabilities() : null
            };
        }
        
        return {
            totalHandlers: this.handlers.size,
            totalPreviews: this.metrics.totalPreviews,
            successfulPreviews: this.metrics.successfulPreviews,
            failedPreviews: this.metrics.failedPreviews,
            successRate: this.metrics.totalPreviews > 0 ? 
                ((this.metrics.successfulPreviews / this.metrics.totalPreviews) * 100).toFixed(1) + '%' : '0%',
            handlerUsage: handlerStats
        };
    }
    
    /**
     * Extract file extension from filename
     * @param {string} filename - Filename
     * @returns {string} File extension (lowercase, without dot)
     */
    extractExtension(filename) {
        const parts = filename.toLowerCase().split('.');
        return parts.length > 1 ? parts.pop() : '';
    }
    
    /**
     * Format byte size to human readable
     * @param {number} bytes - Bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Reset factory statistics
     */
    resetStatistics() {
        this.metrics.totalPreviews = 0;
        this.metrics.successfulPreviews = 0;
        this.metrics.failedPreviews = 0;
        
        for (const name of this.handlerOrder) {
            this.metrics.handlerUsage.set(name, 0);
        }
        
        console.log('📊 Factory statistics reset');
    }
    
    /**
     * Clean up all handlers and factory resources
     */
    cleanup() {
        console.log('🧹 Cleaning up preview factory...');
        
        // Cleanup all handlers
        for (const [name, handler] of this.handlers) {
            try {
                handler.cleanup();
                console.log(`✅ Handler cleaned up: ${name}`);
            } catch (error) {
                console.error(`❌ Handler cleanup error (${name}):`, error);
            }
        }
        
        // Clear all maps and arrays
        this.handlers.clear();
        this.handlerOrder.length = 0;
        this.metrics.handlerUsage.clear();
        
        // Reset metrics
        this.resetStatistics();
        
        console.log('🧹 Preview factory cleanup complete');
    }
    
    /**
     * Get detailed handler information
     * @returns {Array} Handler information array
     */
    getHandlerInfo() {
        const handlerInfo = [];
        
        for (const [name, handler] of this.handlers) {
            try {
                const capabilities = handler.getCapabilities();
                const usage = this.metrics.handlerUsage.get(name) || 0;
                
                handlerInfo.push({
                    name: name,
                    className: handler.constructor.name,
                    capabilities: capabilities,
                    usage: usage,
                    info: handler.getInfo ? handler.getInfo() : null
                });
            } catch (error) {
                handlerInfo.push({
                    name: name,
                    className: 'Unknown',
                    error: error.message,
                    usage: 0
                });
            }
        }
        
        return handlerInfo;
    }
}

// Create singleton instance
let previewFactoryInstance = null;

/**
 * Get singleton PreviewFactory instance
 * @returns {PreviewFactory} Preview factory instance
 */
function getPreviewFactory() {
    if (!previewFactoryInstance) {
        previewFactoryInstance = new PreviewFactory();
    }
    return previewFactoryInstance;
}

// Export for ES6 modules
export { PreviewFactory, getPreviewFactory };