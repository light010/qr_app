/**
 * World-Class QR Scanner - Main Application Controller
 * 
 * ROOT CAUSE FIX: Completely refactored for dependency injection
 * Uses ServiceContainer for all dependencies - ZERO tight coupling
 * 
 * @class WorldClassQRScanner
 */
class WorldClassQRScanner {
    constructor(dependencies = {}) {
        // ROOT CAUSE FIX: Accept all dependencies via injection
        this.ui = dependencies.ui;
        this.scannerEngine = dependencies.scannerEngine;
        this.storageManager = dependencies.storage;
        this.retryManager = dependencies.retry;
        this.chunkManager = dependencies.chunks;
        this.themeManager = dependencies.theme;
        this.cameraManager = dependencies.camera;
        this.cameraUIFactory = dependencies.cameraUI; // Factory function
        this.dataProcessor = dependencies.dataProcessor;
        this.filePreview = dependencies.preview;
        this.audioManager = dependencies.audio;
        this.config = dependencies.config;
        
        // Validate required dependencies
        this.validateDependencies();
        
        this.cameraUI = null; // Will be created from factory
        
        // Application state - NO DOM references
        this.isScanning = false;
        this.currentFile = null;
        this.performanceStats = {
            fps: 0,
            memoryUsage: 0,
            lastFrameTime: 0
        };
        
        // Setup event-driven architecture
        this.setupUIEventHandlers();
        // Note: initialize() will be called by ServiceBootstrap
    }
    
    /**
     * Setup UI event handlers using UIManager's event system
     * ROOT CAUSE FIX: No direct DOM event listeners
     */
    setupUIEventHandlers() {
        // Listen to UI events instead of direct DOM events
        this.ui.addEventListener('scan-toggle', () => this.toggleScanning());
        this.ui.addEventListener('scan-reset', () => this.resetTransfer());
        this.ui.addEventListener('file-download', () => this.downloadFile());
        this.ui.addEventListener('flash-toggle', () => this.toggleFlash());
        this.ui.addEventListener('settings-open', () => this.showSettings());
        
        // Handle page visibility changes
        this.ui.addEventListener('visibility-change', (e) => {
            this.handleVisibilityChange(e.detail.hidden);
        });
        
        // Handle PWA install prompt
        this.ui.addEventListener('install-prompt', (e) => {
            this.handleInstallPrompt(e.detail.event);
        });
        
        // Handle UI errors
        this.ui.addEventListener('ui-error', (e) => {
            console.error('UI Error:', e.detail);
        });
    }
    
    /**
     * Validate required dependencies are injected
     * ROOT CAUSE FIX: Ensures proper dependency injection
     */
    validateDependencies() {
        const required = [
            'ui', 'scannerEngine', 'storageManager', 'retryManager',
            'chunkManager', 'themeManager', 'cameraManager', 'cameraUIFactory',
            'dataProcessor', 'filePreview', 'audioManager', 'config'
        ];
        
        const missing = [];
        for (const dep of required) {
            if (!this[dep]) {
                missing.push(dep);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
        }
        
        console.log('✅ All dependencies validated for WorldClassQRScanner');
    }
    
    async initialize() {
        try {
            // Update loading UI through UIManager
            this.ui.updateLoadingText('Initializing QR Scanner', 'Setting up camera interface...');
            
            // ROOT CAUSE FIX: Services already initialized by ServiceBootstrap
            // Create camera UI from injected factory function
            this.cameraUI = this.cameraUIFactory();
            
            // Setup retry callbacks
            this.retryManager.setCallbacks({
                onRetry: (chunkIndex, attempts) => {
                    console.log(`🔄 Retrying chunk ${chunkIndex} (attempt ${attempts})`);
                    this.ui.updateRetryStatus(chunkIndex, attempts);
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
            
            // Hide loading screen through UIManager
            this.ui.updateLoadingText('Initializing QR Scanner', 'Ready to scan!');
            setTimeout(() => {
                this.ui.hideLoadingScreen();
            }, 1000);
            
        } catch (error) {
            // Show error through UIManager
            this.ui.showLoadError(`Initialization failed: ${error.message}`);
        }
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
            
            // Update UI state through UIManager
            this.ui.updateScanButton('scanning');
            this.ui.updateScanAnimation(true);
            this.ui.updateScanInstruction('Position QR code within the frame');
            this.isScanning = true;
            
            // Start camera and QR scanning
            await this.cameraUI.startCamera();
            await this.scannerEngine.startScanning(
                this.ui.elements.app.video, // Access video through UIManager
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
            this.ui.updateScanButton('error');
            this.ui.showLoadError(`Camera access failed: ${error.message}`);
            await this.audioManager.scanError();
        }
    }
    
    stopScanning() {
        if (!this.isScanning) return;
        
        this.isScanning = false;
        this.scannerEngine.stopScanning();
        this.cameraUI.stopCamera();
        
        // Update UI through UIManager
        this.ui.updateScanButton('idle');
        this.ui.updateScanAnimation(false);
        this.ui.updateScanInstruction('Position QR code within the frame');
        
        console.log('⏸️ Scanning stopped');
    }
    
    resetTransfer() {
        this.stopScanning();
        this.chunkManager.reset();
        this.retryManager.reset();
        this.currentFile = null;
        
        // Reset UI through UIManager
        this.ui.updateScanButton('idle');
        this.ui.hideTransferStatus();
        
        console.log('🔄 Transfer reset');
    }
    
    async toggleFlash() {
        try {
            const isOn = await this.cameraUI.toggleTorch();
            // Update flash button through UIManager
            this.ui.updateFlashButton(isOn);
        } catch (error) {
            console.error('Flash toggle failed:', error);
        }
    }
    
    showSettings() {
        // TODO: Implement settings panel
        console.log('⚙️ Settings panel - TODO: Implement advanced settings');
    }
    
    handleVisibilityChange(isHidden) {
        if (isHidden && this.isScanning) {
            // Pause scanning when tab is hidden to save resources
            this.scannerEngine.pauseScanning();
        } else if (!isHidden && this.isScanning) {
            // Resume scanning when tab becomes visible
            this.scannerEngine.resumeScanning();
        }
    }
    
    handleInstallPrompt(event) {
        // Save the event for triggering later
        window.deferredPrompt = event;
        console.log('📱 PWA install prompt available');
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
                
                // Update performance through UIManager
                this.performanceStats.memoryUsage = (performance.memory?.usedJSHeapSize || 0) / 1024 / 1024;
                this.ui.updatePerformance(this.performanceStats);
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }
    
    setupAudioUI() {
        // Audio settings integration with UIManager events
        this.ui.addEventListener('settings-open', () => {
            this.audioManager.toggleAudioControls();
        });
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
                // Show transfer status through UIManager
                this.ui.showTransferStatus();
                
            } else if (processedData.type === 'chunk') {
                const result = await this.chunkManager.addChunk({
                    index: processedData.index,
                    data: processedData.data
                });
                
                // Audio feedback for chunk received
                await this.audioManager.chunkReceived(processedData.index, this.chunkManager.totalChunks);
                
                // Update progress through UIManager
                this.ui.updateProgress(result.progress, result.isComplete);
                
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
        // Show error through UIManager
        this.ui.showLoadError(error.message);
    }
}

// Initialize the scanner when DOM is loaded - uses event-driven architecture
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