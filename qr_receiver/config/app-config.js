/**
 * @fileoverview Centralized Application Configuration System
 * 
 * ROOT CAUSE SOLUTION: Eliminates configuration fragmentation across 40+ hardcoded 
 * values by creating a single source of truth that adapts to device capabilities, 
 * platform differences, and runtime conditions.
 * 
 * WORLDCLASS Features:
 * - Device-capability aware settings
 * - Platform-specific adaptations (iOS/Android/Windows/macOS)
 * - Network-condition responsive configuration
 * - Performance-scaled thresholds
 * - Runtime configuration overrides
 * - Environment-based configurations
 */

/**
 * Application Configuration Manager
 * Centralizes all configuration and provides adaptive settings based on runtime conditions
 * 
 * @class AppConfig
 */
class AppConfig {
    constructor() {
        /** @type {Object} Device detection results */
        this.device = this.detectDevice();
        
        /** @type {Object} Performance capabilities */
        this.performance = this.detectPerformance();
        
        /** @type {Object} Network conditions */
        this.network = this.detectNetwork();
        
        /** @type {Object} Runtime configuration overrides */
        this.overrides = {};
        
        /** @type {Object} Environment-specific settings */
        this.environment = this.detectEnvironment();
        
        console.log('🔧 AppConfig initialized:', {
            device: this.device.platform,
            performance: this.performance.tier,
            network: this.network.type,
            environment: this.environment.mode
        });
    }
    
    /**
     * Detect device capabilities and platform
     * @returns {Object} Device information
     */
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform?.toLowerCase() || '';
        
        // Platform detection
        const isIOS = /iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 1);
        const isAndroid = /android/.test(userAgent);
        const isWindows = /windows/.test(userAgent) || platform.includes('win');
        const isMacOS = /mac/.test(userAgent) && !isIOS;
        const isLinux = /linux/.test(userAgent) && !isAndroid;
        
        // Device type detection
        const isMobile = /mobi|android|ios|iphone|ipad|phone/i.test(userAgent);
        const isTablet = (isIOS && window.innerWidth >= 768) || 
                        (isAndroid && window.innerWidth >= 600 && window.innerHeight >= 960);
        const isDesktop = !isMobile && !isTablet;
        
        // Screen information
        const screen = {
            width: window.screen.width,
            height: window.screen.height,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.screen.orientation?.angle || 0
        };
        
        // Memory detection (if available)
        const memory = navigator.deviceMemory || this.estimateMemory();
        
        // Hardware concurrency
        const cores = navigator.hardwareConcurrency || 4;
        
        return {
            platform: isIOS ? 'ios' : isAndroid ? 'android' : isWindows ? 'windows' : isMacOS ? 'macos' : isLinux ? 'linux' : 'unknown',
            type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
            screen,
            memory,
            cores,
            isIOS,
            isAndroid,
            isWindows,
            isMacOS,
            isLinux,
            isMobile,
            isTablet,
            isDesktop
        };
    }
    
    /**
     * Estimate device memory if deviceMemory API not available
     * @returns {number} Estimated memory in GB
     */
    estimateMemory() {
        // Rough estimation based on screen size and device type
        const totalPixels = window.screen.width * window.screen.height * (window.devicePixelRatio || 1);
        
        if (totalPixels > 2073600) return 8; // High-res devices likely have more RAM
        if (totalPixels > 921600) return 4;  // Medium-res devices
        return 2; // Basic devices
    }
    
    /**
     * Detect performance capabilities
     * @returns {Object} Performance information
     */
    detectPerformance() {
        const memory = this.device.memory;
        const cores = this.device.cores;
        const pixelRatio = this.device.screen.pixelRatio;
        
        // Performance tier calculation
        let tier = 'medium';
        let score = 0;
        
        // Memory score
        if (memory >= 8) score += 3;
        else if (memory >= 4) score += 2;
        else if (memory >= 2) score += 1;
        
        // CPU score
        if (cores >= 8) score += 3;
        else if (cores >= 4) score += 2;
        else if (cores >= 2) score += 1;
        
        // Screen density penalty (high DPI = more work)
        if (pixelRatio >= 3) score -= 1;
        else if (pixelRatio >= 2) score -= 0.5;
        
        // Determine tier
        if (score >= 5) tier = 'high';
        else if (score >= 3) tier = 'medium';
        else tier = 'low';
        
        return {
            tier,
            score,
            memory,
            cores,
            estimatedFPS: tier === 'high' ? 60 : tier === 'medium' ? 30 : 15,
            estimatedProcessingPower: tier === 'high' ? 1.0 : tier === 'medium' ? 0.7 : 0.4
        };
    }
    
    /**
     * Detect network conditions
     * @returns {Object} Network information
     */
    detectNetwork() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        const effectiveType = connection?.effectiveType || 'unknown';
        const downlink = connection?.downlink || 1; // Mbps
        const rtt = connection?.rtt || 100; // ms
        
        // Network quality assessment
        let quality = 'good';
        if (effectiveType === 'slow-2g' || effectiveType === '2g') quality = 'poor';
        else if (effectiveType === '3g') quality = 'fair';
        else if (effectiveType === '4g' || downlink > 1) quality = 'good';
        
        return {
            type: effectiveType,
            quality,
            downlink,
            rtt,
            isOnline: navigator.onLine
        };
    }
    
    /**
     * Detect environment mode
     * @returns {Object} Environment information
     */
    detectEnvironment() {
        // Check if running in development mode
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.protocol === 'file:';
        
        // Check if PWA
        const isPWA = window.navigator.standalone || 
                     window.matchMedia('(display-mode: standalone)').matches;
        
        // Check theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        return {
            mode: isDevelopment ? 'development' : 'production',
            isPWA,
            prefersDark,
            isSecure: window.location.protocol === 'https:',
            isDevelopment,
            isProduction: !isDevelopment
        };
    }
    
    /**
     * Get application information
     * @returns {Object} App configuration
     */
    get app() {
        return {
            name: 'QR File Transfer - World-Class Scanner',
            shortName: 'QR Scanner',
            version: '2.0.0',
            description: 'World-class QR code scanner for secure file transfers'
        };
    }
    
    /**
     * Get performance-based configuration
     * @returns {Object} Performance configuration
     */
    get performanceConfig() {
        const tier = this.performance.tier;
        
        return {
            // Memory thresholds based on available RAM
            memoryThreshold: this.device.memory >= 8 ? 100 * 1024 * 1024 : // 100MB for high-end
                           this.device.memory >= 4 ? 50 * 1024 * 1024 :  // 50MB for medium
                           25 * 1024 * 1024, // 25MB for low-end
            
            // Scan performance based on device capabilities
            maxScansPerSecond: tier === 'high' ? 15 : tier === 'medium' ? 10 : 5,
            scanInterval: tier === 'high' ? 66 : tier === 'medium' ? 100 : 200, // ms
            
            // Processing limits based on performance
            maxChunkDisplay: tier === 'high' ? 200 : tier === 'medium' ? 100 : 50,
            maxConsecutiveErrors: tier === 'high' ? 15 : tier === 'medium' ? 10 : 5,
            
            // Canvas processing size based on device
            canvasProcessingSize: tier === 'high' ? 800 : tier === 'medium' ? 400 : 200,
            
            // Animation performance
            animationsEnabled: tier !== 'low',
            animationDuration: tier === 'high' ? 300 : tier === 'medium' ? 500 : 800,
            
            // FPS and monitoring
            fpsTarget: this.performance.estimatedFPS,
            fpsInterval: 1000,
            memoryCheckInterval: tier === 'high' ? 2000 : tier === 'medium' ? 5000 : 10000,
            cleanupInterval: tier === 'high' ? 30000 : tier === 'medium' ? 60000 : 120000,
            
            // Performance monitoring
            enableMonitoring: this.environment.isDevelopment
        };
    }
    
    /**
     * Get device-specific configuration
     * @returns {Object} Device configuration
     */
    get deviceConfig() {
        return {
            // Camera constraints based on device capabilities
            camera: {
                constraints: {
                    video: {
                        facingMode: this.device.isMobile ? { ideal: "environment" } : { ideal: "user" },
                        width: { 
                            ideal: this.device.isDesktop ? 1920 : this.device.isTablet ? 1280 : 640,
                            max: this.device.isDesktop ? 2560 : 1920
                        },
                        height: { 
                            ideal: this.device.isDesktop ? 1080 : this.device.isTablet ? 720 : 480,
                            max: this.device.isDesktop ? 1440 : 1080
                        },
                        frameRate: { 
                            ideal: this.performance.tier === 'high' ? 30 : 15, 
                            max: this.performance.tier === 'high' ? 60 : 30 
                        }
                    }
                },
                settings: {
                    autoSwitchOnError: true,
                    preferredCamera: this.device.isMobile ? 'environment' : 'user',
                    enableTorch: this.device.isMobile,
                    zoomLevel: 1.0,
                    focusMode: 'continuous',
                    exposureMode: 'continuous'
                }
            },
            
            // Haptic feedback patterns by platform
            haptics: {
                success: this.device.isIOS ? [100, 30, 100] : 
                        this.device.isAndroid ? [50, 50, 50] : [],
                error: this.device.isIOS ? [200, 100, 200] : 
                      this.device.isAndroid ? [100, 100, 100] : [],
                progress: this.device.isIOS ? [50] : 
                         this.device.isAndroid ? [25] : [],
                enabled: this.device.isMobile && 'vibrate' in navigator
            },
            
            // Touch and interaction
            touch: {
                enabled: this.device.isMobile || this.device.isTablet,
                longPressDelay: 500,
                tapTimeout: 300
            },
            
            // Platform-specific UI adjustments
            ui: {
                safeAreaInsets: this.device.isIOS,
                statusBarHeight: this.device.isIOS ? 44 : this.device.isAndroid ? 24 : 0,
                bottomSafeArea: this.device.isIOS ? 34 : 0
            }
        };
    }
    
    /**
     * Get network-based configuration
     * @returns {Object} Network configuration
     */
    get networkConfig() {
        const quality = this.network.quality;
        
        return {
            // CDN configuration with fallbacks
            cdn: {
                primary: 'https://cdn.jsdelivr.net/npm',
                fallback: 'https://unpkg.com',
                local: './lib', // Local fallback
                timeout: quality === 'poor' ? 60000 : quality === 'fair' ? 30000 : 15000
            },
            
            // Timeout configuration based on network quality
            timeouts: {
                script: quality === 'poor' ? 60000 : quality === 'fair' ? 30000 : 15000,
                request: quality === 'poor' ? 10000 : quality === 'fair' ? 5000 : 3000,
                retry: quality === 'poor' ? 5000 : quality === 'fair' ? 3000 : 1000
            },
            
            // Retry configuration
            retry: {
                maxRetries: quality === 'poor' ? 8 : quality === 'fair' ? 5 : 3,
                baseDelay: 1000,
                maxDelay: quality === 'poor' ? 60000 : quality === 'fair' ? 30000 : 15000,
                backoffFactor: 2,
                jitterMax: 1000
            },
            
            // Data usage optimization
            optimization: {
                compressRequests: quality === 'poor',
                cacheAggressive: quality === 'poor',
                prefetchDisabled: quality === 'poor'
            }
        };
    }
    
    /**
     * Get QR scanner configuration
     * @returns {Object} Scanner configuration
     */
    get scannerConfig() {
        const tier = this.performance.tier;
        
        return {
            workerPath: 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js',
            maxScansPerSecond: this.performanceConfig.maxScansPerSecond,
            scanInterval: this.performanceConfig.scanInterval,
            highlightScanRegion: this.environment.isDevelopment,
            highlightCodeOutline: this.environment.isDevelopment,
            timeout: tier === 'high' ? 5000 : tier === 'medium' ? 10000 : 15000,
            dedupTime: 1000,
            returnDetailedScanResult: false,
            calculateCodeBoundingBox: this.environment.isDevelopment
        };
    }
    
    /**
     * Get audio configuration
     * @returns {Object} Audio configuration
     */
    get audioConfig() {
        return {
            enabled: !this.device.isMobile || this.environment.isDevelopment, // Careful with mobile autoplay
            masterVolume: 0.7,
            soundDefinitions: {
                scanSuccess: {
                    frequency: [800, 1200, 800],
                    duration: 0.15,
                    volume: 0.8
                },
                scanError: {
                    frequency: [400, 300],
                    duration: 0.3,
                    volume: 0.6
                },
                chunkReceived: {
                    frequency: [600, 900],
                    duration: 0.1,
                    volume: 0.4
                },
                transferComplete: {
                    frequency: [523.25, 659.25, 783.99, 1046.5],
                    duration: 0.8,
                    volume: 0.9
                }
            }
        };
    }
    
    /**
     * Get storage configuration
     * @returns {Object} Storage configuration
     */
    get storageConfig() {
        return {
            memoryThreshold: this.performanceConfig.memoryThreshold,
            dbName: 'QRTransferStorage',
            version: 2,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxMemorySize: this.performanceConfig.memoryThreshold,
            
            // IndexedDB configuration
            stores: {
                chunks: 'id, timestamp, fileId',
                files: 'id, filename, timestamp',
                metadata: 'key, value'
            }
        };
    }
    
    /**
     * Get UI configuration
     * @returns {Object} UI configuration
     */
    get uiConfig() {
        const screen = this.device.screen;
        const isLargeScreen = screen.width >= 1200;
        const isSmallScreen = screen.width <= 480;
        
        return {
            // Responsive dimensions
            scanFrame: {
                size: isLargeScreen ? 'min(60vw, 60vh)' : 
                     isSmallScreen ? 'min(90vw, 90vh)' : 'min(80vw, 80vh)',
                maxSize: isLargeScreen ? '600px' : isSmallScreen ? '300px' : '400px',
                cornerSize: isSmallScreen ? '24px' : '32px'
            },
            
            // Theme configuration
            theme: {
                default: this.environment.prefersDark ? 'dark' : 'light',
                storageKey: 'qr-scanner-theme',
                adaptiveColors: true,
                highContrast: false,
                transitions: {
                    fast: this.performanceConfig.animationsEnabled ? '0.2s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
                    smooth: this.performanceConfig.animationsEnabled ? '0.4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                }
            },
            
            // Animation configuration
            animations: {
                enabled: this.performanceConfig.animationsEnabled,
                duration: this.performanceConfig.animationDuration,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            },
            
            // Typography scaling
            typography: {
                scale: isSmallScreen ? 0.9 : isLargeScreen ? 1.1 : 1.0,
                lineHeight: 1.5
            },
            
            // Layout configuration
            layout: {
                maxWidth: isLargeScreen ? '1200px' : '100%',
                padding: isSmallScreen ? '16px' : '24px',
                borderRadius: '12px',
                statusBarOffset: this.deviceConfig.ui.statusBarHeight,
                bottomSafeArea: this.deviceConfig.ui.bottomSafeArea
            }
        };
    }
    
    /**
     * Get file processing configuration
     * @returns {Object} File processing configuration
     */
    get fileConfig() {
        const memory = this.device.memory;
        
        return {
            // Size limits based on device memory
            maxPreviewSizes: {
                image: memory >= 8 ? 50 * 1024 * 1024 : memory >= 4 ? 20 * 1024 * 1024 : 10 * 1024 * 1024,
                text: memory >= 8 ? 5 * 1024 * 1024 : memory >= 4 ? 2 * 1024 * 1024 : 1 * 1024 * 1024,
                audio: 100 * 1024 * 1024, // Audio can be large but streamable
                video: memory >= 8 ? 500 * 1024 * 1024 : memory >= 4 ? 200 * 1024 * 1024 : 100 * 1024 * 1024,
                pdf: memory >= 4 ? 50 * 1024 * 1024 : 20 * 1024 * 1024,
                archive: 100 * 1024 * 1024
            },
            
            supportedTypes: {
                images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
                text: ['text/plain', 'text/html', 'text/css', 'text/javascript', 'text/json', 'text/xml', 'text/csv'],
                code: ['application/json', 'application/xml', 'application/javascript'],
                documents: ['application/pdf'],
                audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
                video: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
                archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
            },
            
            // Processing configuration
            processing: {
                chunkSize: memory >= 8 ? 64 * 1024 : memory >= 4 ? 32 * 1024 : 16 * 1024,
                maxWorkers: Math.min(this.device.cores, 4),
                useWebWorkers: this.device.cores > 2,
                textVirtualization: {
                    threshold: 1 * 1024 * 1024, // 1MB
                    maxLines: memory >= 8 ? 2000 : memory >= 4 ? 1000 : 500
                }
            }
        };
    }
    
    /**
     * Get security configuration
     * @returns {Object} Security configuration
     */
    get securityConfig() {
        return {
            enforceHTTPS: this.environment.isProduction,
            allowedOrigins: this.environment.isDevelopment 
                ? ['http://localhost:*', 'http://127.0.0.1:*', 'file://*'] 
                : ['https://*'],
            contentSecurityPolicy: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                mediaSrc: ["'self'", "blob:"],
                connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
                workerSrc: ["'self'", "blob:", "https://cdn.jsdelivr.net"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"]
            }
        };
    }
    
    /**
     * Get debug configuration
     * @returns {Object} Debug configuration
     */
    get debugConfig() {
        return {
            enabled: this.environment.isDevelopment,
            logLevel: this.environment.isDevelopment ? 'debug' : 'error',
            showPerformanceMonitor: this.environment.isDevelopment,
            verboseLogging: this.environment.isDevelopment,
            showDeviceInfo: this.environment.isDevelopment,
            enableTesting: this.environment.isDevelopment
        };
    }
    
    /**
     * Get URLs and paths
     * @returns {Object} URLs configuration
     */
    get urlsConfig() {
        return {
            serviceWorker: './sw.js',
            manifest: './manifest.json',
            offline: './offline.html',
            
            // External dependencies with fallbacks
            dependencies: {
                qrScanner: {
                    primary: 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js',
                    fallback: 'https://unpkg.com/qr-scanner@1.4.2/build/qr-scanner.umd.min.js',
                    local: './lib/qr-scanner.umd.min.js'
                },
                qrWorker: {
                    primary: 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js',
                    fallback: 'https://unpkg.com/qr-scanner@1.4.2/qr-scanner-worker.min.js',
                    local: './lib/qr-scanner-worker.min.js'
                },
                crypto: {
                    primary: 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
                    fallback: 'https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.min.js',
                    local: './lib/crypto-js.min.js'
                }
            }
        };
    }
    
    /**
     * Get all configuration as a single object
     * @returns {Object} Complete configuration
     */
    get config() {
        return {
            app: this.app,
            environment: this.environment,
            device: this.deviceConfig,
            performance: this.performanceConfig,
            network: this.networkConfig,
            scanner: this.scannerConfig,
            audio: this.audioConfig,
            storage: this.storageConfig,
            ui: this.uiConfig,
            filePreview: this.fileConfig,
            security: this.securityConfig,
            debug: this.debugConfig,
            urls: this.urlsConfig,
            
            // Raw device/performance data for debugging
            _raw: {
                deviceInfo: this.device,
                performanceInfo: this.performance,
                networkInfo: this.network,
                environmentInfo: this.environment
            }
        };
    }
    
    /**
     * Override configuration at runtime
     * @param {string} path - Configuration path (dot notation)
     * @param {*} value - New value
     */
    override(path, value) {
        const keys = path.split('.');
        let current = this.overrides;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        console.log(`🔧 Config override: ${path} = ${value}`);
    }
    
    /**
     * Get configuration value with override support
     * @param {string} path - Configuration path (dot notation)
     * @returns {*} Configuration value
     */
    get(path) {
        const keys = path.split('.');
        let current = this.config;
        
        // Check overrides first
        let override = this.overrides;
        let hasOverride = true;
        for (const key of keys) {
            if (override && typeof override === 'object' && key in override) {
                override = override[key];
            } else {
                hasOverride = false;
                break;
            }
        }
        
        if (hasOverride) {
            return override;
        }
        
        // Get from main config
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        
        return current;
    }
    
    /**
     * Log current configuration for debugging
     */
    logConfig() {
        console.group('🔧 Application Configuration');
        console.log('Device:', this.device);
        console.log('Performance:', this.performance);
        console.log('Network:', this.network);
        console.log('Environment:', this.environment);
        console.log('Full Configuration:', this.config);
        console.groupEnd();
    }
    
    /**
     * Update configuration when conditions change
     */
    updateForConditions() {
        // Re-detect network conditions
        this.network = this.detectNetwork();
        
        // Re-detect performance if needed
        if (performance.memory !== navigator.deviceMemory) {
            this.device = this.detectDevice();
            this.performance = this.detectPerformance();
        }
        
        console.log('🔄 Configuration updated for new conditions');
    }
}

// Create singleton configuration instance
const appConfig = new AppConfig();

// Make configuration globally available (backward compatibility)
window.QRScannerConfig = appConfig.config;
window.AppConfig = appConfig;

// Listen for network changes
if ('connection' in navigator) {
    navigator.connection.addEventListener('change', () => {
        appConfig.updateForConditions();
        // Update global reference
        window.QRScannerConfig = appConfig.config;
    });
}

// Listen for online/offline changes
window.addEventListener('online', () => {
    appConfig.updateForConditions();
    window.QRScannerConfig = appConfig.config;
});
window.addEventListener('offline', () => {
    appConfig.updateForConditions();
    window.QRScannerConfig = appConfig.config;
});

// Development helpers
if (appConfig.environment.isDevelopment) {
    // Make config available for debugging
    window.debugConfig = () => appConfig.logConfig();
    window.overrideConfig = (path, value) => {
        appConfig.override(path, value);
        window.QRScannerConfig = appConfig.config;
    };
    
    console.log('🛠️ Development mode: Use debugConfig() and overrideConfig(path, value) for debugging');
}

// Freeze global configuration to prevent accidental modification
Object.freeze(window.QRScannerConfig);

console.log('✅ WORLDCLASS Adaptive Configuration System loaded');
console.log(`📱 Device: ${appConfig.device.platform} (${appConfig.performance.tier} performance)`);
console.log(`🌐 Network: ${appConfig.network.type} (${appConfig.network.quality})`);

// Export for ES6 modules
export { appConfig, AppConfig };