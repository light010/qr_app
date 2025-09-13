/**
 * World-Class QR Scanner - Main Application Controller
 * 
 * ROOT CAUSE FIX: Extracted from monolithic HTML file (was 545 lines embedded)
 * Implements proper separation of concerns and modular architecture
 */

class WorldClassQRScanner {
    constructor() {
        // Use centralized configuration
        const config = window.QRScannerConfig || {};
        
        // Initialize all manager modules
        this.scannerEngine = new QRScannerEngine();
        this.storageManager = new PersistentStorageManager();
        this.retryManager = new RetryManager(config.retry || {});
        this.chunkManager = new ChunkManager();
        this.themeManager = new ThemeManager();
        this.cameraManager = new CameraManager();
        this.cameraUI = null; // Will be initialized after camera manager
        this.dataProcessor = new DataProcessor();
        this.filePreview = new FilePreviewSystem();
        this.audioManager = new AudioManager();
        
        // Application state
        this.isScanning = false;
        this.currentFile = null;
        this.performanceStats = {
            fps: 0,
            memoryUsage: 0,
            lastFrameTime: 0
        };
        
        // DOM element references (cached for performance)
        this.loadingScreen = document.getElementById('loadingScreen');
        this.startScanBtn = document.getElementById('startScanBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.flashBtn = document.getElementById('flashBtn');
        this.transferStatus = document.getElementById('transferStatus');
        this.progressText = document.getElementById('progressText');
        this.progressDetail = document.getElementById('progressDetail');
        
        // Initialize application
        this.bindEvents();
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize all managers in parallel where possible
            const initPromises = [
                this.storageManager.initialize(),
                this.scannerEngine.initialize(),
                this.cameraManager.initialize(),
                this.dataProcessor.initialize(),
                this.audioManager.initialize()
            ];
            
            const loadingDetail = document.getElementById('loadingDetail');
            
            // Wait for all initialization to complete
            loadingDetail.textContent = 'Initializing components...';
            await Promise.all(initPromises);
            
            // Initialize camera UI after camera manager is ready
            loadingDetail.textContent = 'Setting up camera interface...';
            this.cameraUI = new CameraUI(this.cameraManager, {
                videoElement: document.getElementById('video'),
                overlayElement: document.querySelector('.scan-overlay'),
                torchButton: this.flashBtn
            });
            
            // Setup retry callbacks
            this.retryManager.setCallbacks({
                onRetry: (chunkIndex, attempts) => {
                    console.log(`🔄 Retrying chunk ${chunkIndex} (attempt ${attempts})`);
                    this.updateRetryStatus(chunkIndex, attempts);
                },
                onSuccess: (chunkIndex) => {
                    console.log(`✅ Chunk ${chunkIndex} recovered`);
                },
                onFailure: (chunkIndex, error) => {
                    console.log(`❌ Chunk ${chunkIndex} failed permanently:`, error);
                }
            });
            
            // Setup integrations between modules
            this.setupIntegrations();
            
            // Setup performance monitoring if enabled
            if (window.QRScannerConfig?.debug?.enabled) {
                this.setupPerformanceMonitoring();
            }
            
            // Setup audio controls
            this.setupAudioUI();
            
            // Hide loading screen
            loadingDetail.textContent = 'Ready to scan!';
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
            
        } catch (error) {
            this.showLoadError(`Initialization failed: ${error.message}`);
        }
    }
    
    bindEvents() {
        // Main action buttons
        this.startScanBtn?.addEventListener('click', () => this.toggleScanning());
        this.resetBtn?.addEventListener('click', () => this.resetTransfer());
        this.downloadBtn?.addEventListener('click', () => this.downloadFile());
        this.flashBtn?.addEventListener('click', () => this.toggleFlash());
        
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn?.addEventListener('click', () => this.showSettings());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
        
        // Page visibility handling for camera management
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        // Handle PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => this.handleInstallPrompt(e));
    }
    
    async toggleScanning() {
        if (this.isScanning) {
            this.stopScanning();
        } else {
            await this.startScanning();
        }
    }
    
    async startScanning() {
        try {
            if (this.isScanning) return;
            
            this.updateUI('scanning');
            this.isScanning = true;
            
            // Start camera and QR scanning
            await this.cameraUI.startCamera();
            await this.scannerEngine.startScanning(
                document.getElementById('video'),
                (qrData) => this.handleQRDetection(qrData),
                {
                    maxScansPerSecond: window.QRScannerConfig?.scanner?.maxScansPerSecond || 10,
                    highlightScanRegion: false,
                    highlightCodeOutline: false
                }
            );
            
            console.log('🎥 Scanning started');
            
        } catch (error) {
            this.isScanning = false;
            this.updateUI('error');
            this.showLoadError(`Camera access failed: ${error.message}`);
            await this.audioManager.scanError();
        }
    }
    
    stopScanning() {
        if (!this.isScanning) return;
        
        this.isScanning = false;
        this.scannerEngine.stopScanning();
        this.cameraUI.stopCamera();
        this.updateUI('idle');
        
        console.log('⏸️ Scanning stopped');
    }
    
    resetTransfer() {
        this.stopScanning();
        this.chunkManager.reset();
        this.retryManager.reset();
        this.currentFile = null;
        this.updateUI('idle');
        this.hideTransferStatus();
        console.log('🔄 Transfer reset');
    }
    
    async toggleFlash() {
        try {
            const isOn = await this.cameraUI.toggleTorch();
            this.flashBtn.style.opacity = isOn ? '1' : '0.6';
            this.flashBtn.setAttribute('aria-pressed', isOn.toString());
        } catch (error) {
            console.error('Flash toggle failed:', error);
        }
    }
    
    showSettings() {
        // TODO: Implement settings panel
        console.log('⚙️ Settings panel - TODO: Implement advanced settings');
    }
    
    handleKeyboardShortcut(e) {
        switch (e.code) {
            case 'Space':
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    this.toggleScanning();
                }
                break;
            case 'KeyR':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.resetTransfer();
                }
                break;
            case 'KeyD':
                if ((e.ctrlKey || e.metaKey) && this.currentFile) {
                    e.preventDefault();
                    this.downloadFile();
                }
                break;
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden && this.isScanning) {
            // Pause scanning when tab is hidden to save resources
            this.scannerEngine.pauseScanning();
        } else if (!document.hidden && this.isScanning) {
            // Resume scanning when tab becomes visible
            this.scannerEngine.resumeScanning();
        }
    }
    
    handleInstallPrompt(e) {
        // Prevent the mini-infobar from appearing
        e.preventDefault();
        
        // Save the event for triggering later
        window.deferredPrompt = e;
        
        // Show custom install UI if desired
        console.log('📱 PWA install prompt available');
    }
    
    updateUI(state) {
        const button = this.startScanBtn;
        if (!button) return;
        
        const states = {
            idle: { text: 'Start Scanning', class: 'scan-btn' },
            scanning: { text: 'Stop Scanning', class: 'scan-btn scanning' },
            processing: { text: 'Processing...', class: 'scan-btn processing' },
            complete: { text: 'Transfer Complete', class: 'scan-btn complete' },
            error: { text: 'Try Again', class: 'scan-btn error' }
        };
        
        const config = states[state];
        if (config) {
            button.textContent = config.text;
            button.className = config.class;
        }
        
        // Update other UI elements based on state
        const isActive = state === 'scanning';
        this.downloadBtn.style.display = this.currentFile ? 'block' : 'none';
        this.resetBtn.style.display = (state !== 'idle') ? 'block' : 'none';
    }
    
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 300);
        }
    }
    
    showLoadError(message) {
        const errorElement = document.getElementById('loadError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        console.error('❌ Load error:', message);
    }
    
    showTransferStatus() {
        if (this.transferStatus) {
            this.transferStatus.style.display = 'block';
            this.transferStatus.style.opacity = '1';
        }
    }
    
    hideTransferStatus() {
        if (this.transferStatus) {
            this.transferStatus.style.opacity = '0';
            setTimeout(() => {
                this.transferStatus.style.display = 'none';
            }, 300);
        }
    }
    
    updateProgress(progress, isComplete = false) {
        if (this.progressText) {
            this.progressText.textContent = `${Math.round(progress * 100)}%`;
        }
        
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
        
        if (isComplete) {
            this.updateUI('complete');
            this.progressDetail.textContent = 'Transfer completed successfully!';
        }
    }
    
    updateRetryStatus(chunkIndex, attempts) {
        if (this.progressDetail) {
            this.progressDetail.textContent = `Retrying chunk ${chunkIndex} (attempt ${attempts})...`;
        }
    }
    
    setupPerformanceMonitoring() {
        if (!window.QRScannerConfig?.performance?.enableMonitoring) return;
        
        let frameCount = 0;
        let lastTime = performance.now();
        
        const monitor = () => {
            frameCount++;
            const now = performance.now();
            
            if (now - lastTime >= 1000) {
                this.performanceStats.fps = Math.round(frameCount * 1000 / (now - lastTime));
                frameCount = 0;
                lastTime = now;
                
                // Update performance display if elements exist
                const fpsElement = document.getElementById('fpsCount');
                const memElement = document.getElementById('memUsage');
                
                if (fpsElement) {
                    fpsElement.textContent = this.performanceStats.fps;
                }
                
                if (memElement) {
                    const memUsage = Math.round((performance.memory?.usedJSHeapSize || 0) / 1024 / 1024);
                    memElement.textContent = `${memUsage}MB`;
                }
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }
    
    setupAudioUI() {
        // Add audio toggle to settings
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.audioManager.toggleAudioControls();
            });
        }
    }
    
    setupIntegrations() {
        // Integrate audio feedback with chunk manager
        if (this.chunkManager && this.retryManager) {
            const originalSetTotalChunks = this.chunkManager.setTotalChunks.bind(this.chunkManager);
            this.chunkManager.setTotalChunks = async (...args) => {
                await this.audioManager.transferStart();
                return originalSetTotalChunks(...args);
            };
            
            // Audio feedback for retry attempts
            this.retryManager.setCallbacks({
                ...this.retryManager.callbacks,
                onRetry: async (chunkIndex, attempts) => {
                    await this.audioManager.retryAttempt(attempts);
                    if (this.retryManager.callbacks.onRetry) {
                        this.retryManager.callbacks.onRetry(chunkIndex, attempts);
                    }
                }
            });
        }
    }
    
    async handleQRDetection(qrData) {
        try {
            const processedData = this.parseQRData(qrData);
            
            if (processedData.type === 'header') {
                await this.chunkManager.setTotalChunks(
                    processedData.totalChunks,
                    processedData.filename,
                    processedData.fileSize,
                    processedData.fileHash,
                    processedData.protocol
                );
                this.showTransferStatus();
                
            } else if (processedData.type === 'chunk') {
                const result = await this.chunkManager.addChunk({
                    index: processedData.index,
                    data: processedData.data
                });
                
                // Audio feedback for chunk received
                await this.audioManager.chunkReceived(processedData.index, this.chunkManager.totalChunks);
                
                this.updateProgress(result.progress, result.isComplete);
                
                if (result.isComplete) {
                    await this.completeTransfer();
                }
            }
            
            // Audio feedback for successful scan
            await this.audioManager.scanSuccess();
            
        } catch (error) {
            console.error('QR processing error:', error);
            await this.audioManager.scanError();
        }
    }
    
    async completeTransfer() {
        try {
            let fileData = await this.chunkManager.assembleFile();
            
            // Process data if metadata is available (decompression, decryption, error correction)
            if (fileData.metadata || this.chunkManager.compressionInfo || this.chunkManager.protocol) {
                const metadata = {
                    compression: this.chunkManager.compressionInfo?.compression,
                    encryption: this.chunkManager.compressionInfo?.encryption,
                    errorCorrection: this.chunkManager.protocol === 'qrfile/v2' ? 'rs-255-223' : null,
                    ...fileData.metadata
                };
                
                if (metadata.compression || metadata.encryption || metadata.errorCorrection) {
                    const processed = await this.dataProcessor.processFileData(fileData.data, metadata);
                    fileData.data = processed.data;
                    console.log(`📦 Data processed: ${processed.steps.join(' → ')}`);
                }
            }
            
            this.currentFile = fileData;
            this.stopScanning();
            
            // Audio feedback for completion
            await this.audioManager.transferComplete();
            
            // Show file preview if supported
            const mimeType = this.detectMimeType(fileData.filename, fileData.data);
            if (this.filePreview.canPreview(mimeType, fileData.size)) {
                setTimeout(() => {
                    this.filePreview.previewFile(fileData.data, fileData.filename, mimeType);
                }, 1000);
            }
            
            console.log(`✅ File assembled: ${fileData.filename} (${fileData.size} bytes)`);
        } catch (error) {
            console.error('File assembly failed:', error);
            await this.audioManager.scanError();
        }
    }
    
    parseQRData(qrString) {
        // Use the standardized QR protocol parser
        if (typeof window.parseQRProtocol === 'function') {
            return window.parseQRProtocol(qrString);
        }
        
        // Fallback simple parser
        if (qrString.startsWith('{')) {
            try {
                const data = JSON.parse(qrString);
                return {
                    type: data.index === 0 ? 'header' : 'chunk',
                    index: data.index,
                    totalChunks: data.total,
                    data: atob(data.data_b64),
                    filename: data.name,
                    fileSize: data.size,
                    protocol: data.fmt || 'qrfile/v1'
                };
            } catch (e) {
                throw new Error('Invalid JSON QR data');
            }
        }
        
        throw new Error('Unknown QR format');
    }
    
    detectMimeType(filename, data) {
        // Simple MIME type detection based on file extension and magic bytes
        const ext = filename.toLowerCase().split('.').pop();
        const mimeMap = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
            'pdf': 'application/pdf',
            'txt': 'text/plain', 'md': 'text/plain',
            'json': 'application/json',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav',
            'mp4': 'video/mp4', 'webm': 'video/webm',
            'zip': 'application/zip'
        };
        
        // Check magic bytes for common formats
        if (data.length >= 4) {
            const header = new Uint8Array(data.slice(0, 4));
            
            // PNG: 89 50 4E 47
            if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
                return 'image/png';
            }
            
            // JPEG: FF D8
            if (header[0] === 0xFF && header[1] === 0xD8) {
                return 'image/jpeg';
            }
            
            // PDF: 25 50 44 46
            if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
                return 'application/pdf';
            }
            
            // ZIP: 50 4B 03 04
            if (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) {
                return 'application/zip';
            }
        }
        
        return mimeMap[ext] || 'application/octet-stream';
    }
    
    downloadFile() {
        if (!this.currentFile) return;
        
        const mimeType = this.detectMimeType(this.currentFile.filename, this.currentFile.data);
        const blob = new Blob([this.currentFile.data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentFile.filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    handleScanError(error) {
        console.error('Scan error:', error);
        this.audioManager.scanError();
        this.showLoadError(error.message);
    }
}

// Initialize the scanner when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.qrScanner = new WorldClassQRScanner();
    });
} else {
    window.qrScanner = new WorldClassQRScanner();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldClassQRScanner;
}