/**
 * @fileoverview File Preview System - Plugin-Based Architecture
 * 
 * ROOT CAUSE SOLUTION: Completely transformed from 700+ line monolithic GOD OBJECT
 * into clean, extensible system using PreviewFactory pattern.
 * 
 * This WORLDCLASS architecture enables:
 * - Runtime plugin registration
 * - Single responsibility handlers
 * - Zero coupling between file types
 * - Easy testing and maintenance
 */

/**
 * File Preview System
 * Orchestrates file previews using plugin-based preview handlers
 * 
 * @class FilePreviewSystem
 */
class FilePreviewSystem {
    constructor(ui = null) {
        // UI Manager for DOM operations - ROOT CAUSE FIX
        this.ui = ui;
        
        /** @type {PreviewFactory} Preview factory for handler management */
        this.previewFactory = null;
        
        /** @type {HTMLElement} Preview container modal */
        this.previewContainer = null;
        
        /** @type {Object} Current preview data and cleanup */
        this.currentPreview = null;
        
        /** @type {AbortController} Current operation abort controller */
        this.currentAbortController = null;
        
        console.log('🎬 File Preview System initializing...');
        
        // Initialize preview factory
        this.initializePreviewFactory();
        
        // Setup UI if UIManager provided
        if (this.ui) {
            this.setupStyles();
            this.createPreviewContainer();
        }
        
        console.log('✅ File Preview System initialized with plugin architecture');
    }
    
    /**
     * Initialize preview factory
     */
    initializePreviewFactory() {
        try {
            // Get singleton preview factory instance
            this.previewFactory = getPreviewFactory();
            console.log('🏭 Preview factory connected');
        } catch (error) {
            console.error('❌ Failed to initialize preview factory:', error);
            throw new Error('Preview system initialization failed');
        }
    }
    
    /**
     * Setup preview modal styles
     */
    setupStyles() {
        if (!this.ui) return;
        
        const cssContent = `
            /* File Preview Modal - Enhanced for Plugin Architecture */
            .file-preview-modal {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s ease;
            }
            
            .file-preview-modal.visible {
                opacity: 1;
                pointer-events: auto;
            }
            
            /* Preview Header */
            .preview-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                background: var(--blur-bg, rgba(0, 0, 0, 0.8));
                border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                backdrop-filter: blur(10px);
            }
            
            .preview-title {
                display: flex;
                align-items: center;
                gap: 12px;
                color: var(--text-primary, white);
                font-size: 18px;
                font-weight: 600;
            }
            
            .preview-icon {
                font-size: 24px;
            }
            
            .preview-info {
                font-size: 14px;
                color: var(--text-secondary, rgba(255, 255, 255, 0.7));
                margin-top: 4px;
                display: flex;
                gap: 16px;
            }
            
            .preview-handler-info {
                font-size: 12px;
                opacity: 0.6;
                font-style: italic;
            }
            
            .preview-controls {
                display: flex;
                gap: 8px;
            }
            
            .preview-btn {
                width: 44px;
                height: 44px;
                border-radius: 22px;
                background: var(--blur-bg, rgba(255, 255, 255, 0.1));
                border: none;
                color: var(--text-primary, white);
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .preview-btn:hover {
                background: var(--blur-bg, rgba(255, 255, 255, 0.2));
                transform: scale(1.05);
            }
            
            .preview-btn:active {
                transform: scale(0.95);
            }
            
            .preview-btn.download {
                background: var(--primary-blue);
            }
            
            .preview-btn.close {
                background: var(--error-red);
            }
            
            /* Preview Content - Flexible for all handlers */
            .preview-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                min-height: 0;
            }
            
            /* Handler-specific container styles */
            .image-preview-container,
            .text-preview-container,
            .code-preview-container,
            .audio-preview-container,
            .video-preview-container,
            .document-preview-container,
            .archive-preview-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            /* Loading State */
            .preview-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 20px;
                color: var(--text-primary, white);
                min-height: 200px;
            }
            
            .loading-spinner-preview {
                width: 48px;
                height: 48px;
                border: 4px solid var(--border-color, rgba(255, 255, 255, 0.2));
                border-top-color: var(--primary-blue);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            /* Error State */
            .preview-error {
                text-align: center;
                color: var(--error-red);
                padding: 40px;
                max-width: 500px;
                margin: 0 auto;
            }
            
            .error-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            
            .error-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 12px;
            }
            
            .error-message {
                font-size: 16px;
                margin-bottom: 8px;
            }
            
            .error-details {
                font-size: 14px;
                opacity: 0.8;
            }
            
            /* Unsupported Preview */
            .preview-unsupported {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: var(--text-primary, white);
            }
            
            .unsupported-content {
                text-align: center;
                max-width: 500px;
            }
            
            .unsupported-icon {
                font-size: 64px;
                margin-bottom: 20px;
                opacity: 0.6;
            }
            
            .unsupported-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 16px;
            }
            
            .unsupported-details {
                font-size: 14px;
                line-height: 1.6;
                opacity: 0.8;
            }
            
            .file-info, .error-info {
                background: var(--bg-secondary, rgba(255, 255, 255, 0.05));
                padding: 16px;
                border-radius: 8px;
                margin: 16px 0;
                text-align: left;
            }
            
            .suggestions {
                margin-top: 20px;
            }
            
            .suggestions h4 {
                margin-bottom: 8px;
                color: var(--text-primary, white);
            }
            
            .suggestions ul {
                text-align: left;
                margin-left: 20px;
            }
            
            .suggestions li {
                margin-bottom: 4px;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .preview-header {
                    padding: 16px;
                }
                
                .preview-title {
                    font-size: 16px;
                }
                
                .preview-info {
                    font-size: 12px;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .preview-btn {
                    width: 40px;
                    height: 40px;
                    font-size: 16px;
                }
            }
        `;
        
        // Use UIManager to add styles - ROOT CAUSE FIX
        this.ui.addStyles(cssContent);
    }
    
    /**
     * Create preview modal container
     */
    createPreviewContainer() {
        if (!this.ui) return;
        
        const htmlContent = `
            <div class="preview-header">
                <div class="preview-title">
                    <div class="preview-icon">📄</div>
                    <div>
                        <div class="title-text">File Preview</div>
                        <div class="preview-info">
                            <span class="file-info-text"></span>
                            <span class="preview-handler-info"></span>
                        </div>
                    </div>
                </div>
                <div class="preview-controls">
                    <button class="preview-btn download" id="previewDownload" title="Download">⬇️</button>
                    <button class="preview-btn close" id="previewClose" title="Close">✕</button>
                </div>
            </div>
            <div class="preview-content" id="previewContent"></div>
        `;
        
        // Use UIManager to create modal - ROOT CAUSE FIX
        this.previewContainer = this.ui.createFilePreviewModal(htmlContent, '');
        
        // Bind events
        this.bindPreviewEvents();
        
        console.log('✅ Preview container created');
    }
    
    /**
     * Bind preview modal events
     */
    bindPreviewEvents() {
        if (!this.ui) return;
        
        // Close button
        this.ui.bindFilePreviewEvent('#previewClose', 'click', () => {
            this.closePreview();
        });
        
        // Download button
        this.ui.bindFilePreviewEvent('#previewDownload', 'click', () => {
            this.downloadCurrentFile();
        });
        
        // Click outside to close
        this.ui.bindFilePreviewEvent('.file-preview-modal', 'click', (e) => {
            if (e.target.classList.contains('file-preview-modal')) {
                this.closePreview();
            }
        });
        
        // Keyboard navigation
        this.ui.bindFilePreviewKeydown((e) => {
            if (this.previewContainer && this.previewContainer.classList.contains('visible')) {
                if (e.key === 'Escape') {
                    this.closePreview();
                } else if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    this.downloadCurrentFile();
                }
            }
        });
    }
    
    /**
     * Preview file using plugin architecture
     * @param {Uint8Array} fileData - File data
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     * @returns {Promise<boolean>} Success status
     */
    async previewFile(fileData, filename, mimeType) {
        try {
            console.log(`🎬 Previewing file: ${filename} (${mimeType}, ${this.formatBytes(fileData.length)})`);
            
            // Cancel any existing preview
            this.cancelCurrentPreview();
            
            // Show preview modal with loading
            this.showPreview();
            this.showLoading('Initializing preview...');
            
            // Create abort controller for this operation
            this.currentAbortController = new AbortController();
            
            // Check if preview is supported
            if (!this.previewFactory.canPreview(mimeType, filename, fileData.length)) {
                throw new Error(`Preview not supported for ${mimeType}`);
            }
            
            // Create preview context
            const context = {
                data: fileData,
                filename: filename,
                mimeType: mimeType,
                fileSize: fileData.length,
                container: this.previewContainer.querySelector('#previewContent'),
                onProgress: (progress, message) => {
                    this.updateLoadingProgress(progress, message);
                },
                onError: (error) => {
                    console.error('Preview error:', error);
                },
                abortController: this.currentAbortController
            };
            
            // Update header before generating preview
            this.updatePreviewHeader(filename, mimeType, fileData.length);
            
            // Generate preview using factory
            const result = await this.previewFactory.generatePreview(context);
            
            if (!result.success) {
                throw new Error(result.error || 'Preview generation failed');
            }
            
            // Store current preview for cleanup and download
            this.currentPreview = {
                data: fileData,
                filename: filename,
                mimeType: mimeType,
                result: result,
                startTime: Date.now()
            };
            
            // Update header with handler info
            this.updateHandlerInfo(result.factory);
            
            console.log(`✅ Preview generated successfully using ${result.factory.handlerName} handler`);
            return true;
            
        } catch (error) {
            console.error('❌ File preview failed:', error);
            this.showError(error.message);
            return false;
        }
    }
    
    /**
     * Update preview header
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     * @param {number} fileSize - File size
     */
    updatePreviewHeader(filename, mimeType, fileSize) {
        if (!this.ui) return;
        
        const icon = this.getFileIcon(mimeType);
        const formattedSize = this.formatBytes(fileSize);
        
        this.ui.updateFilePreviewHeader(filename, mimeType, fileSize, icon);
        
        // Update file info text
        const fileInfoText = this.previewContainer.querySelector('.file-info-text');
        if (fileInfoText) {
            fileInfoText.textContent = `${formattedSize} • ${mimeType}`;
        }
    }
    
    /**
     * Update handler information in header
     * @param {Object} factoryInfo - Factory processing info
     */
    updateHandlerInfo(factoryInfo) {
        const handlerInfoElement = this.previewContainer?.querySelector('.preview-handler-info');
        if (handlerInfoElement && factoryInfo) {
            const processingTime = factoryInfo.processingTime?.toFixed(1) || '0';
            handlerInfoElement.textContent = `via ${factoryInfo.handlerName} handler (${processingTime}ms)`;
        }
    }
    
    /**
     * Get file icon for type
     * @param {string} mimeType - MIME type
     * @returns {string} File icon emoji
     */
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType === 'application/pdf') return '📕';
        if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) return '📝';
        if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return '📦';
        if (mimeType.includes('office') || mimeType.includes('document')) return '📄';
        return '📄';
    }
    
    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading preview...') {
        if (!this.ui) return;
        
        const loadingContent = `
            <div class="preview-loading">
                <div class="loading-spinner-preview"></div>
                <div class="loading-message">${this.escapeHtml(message)}</div>
            </div>
        `;
        
        this.ui.updateFilePreviewContent(loadingContent);
    }
    
    /**
     * Update loading progress
     * @param {number} progress - Progress (0-1)
     * @param {string} message - Progress message
     */
    updateLoadingProgress(progress, message) {
        const loadingMessage = this.previewContainer?.querySelector('.loading-message');
        if (loadingMessage) {
            const percentage = Math.round(progress * 100);
            loadingMessage.textContent = `${message} (${percentage}%)`;
        }
    }
    
    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        if (!this.ui) return;
        
        const errorContent = `
            <div class="preview-error">
                <div class="error-icon">⚠️</div>
                <div class="error-title">Preview Failed</div>
                <div class="error-message">${this.escapeHtml(message)}</div>
                <div class="error-details">
                    Try downloading the file to view with appropriate software.
                </div>
            </div>
        `;
        
        this.ui.updateFilePreviewContent(errorContent);
    }
    
    /**
     * Show preview modal
     */
    showPreview() {
        if (this.ui) {
            this.ui.showFilePreviewModal();
        }
    }
    
    /**
     * Close preview modal
     */
    closePreview() {
        console.log('🔒 Closing file preview');
        
        // Cancel current operation
        this.cancelCurrentPreview();
        
        // Hide modal
        if (this.ui) {
            this.ui.hideFilePreviewModal();
        }
        
        // Clear current preview after animation
        setTimeout(() => {
            this.currentPreview = null;
        }, 300);
    }
    
    /**
     * Cancel current preview operation
     */
    cancelCurrentPreview() {
        // Abort current operation
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
        
        // Cleanup current preview
        if (this.currentPreview?.result?.cleanup) {
            try {
                this.currentPreview.result.cleanup.forEach(cleanupFn => cleanupFn());
            } catch (error) {
                console.warn('Cleanup error:', error);
            }
        }
    }
    
    /**
     * Download current file
     */
    downloadCurrentFile() {
        if (!this.currentPreview) return;
        
        try {
            console.log(`⬇️ Downloading: ${this.currentPreview.filename}`);
            
            const blob = new Blob([this.currentPreview.data], { 
                type: this.currentPreview.mimeType 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.currentPreview.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            console.error('Download failed:', error);
        }
    }
    
    /**
     * Check if file can be previewed
     * @param {string} mimeType - MIME type
     * @param {string} filename - Filename  
     * @param {number} fileSize - File size
     * @returns {boolean} Whether file can be previewed
     */
    canPreview(mimeType, filename, fileSize) {
        return this.previewFactory ? 
            this.previewFactory.canPreview(mimeType, filename, fileSize) : false;
    }
    
    /**
     * Get supported file types
     * @returns {Object} Supported types
     */
    getSupportedTypes() {
        return this.previewFactory ? 
            this.previewFactory.getSupportedTypes() : { mimeTypes: [], extensions: [], handlers: {} };
    }
    
    /**
     * Get preview system statistics
     * @returns {Object} System statistics
     */
    getStatistics() {
        const factoryStats = this.previewFactory ? this.previewFactory.getStatistics() : {};
        
        return {
            ...factoryStats,
            currentPreview: this.currentPreview ? {
                filename: this.currentPreview.filename,
                mimeType: this.currentPreview.mimeType,
                fileSize: this.currentPreview.data.length,
                handler: this.currentPreview.result?.factory?.handlerName,
                duration: Date.now() - this.currentPreview.startTime
            } : null
        };
    }
    
    /**
     * Format bytes to human readable
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
     * Clean up preview system
     */
    cleanup() {
        console.log('🧹 Cleaning up file preview system...');
        
        // Cancel and cleanup current preview
        this.cancelCurrentPreview();
        
        // Cleanup preview factory
        if (this.previewFactory) {
            // Note: Don't cleanup singleton factory as other instances might use it
            this.previewFactory = null;
        }
        
        // Clear references
        this.previewContainer = null;
        this.currentPreview = null;
        this.ui = null;
        
        console.log('🧹 File preview system cleanup complete');
    }
}

// Export for ES6 modules
export { FilePreviewSystem };