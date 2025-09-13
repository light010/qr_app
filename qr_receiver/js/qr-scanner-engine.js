/**
 * QR Scanner Engine with Progressive Enhancement
 * Handles QR detection using native BarcodeDetector API or QrScanner library fallback
 * ROOT CAUSE FIX: Integrated with ProtocolBridge for universal format support
 */
class QRScannerEngine {
    constructor() {
        this.scanner = null;
        this.video = null;
        this.isScanning = false;
        this.mode = 'none'; // 'native', 'library', or 'none'
        this.onDetection = null;
        this.onError = null;
        this.scanInterval = null;
        
        // ROOT CAUSE FIX: Universal protocol compatibility
        this.protocolBridge = new ProtocolBridge();
        
        console.log('🔍 QR Scanner Engine with universal protocol support initialized');
    }
    
    async initialize() {
        try {
            // Progressive enhancement: try BarcodeDetector first
            if ('BarcodeDetector' in window && BarcodeDetector.getSupportedFormats) {
                try {
                    const formats = await BarcodeDetector.getSupportedFormats();
                    if (formats.includes('qr_code')) {
                        this.scanner = new BarcodeDetector({ formats: ['qr_code'] });
                        this.mode = 'native';
                        console.log('Using native BarcodeDetector API');
                        return;
                    }
                } catch (e) {
                    console.log('BarcodeDetector check failed, falling back to library');
                }
            }
            
            // Fallback to library mode
            await this.initializeLibrary();
            
            // Ensure we have a working scanner
            if (this.mode === 'none') {
                const hasQrScanner = typeof QrScanner !== 'undefined';
                const hasBarcodeDetector = 'BarcodeDetector' in window;
                throw new Error(`QR scanner initialization failed. Available APIs: QrScanner=${hasQrScanner}, BarcodeDetector=${hasBarcodeDetector}`);
            }
        } catch (error) {
            console.error('QR Scanner initialization failed:', error);
            throw error;
        }
    }
    
    async initializeLibrary() {
        if (typeof QrScanner !== 'undefined') {
            QrScanner.WORKER_PATH = 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js';
            this.mode = 'library';
            console.log('Using qr-scanner library');
            return true;
        } else {
            console.error('QrScanner library not loaded - check if script loaded correctly');
            this.mode = 'none';
            return false;
        }
    }
    
    async startScanning(onDetection, onError) {
        this.onDetection = onDetection;
        this.onError = onError;
        
        try {
            await this.startCamera();
            
            if (this.mode === 'library' && typeof QrScanner !== 'undefined') {
                // Use library scanner
                this.scanner = new QrScanner(this.video, (result) => this.handleDetection(result), {
                    returnDetailedScanResult: true,
                    highlightScanRegion: false,
                    highlightCodeOutline: false,
                    maxScansPerSecond: 10,
                    preferredCamera: 'environment'
                });
                await this.scanner.start();
                this.isScanning = true;
            } else if (this.mode === 'native') {
                // Use native scanner
                this.isScanning = true;
                this.scanLoop();
            } else {
                throw new Error('No QR scanner available');
            }
        } catch (error) {
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }
    
    async startCamera() {
        this.video = document.getElementById('video');
        if (!this.video) {
            throw new Error('Video element not found');
        }
        
        if (!window.isSecureContext) {
            throw new Error('Camera requires HTTPS or localhost');
        }
        
        try {
            // Optimal camera constraints for QR scanning
            const constraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 15, max: 30 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            // Wait for video to load
            return new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => resolve();
                this.video.onerror = () => reject(new Error('Video loading failed'));
                setTimeout(() => reject(new Error('Video loading timeout')), 10000);
            });
        } catch (error) {
            throw new Error(this.getCameraErrorMessage(error));
        }
    }
    
    scanLoop() {
        if (!this.isScanning) return;
        
        // Create canvas for frame capture (80% scan region optimization)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        
        canvas.width = 400;
        canvas.height = 400;
        
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        
        // Use ImageData for native scanner
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        this.scanner.detect(imageData)
            .then(codes => {
                if (codes.length > 0) {
                    this.handleDetection({ data: codes[0].rawValue });
                }
            })
            .catch(() => {}); // Ignore scan failures
        
        // Maintain 10-15 FPS (67ms = ~15 FPS)
        this.scanInterval = setTimeout(() => this.scanLoop(), 67);
    }
    
    handleDetection(result) {
        if (this.onDetection) {
            try {
                // ROOT CAUSE FIX: Universal protocol parsing
                const parsedData = this.protocolBridge.parseQRData(result.data);
                
                // Pass both raw and parsed data for compatibility
                this.onDetection(result.data, parsedData);
            } catch (error) {
                console.warn('Protocol parsing failed, passing raw data:', error);
                this.onDetection(result.data, null);
            }
        }
    }
    
    stopScanning() {
        this.isScanning = false;
        
        if (this.scanInterval) {
            clearTimeout(this.scanInterval);
            this.scanInterval = null;
        }
        
        if (this.scanner && this.mode === 'library') {
            this.scanner.stop();
            this.scanner = null;
        }
        
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }
    
    toggleFlash() {
        if (!this.scanner || !this.isScanning || this.mode !== 'library') {
            return false;
        }
        
        try {
            this.scanner.setFlash(!this.flashEnabled);
            this.flashEnabled = !this.flashEnabled;
            return this.flashEnabled;
        } catch (error) {
            console.log('Flash not available');
            return false;
        }
    }
    
    getCameraErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return 'Camera permission denied';
        } else if (error.name === 'NotFoundError') {
            return 'No camera found';
        } else if (error.name === 'NotReadableError') {
            return 'Camera already in use';
        } else if (error.name === 'OverconstrainedError') {
            return 'Camera constraints not supported';
        }
        return error.message;
    }
}

// Export for ES6 modules
export { QRScannerEngine };