/**
 * @fileoverview Advanced Chunk Manager with Persistent Storage Integration
 * Handles QR transfer chunk processing, memory optimization, and visual feedback
 */

/**
 * @interface ChunkData
 * @description Represents a single chunk of data
 * @typedef {Object} ChunkData
 * @property {number} index - Chunk index (0-based)
 * @property {Uint8Array} data - Raw chunk data
 */

/**
 * @interface FileMetadata
 * @description File metadata for chunk processing
 * @typedef {Object} FileMetadata
 * @property {string} filename - Original filename
 * @property {number} fileSize - Total file size in bytes
 * @property {string} fileHash - File hash for integrity verification
 * @property {string} protocol - Transfer protocol version
 * @property {Object} compressionInfo - Compression metadata
 */

/**
 * @interface ChunkManagerResult
 * @description Result from chunk processing operations
 * @typedef {Object} ChunkManagerResult
 * @property {number} progress - Processing progress (0-1)
 * @property {boolean} isComplete - Whether all chunks are received
 * @property {number} memoryUsage - Current memory usage in bytes
 */

/**
 * @interface AssembledFile
 * @description Assembled file data
 * @typedef {Object} AssembledFile
 * @property {Uint8Array} data - Complete file data
 * @property {string} filename - Original filename
 * @property {number} size - Total file size
 */

/**
 * @interface ChunkManagerAPI
 * @description Public API contract for ChunkManager
 * @typedef {Object} ChunkManagerAPI
 * @property {function(number, string=, number=, string=, string=): Promise<void>} setTotalChunks - Set total chunk count
 * @property {function(ChunkData): Promise<ChunkManagerResult>} addChunk - Add a chunk
 * @property {function(): number} getProgress - Get current progress
 * @property {function(): boolean} isComplete - Check if transfer is complete
 * @property {function(): number[]} getMissingChunks - Get missing chunk indices
 * @property {function(): Promise<AssembledFile>} assembleFile - Assemble complete file
 * @property {function(): void} reset - Reset chunk manager state
 */
/**
 * Advanced Chunk Manager with Persistent Storage Integration
 * Handles QR transfer chunk processing, memory optimization, and visual feedback
 * 
 * @class ChunkManager
 * @implements {ChunkManagerAPI}
 */
class ChunkManager {
    constructor(ui = null, storage = null, retryManager = null) {
        // UI Manager for DOM operations - ROOT CAUSE FIX
        this.ui = ui;
        this.receivedChunks = new Map();
        this.missingChunks = new Set();
        this.totalChunks = 0;
        this.memoryThreshold = window.AppConfig?.get('storage.chunkManager.memoryThreshold') || 50 * 1024 * 1024; // 50MB
        this.currentMemoryUsage = 0;
        this.filename = '';
        this.fileSize = 0;
        this.fileHash = '';
        this.compressionInfo = null;
        this.chunkErrors = new Set();
        this.protocol = null;
        this.storage = storage;
        this.transferId = null;
        this.useStorage = false;
        this.retryManager = retryManager;
        this.chunkTimeouts = new Map(); // Track chunk reception timeouts
        this.timeoutDuration = window.AppConfig?.get('transfer.chunkTimeout') || 10000; // 10 seconds timeout per chunk
        
        if (this.retryManager) {
            this.setupRetryCallbacks();
        }
    }
    
    async setTotalChunks(total, filename = '', fileSize = 0, fileHash = '', protocol = 'unknown') {
        this.totalChunks = total;
        this.filename = filename || `transfer_${Date.now()}.bin`;
        this.fileSize = fileSize;
        this.fileHash = fileHash;
        this.protocol = protocol;
        this.missingChunks = new Set([...Array(total).keys()]);
        
        // Create persistent transfer if storage is available and file is large
        if (this.storage && fileSize > this.memoryThreshold) {
            this.useStorage = true;
            this.transferId = await this.storage.storeTransfer({
                filename: this.filename,
                totalChunks: total,
                fileSize: fileSize,
                protocol: protocol,
                fileHash: fileHash,
                metadata: { compressionInfo: this.compressionInfo }
            });
            console.log(`📁 Using persistent storage for large file: ${this.filename} (${this.formatBytes(fileSize)})`);
        }
        
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.ui.updateChunkGrid(total);
        }
        this.startChunkTimeoutMonitoring();
    }
    
    setupRetryCallbacks() {
        this.retryManager.setCallbacks({
            onRetry: (chunkIndex, attempts) => {
                console.log(`🔄 Retrying chunk ${chunkIndex} (attempt ${attempts})`);
                // Use UIManager for DOM operations - ROOT CAUSE FIX
                if (this.ui) {
                    this.ui.updateChunkIndicator(chunkIndex, 'retrying', { attempts });
                }
            },
            onSuccess: (chunkIndex, attempts) => {
                console.log(`✅ Retry successful for chunk ${chunkIndex} after ${attempts} attempts`);
                this.chunkErrors.delete(chunkIndex);
                // Use UIManager for DOM operations - ROOT CAUSE FIX
                if (this.ui) {
                    this.ui.updateChunkIndicator(chunkIndex, 'received');
                }
            },
            onFailure: (chunkIndex, error, attempts) => {
                console.log(`❌ Retry failed for chunk ${chunkIndex} (attempt ${attempts}): ${error.message}`);
                // Use UIManager for DOM operations - ROOT CAUSE FIX
                if (this.ui) {
                    this.ui.updateChunkIndicator(chunkIndex, 'error');
                }
            },
            onMaxRetriesReached: (chunkIndex, lastError) => {
                console.error(`💀 Max retries reached for chunk ${chunkIndex}: ${lastError.message}`);
                this.chunkErrors.add(chunkIndex);
                // Use UIManager for DOM operations - ROOT CAUSE FIX
                if (this.ui) {
                    this.ui.updateChunkIndicator(chunkIndex, 'failed');
                }
            }
        });
    }
    
    startChunkTimeoutMonitoring() {
        // Monitor for chunks that haven't been received within timeout
        const checkTimeouts = () => {
            const now = Date.now();
            
            for (const [chunkIndex, startTime] of this.chunkTimeouts) {
                if (now - startTime > this.timeoutDuration && this.missingChunks.has(chunkIndex)) {
                    console.warn(`⏰ Chunk ${chunkIndex} timeout detected`);
                    
                    if (this.retryManager) {
                        const timeoutError = new Error(`Chunk ${chunkIndex} reception timeout`);
                        this.retryManager.addFailedChunk(chunkIndex, timeoutError);
                    }
                    
                    this.chunkTimeouts.delete(chunkIndex);
                }
            }
            
            // Continue monitoring if transfer is active
            if (this.missingChunks.size > 0) {
                setTimeout(checkTimeouts, 2000); // Check every 2 seconds
            }
        };
        
        // Start timeout monitoring
        setTimeout(checkTimeouts, this.timeoutDuration);
        
        // Set initial timeout timestamps for all chunks
        for (let i = 0; i < this.totalChunks; i++) {
            this.chunkTimeouts.set(i, Date.now());
        }
    }
    
    async addChunk(chunkData) {
        const { index, data } = chunkData;
        
        // Validate chunk index
        if (index < 0 || index >= this.totalChunks) {
            throw new Error(`Invalid chunk index: ${index}`);
        }
        
        const chunkSize = data.byteLength || data.length;
        
        // Use persistent storage if enabled or memory threshold exceeded
        if (this.useStorage || (this.storage && this.currentMemoryUsage + chunkSize > this.memoryThreshold)) {
            if (!this.useStorage && this.storage) {
                // Switch to storage mode
                this.useStorage = true;
                console.warn('💾 Memory threshold exceeded, switching to persistent storage');
                
                // Create transfer if not already created
                if (!this.transferId) {
                    this.transferId = await this.storage.storeTransfer({
                        filename: this.filename,
                        totalChunks: this.totalChunks,
                        fileSize: this.fileSize,
                        protocol: this.protocol,
                        fileHash: this.fileHash,
                        metadata: { compressionInfo: this.compressionInfo }
                    });
                }
                
                // Move existing chunks to storage
                for (const [existingIndex, existingData] of this.receivedChunks) {
                    await this.storage.storeChunk(this.transferId, existingIndex, existingData);
                }
                
                // Clear memory
                this.receivedChunks.clear();
                this.currentMemoryUsage = 0;
            }
            
            // Store chunk persistently
            await this.storage.storeChunk(this.transferId, index, data);
        } else {
            // Store chunk in memory
            this.receivedChunks.set(index, data);
            this.currentMemoryUsage += chunkSize;
        }
        
        this.missingChunks.delete(index);
        this.chunkErrors.delete(index);
        this.chunkTimeouts.delete(index); // Clear timeout for received chunk
        
        // Remove from retry queue if it was being retried
        if (this.retryManager) {
            this.retryManager.removeFromQueue(index);
        }
        
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.ui.updateChunkIndicator(index, 'received');
        }
        
        const progress = this.getProgress();
        const isComplete = this.missingChunks.size === 0;
        
        return { progress, isComplete, memoryUsage: this.currentMemoryUsage };
    }
    
    getProgress() {
        return this.totalChunks > 0 ? (this.totalChunks - this.missingChunks.size) / this.totalChunks : 0;
    }
    
    isComplete() {
        return this.totalChunks > 0 && this.missingChunks.size === 0;
    }
    
    getMissingChunks() {
        return Array.from(this.missingChunks);
    }
    
    async assembleFile() {
        if (this.useStorage && this.storage) {
            // Use persistent storage assembly
            return await this.storage.assembleFile(this.transferId);
        } else {
            // Use memory assembly
            return this.assembleFromMemory();
        }
    }
    
    assembleFromMemory() {
        if (!this.isComplete()) {
            throw new Error('Transfer incomplete');
        }
        
        // Sort chunks by index
        const sortedChunks = Array.from(this.receivedChunks.entries())
            .sort((a, b) => a[0] - b[0])
            .map(entry => entry[1]);
        
        // Calculate total size
        let totalSize = 0;
        for (const chunk of sortedChunks) {
            totalSize += chunk.length;
        }
        
        // Assemble file
        const result = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const chunk of sortedChunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return {
            data: result,
            filename: this.filename,
            size: totalSize
        };
    }
    
    
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    reset() {
        this.receivedChunks.clear();
        this.missingChunks.clear();
        this.chunkErrors.clear();
        this.totalChunks = 0;
        this.currentMemoryUsage = 0;
        this.filename = '';
        this.fileSize = 0;
        this.fileHash = '';
        this.compressionInfo = null;
        this.protocol = null;
        this.transferId = null;
        this.useStorage = false;
        
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.ui.clearChunkGrid();
        }
    }
}

// Export for ES6 modules
export { ChunkManager };