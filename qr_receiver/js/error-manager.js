/**
 * @fileoverview Centralized Error Manager for QR Scanner Application
 * 
 * ROOT CAUSE SOLUTION: Eliminates scattered error handling by providing
 * centralized error categorization, logging, user messaging, and recovery.
 * 
 * Implements consistent error boundaries and propagation across all modules.
 */

/**
 * @interface ErrorManagerAPI
 * @description Public API contract for ErrorManager
 * @typedef {Object} ErrorManagerAPI
 * @property {function(Error|string, string, Object=): ErrorInfo} createError - Create standardized error
 * @property {function(ErrorInfo): void} handleError - Handle error with appropriate response
 * @property {function(Error|ErrorInfo, string=): void} reportError - Report error for logging/telemetry
 * @property {function(string, Function): void} onErrorType - Register error type handler
 * @property {function(Error|ErrorInfo): boolean} isRecoverable - Check if error is recoverable
 * @property {function(): void} showErrorDialog - Show error dialog to user
 * @property {function(): void} clearErrors - Clear all errors
 */

/**
 * Centralized Error Manager
 * Provides consistent error handling, user messaging, and recovery across modules
 * 
 * @class ErrorManager
 * @extends EventTarget
 * @implements {ErrorManagerAPI}
 */
class ErrorManager extends EventTarget {
    constructor(ui = null) {
        super();
        
        /** @type {UIManager} UI manager for displaying errors */
        this.ui = ui;
        
        /** @type {Map<string, Function>} Error type handlers */
        this.errorHandlers = new Map();
        
        /** @type {ErrorInfo[]} Recent errors for debugging */
        this.recentErrors = [];
        
        /** @type {number} Maximum errors to keep in memory */
        this.maxRecentErrors = 50;
        
        /** @type {boolean} Whether to show error details to user */
        this.showDetailedErrors = false;
        
        /** @type {Map<string, number>} Error occurrence counts */
        this.errorCounts = new Map();
        
        /** @type {Set<string>} Suppressed error types */
        this.suppressedErrors = new Set();
        
        this.setupDefaultHandlers();
        this.setupGlobalErrorHandling();
    }
    
    /**
     * Setup default error handlers for common error types
     */
    setupDefaultHandlers() {
        // Camera errors
        this.onErrorType('camera', (error) => {
            this.showUserMessage(
                'Camera Error',
                error.userMessage || 'Unable to access camera. Please check permissions.',
                'warning'
            );
        });
        
        // Network errors
        this.onErrorType('network', (error) => {
            this.showUserMessage(
                'Connection Error', 
                error.userMessage || 'Network connection issue. Please check your internet connection.',
                'error'
            );
        });
        
        // Storage errors
        this.onErrorType('storage', (error) => {
            this.showUserMessage(
                'Storage Error',
                error.userMessage || 'Unable to save data. Storage may be full.',
                'warning'
            );
        });
        
        // Processing errors
        this.onErrorType('processing', (error) => {
            this.showUserMessage(
                'Processing Error',
                error.userMessage || 'Failed to process data. Please try again.',
                'error'
            );
        });
        
        // UI errors
        this.onErrorType('ui', (error) => {
            console.error('UI Error:', error);
            // UI errors are usually not shown to user directly
        });
        
        // Unknown errors
        this.onErrorType('unknown', (error) => {
            this.showUserMessage(
                'Unexpected Error',
                'An unexpected error occurred. Please try refreshing the page.',
                'error'
            );
        });
    }
    
    /**
     * Setup global error handling for unhandled errors
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            const error = this.createError(
                event.reason || 'Unhandled promise rejection',
                'unknown',
                { source: 'promise', preventDefault: true }
            );
            this.handleError(error);
            event.preventDefault();
        });
        
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            const error = this.createError(
                event.error || event.message,
                'unknown',
                { 
                    source: 'global',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            );
            this.handleError(error);
        });
    }
    
    /**
     * Create standardized error object
     * @param {Error|string} error - Error instance or message
     * @param {'camera'|'network'|'storage'|'processing'|'ui'|'unknown'} type - Error category
     * @param {Object} [options={}] - Additional error options
     * @returns {ErrorInfo} Standardized error information
     */
    createError(error, type = 'unknown', options = {}) {
        const timestamp = Date.now();
        const errorId = `${type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
        
        let message, stack, code;
        
        if (error instanceof Error) {
            message = error.message;
            stack = error.stack;
            code = error.name;
        } else {
            message = String(error);
            stack = new Error().stack;
            code = type.toUpperCase() + '_ERROR';
        }
        
        const errorInfo = {
            id: errorId,
            type,
            code: options.code || code,
            message,
            userMessage: options.userMessage || this.getUserMessage(type, message),
            recoverable: options.recoverable !== undefined ? options.recoverable : this.isErrorRecoverable(type),
            suggestedAction: options.suggestedAction || this.getSuggestedAction(type),
            details: {
                stack,
                timestamp,
                userAgent: navigator.userAgent,
                url: window.location.href,
                ...options.details
            },
            context: options.context || {},
            ...options
        };
        
        return errorInfo;
    }
    
    /**
     * Handle error with appropriate response
     * @param {ErrorInfo|Error|string} error - Error to handle
     * @param {string} [type] - Error type if error is not ErrorInfo
     * @param {Object} [options] - Additional options
     */
    handleError(error, type, options = {}) {
        let errorInfo;
        
        if (error && typeof error === 'object' && error.type) {
            // Already an ErrorInfo object
            errorInfo = error;
        } else {
            // Create ErrorInfo from error
            errorInfo = this.createError(error, type || 'unknown', options);
        }
        
        // Check if error should be suppressed
        if (this.suppressedErrors.has(errorInfo.type)) {
            return;
        }
        
        // Track error occurrences
        const countKey = `${errorInfo.type}:${errorInfo.code}`;
        this.errorCounts.set(countKey, (this.errorCounts.get(countKey) || 0) + 1);
        
        // Add to recent errors
        this.addToRecentErrors(errorInfo);
        
        // Log error
        this.logError(errorInfo);
        
        // Execute type-specific handler
        const handler = this.errorHandlers.get(errorInfo.type);
        if (handler) {
            try {
                handler(errorInfo);
            } catch (handlerError) {
                console.error('Error in error handler:', handlerError);
            }
        }
        
        // Emit error event for listeners
        this.dispatchEvent(new CustomEvent('error', {
            detail: { error: errorInfo, timestamp: Date.now() }
        }));
        
        // Report error for telemetry/logging
        this.reportError(errorInfo);
    }
    
    /**
     * Register error type handler
     * @param {string} type - Error type
     * @param {Function} handler - Handler function
     */
    onErrorType(type, handler) {
        this.errorHandlers.set(type, handler);
    }
    
    /**
     * Check if error is recoverable
     * @param {ErrorInfo|string} error - Error or error type
     * @returns {boolean} Whether error is recoverable
     */
    isRecoverable(error) {
        if (typeof error === 'object' && error.recoverable !== undefined) {
            return error.recoverable;
        }
        
        const type = typeof error === 'string' ? error : error.type;
        return this.isErrorRecoverable(type);
    }
    
    /**
     * Determine if error type is recoverable
     * @param {string} type - Error type
     * @returns {boolean} Whether error type is generally recoverable
     */
    isErrorRecoverable(type) {
        const recoverableTypes = new Set([
            'camera',     // Can retry camera access
            'network',    // Can retry network requests
            'processing', // Can retry data processing
            'storage'     // Can clear storage or use memory
        ]);
        
        return recoverableTypes.has(type);
    }
    
    /**
     * Get user-friendly error message
     * @param {string} type - Error type
     * @param {string} message - Technical message
     * @returns {string} User-friendly message
     */
    getUserMessage(type, message) {
        const userMessages = {
            camera: 'Unable to access camera. Please allow camera permissions and try again.',
            network: 'Connection issue detected. Please check your internet connection.',
            storage: 'Unable to save data. Your device storage may be full.',
            processing: 'Failed to process the QR code. Please try scanning again.',
            ui: 'Display issue detected. Please refresh the page.',
            unknown: 'An unexpected error occurred. Please try again.'
        };
        
        return userMessages[type] || userMessages.unknown;
    }
    
    /**
     * Get suggested action for error type
     * @param {string} type - Error type
     * @returns {string} Suggested action
     */
    getSuggestedAction(type) {
        const actions = {
            camera: 'Check camera permissions in browser settings',
            network: 'Verify internet connection and try again',
            storage: 'Free up device storage space',
            processing: 'Try scanning the QR code again',
            ui: 'Refresh the page or try a different browser',
            unknown: 'Refresh the page or contact support'
        };
        
        return actions[type] || actions.unknown;
    }
    
    /**
     * Show user message through UI
     * @param {string} title - Message title
     * @param {string} message - Message content
     * @param {'info'|'warning'|'error'} severity - Message severity
     */
    showUserMessage(title, message, severity = 'error') {
        if (this.ui && typeof this.ui.showError === 'function') {
            this.ui.showError(`${title}: ${message}`);
        } else {
            // Fallback to console and alert for critical errors
            console.error(`${title}: ${message}`);
            if (severity === 'error') {
                alert(`${title}\n\n${message}`);
            }
        }
    }
    
    /**
     * Add error to recent errors list
     * @param {ErrorInfo} errorInfo - Error information
     */
    addToRecentErrors(errorInfo) {
        this.recentErrors.unshift(errorInfo);
        
        // Keep only recent errors
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors = this.recentErrors.slice(0, this.maxRecentErrors);
        }
    }
    
    /**
     * Log error with appropriate level
     * @param {ErrorInfo} errorInfo - Error information
     */
    logError(errorInfo) {
        const logMessage = `[${errorInfo.type.toUpperCase()}] ${errorInfo.code}: ${errorInfo.message}`;
        
        if (errorInfo.type === 'ui' || errorInfo.recoverable) {
            console.warn(logMessage, errorInfo);
        } else {
            console.error(logMessage, errorInfo);
        }
        
        // Log stack trace for debugging
        if (this.showDetailedErrors && errorInfo.details.stack) {
            console.group('Error Details');
            console.log('Stack Trace:', errorInfo.details.stack);
            console.log('Context:', errorInfo.context);
            console.log('Full Error:', errorInfo);
            console.groupEnd();
        }
    }
    
    /**
     * Report error for telemetry/logging services
     * @param {ErrorInfo} errorInfo - Error information
     * @param {string} [source] - Error source
     */
    reportError(errorInfo, source) {
        // In production, this would send to logging service
        // For now, we'll emit an event that can be handled by telemetry
        this.dispatchEvent(new CustomEvent('errorReport', {
            detail: {
                error: errorInfo,
                source: source || 'application',
                sessionId: this.getSessionId(),
                timestamp: Date.now()
            }
        }));
    }
    
    /**
     * Get or create session ID for error tracking
     * @returns {string} Session ID
     */
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }
    
    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.recentErrors.length,
            errorsByType: {},
            mostFrequentErrors: [],
            recoverableErrors: 0,
            criticalErrors: 0
        };
        
        // Count by type
        for (const error of this.recentErrors) {
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
            
            if (error.recoverable) {
                stats.recoverableErrors++;
            } else {
                stats.criticalErrors++;
            }
        }
        
        // Most frequent errors
        const sortedCounts = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
            
        stats.mostFrequentErrors = sortedCounts.map(([key, count]) => ({
            error: key,
            count
        }));
        
        return stats;
    }
    
    /**
     * Clear all errors and reset state
     */
    clearErrors() {
        this.recentErrors = [];
        this.errorCounts.clear();
        console.log('🧹 Error manager cleared');
    }
    
    /**
     * Suppress errors of specific type
     * @param {string} type - Error type to suppress
     */
    suppressErrorType(type) {
        this.suppressedErrors.add(type);
        console.log(`🔇 Suppressing errors of type: ${type}`);
    }
    
    /**
     * Unsuppress errors of specific type
     * @param {string} type - Error type to unsuppress
     */
    unsuppressErrorType(type) {
        this.suppressedErrors.delete(type);
        console.log(`🔊 Unsuppressing errors of type: ${type}`);
    }
    
    /**
     * Enable detailed error logging
     * @param {boolean} enabled - Whether to show detailed errors
     */
    setDetailedErrorLogging(enabled) {
        this.showDetailedErrors = enabled;
        console.log(`🔍 Detailed error logging: ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export for ES6 modules
export { ErrorManager };