/**
 * @fileoverview Base Preview Handler - Foundation for Plugin-Based Preview System
 * 
 * ROOT CAUSE SOLUTION: Transforms monolithic 700+ line FilePreviewSystem into 
 * extensible, plugin-based architecture where each file type is a focused,
 * single-responsibility handler.
 * 
 * This enables WORLDCLASS extensibility where new file types can be added
 * at runtime without modifying existing code.
 */

/**
 * @interface PreviewHandlerCapabilities
 * @description Handler capabilities and requirements
 * @typedef {Object} PreviewHandlerCapabilities
 * @property {string[]} mimeTypes - Supported MIME types
 * @property {string[]} extensions - Supported file extensions
 * @property {number} maxFileSize - Maximum file size in bytes
 * @property {boolean} supportsStreaming - Whether handler supports streaming
 * @property {boolean} supportsAsync - Whether handler supports async operations
 * @property {string[]} features - Special features (thumbnail, metadata, etc.)
 */

/**
 * @interface PreviewContext
 * @description Context object passed to preview handlers
 * @typedef {Object} PreviewContext
 * @property {Uint8Array} data - File data
 * @property {string} filename - Original filename
 * @property {string} mimeType - File MIME type
 * @property {number} fileSize - File size in bytes
 * @property {HTMLElement} container - Container element for preview
 * @property {Object} options - Preview options and settings
 * @property {Function} onProgress - Progress callback
 * @property {Function} onError - Error callback
 * @property {AbortController} abortController - For cancelling operations
 */

/**
 * @interface PreviewResult
 * @description Result returned by preview handlers
 * @typedef {Object} PreviewResult
 * @property {boolean} success - Whether preview was successful
 * @property {HTMLElement} element - Created preview element
 * @property {Object} metadata - Extracted file metadata
 * @property {Function[]} cleanup - Cleanup functions to call
 * @property {Object} resources - Resource references (URLs, etc.)
 * @property {string} error - Error message if failed
 */

/**
 * Abstract Base Preview Handler
 * Defines the contract and common functionality for all file preview handlers
 * 
 * ROOT CAUSE SOLUTION: Each file type gets its own focused, single-responsibility
 * class instead of being crammed into a monolithic switch statement.
 * 
 * @abstract
 * @class BasePreviewHandler
 */
class BasePreviewHandler {
    constructor() {
        if (new.target === BasePreviewHandler) {
            throw new Error('BasePreviewHandler is abstract and cannot be instantiated directly');
        }
        
        /** @type {PreviewHandlerCapabilities} */
        this.capabilities = this.getCapabilities();
        
        /** @type {Map<string, Function>} Cleanup functions */
        this.cleanupFunctions = new Map();
        
        /** @type {Set<string>} Active object URLs */
        this.objectURLs = new Set();
        
        /** @type {number} Handler instance ID */
        this.instanceId = `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`📁 Preview handler created: ${this.constructor.name} (${this.instanceId})`);
    }
    
    /**
     * Get handler capabilities - MUST be implemented by subclasses
     * @abstract
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        throw new Error('getCapabilities() must be implemented by subclass');
    }
    
    /**
     * Check if handler can process this file
     * @param {string} mimeType - File MIME type
     * @param {string} filename - Filename with extension
     * @param {number} fileSize - File size in bytes
     * @returns {boolean} Whether handler can process this file
     */
    canHandle(mimeType, filename, fileSize) {
        // Check MIME type
        if (this.capabilities.mimeTypes.includes(mimeType)) {
            return this.checkFileSize(fileSize);
        }
        
        // Check file extension as fallback
        const extension = this.extractExtension(filename);
        if (this.capabilities.extensions.includes(extension)) {
            return this.checkFileSize(fileSize);
        }
        
        return false;
    }
    
    /**
     * Check if file size is within limits
     * @param {number} fileSize - File size in bytes
     * @returns {boolean} Whether file size is acceptable
     */
    checkFileSize(fileSize) {
        return fileSize <= this.capabilities.maxFileSize;
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
     * Get processing priority for this file
     * Higher values = higher priority
     * @param {string} mimeType - File MIME type
     * @param {string} filename - Filename
     * @returns {number} Priority score (0-100)
     */
    getPriority(mimeType, filename) {
        // Prefer MIME type matches over extension matches
        if (this.capabilities.mimeTypes.includes(mimeType)) {
            return 100;
        }
        
        const extension = this.extractExtension(filename);
        if (this.capabilities.extensions.includes(extension)) {
            return 80;
        }
        
        return 0;
    }
    
    /**
     * Generate preview for file - MUST be implemented by subclasses
     * @abstract
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        throw new Error('generatePreview() must be implemented by subclass');
    }
    
    /**
     * Extract metadata from file
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<Object>} File metadata
     */
    async extractMetadata(context) {
        return {
            filename: context.filename,
            mimeType: context.mimeType,
            fileSize: context.fileSize,
            handler: this.constructor.name
        };
    }
    
    /**
     * Create object URL and track for cleanup
     * @param {Blob} blob - Blob to create URL for
     * @returns {string} Object URL
     */
    createObjectURL(blob) {
        const url = URL.createObjectURL(blob);
        this.objectURLs.add(url);
        return url;
    }
    
    /**
     * Revoke object URL and remove from tracking
     * @param {string} url - Object URL to revoke
     */
    revokeObjectURL(url) {
        if (this.objectURLs.has(url)) {
            URL.revokeObjectURL(url);
            this.objectURLs.delete(url);
        }
    }
    
    /**
     * Register cleanup function
     * @param {string} key - Cleanup key
     * @param {Function} cleanupFn - Cleanup function
     */
    registerCleanup(key, cleanupFn) {
        this.cleanupFunctions.set(key, cleanupFn);
    }
    
    /**
     * Create preview container with consistent styling
     * @param {string} className - CSS class name
     * @param {Object} styles - Additional styles
     * @returns {HTMLElement} Container element
     */
    createContainer(className = 'preview-container', styles = {}) {
        const container = document.createElement('div');
        container.className = className;
        
        // Apply styles
        Object.assign(container.style, styles);
        
        return container;
    }
    
    /**
     * Create error element for preview failures
     * @param {string} message - Error message
     * @param {Error} error - Original error
     * @returns {HTMLElement} Error element
     */
    createErrorElement(message, error = null) {
        const errorContainer = this.createContainer('preview-error');
        errorContainer.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-title">Preview Error</div>
            <div class="error-message">${this.escapeHtml(message)}</div>
            ${error ? `<div class="error-details">${this.escapeHtml(error.message)}</div>` : ''}
        `;
        return errorContainer;
    }
    
    /**
     * Create loading element for async operations
     * @param {string} message - Loading message
     * @returns {HTMLElement} Loading element
     */
    createLoadingElement(message = 'Loading preview...') {
        const loadingContainer = this.createContainer('preview-loading');
        loadingContainer.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${this.escapeHtml(message)}</div>
        `;
        return loadingContainer;
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
     * Check if operation was cancelled
     * @param {AbortController} abortController - Abort controller
     * @returns {boolean} Whether operation was cancelled
     */
    isCancelled(abortController) {
        return abortController && abortController.signal.aborted;
    }
    
    /**
     * Execute operation with cancellation support
     * @param {Function} operation - Async operation to execute
     * @param {AbortController} abortController - Abort controller
     * @returns {Promise<*>} Operation result
     */
    async executeWithCancellation(operation, abortController) {
        if (this.isCancelled(abortController)) {
            throw new Error('Operation cancelled');
        }
        
        // Add abort listener
        const abortListener = () => {
            throw new Error('Operation cancelled');
        };
        
        if (abortController) {
            abortController.signal.addEventListener('abort', abortListener);
        }
        
        try {
            const result = await operation();
            return result;
        } finally {
            if (abortController) {
                abortController.signal.removeEventListener('abort', abortListener);
            }
        }
    }
    
    /**
     * Clean up all resources used by this handler
     */
    cleanup() {
        // Revoke all object URLs
        for (const url of this.objectURLs) {
            URL.revokeObjectURL(url);
        }
        this.objectURLs.clear();
        
        // Execute cleanup functions
        for (const [key, cleanupFn] of this.cleanupFunctions) {
            try {
                cleanupFn();
            } catch (error) {
                console.error(`Cleanup error for ${key}:`, error);
            }
        }
        this.cleanupFunctions.clear();
        
        console.log(`🧹 Handler cleaned up: ${this.constructor.name} (${this.instanceId})`);
    }
    
    /**
     * Get handler information
     * @returns {Object} Handler info
     */
    getInfo() {
        return {
            name: this.constructor.name,
            instanceId: this.instanceId,
            capabilities: this.capabilities,
            activeResources: {
                objectURLs: this.objectURLs.size,
                cleanupFunctions: this.cleanupFunctions.size
            }
        };
    }
    
    /**
     * Validate preview context
     * @param {PreviewContext} context - Context to validate
     * @throws {Error} If context is invalid
     */
    validateContext(context) {
        if (!context) {
            throw new Error('Preview context is required');
        }
        
        if (!context.data || !(context.data instanceof Uint8Array)) {
            throw new Error('Valid file data (Uint8Array) is required');
        }
        
        if (!context.filename || typeof context.filename !== 'string') {
            throw new Error('Valid filename is required');
        }
        
        if (!context.mimeType || typeof context.mimeType !== 'string') {
            throw new Error('Valid MIME type is required');
        }
        
        if (!context.container || !(context.container instanceof HTMLElement)) {
            throw new Error('Valid container element is required');
        }
    }
    
    /**
     * Create a safe preview execution wrapper
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Safe preview result
     */
    async safePreview(context) {
        try {
            // Validate context
            this.validateContext(context);
            
            // Check cancellation
            if (this.isCancelled(context.abortController)) {
                throw new Error('Preview cancelled');
            }
            
            // Generate preview
            const result = await this.generatePreview(context);
            
            // Validate result
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid preview result');
            }
            
            return {
                success: true,
                handler: this.constructor.name,
                instanceId: this.instanceId,
                ...result
            };
            
        } catch (error) {
            console.error(`Preview error in ${this.constructor.name}:`, error);
            
            return {
                success: false,
                error: error.message,
                handler: this.constructor.name,
                instanceId: this.instanceId,
                element: this.createErrorElement('Preview generation failed', error),
                cleanup: [],
                resources: {}
            };
        }
    }
}

// Export for ES6 modules
export { BasePreviewHandler };