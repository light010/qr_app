/**
 * @fileoverview Centralized Interface Definitions for QR Scanner Application
 * 
 * ROOT CAUSE SOLUTION: Establishes clear module contracts and reduces coupling
 * by defining standardized interfaces that all modules must implement.
 * 
 * This file contains all interface definitions used across the application,
 * providing a single source of truth for module contracts.
 */

// ============ CORE DATA INTERFACES ============

/**
 * @interface QRData
 * @description Parsed QR code data structure
 * @typedef {Object} QRData
 * @property {'header'|'chunk'} type - QR data type
 * @property {number} index - Chunk index or sequence number
 * @property {number} totalChunks - Total number of chunks (for header)
 * @property {string} data - Raw QR data content
 * @property {string} filename - Original filename (for header)
 * @property {number} fileSize - Total file size (for header)
 * @property {string} fileHash - File integrity hash (for header)
 * @property {string} protocol - Transfer protocol version
 * @property {Object} metadata - Additional metadata
 */

/**
 * @interface TransferProgress
 * @description Transfer progress information
 * @typedef {Object} TransferProgress
 * @property {number} progress - Progress ratio (0-1)
 * @property {number} chunksReceived - Number of chunks received
 * @property {number} totalChunks - Total number of chunks
 * @property {number} bytesReceived - Bytes received so far
 * @property {number} totalBytes - Total file size in bytes
 * @property {number[]} missingChunks - Array of missing chunk indices
 * @property {number} estimatedTimeRemaining - ETA in milliseconds
 */

/**
 * @interface FileInfo
 * @description Complete file information
 * @typedef {Object} FileInfo
 * @property {string} filename - Original filename
 * @property {string} mimeType - MIME type
 * @property {number} size - File size in bytes
 * @property {string} hash - File hash for integrity
 * @property {Uint8Array} data - File data
 * @property {Object} metadata - Additional file metadata
 */

// ============ ERROR HANDLING INTERFACES ============

/**
 * @interface ErrorInfo
 * @description Standardized error information
 * @typedef {Object} ErrorInfo
 * @property {'camera'|'network'|'storage'|'processing'|'ui'|'unknown'} type - Error category
 * @property {string} code - Specific error code
 * @property {string} message - Human-readable error message
 * @property {string} userMessage - User-friendly error message
 * @property {boolean} recoverable - Whether error can be recovered from
 * @property {string} suggestedAction - Recommended user action
 * @property {Object} details - Additional error details
 * @property {number} timestamp - Error timestamp
 */

/**
 * @interface RetryInfo
 * @description Retry attempt information
 * @typedef {Object} RetryInfo
 * @property {number} attempts - Number of retry attempts made
 * @property {number} maxAttempts - Maximum retry attempts allowed
 * @property {number} delay - Current retry delay in milliseconds
 * @property {number} nextRetry - Timestamp of next retry attempt
 * @property {Error} lastError - Last error that occurred
 * @property {boolean} critical - Whether this is a critical retry
 */

// ============ MODULE CONTRACT INTERFACES ============

/**
 * @interface IUIProvider
 * @description Contract for UI management
 */
class IUIProvider extends EventTarget {
    /**
     * Initialize UI provider
     * @returns {Promise<void>}
     */
    async initialize() { throw new Error('Not implemented'); }
    
    /**
     * Update loading text
     * @param {string} text - Loading text
     * @param {string} [detail] - Additional detail text
     */
    updateLoadingText(text, detail) { throw new Error('Not implemented'); }
    
    /**
     * Update progress display
     * @param {number} progress - Progress ratio (0-1)
     * @param {boolean} [isComplete] - Whether transfer is complete
     */
    updateProgress(progress, isComplete) { throw new Error('Not implemented'); }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) { throw new Error('Not implemented'); }
    
    /**
     * Update button state
     * @param {'idle'|'scanning'|'processing'|'complete'|'error'} state - Button state
     */
    updateScanButton(state) { throw new Error('Not implemented'); }
}

/**
 * @interface IStorageProvider  
 * @description Contract for persistent storage
 */
class IStorageProvider {
    /**
     * Initialize storage provider
     * @returns {Promise<void>}
     */
    async initialize() { throw new Error('Not implemented'); }
    
    /**
     * Store chunk data
     * @param {string} transferId - Transfer identifier
     * @param {number} chunkIndex - Chunk index
     * @param {Uint8Array} data - Chunk data
     * @returns {Promise<void>}
     */
    async storeChunk(transferId, chunkIndex, data) { throw new Error('Not implemented'); }
    
    /**
     * Retrieve chunk data
     * @param {string} transferId - Transfer identifier
     * @param {number} chunkIndex - Chunk index
     * @returns {Promise<Uint8Array>}
     */
    async getChunk(transferId, chunkIndex) { throw new Error('Not implemented'); }
    
    /**
     * Assemble complete file from chunks
     * @param {string} transferId - Transfer identifier
     * @returns {Promise<FileInfo>}
     */
    async assembleFile(transferId) { throw new Error('Not implemented'); }
}

/**
 * @interface ICameraProvider
 * @description Contract for camera management
 */
class ICameraProvider extends EventTarget {
    /**
     * Initialize camera provider
     * @returns {Promise<void>}
     */
    async initialize() { throw new Error('Not implemented'); }
    
    /**
     * Start camera with video element
     * @param {HTMLVideoElement} videoElement - Video element
     * @param {string} [cameraId] - Specific camera ID
     * @returns {Promise<MediaStream>}
     */
    async startCamera(videoElement, cameraId) { throw new Error('Not implemented'); }
    
    /**
     * Stop camera
     */
    stopCamera() { throw new Error('Not implemented'); }
    
    /**
     * Get available cameras
     * @returns {CameraInfo[]}
     */
    getCameraList() { throw new Error('Not implemented'); }
    
    /**
     * Toggle camera flash/torch
     * @returns {Promise<boolean>}
     */
    async toggleTorch() { throw new Error('Not implemented'); }
}

/**
 * @interface IAudioProvider
 * @description Contract for audio feedback
 */
class IAudioProvider {
    /**
     * Initialize audio provider
     * @returns {Promise<void>}
     */
    async initialize() { throw new Error('Not implemented'); }
    
    /**
     * Play feedback sound
     * @param {'success'|'error'|'progress'|'complete'} type - Sound type
     * @param {Object} [options] - Play options
     * @returns {Promise<void>}
     */
    async playFeedback(type, options) { throw new Error('Not implemented'); }
    
    /**
     * Set audio enabled state
     * @param {boolean} enabled - Whether audio is enabled
     */
    setEnabled(enabled) { throw new Error('Not implemented'); }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) { throw new Error('Not implemented'); }
}

/**
 * @interface IChunkProcessor
 * @description Contract for chunk processing
 */
class IChunkProcessor extends EventTarget {
    /**
     * Set total chunk count and metadata
     * @param {number} totalChunks - Total number of chunks
     * @param {FileMetadata} metadata - File metadata
     * @returns {Promise<void>}
     */
    async setTotalChunks(totalChunks, metadata) { throw new Error('Not implemented'); }
    
    /**
     * Add a chunk to the processor
     * @param {ChunkData} chunkData - Chunk data
     * @returns {Promise<TransferProgress>}
     */
    async addChunk(chunkData) { throw new Error('Not implemented'); }
    
    /**
     * Check if transfer is complete
     * @returns {boolean}
     */
    isComplete() { throw new Error('Not implemented'); }
    
    /**
     * Assemble complete file
     * @returns {Promise<FileInfo>}
     */
    async assembleFile() { throw new Error('Not implemented'); }
    
    /**
     * Reset processor state
     */
    reset() { throw new Error('Not implemented'); }
}

/**
 * @interface IDataProcessor
 * @description Contract for data processing (compression, encryption, etc.)
 */
class IDataProcessor {
    /**
     * Process file data
     * @param {Uint8Array} data - Raw file data
     * @param {Object} metadata - Processing metadata
     * @returns {Promise<{data: Uint8Array, metadata: Object}>}
     */
    async processData(data, metadata) { throw new Error('Not implemented'); }
    
    /**
     * Validate data integrity
     * @param {Uint8Array} data - File data
     * @param {string} expectedHash - Expected hash
     * @returns {Promise<boolean>}
     */
    async validateIntegrity(data, expectedHash) { throw new Error('Not implemented'); }
    
    /**
     * Get supported formats
     * @returns {Object}
     */
    getSupportedFormats() { throw new Error('Not implemented'); }
}

/**
 * @interface IFilePreview
 * @description Contract for file preview
 */
class IFilePreview {
    /**
     * Check if file can be previewed
     * @param {string} mimeType - File MIME type
     * @param {number} fileSize - File size
     * @returns {boolean}
     */
    canPreview(mimeType, fileSize) { throw new Error('Not implemented'); }
    
    /**
     * Show file preview
     * @param {FileInfo} fileInfo - File information
     * @returns {Promise<void>}
     */
    async showPreview(fileInfo) { throw new Error('Not implemented'); }
    
    /**
     * Close preview
     */
    closePreview() { throw new Error('Not implemented'); }
    
    /**
     * Get supported file types
     * @returns {Object}
     */
    getSupportedTypes() { throw new Error('Not implemented'); }
}

/**
 * @interface IQRScanner
 * @description Contract for QR code scanning
 */
class IQRScanner extends EventTarget {
    /**
     * Initialize QR scanner
     * @returns {Promise<void>}
     */
    async initialize() { throw new Error('Not implemented'); }
    
    /**
     * Start scanning
     * @returns {Promise<void>}
     */
    async startScanning() { throw new Error('Not implemented'); }
    
    /**
     * Stop scanning
     */
    stopScanning() { throw new Error('Not implemented'); }
    
    /**
     * Parse QR data
     * @param {string} qrString - Raw QR string
     * @returns {QRData}
     */
    parseQRData(qrString) { throw new Error('Not implemented'); }
}

// ============ SERVICE CONTAINER INTERFACE ============

/**
 * @interface IServiceContainer
 * @description Contract for dependency injection container
 */
class IServiceContainer {
    /**
     * Register a service
     * @param {string} name - Service name
     * @param {Function|Object} service - Service factory or instance
     * @param {boolean} [singleton=true] - Whether service is singleton
     */
    register(name, service, singleton = true) { throw new Error('Not implemented'); }
    
    /**
     * Get service instance
     * @param {string} name - Service name
     * @returns {Object}
     */
    get(name) { throw new Error('Not implemented'); }
    
    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) { throw new Error('Not implemented'); }
    
    /**
     * Clear all services
     */
    clear() { throw new Error('Not implemented'); }
}

// ============ CONFIGURATION INTERFACES ============

/**
 * @interface AppConfig
 * @description Application configuration
 * @typedef {Object} AppConfig
 * @property {Object} camera - Camera configuration
 * @property {Object} audio - Audio configuration
 * @property {Object} storage - Storage configuration
 * @property {Object} transfer - Transfer configuration
 * @property {Object} ui - UI configuration
 * @property {Object} theme - Theme configuration
 */

/**
 * @interface ModuleConfig
 * @description Module-specific configuration
 * @typedef {Object} ModuleConfig
 * @property {boolean} enabled - Whether module is enabled
 * @property {Object} options - Module-specific options
 * @property {Object} dependencies - Required dependencies
 */

// Export interfaces for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IUIProvider,
        IStorageProvider,
        ICameraProvider,
        IAudioProvider,
        IChunkProcessor,
        IDataProcessor,
        IFilePreview,
        IQRScanner,
        IServiceContainer
    };
}