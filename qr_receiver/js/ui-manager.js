/**
 * @fileoverview UI Manager - Centralized DOM Operations & Event Handling
 * ROOT CAUSE SOLUTION: Eliminates 135+ DOM coupling violations by providing
 * a clean abstraction layer between business logic and DOM operations.
 */

/**
 * @interface UIState
 * @description Current state of UI components
 * @typedef {Object} UIState
 * @property {boolean} isScanning - Whether scanning is active
 * @property {number} currentProgress - Current transfer progress (0-1)
 * @property {boolean} transferActive - Whether transfer is in progress
 * @property {boolean} loadingVisible - Whether loading screen is visible
 */

/**
 * @interface CachedElements
 * @description Cached DOM elements organized by category
 * @typedef {Object} CachedElements
 * @property {Object} app - Main application elements
 * @property {Object} controls - Control panel elements
 * @property {Object} scanner - Scanner overlay elements
 * @property {Object} progress - Progress and status elements
 * @property {HTMLElement} chunkGrid - Chunk visualization grid
 * @property {HTMLElement} audioControls - Audio control panel
 * @property {HTMLElement} filePreviewModal - File preview modal
 */

/**
 * @interface UIManagerAPI
 * @description Public API contract for UIManager
 * @typedef {Object} UIManagerAPI
 * @property {function(): void} initialize - Initialize UI Manager
 * @property {function(string, string=): void} updateLoadingText - Update loading text
 * @property {function(): void} hideLoadingScreen - Hide loading screen
 * @property {function(string): void} updateScanButton - Update scan button state
 * @property {function(boolean): void} updateFlashButton - Update flash button state
 * @property {function(): void} showTransferStatus - Show transfer status
 * @property {function(): void} hideTransferStatus - Hide transfer status
 * @property {function(number, boolean=): void} updateProgress - Update progress
 * @property {function(number): void} updateChunkGrid - Update chunk grid
 * @property {function(number, string, Object=): void} updateChunkIndicator - Update chunk indicator
 */

/**
 * UI Manager - Centralized DOM Operations & Event Handling
 * 
 * ROOT CAUSE SOLUTION: Eliminates 135+ DOM coupling violations by providing
 * a clean abstraction layer between business logic and DOM operations.
 * 
 * @class UIManager
 * @implements {EventTarget}
 * @implements {UIManagerAPI}
 */
class UIManager extends EventTarget {
    constructor() {
        super();
        
        // Cached DOM elements - Single source of truth
        this.elements = {};
        this.isInitialized = false;
        
        // UI state management
        this.state = {
            isScanning: false,
            currentProgress: 0,
            transferActive: false,
            loadingVisible: true
        };
        
        // Event handlers registry
        this.eventHandlers = new Map();
        
        // Animation frame tracking
        this.animationFrame = null;
        
        this.initialize();
    }
    
    /**
     * Initialize UI Manager - Cache all DOM elements once
     * ROOT CAUSE FIX: Eliminates repeated getElementById() calls
     */
    initialize() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.setupAccessibility();
            this.isInitialized = true;
            
            console.log('✅ UIManager initialized - DOM coupling eliminated');
        } catch (error) {
            console.error('❌ UIManager initialization failed:', error);
            this.dispatchEvent(new CustomEvent('ui-error', { detail: error }));
        }
    }
    
    /**
     * Cache all DOM elements to eliminate repeated queries
     * ROOT CAUSE FIX: Single DOM access point
     */
    cacheElements() {
        // Main application elements
        this.elements.app = {
            loading: document.getElementById('loadingScreen'),
            loadingText: document.querySelector('.loading-text'),
            loadingDetail: document.querySelector('.loading-detail'),
            loadError: document.getElementById('loadError'),
            statusBar: document.querySelector('.status-bar'),
            topBar: document.querySelector('.top-bar'),
            cameraView: document.querySelector('.camera-view'),
            video: document.getElementById('video')
        };
        
        // Control elements
        this.elements.controls = {
            settingsBtn: document.getElementById('settingsBtn'),
            flashBtn: document.getElementById('flashBtn'),
            startScanBtn: document.getElementById('startScanBtn'),
            resetBtn: document.getElementById('resetBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            controlPanel: document.querySelector('.control-panel')
        };
        
        // Scanner overlay elements
        this.elements.scanner = {
            overlay: document.querySelector('.scan-overlay'),
            frame: document.querySelector('.scan-frame'),
            corners: document.querySelectorAll('.scan-corner'),
            line: document.querySelector('.scan-line'),
            instruction: document.querySelector('.scan-instruction')
        };
        
        // Progress and status elements
        this.elements.progress = {
            transferStatus: document.getElementById('transferStatus'),
            statusHeader: document.querySelector('.status-header'),
            progressContainer: document.querySelector('.progress-container'),
            progressBar: document.querySelector('.progress-bar'),
            progressFill: document.querySelector('.progress-fill'),
            progressText: document.getElementById('progressText'),
            progressDetail: document.getElementById('progressDetail'),
            closeBtn: document.querySelector('.close-btn')
        };
        
        // Chunk grid element
        this.elements.chunkGrid = document.getElementById('chunk-grid');
        
        // Validate critical elements exist
        this.validateElements();
    }
    
    /**
     * Validate that critical DOM elements exist
     * ROOT CAUSE FIX: Early error detection for missing elements
     */
    validateElements() {
        const critical = [
            'app.video',
            'controls.startScanBtn',
            'scanner.overlay',
            'progress.transferStatus'
        ];
        
        for (const path of critical) {
            const element = this.getNestedElement(path);
            if (!element) {
                throw new Error(`Critical UI element missing: ${path}`);
            }
        }
    }
    
    /**
     * Get nested element using dot notation
     * @param {string} path - Dot notation path to element
     * @returns {HTMLElement|null}
     */
    getNestedElement(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], this.elements);
    }
    
    /**
     * Setup centralized event listeners
     * ROOT CAUSE FIX: Eliminates scattered event handler setup
     */
    setupEventListeners() {
        // Button event handlers
        this.addClickHandler('controls.startScanBtn', () => this.emitEvent('scan-toggle'));
        this.addClickHandler('controls.resetBtn', () => this.emitEvent('scan-reset'));
        this.addClickHandler('controls.downloadBtn', () => this.emitEvent('file-download'));
        this.addClickHandler('controls.flashBtn', () => this.emitEvent('flash-toggle'));
        this.addClickHandler('controls.settingsBtn', () => this.emitEvent('settings-open'));
        this.addClickHandler('progress.closeBtn', () => this.hideTransferStatus());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.emitEvent('visibility-change', { 
                hidden: document.hidden 
            });
        });
        
        // PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.emitEvent('install-prompt', { event: e });
        });
    }
    
    /**
     * Add click handler with error boundary
     * @param {string} elementPath - Path to element
     * @param {Function} handler - Click handler function
     */
    addClickHandler(elementPath, handler) {
        const element = this.getNestedElement(elementPath);
        if (!element) {
            console.warn(`Cannot add click handler to missing element: ${elementPath}`);
            return;
        }
        
        const safeHandler = (e) => {
            try {
                e.preventDefault();
                handler(e);
            } catch (error) {
                console.error(`Click handler error for ${elementPath}:`, error);
                this.emitEvent('ui-error', { error, element: elementPath });
            }
        };
        
        element.addEventListener('click', safeHandler);
        this.eventHandlers.set(elementPath, safeHandler);
    }
    
    /**
     * Handle keyboard shortcuts
     * ROOT CAUSE FIX: Centralized keyboard event handling
     */
    handleKeyboard(e) {
        // Only handle if not in input fields
        if (e.target.matches('input, textarea, select')) return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.emitEvent('scan-toggle');
                break;
            case 'KeyR':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.emitEvent('scan-reset');
                }
                break;
            case 'KeyD':
                if ((e.ctrlKey || e.metaKey) && this.state.transferActive) {
                    e.preventDefault();
                    this.emitEvent('file-download');
                }
                break;
            case 'KeyS':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.emitEvent('settings-open');
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (this.state.transferActive) {
                    this.hideTransferStatus();
                }
                break;
        }
    }
    
    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Add ARIA labels and roles where missing
        const video = this.elements.app.video;
        if (video && !video.getAttribute('aria-label')) {
            video.setAttribute('aria-label', 'QR code scanner camera feed');
            video.setAttribute('role', 'application');
        }
        
        // Set up live regions for screen readers
        if (this.elements.progress.progressText) {
            this.elements.progress.progressText.setAttribute('aria-live', 'polite');
            this.elements.progress.progressDetail.setAttribute('aria-live', 'polite');
        }
    }
    
    // ============ LOADING SCREEN METHODS ============
    
    /**
     * Update loading screen text
     * @param {string} text - Main loading text
     * @param {string} detail - Detailed loading text
     */
    updateLoadingText(text, detail = '') {
        if (this.elements.app.loadingText) {
            this.elements.app.loadingText.textContent = text;
        }
        if (this.elements.app.loadingDetail && detail) {
            this.elements.app.loadingDetail.textContent = detail;
        }
    }
    
    /**
     * Show loading error
     * @param {string} message - Error message to display
     */
    showLoadError(message) {
        if (this.elements.app.loadError) {
            this.elements.app.loadError.textContent = message;
            this.elements.app.loadError.style.display = 'block';
        }
    }
    
    /**
     * Hide loading screen with animation
     */
    hideLoadingScreen() {
        const loading = this.elements.app.loading;
        if (!loading) return;
        
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            loading.style.display = 'none';
            this.state.loadingVisible = false;
            this.emitEvent('loading-complete');
        }, 300);
    }
    
    // ============ BUTTON STATE METHODS ============
    
    /**
     * Update scan button state
     * @param {string} state - Button state: 'idle', 'scanning', 'processing', 'complete', 'error'
     */
    updateScanButton(state) {
        const btn = this.elements.controls.startScanBtn;
        if (!btn) return;
        
        const states = {
            idle: { text: 'Start Scanning', class: 'scan-btn', disabled: false },
            scanning: { text: 'Stop Scanning', class: 'scan-btn scanning', disabled: false },
            processing: { text: 'Processing...', class: 'scan-btn processing', disabled: true },
            complete: { text: 'Transfer Complete', class: 'scan-btn complete', disabled: false },
            error: { text: 'Try Again', class: 'scan-btn error', disabled: false }
        };
        
        const config = states[state];
        if (config) {
            btn.textContent = config.text;
            btn.className = config.class;
            btn.disabled = config.disabled;
            
            // Update ARIA attributes
            btn.setAttribute('aria-pressed', state === 'scanning');
        }
        
        this.state.isScanning = (state === 'scanning');
        this.updateSecondaryControls();
    }
    
    /**
     * Update secondary control visibility
     */
    updateSecondaryControls() {
        const resetBtn = this.elements.controls.resetBtn;
        const downloadBtn = this.elements.controls.downloadBtn;
        
        if (resetBtn) {
            resetBtn.style.display = this.state.isScanning || this.state.transferActive ? 'block' : 'none';
        }
        
        if (downloadBtn) {
            downloadBtn.style.display = this.state.transferActive ? 'block' : 'none';
        }
    }
    
    /**
     * Update flash button state
     * @param {boolean} isOn - Flash state
     */
    updateFlashButton(isOn) {
        const btn = this.elements.controls.flashBtn;
        if (!btn) return;
        
        btn.style.opacity = isOn ? '1' : '0.6';
        btn.setAttribute('aria-pressed', isOn.toString());
        
        // Add visual feedback
        if (isOn) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    
    // ============ PROGRESS METHODS ============
    
    /**
     * Show transfer status panel
     */
    showTransferStatus() {
        const panel = this.elements.progress.transferStatus;
        if (!panel) return;
        
        panel.style.display = 'block';
        // Force reflow
        panel.offsetHeight;
        panel.style.opacity = '1';
        
        this.state.transferActive = true;
        this.updateSecondaryControls();
        
        this.emitEvent('transfer-status-shown');
    }
    
    /**
     * Hide transfer status panel
     */
    hideTransferStatus() {
        const panel = this.elements.progress.transferStatus;
        if (!panel) return;
        
        panel.style.opacity = '0';
        setTimeout(() => {
            panel.style.display = 'none';
            this.state.transferActive = false;
            this.updateSecondaryControls();
            this.emitEvent('transfer-status-hidden');
        }, 300);
    }
    
    /**
     * Update progress display
     * @param {number} progress - Progress value (0-1)
     * @param {boolean} isComplete - Whether transfer is complete
     */
    updateProgress(progress, isComplete = false) {
        const progressText = this.elements.progress.progressText;
        const progressFill = this.elements.progress.progressFill;
        const progressDetail = this.elements.progress.progressDetail;
        
        const percentage = Math.round(progress * 100);
        
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.setAttribute('aria-valuenow', percentage);
        }
        
        if (isComplete) {
            this.updateScanButton('complete');
            if (progressDetail) {
                progressDetail.textContent = 'Transfer completed successfully!';
            }
        }
        
        this.state.currentProgress = progress;
    }
    
    /**
     * Update progress detail text
     * @param {string} detail - Detail text to show
     */
    updateProgressDetail(detail) {
        if (this.elements.progress.progressDetail) {
            this.elements.progress.progressDetail.textContent = detail;
        }
    }
    
    /**
     * Update retry status display
     * @param {number} chunkIndex - Index of chunk being retried
     * @param {number} attempts - Current attempt number
     */
    updateRetryStatus(chunkIndex, attempts) {
        this.updateProgressDetail(`Retrying chunk ${chunkIndex} (attempt ${attempts})...`);
    }
    
    /**
     * Update chunk grid visualization
     * @param {number} totalChunks - Total number of chunks
     */
    updateChunkGrid(totalChunks) {
        const grid = this.elements.chunkGrid;
        if (!grid || totalChunks === 0) return;
        
        // Clear existing grid
        grid.innerHTML = '';
        
        // Create chunk indicators (max 100 for performance)
        const maxVisible = Math.min(totalChunks, 100);
        const chunkStep = Math.ceil(totalChunks / maxVisible);
        
        for (let i = 0; i < maxVisible; i++) {
            const chunkIndex = i * chunkStep;
            const indicator = document.createElement('div');
            indicator.className = 'chunk-indicator pending';
            indicator.dataset.chunk = chunkIndex;
            indicator.title = `Chunk ${chunkIndex}`;
            grid.appendChild(indicator);
        }
        
        // Emit event for listeners
        this.dispatchEvent(new CustomEvent('chunkGridUpdated', {
            detail: { totalChunks, maxVisible, chunkStep }
        }));
    }
    
    /**
     * Update individual chunk indicator status
     * @param {number} index - Chunk index
     * @param {string} status - Status: 'pending', 'received', 'retrying', 'failed', 'error'
     * @param {Object} options - Additional options like retry info
     */
    updateChunkIndicator(index, status, options = {}) {
        const indicator = document.querySelector(`[data-chunk="${index}"]`);
        if (indicator) {
            indicator.className = `chunk-indicator ${status}`;
            
            // Add tooltip with retry information
            if (status === 'retrying' && options.attempts) {
                indicator.title = `Chunk ${index} - Retrying (${options.attempts}/5)`;
            } else if (status === 'failed') {
                indicator.title = `Chunk ${index} - Failed (max retries reached)`;
            } else {
                indicator.title = `Chunk ${index} - ${status}`;
            }
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('chunkIndicatorUpdated', {
                detail: { index, status, options }
            }));
        }
    }
    
    /**
     * Clear chunk grid visualization
     */
    clearChunkGrid() {
        const grid = this.elements.chunkGrid;
        if (grid) {
            grid.innerHTML = '';
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('chunkGridCleared'));
        }
    }
    
    // ============ AUDIO CONTROLS METHODS ============
    
    /**
     * Create audio controls UI and add to body
     * @param {string} htmlContent - HTML content for audio controls
     */
    createAudioControls(htmlContent) {
        const controls = document.createElement('div');
        controls.className = 'audio-controls';
        controls.id = 'audioControls';
        controls.innerHTML = htmlContent;
        document.body.appendChild(controls);
        
        // Cache the element
        this.elements.audioControls = controls;
        
        // Emit event for listeners
        this.dispatchEvent(new CustomEvent('audioControlsCreated', {
            detail: { element: controls }
        }));
        
        return controls;
    }
    
    /**
     * Add styles to document head
     * @param {string} cssContent - CSS content to add
     */
    addStyles(cssContent) {
        const style = document.createElement('style');
        style.textContent = cssContent;
        document.head.appendChild(style);
    }
    
    /**
     * Show audio controls
     */
    showAudioControls() {
        const controls = this.elements.audioControls || document.getElementById('audioControls');
        if (controls) {
            controls.classList.add('visible');
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('audioControlsShown'));
        }
    }
    
    /**
     * Hide audio controls
     */
    hideAudioControls() {
        const controls = this.elements.audioControls || document.getElementById('audioControls');
        if (controls) {
            controls.classList.remove('visible');
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('audioControlsHidden'));
        }
    }
    
    /**
     * Toggle audio controls visibility
     */
    toggleAudioControls() {
        const controls = this.elements.audioControls || document.getElementById('audioControls');
        if (controls) {
            controls.classList.toggle('visible');
            const isVisible = controls.classList.contains('visible');
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('audioControlsToggled', {
                detail: { visible: isVisible }
            }));
        }
    }
    
    /**
     * Update audio control element value
     * @param {string} elementId - Element ID to update
     * @param {string} property - Property to update ('checked', 'value', 'textContent')
     * @param {*} value - New value
     */
    updateAudioControl(elementId, property, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element[property] = value;
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('audioControlUpdated', {
                detail: { elementId, property, value }
            }));
        }
    }
    
    /**
     * Bind event listener to audio control element
     * @param {string} elementId - Element ID to bind to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    bindAudioControlEvent(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }
    
    // ============ FILE PREVIEW METHODS ============
    
    /**
     * Create file preview modal and add to body
     * @param {string} htmlContent - HTML content for preview modal
     * @param {string} cssContent - CSS content for preview modal styles
     */
    createFilePreviewModal(htmlContent, cssContent) {
        // Add styles first
        this.addStyles(cssContent);
        
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'file-preview-modal';
        modal.innerHTML = htmlContent;
        document.body.appendChild(modal);
        
        // Cache the element
        this.elements.filePreviewModal = modal;
        
        // Emit event for listeners
        this.dispatchEvent(new CustomEvent('filePreviewModalCreated', {
            detail: { element: modal }
        }));
        
        return modal;
    }
    
    /**
     * Show file preview modal
     */
    showFilePreviewModal() {
        const modal = this.elements.filePreviewModal;
        if (modal) {
            modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('filePreviewModalShown'));
        }
    }
    
    /**
     * Hide file preview modal
     */
    hideFilePreviewModal() {
        const modal = this.elements.filePreviewModal;
        if (modal) {
            modal.classList.remove('visible');
            document.body.style.overflow = '';
            
            // Dispatch hidden event for cleanup
            modal.dispatchEvent(new Event('hidden'));
            
            // Emit event for listeners
            this.dispatchEvent(new CustomEvent('filePreviewModalHidden'));
            
            // Clear content after animation
            setTimeout(() => {
                if (!modal.classList.contains('visible')) {
                    const content = modal.querySelector('#previewContent');
                    if (content) {
                        content.innerHTML = '';
                    }
                }
            }, 300);
        }
    }
    
    /**
     * Update file preview header
     * @param {string} filename - File name to display
     * @param {string} mimeType - MIME type of the file
     * @param {number} fileSize - File size in bytes
     * @param {string} icon - Icon to display
     */
    updateFilePreviewHeader(filename, mimeType, fileSize, icon) {
        const modal = this.elements.filePreviewModal;
        if (!modal) return;
        
        const iconElement = modal.querySelector('.preview-icon');
        const titleElement = modal.querySelector('.title-text');
        const infoElement = modal.querySelector('.preview-info');
        
        if (iconElement) iconElement.textContent = icon;
        if (titleElement) titleElement.textContent = filename;
        if (infoElement) {
            const sizeText = this.formatBytes(fileSize);
            infoElement.textContent = `${mimeType || 'Unknown type'} • ${sizeText}`;
        }
    }
    
    /**
     * Update file preview content
     * @param {string|HTMLElement} content - Content to show in preview
     */
    updateFilePreviewContent(content) {
        const modal = this.elements.filePreviewModal;
        if (!modal) return;
        
        const contentElement = modal.querySelector('#previewContent');
        if (contentElement) {
            if (typeof content === 'string') {
                contentElement.innerHTML = content;
            } else {
                contentElement.innerHTML = '';
                contentElement.appendChild(content);
            }
        }
        
        // Emit event for listeners
        this.dispatchEvent(new CustomEvent('filePreviewContentUpdated', {
            detail: { content }
        }));
    }
    
    /**
     * Bind event to file preview element
     * @param {string} selector - CSS selector for element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    bindFilePreviewEvent(selector, event, handler) {
        const modal = this.elements.filePreviewModal;
        if (!modal) return;
        
        const element = modal.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
        }
    }
    
    /**
     * Bind global keydown event for file preview
     * @param {Function} handler - Event handler
     */
    bindFilePreviewKeydown(handler) {
        document.addEventListener('keydown', handler);
    }
    
    /**
     * Format bytes to human readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // ============ SCANNER VISUAL METHODS ============
    
    /**
     * Update scan line animation
     * @param {boolean} active - Whether scanning is active
     */
    updateScanAnimation(active) {
        const scanLine = this.elements.scanner.line;
        if (!scanLine) return;
        
        if (active) {
            scanLine.classList.add('scanning');
        } else {
            scanLine.classList.remove('scanning');
        }
    }
    
    /**
     * Update scan instruction text
     * @param {string} text - Instruction text to display
     */
    updateScanInstruction(text) {
        if (this.elements.scanner.instruction) {
            this.elements.scanner.instruction.textContent = text;
        }
    }
    
    // ============ PERFORMANCE MONITORING ============
    
    /**
     * Update performance indicators
     * @param {Object} stats - Performance statistics
     */
    updatePerformance(stats) {
        // Find or create performance indicators
        let fpsElement = document.getElementById('fpsCount');
        let memElement = document.getElementById('memUsage');
        
        if (!fpsElement && stats.fps !== undefined) {
            // Create performance overlay if needed
            this.createPerformanceOverlay();
            fpsElement = document.getElementById('fpsCount');
            memElement = document.getElementById('memUsage');
        }
        
        if (fpsElement && stats.fps !== undefined) {
            fpsElement.textContent = stats.fps;
        }
        
        if (memElement && stats.memoryUsage !== undefined) {
            memElement.textContent = `${Math.round(stats.memoryUsage)}MB`;
        }
    }
    
    /**
     * Create performance monitoring overlay
     */
    createPerformanceOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'performance-overlay';
        overlay.innerHTML = `
            <div class="perf-item">FPS: <span id="fpsCount">0</span></div>
            <div class="perf-item">Memory: <span id="memUsage">0MB</span></div>
        `;
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            font-family: monospace;
        `;
        document.body.appendChild(overlay);
    }
    
    // ============ UTILITY METHODS ============
    
    /**
     * Emit custom event with error handling
     * @param {string} eventType - Event type
     * @param {*} data - Event data
     */
    emitEvent(eventType, data = null) {
        try {
            const event = new CustomEvent(eventType, { 
                detail: data,
                bubbles: true,
                cancelable: true
            });
            this.dispatchEvent(event);
        } catch (error) {
            console.error(`Failed to emit event ${eventType}:`, error);
        }
    }
    
    /**
     * Get current UI state
     * @returns {Object} Current UI state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Check if UI is properly initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized;
    }
    
    /**
     * Cleanup method for proper disposal
     */
    destroy() {
        // Cancel any pending animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove event listeners
        this.eventHandlers.forEach((handler, elementPath) => {
            const element = this.getNestedElement(elementPath);
            if (element) {
                element.removeEventListener('click', handler);
            }
        });
        
        // Clear references
        this.elements = {};
        this.eventHandlers.clear();
        this.isInitialized = false;
        
        console.log('🧹 UIManager destroyed - cleanup complete');
    }
}