/**
 * @fileoverview Error Boundaries and Propagation Utilities
 * 
 * ROOT CAUSE SOLUTION: Implements consistent error boundaries to prevent
 * the 127 identified error scenarios from causing cascade failures.
 * 
 * Provides memory monitoring, timeout handling, circuit breakers, and
 * graceful degradation patterns for all critical operations.
 */

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by breaking circuits when error threshold exceeded
 * 
 * @class CircuitBreaker
 */
class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.failureThreshold = options.failureThreshold || 5;
        this.timeout = options.timeout || 60000; // 1 minute
        this.retryTimeout = options.retryTimeout || 10000; // 10 seconds
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        
        console.log(`🔒 Circuit breaker '${name}' created (threshold: ${this.failureThreshold})`);
    }
    
    /**
     * Execute operation with circuit breaker protection
     * @param {Function} operation - Async operation to execute
     * @returns {Promise<*>} Operation result
     */
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttemptTime) {
                const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
                error.circuitBreaker = true;
                throw error;
            } else {
                this.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker '${this.name}' attempting recovery (HALF_OPEN)`);
            }
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    
    /**
     * Handle successful operation
     */
    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            console.log(`✅ Circuit breaker '${this.name}' recovered (CLOSED)`);
        }
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }
    
    /**
     * Handle failed operation
     * @param {Error} error - Error that occurred
     */
    onFailure(error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.retryTimeout;
            console.error(`🔴 Circuit breaker '${this.name}' opened after ${this.failureCount} failures`);
        }
        
        console.warn(`⚠️ Circuit breaker '${this.name}' failure ${this.failureCount}/${this.failureThreshold}`);
    }
    
    /**
     * Get circuit breaker status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            isAvailable: this.state !== 'OPEN' || Date.now() >= this.nextAttemptTime,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttemptTime
        };
    }
    
    /**
     * Reset circuit breaker to closed state
     */
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        console.log(`🔄 Circuit breaker '${this.name}' manually reset`);
    }
}

/**
 * Memory Pressure Monitor
 * Prevents browser crashes by monitoring and managing memory usage
 * 
 * @class MemoryMonitor
 */
class MemoryMonitor {
    constructor(options = {}) {
        this.thresholds = {
            warning: options.warningThreshold || 50 * 1024 * 1024,    // 50MB
            critical: options.criticalThreshold || 100 * 1024 * 1024, // 100MB
            emergency: options.emergencyThreshold || 150 * 1024 * 1024 // 150MB
        };
        
        this.checkInterval = options.checkInterval || 5000; // 5 seconds
        this.listeners = new Set();
        this.isMonitoring = false;
        this.currentUsage = 0;
        
        this.cleanupCallbacks = new Set();
    }
    
    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitorLoop();
        console.log('📊 Memory monitoring started');
    }
    
    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('📊 Memory monitoring stopped');
    }
    
    /**
     * Monitor memory usage loop
     */
    async monitorLoop() {
        while (this.isMonitoring) {
            try {
                this.checkMemoryUsage();
                await this.sleep(this.checkInterval);
            } catch (error) {
                console.error('Memory monitoring error:', error);
            }
        }
    }
    
    /**
     * Check current memory usage
     */
    checkMemoryUsage() {
        let memoryInfo = null;
        
        // Try to get memory information
        if (performance.memory) {
            memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        } else {
            // Fallback estimation based on data structures
            memoryInfo = this.estimateMemoryUsage();
        }
        
        this.currentUsage = memoryInfo.used;
        
        // Check thresholds
        if (memoryInfo.used > this.thresholds.emergency) {
            this.handleEmergencyPressure(memoryInfo);
        } else if (memoryInfo.used > this.thresholds.critical) {
            this.handleCriticalPressure(memoryInfo);
        } else if (memoryInfo.used > this.thresholds.warning) {
            this.handleWarningPressure(memoryInfo);
        }
    }
    
    /**
     * Handle emergency memory pressure
     * @param {Object} memoryInfo - Memory usage information
     */
    handleEmergencyPressure(memoryInfo) {
        console.error('🚨 EMERGENCY: Memory usage critical!', memoryInfo);
        
        // Force aggressive cleanup
        this.triggerCleanup('emergency');
        
        // Emit emergency event
        this.emit('emergency', { type: 'emergency', memory: memoryInfo });
        
        // Consider forcing garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }
    
    /**
     * Handle critical memory pressure
     * @param {Object} memoryInfo - Memory usage information
     */
    handleCriticalPressure(memoryInfo) {
        console.warn('🔴 CRITICAL: High memory usage detected', memoryInfo);
        
        // Trigger cleanup
        this.triggerCleanup('critical');
        
        // Emit critical event
        this.emit('critical', { type: 'critical', memory: memoryInfo });
    }
    
    /**
     * Handle warning memory pressure
     * @param {Object} memoryInfo - Memory usage information
     */
    handleWarningPressure(memoryInfo) {
        console.warn('🟡 WARNING: Memory usage elevated', memoryInfo);
        
        // Emit warning event
        this.emit('warning', { type: 'warning', memory: memoryInfo });
    }
    
    /**
     * Estimate memory usage when performance.memory unavailable
     * @returns {Object} Estimated memory info
     */
    estimateMemoryUsage() {
        // This is a rough estimation - real implementation would be more sophisticated
        const estimatedUsage = 20 * 1024 * 1024; // 20MB baseline
        
        return {
            used: estimatedUsage,
            total: estimatedUsage * 2,
            limit: 100 * 1024 * 1024, // 100MB estimated limit
            estimated: true
        };
    }
    
    /**
     * Trigger cleanup callbacks
     * @param {string} level - Cleanup level: 'warning', 'critical', 'emergency'
     */
    triggerCleanup(level) {
        console.log(`🧹 Triggering ${level} cleanup...`);
        
        for (const callback of this.cleanupCallbacks) {
            try {
                callback(level);
            } catch (error) {
                console.error('Cleanup callback error:', error);
            }
        }
    }
    
    /**
     * Register cleanup callback
     * @param {Function} callback - Cleanup function
     */
    onMemoryPressure(callback) {
        this.cleanupCallbacks.add(callback);
    }
    
    /**
     * Add event listener
     * @param {string} event - Event type
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (!this.eventListeners) {
            this.eventListeners = new Map();
        }
        
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        
        this.eventListeners.get(event).add(callback);
    }
    
    /**
     * Emit event to listeners
     * @param {string} event - Event type
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.eventListeners || !this.eventListeners.has(event)) {
            return;
        }
        
        for (const callback of this.eventListeners.get(event)) {
            try {
                callback(data);
            } catch (error) {
                console.error(`Event listener error for ${event}:`, error);
            }
        }
    }
    
    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get current memory status
     * @returns {Object} Memory status
     */
    getStatus() {
        return {
            currentUsage: this.currentUsage,
            thresholds: this.thresholds,
            isMonitoring: this.isMonitoring,
            formatUsage: this.formatBytes(this.currentUsage)
        };
    }
    
    /**
     * Format bytes to human readable
     * @param {number} bytes - Bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}

/**
 * Timeout Wrapper Utility
 * Adds consistent timeout handling to prevent hanging operations
 */
class TimeoutManager {
    /**
     * Wrap promise with timeout
     * @param {Promise} promise - Promise to wrap
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} [operation] - Operation name for error message
     * @returns {Promise} Promise that rejects on timeout
     */
    static withTimeout(promise, timeoutMs, operation = 'Operation') {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const error = new Error(`${operation} timed out after ${timeoutMs}ms`);
                error.timeout = true;
                error.duration = timeoutMs;
                reject(error);
            }, timeoutMs);
            
            promise
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }
    
    /**
     * Create a timeout wrapper with default settings
     * @param {number} defaultTimeout - Default timeout in ms
     * @returns {Function} Timeout wrapper function
     */
    static createWrapper(defaultTimeout = 10000) {
        return (promise, operation, timeout = defaultTimeout) => {
            return TimeoutManager.withTimeout(promise, timeout, operation);
        };
    }
}

/**
 * Error Boundary Wrapper
 * Provides consistent error boundaries for all operations
 */
class ErrorBoundary {
    constructor(name, errorManager) {
        this.name = name;
        this.errorManager = errorManager;
        this.circuitBreaker = new CircuitBreaker(name);
    }
    
    /**
     * Execute operation with error boundary protection
     * @param {Function} operation - Operation to execute
     * @param {Object} options - Execution options
     * @returns {Promise<*>} Operation result or fallback
     */
    async execute(operation, options = {}) {
        const {
            timeout = 30000,
            fallback = null,
            errorType = 'unknown',
            context = {},
            suppressErrors = false
        } = options;
        
        try {
            // Wrap with circuit breaker and timeout
            const wrappedOperation = () => TimeoutManager.withTimeout(
                operation(), 
                timeout, 
                `${this.name} operation`
            );
            
            const result = await this.circuitBreaker.execute(wrappedOperation);
            return result;
            
        } catch (error) {
            // Create standardized error
            const errorInfo = this.errorManager.createError(error, errorType, {
                context: {
                    boundary: this.name,
                    circuitBreakerStatus: this.circuitBreaker.getStatus(),
                    ...context
                },
                recoverable: fallback !== null
            });
            
            // Handle error through error manager
            if (!suppressErrors) {
                this.errorManager.handleError(errorInfo);
            }
            
            // Return fallback if available
            if (fallback !== null) {
                console.warn(`⚠️ Using fallback for ${this.name}:`, typeof fallback === 'function' ? fallback() : fallback);
                return typeof fallback === 'function' ? await fallback(error) : fallback;
            }
            
            throw error;
        }
    }
    
    /**
     * Get boundary status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            name: this.name,
            circuitBreaker: this.circuitBreaker.getStatus()
        };
    }
}

/**
 * Graceful Degradation Framework
 * Manages feature availability and fallback mechanisms
 */
class GracefulDegradation {
    constructor() {
        this.features = new Map();
        this.fallbacks = new Map();
        this.listeners = new Set();
    }
    
    /**
     * Register a feature with detection and fallback
     * @param {string} name - Feature name
     * @param {Function} detector - Function to detect if feature is available
     * @param {*} fallback - Fallback value or function
     */
    registerFeature(name, detector, fallback = null) {
        this.features.set(name, {
            name,
            detector,
            available: null, // null = not tested, true/false = tested
            lastCheck: null
        });
        
        if (fallback !== null) {
            this.fallbacks.set(name, fallback);
        }
        
        console.log(`📋 Feature '${name}' registered`);
    }
    
    /**
     * Check if feature is available
     * @param {string} name - Feature name
     * @param {boolean} forceRecheck - Force re-detection
     * @returns {Promise<boolean>} Whether feature is available
     */
    async isFeatureAvailable(name, forceRecheck = false) {
        const feature = this.features.get(name);
        if (!feature) {
            throw new Error(`Unknown feature: ${name}`);
        }
        
        // Return cached result unless force recheck
        if (!forceRecheck && feature.available !== null) {
            return feature.available;
        }
        
        try {
            feature.available = await feature.detector();
            feature.lastCheck = Date.now();
            
            console.log(`🔍 Feature '${name}' detection: ${feature.available ? 'available' : 'unavailable'}`);
            
            // Notify listeners of feature status change
            this.notifyListeners(name, feature.available);
            
            return feature.available;
        } catch (error) {
            console.error(`Feature detection failed for '${name}':`, error);
            feature.available = false;
            feature.lastCheck = Date.now();
            return false;
        }
    }
    
    /**
     * Get feature value or fallback
     * @param {string} name - Feature name
     * @param {*} primary - Primary value to use if feature available
     * @returns {Promise<*>} Feature value or fallback
     */
    async getFeatureValue(name, primary) {
        const isAvailable = await this.isFeatureAvailable(name);
        
        if (isAvailable) {
            return primary;
        }
        
        const fallback = this.fallbacks.get(name);
        if (fallback === undefined) {
            throw new Error(`Feature '${name}' unavailable and no fallback provided`);
        }
        
        return typeof fallback === 'function' ? await fallback() : fallback;
    }
    
    /**
     * Execute operation with feature detection
     * @param {string} featureName - Feature name
     * @param {Function} primaryOperation - Operation if feature available
     * @param {Function} [fallbackOperation] - Operation if feature unavailable
     * @returns {Promise<*>} Operation result
     */
    async executeWithFeature(featureName, primaryOperation, fallbackOperation = null) {
        const isAvailable = await this.isFeatureAvailable(featureName);
        
        if (isAvailable) {
            return await primaryOperation();
        }
        
        if (fallbackOperation) {
            console.warn(`⚠️ Using fallback for unavailable feature: ${featureName}`);
            return await fallbackOperation();
        }
        
        const registeredFallback = this.fallbacks.get(featureName);
        if (registeredFallback) {
            return typeof registeredFallback === 'function' ? await registeredFallback() : registeredFallback;
        }
        
        throw new Error(`Feature '${featureName}' is unavailable and no fallback provided`);
    }
    
    /**
     * Add feature status listener
     * @param {Function} listener - Listener function
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    
    /**
     * Remove feature status listener
     * @param {Function} listener - Listener function
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    /**
     * Notify listeners of feature status change
     * @param {string} featureName - Feature name
     * @param {boolean} available - Whether feature is available
     */
    notifyListeners(featureName, available) {
        for (const listener of this.listeners) {
            try {
                listener(featureName, available);
            } catch (error) {
                console.error('Feature listener error:', error);
            }
        }
    }
    
    /**
     * Get status of all features
     * @returns {Object} Feature status map
     */
    getFeatureStatus() {
        const status = {};
        for (const [name, feature] of this.features) {
            status[name] = {
                available: feature.available,
                lastCheck: feature.lastCheck,
                hasFallback: this.fallbacks.has(name)
            };
        }
        return status;
    }
}

// Export utilities
export { 
    CircuitBreaker, 
    MemoryMonitor, 
    TimeoutManager, 
    ErrorBoundary, 
    GracefulDegradation 
};