/**
 * Automatic Retry Manager with Exponential Backoff
 * Handles failed chunk transfers with intelligent retry logic
 */
class RetryManager {
    constructor(options = {}) {
        // Use centralized configuration with fallbacks
        const config = window.AppConfig?.get('retry') || {};
        this.maxRetries = options.maxRetries || config.maxRetries || 5;
        this.baseDelay = options.baseDelay || config.baseDelay || 1000; // 1 second
        this.maxDelay = options.maxDelay || config.maxDelay || 30000; // 30 seconds
        this.backoffFactor = options.backoffFactor || config.backoffFactor || 2;
        this.jitterMax = options.jitterMax || config.jitterMax || 1000; // Random jitter up to 1s
        
        this.retryQueue = new Map(); // chunkIndex -> RetryInfo
        this.activeRetries = new Set();
        this.retryCallbacks = {
            onRetry: null,
            onSuccess: null,
            onFailure: null,
            onMaxRetriesReached: null
        };
        
        this.isActive = false;
        this.retryInterval = null;
    }
    
    setCallbacks(callbacks) {
        Object.assign(this.retryCallbacks, callbacks);
    }
    
    addFailedChunk(chunkIndex, error, originalData = null) {
        const retryInfo = this.retryQueue.get(chunkIndex) || {
            chunkIndex,
            attempts: 0,
            lastError: null,
            originalData,
            nextRetryTime: 0,
            backoffDelay: this.baseDelay
        };
        
        retryInfo.attempts++;
        retryInfo.lastError = error;
        retryInfo.nextRetryTime = Date.now() + this.calculateDelay(retryInfo.attempts);
        
        this.retryQueue.set(chunkIndex, retryInfo);
        
        console.log(`📋 Added chunk ${chunkIndex} to retry queue (attempt ${retryInfo.attempts}/${this.maxRetries})`);
        
        if (!this.isActive) {
            this.startRetryProcess();
        }
        
        return retryInfo.attempts < this.maxRetries;
    }
    
    removeFromQueue(chunkIndex) {
        const removed = this.retryQueue.delete(chunkIndex);
        this.activeRetries.delete(chunkIndex);
        
        if (removed) {
            console.log(`✅ Removed chunk ${chunkIndex} from retry queue`);
        }
        
        // Stop retry process if queue is empty
        if (this.retryQueue.size === 0 && this.isActive) {
            this.stopRetryProcess();
        }
        
        return removed;
    }
    
    calculateDelay(attemptNumber) {
        // Exponential backoff with jitter
        const exponentialDelay = this.baseDelay * Math.pow(this.backoffFactor, attemptNumber - 1);
        const clampedDelay = Math.min(exponentialDelay, this.maxDelay);
        const jitter = Math.random() * this.jitterMax;
        
        return clampedDelay + jitter;
    }
    
    startRetryProcess() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🔄 Starting automatic retry process');
        
        // Check for retries every 500ms
        const checkInterval = window.AppConfig?.get('retry.checkInterval') || 500;
        this.retryInterval = setInterval(() => {
            this.processRetryQueue();
        }, checkInterval);
    }
    
    stopRetryProcess() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
            this.retryInterval = null;
        }
        
        console.log('⏹️ Stopped automatic retry process');
    }
    
    async processRetryQueue() {
        const now = Date.now();
        const readyForRetry = [];
        
        // Find chunks ready for retry
        for (const [chunkIndex, retryInfo] of this.retryQueue) {
            if (retryInfo.nextRetryTime <= now && !this.activeRetries.has(chunkIndex)) {
                if (retryInfo.attempts >= this.maxRetries) {
                    // Max retries reached
                    this.handleMaxRetriesReached(retryInfo);
                    this.retryQueue.delete(chunkIndex);
                } else {
                    readyForRetry.push(retryInfo);
                }
            }
        }
        
        // Process retries (limit concurrent retries)
        const maxConcurrentRetries = window.AppConfig?.get('retry.maxConcurrent') || 3;
        const availableSlots = maxConcurrentRetries - this.activeRetries.size;
        const toProcess = readyForRetry.slice(0, availableSlots);
        
        for (const retryInfo of toProcess) {
            await this.attemptRetry(retryInfo);
        }
    }
    
    async attemptRetry(retryInfo) {
        const { chunkIndex } = retryInfo;
        
        this.activeRetries.add(chunkIndex);
        
        try {
            console.log(`🔄 Retrying chunk ${chunkIndex} (attempt ${retryInfo.attempts}/${this.maxRetries})`);
            
            if (this.retryCallbacks.onRetry) {
                this.retryCallbacks.onRetry(chunkIndex, retryInfo.attempts);
            }
            
            // Attempt to re-scan the chunk (this would trigger QR re-detection)
            const success = await this.triggerChunkRescan(retryInfo);
            
            if (success) {
                this.handleRetrySuccess(retryInfo);
            } else {
                this.handleRetryFailure(retryInfo, new Error('Rescan failed'));
            }
            
        } catch (error) {
            this.handleRetryFailure(retryInfo, error);
        } finally {
            this.activeRetries.delete(chunkIndex);
        }
    }
    
    async triggerChunkRescan(retryInfo) {
        // This method would integrate with the QR scanner to request re-detection
        // For now, we simulate retry logic - in practice this would:
        // 1. Request the QR scanner to focus on missing chunks
        // 2. Increase scan sensitivity for specific chunk patterns
        // 3. Apply error correction if available
        
        return new Promise((resolve) => {
            // Simulate retry delay and potential success
            const successProbability = Math.min(0.7, 0.3 + (retryInfo.attempts * 0.1));
            setTimeout(() => {
                resolve(Math.random() < successProbability);
            }, 100);
        });
    }
    
    handleRetrySuccess(retryInfo) {
        console.log(`✅ Retry successful for chunk ${retryInfo.chunkIndex}`);
        
        if (this.retryCallbacks.onSuccess) {
            this.retryCallbacks.onSuccess(retryInfo.chunkIndex, retryInfo.attempts);
        }
        
        this.removeFromQueue(retryInfo.chunkIndex);
    }
    
    handleRetryFailure(retryInfo, error) {
        console.log(`❌ Retry failed for chunk ${retryInfo.chunkIndex}: ${error.message}`);
        
        retryInfo.lastError = error;
        retryInfo.nextRetryTime = Date.now() + this.calculateDelay(retryInfo.attempts + 1);
        
        if (this.retryCallbacks.onFailure) {
            this.retryCallbacks.onFailure(retryInfo.chunkIndex, error, retryInfo.attempts);
        }
    }
    
    handleMaxRetriesReached(retryInfo) {
        console.error(`💀 Max retries reached for chunk ${retryInfo.chunkIndex}`);
        
        if (this.retryCallbacks.onMaxRetriesReached) {
            this.retryCallbacks.onMaxRetriesReached(retryInfo.chunkIndex, retryInfo.lastError);
        }
    }
    
    getRetryStats() {
        const stats = {
            totalInQueue: this.retryQueue.size,
            activeRetries: this.activeRetries.size,
            chunksNearMaxRetries: 0,
            averageAttempts: 0,
            oldestRetry: null
        };
        
        let totalAttempts = 0;
        let oldestTime = Infinity;
        
        for (const retryInfo of this.retryQueue.values()) {
            totalAttempts += retryInfo.attempts;
            
            if (retryInfo.attempts >= this.maxRetries - 1) {
                stats.chunksNearMaxRetries++;
            }
            
            const retryAge = Date.now() - (retryInfo.nextRetryTime - this.calculateDelay(retryInfo.attempts));
            if (retryAge < oldestTime) {
                oldestTime = retryAge;
                stats.oldestRetry = {
                    chunkIndex: retryInfo.chunkIndex,
                    ageMs: retryAge,
                    attempts: retryInfo.attempts
                };
            }
        }
        
        if (this.retryQueue.size > 0) {
            stats.averageAttempts = totalAttempts / this.retryQueue.size;
        }
        
        return stats;
    }
    
    clearQueue() {
        this.retryQueue.clear();
        this.activeRetries.clear();
        this.stopRetryProcess();
        console.log('🧹 Retry queue cleared');
    }
    
    pauseRetries() {
        this.stopRetryProcess();
        console.log('⏸️ Retry process paused');
    }
    
    resumeRetries() {
        if (this.retryQueue.size > 0) {
            this.startRetryProcess();
            console.log('▶️ Retry process resumed');
        }
    }
    
    // Get chunks that need immediate attention
    getCriticalChunks() {
        const critical = [];
        const now = Date.now();
        
        for (const retryInfo of this.retryQueue.values()) {
            if (retryInfo.attempts >= this.maxRetries - 2 || 
                (now - retryInfo.nextRetryTime) > this.maxDelay * 2) {
                critical.push({
                    chunkIndex: retryInfo.chunkIndex,
                    attempts: retryInfo.attempts,
                    lastError: retryInfo.lastError.message,
                    overdue: now > retryInfo.nextRetryTime
                });
            }
        }
        
        return critical;
    }
}

// Export for ES6 modules
export { RetryManager };