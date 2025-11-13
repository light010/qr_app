# QR Scanner - Implementation Guide

## 1. Project Structure

### 1.1 Directory Layout

```
scanner/
├── public/
│   ├── index.html                  # Main HTML entry point
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   ├── offline.html                # Offline fallback page
│   │
│   ├── css/
│   │   ├── styles.css              # Main stylesheet
│   │   ├── themes/
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── components/
│   │       ├── camera.css
│   │       ├── progress.css
│   │       └── preview.css
│   │
│   ├── js/
│   │   ├── app.js                  # Application entry point
│   │   │
│   │   ├── core/
│   │   │   ├── qr-scanner-engine.js
│   │   │   ├── chunk-assembly-manager.js
│   │   │   ├── protocol-parser.js
│   │   │   ├── file-reconstructor.js
│   │   │   └── state-machine.js
│   │   │
│   │   ├── services/
│   │   │   ├── camera-service.js
│   │   │   ├── storage-service.js
│   │   │   ├── crypto-service.js
│   │   │   ├── compression-service.js
│   │   │   ├── preview-service.js
│   │   │   ├── download-service.js
│   │   │   └── metrics-service.js
│   │   │
│   │   ├── ui/
│   │   │   ├── camera-view.js
│   │   │   ├── progress-view.js
│   │   │   ├── preview-view.js
│   │   │   ├── control-panel.js
│   │   │   └── notification-manager.js
│   │   │
│   │   ├── protocols/
│   │   │   ├── protocol-v1.js
│   │   │   ├── protocol-v2.js
│   │   │   └── protocol-v3.js
│   │   │
│   │   ├── config/
│   │   │   ├── app-config.js      # Centralized configuration
│   │   │   └── platform-detector.js
│   │   │
│   │   └── utils/
│   │       ├── event-bus.js
│   │       ├── logger.js
│   │       ├── helpers.js
│   │       └── validators.js
│   │
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── favicon.svg
│   │
│   └── fonts/
│       └── (optional custom fonts)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── docs/
│   ├── API.md
│   ├── USER_GUIDE.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js                  # Development server config
├── playwright.config.js            # E2E test config
└── README.md
```

### ⚠️ AIR-GAP DEPLOYMENT NOTE

**For Military/Classified Environments:**

**CRITICAL CHANGES REQUIRED:**
- ❌ **NO CDN**: The `qr-scanner` library MUST be bundled locally in `public/lib/` directory
- ❌ **NO Web Hosting**: Deploy as single HTML file via USB/CD, not to web servers
- ❌ **NO Service Worker Network Fallback**: Service worker must be offline-only

**Required modifications:**
```bash
# 1. Download qr-scanner library locally (do ONCE on connected machine)
mkdir -p public/lib/
curl -o public/lib/qr-scanner.umd.min.js \
  https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js

# 2. Update all script tags in HTML files
# Replace: <script src="https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/...">
# With:    <script src="./lib/qr-scanner.umd.min.js">

# 3. For maximum portability, create single-file version
# Inline ALL CSS, JavaScript, and libraries into one HTML file

# 4. Verification (MUST return nothing)
grep -i "http://" public/*.html
grep -i "cdn\." public/*.html
```

**Air-gap compatible implementation:**
- ✅ All core implementations (Section 2) - fully client-side
- ✅ Storage Service (Section 2.2) - uses IndexedDB (local)
- ✅ UI Components (Section 2.4) - no network dependencies
- ✅ Configuration System (Section 3) - adaptive, no external calls

**Deployment:** See `../ENTERPRISE_GUIDE.md` → AIR-GAP DEPLOYMENT for complete procedures.

---

## 2. Core Implementation

### 2.1 Application Entry Point

```javascript
// public/js/app.js
/**
 * Application Entry Point
 *
 * Initializes the QR Scanner application with dependency injection
 */

import { AppConfig } from './config/app-config.js';
import { EventBus } from './utils/event-bus.js';
import { Logger } from './utils/logger.js';
import { CameraService } from './services/camera-service.js';
import { StorageService } from './services/storage-service.js';
import { QRScannerEngine } from './core/qr-scanner-engine.js';
import { ChunkAssemblyManager } from './core/chunk-assembly-manager.js';
import { ProtocolParser } from './core/protocol-parser.js';
import { FileReconstructor } from './core/file-reconstructor.js';
import { CameraView } from './ui/camera-view.js';
import { ProgressView } from './ui/progress-view.js';
import { ControlPanel } from './ui/control-panel.js';

class QRScannerApp {
    constructor() {
        this.config = new AppConfig();
        this.eventBus = new EventBus();
        this.logger = new Logger(this.config.get('logging'));

        this.services = {};
        this.ui = {};
        this.core = {};
        this.state = 'IDLE';
    }

    /**
     * Initialize application
     */
    async initialize() {
        try {
            this.logger.info('Initializing QR Scanner Application...');

            // Step 1: Initialize services
            await this.initializeServices();

            // Step 2: Initialize core components
            await this.initializeCore();

            // Step 3: Initialize UI components
            await this.initializeUI();

            // Step 4: Setup event handlers
            this.setupEventHandlers();

            // Step 5: Register service worker
            await this.registerServiceWorker();

            this.logger.info('Application initialized successfully');

        } catch (error) {
            this.logger.error('Application initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize services
     */
    async initializeServices() {
        this.logger.debug('Initializing services...');

        this.services.camera = new CameraService(
            this.config.get('camera'),
            this.eventBus
        );

        this.services.storage = new StorageService(
            this.config.get('storage'),
            this.eventBus
        );

        await this.services.storage.initialize();

        this.logger.debug('Services initialized');
    }

    /**
     * Initialize core components
     */
    async initializeCore() {
        this.logger.debug('Initializing core components...');

        this.core.parser = new ProtocolParser();

        this.core.assemblyManager = new ChunkAssemblyManager(
            this.services.storage,
            this.config.get('assembly')
        );

        this.core.fileReconstructor = new FileReconstructor(
            this.config.get('reconstruction')
        );

        this.logger.debug('Core components initialized');
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        this.logger.debug('Initializing UI components...');

        this.ui.cameraView = new CameraView(
            document.getElementById('camera-view'),
            this.eventBus
        );

        this.ui.progressView = new ProgressView(
            document.getElementById('progress-view'),
            this.eventBus
        );

        this.ui.controlPanel = new ControlPanel(
            document.getElementById('control-panel'),
            this.eventBus
        );

        this.logger.debug('UI components initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Camera events
        this.eventBus.on('camera:ready', this.onCameraReady.bind(this));
        this.eventBus.on('camera:error', this.onCameraError.bind(this));

        // Scan events
        this.eventBus.on('scan:result', this.onScanResult.bind(this));

        // Assembly events
        this.eventBus.on('chunk:received', this.onChunkReceived.bind(this));
        this.eventBus.on('transfer:complete', this.onTransferComplete.bind(this));

        // UI events
        this.eventBus.on('ui:start-scan', this.startScanning.bind(this));
        this.eventBus.on('ui:stop-scan', this.stopScanning.bind(this));
        this.eventBus.on('ui:reset', this.reset.bind(this));
    }

    /**
     * Start scanning
     */
    async startScanning() {
        try {
            this.state = 'INITIALIZING';

            // Request camera access
            const stream = await this.services.camera.requestCamera();

            // Attach to video element
            const videoElement = this.ui.cameraView.getVideoElement();
            videoElement.srcObject = stream;

            // Initialize QR scanner
            this.core.scanner = new QRScannerEngine(
                videoElement,
                this.config.get('scanner'),
                this.eventBus
            );

            await this.core.scanner.start();

            this.state = 'SCANNING';
            this.logger.info('Scanning started');

        } catch (error) {
            this.state = 'ERROR';
            this.logger.error('Failed to start scanning:', error);
            this.eventBus.emit('error', { message: error.message });
        }
    }

    /**
     * Stop scanning
     */
    stopScanning() {
        if (this.core.scanner) {
            this.core.scanner.stop();
        }

        if (this.services.camera) {
            this.services.camera.stopCamera();
        }

        this.state = 'IDLE';
        this.logger.info('Scanning stopped');
    }

    /**
     * Handle scan result
     */
    async onScanResult(event) {
        try {
            const { data } = event;

            // Parse protocol data
            const parsed = await this.core.parser.parse(data);

            // Initialize session if first chunk
            if (parsed.index === 0) {
                await this.core.assemblyManager.initializeSession(
                    parsed.sessionId,
                    parsed.total,
                    parsed.metadata
                );
            }

            // Add chunk to assembly
            await this.core.assemblyManager.addChunk({
                index: parsed.index,
                data: parsed.data,
                hash: parsed.hash
            });

        } catch (error) {
            this.logger.error('Failed to process scan result:', error);
            this.eventBus.emit('error', { message: error.message });
        }
    }

    /**
     * Handle chunk received
     */
    onChunkReceived(event) {
        const { index, total, received, progress } = event;

        this.logger.debug(`Chunk ${index + 1}/${total} received (${(progress * 100).toFixed(1)}%)`);

        // Update UI
        this.ui.progressView.updateProgress(progress, received, total);
    }

    /**
     * Handle transfer complete
     */
    async onTransferComplete() {
        try {
            this.state = 'ASSEMBLING';

            this.logger.info('Transfer complete, assembling file...');

            // Assemble file
            const { data, metadata } = await this.core.assemblyManager.assembleFile();

            // Reconstruct file (decompress, decrypt)
            const reconstructed = await this.core.fileReconstructor.reconstruct(
                data,
                metadata
            );

            // Download file
            this.downloadFile(reconstructed.data, metadata.filename);

            this.state = 'COMPLETE';
            this.logger.info('File download initiated');

            // Cleanup
            await this.core.assemblyManager.cleanup();

        } catch (error) {
            this.state = 'ERROR';
            this.logger.error('Failed to complete transfer:', error);
            this.eventBus.emit('error', { message: error.message });
        }
    }

    /**
     * Download file
     */
    downloadFile(data, filename) {
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Reset application
     */
    async reset() {
        this.stopScanning();

        if (this.core.assemblyManager) {
            await this.core.assemblyManager.cleanup();
        }

        this.ui.progressView.reset();
        this.state = 'IDLE';

        this.logger.info('Application reset');
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.logger.info('Service worker registered:', registration);
            } catch (error) {
                this.logger.warn('Service worker registration failed:', error);
            }
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        const app = new QRScannerApp();
        await app.initialize();
        window.app = app; // For debugging
    });
} else {
    (async () => {
        const app = new QRScannerApp();
        await app.initialize();
        window.app = app;
    })();
}
```

### 2.2 Storage Service (IndexedDB)

```javascript
// public/js/services/storage-service.js
/**
 * Storage Service
 *
 * Manages IndexedDB for persistent chunk storage
 */

export class StorageService {
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;
        this.db = null;
        this.dbName = config.dbName || 'QRScannerStorage';
        this.version = config.version || 1;
    }

    /**
     * Initialize IndexedDB
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', {
                        keyPath: ['sessionId', 'index']
                    });
                    chunkStore.createIndex('sessionId', 'sessionId', { unique: false });
                }

                if (!db.objectStoreNames.contains('sessions')) {
                    db.createObjectStore('sessions', { keyPath: 'sessionId' });
                }
            };
        });
    }

    /**
     * Create new session
     */
    async createSession(sessionId, metadata) {
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');

        const session = {
            sessionId,
            metadata,
            createdAt: Date.now(),
            totalChunks: metadata.totalChunks || 0,
            receivedChunks: 0
        };

        await this.promisifyRequest(store.put(session));
    }

    /**
     * Save chunk
     */
    async saveChunk(sessionId, index, data) {
        const transaction = this.db.transaction(['chunks'], 'readwrite');
        const store = transaction.objectStore('chunks');

        const chunk = {
            sessionId,
            index,
            data,
            timestamp: Date.now()
        };

        await this.promisifyRequest(store.put(chunk));

        // Update session received count
        await this.incrementReceivedCount(sessionId);
    }

    /**
     * Get chunk
     */
    async getChunk(sessionId, index) {
        const transaction = this.db.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');

        const request = store.get([sessionId, index]);
        const result = await this.promisifyRequest(request);

        return result ? result.data : null;
    }

    /**
     * Get all chunks for session
     */
    async getAllChunks(sessionId) {
        const transaction = this.db.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');
        const index = store.index('sessionId');

        const request = index.getAll(sessionId);
        const chunks = await this.promisifyRequest(request);

        return chunks.sort((a, b) => a.index - b.index);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        // Delete all chunks
        const chunkTransaction = this.db.transaction(['chunks'], 'readwrite');
        const chunkStore = chunkTransaction.objectStore('chunks');
        const chunkIndex = chunkStore.index('sessionId');

        const chunks = await this.promisifyRequest(chunkIndex.getAll(sessionId));

        for (const chunk of chunks) {
            await this.promisifyRequest(
                chunkStore.delete([sessionId, chunk.index])
            );
        }

        // Delete session
        const sessionTransaction = this.db.transaction(['sessions'], 'readwrite');
        const sessionStore = sessionTransaction.objectStore('sessions');

        await this.promisifyRequest(sessionStore.delete(sessionId));
    }

    /**
     * Increment received chunk count
     */
    async incrementReceivedCount(sessionId) {
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');

        const session = await this.promisifyRequest(store.get(sessionId));
        if (session) {
            session.receivedChunks++;
            await this.promisifyRequest(store.put(session));
        }
    }

    /**
     * Promisify IndexedDB request
     */
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Close database
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
```

### 2.3 File Reconstructor

```javascript
// public/js/core/file-reconstructor.js
/**
 * File Reconstructor
 *
 * Handles decompression and decryption of assembled file data
 */

import { CryptoService } from '../services/crypto-service.js';
import { CompressionService } from '../services/compression-service.js';

export class FileReconstructor {
    constructor(config) {
        this.config = config;
        this.cryptoService = new CryptoService();
        this.compressionService = new CompressionService();
    }

    /**
     * Reconstruct file from assembled data
     *
     * Steps:
     * 1. Decrypt (if encrypted)
     * 2. Decompress (if compressed)
     * 3. Validate integrity
     */
    async reconstruct(data, metadata) {
        let processedData = data;

        try {
            // Step 1: Decrypt if encrypted
            if (metadata.encryption && metadata.encryption !== 'none') {
                processedData = await this.decrypt(processedData, metadata);
            }

            // Step 2: Decompress if compressed
            if (metadata.compression && metadata.compression !== 'none') {
                processedData = await this.decompress(processedData, metadata);
            }

            // Step 3: Validate final hash (if available)
            if (metadata.originalHash) {
                await this.validateHash(processedData, metadata.originalHash);
            }

            return {
                data: processedData,
                metadata: {
                    filename: metadata.filename,
                    size: processedData.byteLength,
                    mimeType: metadata.mimeType || 'application/octet-stream'
                }
            };

        } catch (error) {
            throw new Error(`File reconstruction failed: ${error.message}`);
        }
    }

    /**
     * Decrypt data
     */
    async decrypt(data, metadata) {
        const password = await this.promptForPassword();

        const decrypted = await this.cryptoService.decrypt(
            data,
            metadata.encryptionMeta.nonce,
            metadata.encryptionMeta.salt,
            password
        );

        return decrypted;
    }

    /**
     * Decompress data
     */
    async decompress(data, metadata) {
        const algorithm = metadata.compression;

        const decompressed = await this.compressionService.decompress(
            data,
            algorithm
        );

        return decompressed;
    }

    /**
     * Validate hash
     */
    async validateHash(data, expectedHash) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        if (computedHash !== expectedHash) {
            throw new Error('Hash validation failed');
        }
    }

    /**
     * Prompt for password (for encrypted files)
     */
    async promptForPassword() {
        return new Promise((resolve) => {
            // Create password dialog
            const password = prompt('Enter decryption password:');
            resolve(password);
        });
    }
}
```

### 2.4 UI Components

#### 2.4.1 Camera View Component

```javascript
// public/js/ui/camera-view.js
/**
 * Camera View Component
 *
 * Manages camera display and scan overlay
 */

export class CameraView {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.videoElement = null;
        this.scanOverlay = null;

        this.render();
    }

    /**
     * Render component
     */
    render() {
        this.container.innerHTML = `
            <div class="camera-container">
                <video
                    id="video"
                    autoplay
                    muted
                    playsinline
                    class="camera-video"
                ></video>

                <div class="scan-overlay">
                    <div class="scan-frame">
                        <div class="scan-corner tl"></div>
                        <div class="scan-corner tr"></div>
                        <div class="scan-corner bl"></div>
                        <div class="scan-corner br"></div>
                        <div class="scan-line"></div>
                    </div>
                    <p class="scan-instruction">
                        Position QR code within the frame
                    </p>
                </div>
            </div>
        `;

        this.videoElement = this.container.querySelector('#video');
        this.scanOverlay = this.container.querySelector('.scan-overlay');
    }

    /**
     * Get video element
     */
    getVideoElement() {
        return this.videoElement;
    }

    /**
     * Show scan overlay
     */
    showOverlay() {
        this.scanOverlay.classList.add('active');
    }

    /**
     * Hide scan overlay
     */
    hideOverlay() {
        this.scanOverlay.classList.remove('active');
    }

    /**
     * Highlight successful scan
     */
    highlightScan() {
        this.scanOverlay.classList.add('scan-success');

        setTimeout(() => {
            this.scanOverlay.classList.remove('scan-success');
        }, 300);
    }
}
```

#### 2.4.2 Progress View Component

```javascript
// public/js/ui/progress-view.js
/**
 * Progress View Component
 *
 * Displays transfer progress
 */

export class ProgressView {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.progressBar = null;
        this.progressText = null;
        this.detailText = null;

        this.render();
    }

    /**
     * Render component
     */
    render() {
        this.container.innerHTML = `
            <div class="progress-container">
                <div class="progress-header">
                    <h3>File Transfer</h3>
                    <span class="progress-percentage">0%</span>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>

                <div class="progress-detail">
                    <span class="chunks-received">0</span> /
                    <span class="chunks-total">0</span> chunks
                </div>

                <div class="progress-stats">
                    <div class="stat">
                        <span class="stat-label">Speed:</span>
                        <span class="stat-value" id="transfer-speed">0 KB/s</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Time:</span>
                        <span class="stat-value" id="transfer-time">00:00</span>
                    </div>
                </div>
            </div>
        `;

        this.progressBar = this.container.querySelector('.progress-fill');
        this.progressPercentage = this.container.querySelector('.progress-percentage');
        this.chunksReceived = this.container.querySelector('.chunks-received');
        this.chunksTotal = this.container.querySelector('.chunks-total');
    }

    /**
     * Update progress
     */
    updateProgress(progress, received, total) {
        const percentage = (progress * 100).toFixed(1);

        this.progressBar.style.width = `${percentage}%`;
        this.progressPercentage.textContent = `${percentage}%`;
        this.chunksReceived.textContent = received;
        this.chunksTotal.textContent = total;

        // Emit progress event
        this.eventBus.emit('ui:progress-updated', {
            progress,
            received,
            total
        });
    }

    /**
     * Reset progress
     */
    reset() {
        this.updateProgress(0, 0, 0);
    }

    /**
     * Show completion
     */
    showComplete() {
        this.container.classList.add('complete');

        setTimeout(() => {
            this.container.classList.remove('complete');
        }, 2000);
    }
}
```

---

## 3. Configuration System

### 3.1 Centralized Configuration

```javascript
// public/js/config/app-config.js
/**
 * Application Configuration
 *
 * Centralized, adaptive configuration system
 */

export class AppConfig {
    constructor() {
        this.platform = this.detectPlatform();
        this.performance = this.detectPerformance();
        this.config = this.buildConfig();
    }

    /**
     * Detect platform
     */
    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();

        return {
            isIOS: /iphone|ipad|ipod/.test(ua),
            isAndroid: /android/.test(ua),
            isMobile: /mobile/.test(ua),
            isDesktop: !/mobile|tablet/.test(ua),
            browser: this.detectBrowser()
        };
    }

    /**
     * Detect browser
     */
    detectBrowser() {
        const ua = navigator.userAgent;

        if (/chrome/i.test(ua)) return 'chrome';
        if (/safari/i.test(ua)) return 'safari';
        if (/firefox/i.test(ua)) return 'firefox';
        if (/edge/i.test(ua)) return 'edge';

        return 'unknown';
    }

    /**
     * Detect performance tier
     */
    detectPerformance() {
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;

        let tier = 'medium';
        if (memory >= 8 && cores >= 8) tier = 'high';
        else if (memory < 4 || cores < 4) tier = 'low';

        return {
            tier,
            memory,
            cores,
            maxScansPerSecond: tier === 'high' ? 30 : tier === 'medium' ? 15 : 5
        };
    }

    /**
     * Build configuration
     */
    buildConfig() {
        return {
            camera: {
                facingMode: this.platform.isMobile ? 'environment' : 'user',
                width: { ideal: 1920, max: 2560 },
                height: { ideal: 1080, max: 1440 },
                frameRate: { ideal: 30, max: 60 }
            },

            scanner: {
                maxScansPerSecond: this.performance.maxScansPerSecond,
                dedupTimeout: 1000,
                highlightScan: false
            },

            storage: {
                dbName: 'QRScannerStorage',
                version: 1,
                memoryThreshold: this.performance.memory >= 8
                    ? 100 * 1024 * 1024
                    : 50 * 1024 * 1024
            },

            assembly: {
                maxMemoryUsage: this.performance.memory * 1024 * 1024 * 0.5
            },

            ui: {
                theme: 'light',
                animations: this.performance.tier !== 'low'
            },

            logging: {
                level: 'INFO',
                console: true
            }
        };
    }

    /**
     * Get configuration value
     */
    get(path) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }
}
```

---

## 4. HTML Structure

### 4.1 Main HTML File

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>QR Scanner - Enterprise Edition</title>

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#007AFF">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

    <!-- Manifest -->
    <link rel="manifest" href="/manifest.json">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
    <link rel="apple-touch-icon" href="/icons/icon-192.png">

    <!-- Styles -->
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- App Container -->
    <div id="app">
        <!-- Header -->
        <header class="app-header">
            <h1>QR Scanner</h1>
            <button id="settings-btn" class="icon-btn">⚙️</button>
        </header>

        <!-- Camera View -->
        <div id="camera-view" class="camera-view"></div>

        <!-- Progress View -->
        <div id="progress-view" class="progress-view" style="display: none;"></div>

        <!-- Control Panel -->
        <div id="control-panel" class="control-panel">
            <button id="start-btn" class="btn btn-primary">Start Scanning</button>
            <button id="stop-btn" class="btn btn-secondary" style="display: none;">Stop</button>
            <button id="reset-btn" class="btn btn-danger" style="display: none;">Reset</button>
        </div>

        <!-- Notifications -->
        <div id="notifications" class="notifications"></div>
    </div>

    <!-- Scripts (ES Modules) -->
    <script type="module" src="/js/app.js"></script>
</body>
</html>
```

---

## 5. Testing Implementation

### 5.1 Unit Test Example (Vitest)

```javascript
// tests/unit/chunk-assembly-manager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkAssemblyManager } from '../../public/js/core/chunk-assembly-manager.js';

describe('ChunkAssemblyManager', () => {
    let manager;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            createSession: vi.fn(),
            saveChunk: vi.fn(),
            getChunk: vi.fn()
        };

        manager = new ChunkAssemblyManager(mockStorage, {
            memoryThreshold: 1024 * 1024
        });
    });

    it('should initialize session correctly', async () => {
        await manager.initializeSession('session-1', 10, {
            filename: 'test.txt',
            size: 1000
        });

        expect(manager.sessionId).toBe('session-1');
        expect(manager.totalChunks).toBe(10);
        expect(manager.receivedCount).toBe(0);
    });

    it('should add chunks correctly', async () => {
        await manager.initializeSession('session-1', 5, {
            filename: 'test.txt',
            size: 100
        });

        const chunkData = {
            index: 0,
            data: new Uint8Array([1, 2, 3]),
            hash: await manager.computeHash(new Uint8Array([1, 2, 3]))
        };

        const result = await manager.addChunk(chunkData);

        expect(result.duplicate).toBe(false);
        expect(manager.receivedCount).toBe(1);
    });

    it('should detect duplicates', async () => {
        await manager.initializeSession('session-1', 5, {
            filename: 'test.txt',
            size: 100
        });

        const chunkData = {
            index: 0,
            data: new Uint8Array([1, 2, 3]),
            hash: await manager.computeHash(new Uint8Array([1, 2, 3]))
        };

        await manager.addChunk(chunkData);
        const result = await manager.addChunk(chunkData);

        expect(result.duplicate).toBe(true);
    });

    it('should calculate progress correctly', async () => {
        await manager.initializeSession('session-1', 10, {
            filename: 'test.txt',
            size: 1000
        });

        expect(manager.getProgress()).toBe(0);

        // Add 5 chunks
        for (let i = 0; i < 5; i++) {
            await manager.addChunk({
                index: i,
                data: new Uint8Array([i]),
                hash: await manager.computeHash(new Uint8Array([i]))
            });
        }

        expect(manager.getProgress()).toBe(0.5);
    });
});
```

---

## 6. Deployment

### 6.1 Development Server (Vite)

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'public',
    server: {
        port: 3000,
        https: true, // Required for camera access
        open: true
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true
    }
});
```

### 6.2 Production Build

```json
// package.json
{
    "name": "qr-scanner-enterprise",
    "version": "3.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "test": "vitest",
        "test:e2e": "playwright test"
    },
    "dependencies": {
        "qr-scanner": "^1.4.2"
    },
    "devDependencies": {
        "vite": "^5.0.0",
        "vitest": "^1.0.0",
        "@playwright/test": "^1.40.0",
        "eslint": "^8.55.0",
        "prettier": "^3.1.0"
    }
}
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-13
**Status**: Ready for Implementation
