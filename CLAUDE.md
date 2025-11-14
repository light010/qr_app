# CLAUDE.md - QR File Transfer System

> Comprehensive guide for AI assistants working on the QR File Transfer codebase

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture & Design Patterns](#architecture--design-patterns)
- [Repository Structure](#repository-structure)
- [Key Components](#key-components)
- [Development Workflow](#development-workflow)
- [Code Conventions](#code-conventions)
- [Common Operations](#common-operations)
- [Testing & Debugging](#testing--debugging)
- [Known Issues & Solutions](#known-issues--solutions)
- [Git Workflow](#git-workflow)
- [Important Notes for AI Assistants](#important-notes-for-ai-assistants)

---

## Project Overview

### Purpose
QR File Transfer is a secure, air-gapped file transfer system that uses QR codes to transmit files between devices without network connectivity. The system consists of:
- **Python Sender** (`qr_sender_final.py`): Encodes files into QR codes and displays them
- **JavaScript Receiver** (`qr_receiver/`): Web-based PWA that scans QR codes and reconstructs files

### Key Features
- **Air-gapped security**: No network required, forensic-resistant
- **Cross-platform**: Works on iOS, Android, Windows, macOS, Linux
- **Large file support**: Can handle 4MB+ files through chunking
- **Progressive Web App**: Installable, works offline
- **Protocol support**: Multiple formats (qrfile/v1, v2, simple)
- **World-class architecture**: Dependency injection, modular design

### Technology Stack
- **Backend/Sender**: Python 3, segno (QR generation), tkinter (GUI)
- **Frontend/Receiver**: Pure JavaScript (ES6), HTML5, CSS3
- **QR Library**: qr-scanner (Nimiq-based, v1.4.2)
- **Storage**: IndexedDB for chunk persistence
- **Architecture**: Service Container pattern with dependency injection

---

## Architecture & Design Patterns

### Design Philosophy
The codebase follows **"ROOT CAUSE SOLUTION"** principles - identifying and fixing fundamental architectural issues rather than symptomatic problems.

### Core Patterns

#### 1. Dependency Injection (Primary Pattern)
```javascript
// ServiceContainer manages all dependencies
class ServiceContainer {
    register(name, factory, singleton, dependencies)
    get(name) // Returns service instance with auto-injection
}
```

**Why**: Eliminates tight coupling between modules. Main app went from 11 direct dependencies to container-managed dependencies.

**Usage**: All services are registered in `service-bootstrap.js` and injected via the container.

#### 2. Service-Oriented Architecture
Each major feature is a separate service:
- `CameraManager`: Camera access and controls
- `ChunkManager`: Chunk processing and assembly
- `UIManager`: DOM manipulation and UI updates
- `AudioManager`: Sound feedback
- `StorageManager`: IndexedDB persistence
- `ThemeManager`: Theme switching
- `ErrorManager`: Error handling
- `RetryManager`: Automatic retry logic

#### 3. Configuration-Driven Development
```javascript
// All configuration centralized in app-config.js
class AppConfig {
    detectDevice()      // Platform detection
    detectPerformance() // Device capabilities
    detectNetwork()     // Network conditions
    get performanceConfig() // Adaptive settings
}
```

**Why**: Eliminates 40+ hardcoded values scattered across files. Configuration adapts to device capabilities, network conditions, and platform differences.

#### 4. Interface Contracts
```javascript
// interfaces.js defines contracts for all services
interface IServiceContainer { register, get, has }
interface ICameraManager { start, stop, switchCamera }
interface IChunkManager { addChunk, assembleFile }
```

**Why**: Provides type safety and documentation without TypeScript overhead.

### Module Loading Strategy

**CRITICAL**: Modules load in a specific order defined in `qr-scanner.html`:

```html
<!-- 1. Configuration (must be first) -->
<script src="config/app-config.js"></script>

<!-- 2. External dependencies -->
<script src="https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js"></script>

<!-- 3. Interface contracts (defines all service contracts) -->
<script src="js/interfaces.js"></script>

<!-- 4. Core services (in dependency order) -->
<script src="js/error-boundaries.js"></script>
<script src="js/error-boundary-manager.js"></script>
<script src="js/error-manager.js"></script>
<!-- ... etc -->

<!-- 5. Main application (last) -->
<script src="js/app-main.js"></script>
```

**DO NOT** change this order without understanding dependencies.

---

## Repository Structure

```
qr_app/
├── CLAUDE.md                      # This file
├── README.md                      # Root project README
├── qr_sender_final.py             # Python QR sender application
├── qr_receiver_final.html         # Legacy receiver (deprecated)
├── qr_receiver_finalv2.html       # Legacy receiver v2 (deprecated)
│
└── qr_receiver/                   # Main receiver application
    ├── README.md                  # Receiver documentation
    ├── IPAD_DIRECT.md            # iPad setup guide
    ├── IPAD_SETUP.md             # iPad troubleshooting
    │
    ├── qr-scanner.html           # Main entry point (PRIMARY FILE)
    ├── world-class-qr-scanner.html # Alternative entry point
    ├── offline.html              # PWA offline fallback
    ├── manifest.json             # PWA manifest
    ├── sw.js                     # Service worker
    │
    ├── config/
    │   └── app-config.js         # ⭐ Centralized configuration system
    │
    ├── js/                       # Modular JavaScript (30+ files)
    │   ├── app-main.js           # Application entry point
    │   ├── service-container.js  # Dependency injection container
    │   ├── service-bootstrap.js  # Service initialization
    │   ├── interfaces.js         # TypeScript-like interfaces
    │   │
    │   ├── qr-scanner-engine.js  # QR scanning logic
    │   ├── chunk-manager.js      # Chunk processing
    │   ├── data-processor.js     # Compression/encryption
    │   ├── camera-manager.js     # Camera access
    │   ├── camera-ui.js          # Camera UI controls
    │   ├── ui-manager.js         # DOM manipulation
    │   ├── audio-manager.js      # Sound feedback
    │   ├── storage-manager.js    # IndexedDB operations
    │   ├── theme-manager.js      # Theme switching
    │   ├── error-manager.js      # Error handling
    │   ├── retry-manager.js      # Retry logic
    │   ├── protocol-bridge.js    # Protocol parsing
    │   │
    │   └── preview-handlers/     # File preview system
    │       ├── preview-factory.js
    │       ├── base-preview-handler.js
    │       ├── text-preview-handler.js
    │       ├── image-preview-handler.js
    │       ├── audio-preview-handler.js
    │       ├── video-preview-handler.js
    │       ├── code-preview-handler.js
    │       ├── document-preview-handler.js
    │       └── archive-preview-handler.js
    │
    ├── css/
    │   └── styles.css            # Apple-inspired design system
    │
    ├── docs/
    │   └── format-comparison.md  # Protocol documentation
    │
    ├── receiver/                 # Python backend (legacy, still present)
    │   ├── chunk_assembler.py
    │   ├── data_parser.py
    │   └── qr_receiver_engine.py
    │
    ├── utils/                    # Python utilities (legacy)
    │   └── secure_memory.py
    │
    └── archive/                  # Archived/deprecated files
        ├── ARCHIVE_SUMMARY.md    # Archive documentation
        └── [legacy implementations]
```

### Key File Descriptions

| File | Purpose | When to Modify |
|------|---------|----------------|
| `qr-scanner.html` | Main entry point, loads all modules | Adding new services |
| `config/app-config.js` | All configuration | Changing thresholds, settings |
| `js/service-bootstrap.js` | Service registration | Adding new services |
| `js/app-main.js` | Application lifecycle | Initialization logic |
| `js/chunk-manager.js` | Chunk processing | Protocol changes |
| `js/camera-manager.js` | Camera handling | Camera features |
| `css/styles.css` | UI styling | Design changes |
| `qr_sender_final.py` | QR code sender | Sender features |

---

## Key Components

### 1. Configuration System (`config/app-config.js`)

**Purpose**: Single source of truth for all application settings

**Features**:
- Device detection (iOS, Android, desktop)
- Performance tier calculation (high/medium/low)
- Network quality assessment
- Adaptive configuration based on capabilities

**Usage**:
```javascript
// Access configuration
const config = window.AppConfig;
const memoryThreshold = config.get('storage.memoryThreshold');

// Override at runtime
config.override('scanner.maxScansPerSecond', 20);
```

**When to modify**: Changing thresholds, timeouts, or adding new configurable features.

### 2. Service Container (`js/service-container.js`)

**Purpose**: Manages service dependencies and lifecycle

**Key Methods**:
```javascript
container.register(name, factory, singleton, dependencies)
container.get(name)
container.has(name)
container.clear(name)
```

**Features**:
- Circular dependency detection
- Lazy initialization
- Singleton management
- Event-based lifecycle hooks

### 3. QR Scanner Engine (`js/qr-scanner-engine.js`)

**Purpose**: QR code detection and protocol parsing

**Dependencies**:
- `qr-scanner` library (CDN: jsdelivr.net)
- Worker file for background processing

**Supported Protocols**:
- `qrfile/v1`: Simple JSON format
- `qrfile/v2`: Extended format with compression
- Simple base64: Legacy format

**Important**: Uses Nimiq's `qr-scanner` v1.4.2, NOT `@nimiq/qr-scanner` or `html5-qrcode`.

### 4. Chunk Manager (`js/chunk-manager.js`)

**Purpose**: Assembles file chunks from QR codes

**Features**:
- Memory-aware chunk storage
- IndexedDB persistence for large files
- Progress tracking
- Missing chunk detection
- Hash verification (SHA-256)

**Thresholds** (from `app-config.js`):
- Memory threshold: 25MB-100MB (device-dependent)
- Max chunks display: 50-200 (performance-dependent)

### 5. Camera Manager (`js/camera-manager.js`)

**Purpose**: Camera access and control

**Features**:
- Platform-specific constraints (iOS/Android/desktop)
- Auto camera switching on error
- Flash/torch control
- Zoom support
- Focus modes

**iOS Quirks**:
- Requires `playsinline` attribute
- Prefers rear camera (`environment`)
- Status bar handling with safe area insets

### 6. Storage Manager (`js/storage-manager.js`)

**Purpose**: IndexedDB operations for chunk persistence

**Schema**:
- `chunks` store: Individual chunk data
- `files` store: File metadata
- `metadata` store: Transfer session info

**Usage**: Automatically switches between memory and IndexedDB based on `memoryThreshold`.

---

## Development Workflow

### Setting Up Development Environment

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd qr_app
   ```

2. **No Build Step Required**: Pure HTML/CSS/JS - no compilation needed

3. **Local Server** (optional but recommended):
   ```bash
   # Python
   python -m http.server 8000

   # Navigate to: http://localhost:8000/qr_receiver/qr-scanner.html
   ```

4. **HTTPS Required** for camera access (except localhost):
   ```bash
   # Use ngrok, localtunnel, or similar
   npx localtunnel --port 8000
   ```

### Development Mode

**Enable**: Visit file from `localhost` or `127.0.0.1` (auto-detected in `app-config.js`)

**Features enabled**:
- Verbose console logging
- Performance monitoring
- Device info display
- QR code outline highlighting
- Error stack traces

**Debug helpers** (available in console):
```javascript
window.debugConfig()              // Show current configuration
window.overrideConfig(path, val)  // Override configuration
window.AppConfig.logConfig()      // Log full config
```

### Testing Changes

1. **Browser DevTools**: Open Console, Network, and Application tabs
2. **Mobile Testing**: Use Chrome DevTools Remote Debugging
3. **iOS Testing**: Use Safari Web Inspector
4. **Sender Testing**: Run `python qr_sender_final.py <file>` to test transfers

---

## Code Conventions

### JavaScript Style

**ES6+ Features**: Use modern JavaScript (classes, arrow functions, async/await, destructuring)

**NO Transpilation**: Code runs directly in browser, ensure ES6+ browser support

**Class Structure**:
```javascript
/**
 * @fileoverview Brief file description
 *
 * ROOT CAUSE SOLUTION: Explain what architectural problem this solves
 */

/**
 * Class description
 * @class ClassName
 * @implements {IInterfaceName}
 */
class ClassName {
    constructor(dependencies) {
        // Dependency injection pattern
        this.dependency = dependencies.dependency;
    }

    /**
     * Method description
     * @param {Type} param - Parameter description
     * @returns {Type} Return description
     */
    methodName(param) {
        // Implementation
    }
}
```

**Naming Conventions**:
- Classes: `PascalCase` (e.g., `ChunkManager`)
- Methods: `camelCase` (e.g., `addChunk`)
- Private methods: `_camelCase` (e.g., `_validateData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_CHUNK_SIZE`)
- Files: `kebab-case.js` (e.g., `chunk-manager.js`)

### Error Handling

**Always use try-catch** in async operations:
```javascript
async methodName() {
    try {
        const result = await operation();
        return result;
    } catch (error) {
        console.error('Operation failed:', error);
        if (this.errorManager) {
            this.errorManager.handleError(error, 'ClassName.methodName');
        }
        throw error; // Re-throw or handle gracefully
    }
}
```

**Error boundaries**: Use `ErrorBoundaryManager` for critical sections.

### UI Updates

**ALWAYS use UIManager** for DOM operations (except in `ui-manager.js` itself):
```javascript
// ✅ CORRECT
this.ui.updateProgress(progress, statusText);
this.ui.showNotification('Success!', 'success');

// ❌ WRONG
document.getElementById('progress').textContent = progress;
```

**Why**: Centralized DOM access prevents race conditions and simplifies testing.

### Configuration Access

**ALWAYS use AppConfig** for settings:
```javascript
// ✅ CORRECT
const threshold = window.AppConfig.get('storage.memoryThreshold');

// ❌ WRONG
const threshold = 50 * 1024 * 1024; // Hardcoded value
```

### Performance Considerations

1. **Lazy loading**: Services initialize only when needed
2. **Memory management**: Monitor with `performanceConfig.memoryThreshold`
3. **Animations**: Adapt to `performanceConfig.animationsEnabled`
4. **Scan rates**: Respect `performanceConfig.maxScansPerSecond`

---

## Common Operations

### Adding a New Service

1. **Define interface** in `js/interfaces.js`:
   ```javascript
   /**
    * @interface IMyService
    * @description Service description
    */
   window.Interfaces = window.Interfaces || {};
   window.Interfaces.IMyService = {
       methodName: Function,
       propertyName: null
   };
   ```

2. **Create service file** `js/my-service.js`:
   ```javascript
   /**
    * @implements {IMyService}
    */
   class MyService {
       constructor(dependencies) {
           this.dependency = dependencies.dependency;
       }

       methodName() {
           // Implementation
       }
   }
   ```

3. **Register in bootstrap** (`js/service-bootstrap.js`):
   ```javascript
   registerServices() {
       // ... existing services

       this.container.register(
           'myService',
           (deps) => new MyService(deps),
           true, // singleton
           ['dependency'] // dependencies
       );
   }
   ```

4. **Add script tag** to `qr-scanner.html` (in correct order):
   ```html
   <script src="js/my-service.js"></script>
   ```

5. **Inject into consumers**:
   ```javascript
   class ConsumerService {
       constructor(container) {
           this.myService = container.get('myService');
       }
   }
   ```

### Modifying Configuration

1. **Edit** `config/app-config.js`
2. **Add getter** to `AppConfig` class:
   ```javascript
   get myNewConfig() {
       return {
           setting1: this.device.isIOS ? 'ios-value' : 'default-value',
           setting2: this.performance.tier === 'high' ? 100 : 50
       };
   }
   ```

3. **Add to main config**:
   ```javascript
   get config() {
       return {
           // ... existing
           myNewConfig: this.myNewConfig
       };
   }
   ```

4. **Access in code**:
   ```javascript
   const setting = window.AppConfig.get('myNewConfig.setting1');
   ```

### Adding Protocol Support

1. **Update** `js/protocol-bridge.js`:
   ```javascript
   parseQRData(data) {
       if (data.startsWith('myprotocol://')) {
           return this.parseMyProtocol(data);
       }
       // ... existing protocols
   }

   parseMyProtocol(data) {
       // Parse logic
       return {
           protocol: 'myprotocol/v1',
           index: ...,
           data: ...,
           total: ...
       };
   }
   ```

2. **Update** `qr_sender_final.py` to generate compatible format

3. **Test** with sender/receiver pair

### Adding File Preview Handler

1. **Create handler** in `js/preview-handlers/my-handler.js`:
   ```javascript
   class MyPreviewHandler extends BasePreviewHandler {
       canHandle(mimeType) {
           return mimeType === 'application/my-type';
       }

       async generatePreview(file, data) {
           // Generate preview HTML
           return `<div class="my-preview">...</div>`;
       }
   }
   ```

2. **Register in factory** (`js/preview-handlers/preview-factory.js`):
   ```javascript
   registerHandlers() {
       // ... existing handlers
       this.registerHandler(new MyPreviewHandler());
   }
   ```

3. **Add MIME type** to `app-config.js`:
   ```javascript
   supportedTypes: {
       // ... existing
       myTypes: ['application/my-type']
   }
   ```

---

## Testing & Debugging

### Browser Console Commands

```javascript
// Configuration
debugConfig()                          // Show all config
overrideConfig('scanner.fps', 30)     // Override setting

// Service access
const app = window.App                 // Main app instance
const container = app.bootstrap.container
const camera = container.get('cameraManager')
const chunks = container.get('chunkManager')

// Manual operations
camera.switchCamera()                  // Switch camera
camera.toggleFlash()                   // Toggle flash
chunks.reset()                        // Reset chunks
```

### Common Issues

#### Camera Not Working
1. **Check HTTPS**: Camera requires HTTPS (except localhost)
2. **Check permissions**: Browser settings → Site permissions → Camera
3. **iOS specific**: Must use Safari, requires `playsinline`
4. **Console check**:
   ```javascript
   navigator.mediaDevices.getUserMedia({video: true})
     .then(() => console.log('Camera OK'))
     .catch(err => console.error('Camera error:', err));
   ```

#### QR Scanner Not Loading
1. **Check CDN**: Network tab should show successful load of `qr-scanner.umd.min.js`
2. **Check console**: Look for "QR Scanner library loaded successfully"
3. **Fallback**: If CDN fails, add local copy to `./lib/`
4. **Important**: Package is `qr-scanner`, NOT `@nimiq/qr-scanner`

#### Chunks Not Assembling
1. **Check protocol**: Console should show "Detected protocol: qrfile/v2"
2. **Check memory**: May be hitting memory threshold (check console)
3. **Check hash**: File hash mismatch indicates corruption
4. **Debug**:
   ```javascript
   chunks.getMissingChunks()  // Shows missing chunks
   chunks.getProgress()       // Shows progress (0-1)
   ```

#### Performance Issues
1. **Check tier**: Console shows performance tier on load
2. **Reduce scan rate**: `overrideConfig('scanner.maxScansPerSecond', 5)`
3. **Disable animations**: `overrideConfig('ui.animations.enabled', false)`
4. **Check memory**: Look for memory warnings in console

### Testing Workflow

1. **Unit testing**: No formal tests yet - manual testing in browser
2. **Integration testing**: Test sender + receiver workflow
3. **Cross-platform**: Test on iOS Safari, Android Chrome, desktop browsers
4. **Large files**: Test with files > 1MB to verify chunking
5. **Error scenarios**: Test camera denial, network loss, invalid QR codes

---

## Known Issues & Solutions

### Issue: CDN Loading Failures

**Symptom**: QR scanner doesn't initialize, console shows network errors

**Root cause**: CDN (jsdelivr.net) unreachable

**Solution**:
1. Add fallback to unpkg.com (already implemented in `app-config.js`)
2. Add local copy as last resort
3. Implement retry logic with exponential backoff

**Prevention**: Always use CDN fallback chain from `app-config.js`.

### Issue: iOS Camera Orientation

**Symptom**: Camera feed rotated incorrectly on iOS

**Root cause**: iOS Safari handles orientation differently

**Solution**: CSS transform based on `screen.orientation.angle`

**Code location**: `css/styles.css` - `.camera-view video` styles

### Issue: Memory Leaks with Large Files

**Symptom**: Browser crashes or slows down with large file transfers

**Root cause**: Chunks stored in memory exceed available RAM

**Solution**:
1. Automatic IndexedDB persistence above threshold
2. Chunk cleanup after assembly
3. Memory monitoring with periodic cleanup

**Code location**: `js/chunk-manager.js` and `js/storage-manager.js`

### Issue: Rapid QR Scanning Duplicates

**Symptom**: Same chunk processed multiple times

**Root cause**: QR scanner detects same code in consecutive frames

**Solution**: Deduplication with `dedupTime` (1000ms) in scanner config

**Code location**: `config/app-config.js` - `scannerConfig.dedupTime`

### Issue: Python Dependencies

**Symptom**: Sender fails to start, missing modules

**Root cause**: Missing Python dependencies

**Solution**:
```bash
pip install segno pillow
# Required for compression: brotli
# Optional for encryption: cryptography
```

**Documentation**: `qr_receiver/README.md` - Dependencies section

---

## Git Workflow

### Branch Strategy

**Main branch**: `main` (or `master`) - stable releases

**Feature branches**: `claude/claude-md-*` pattern (auto-generated by Claude Code)

**CRITICAL**: When pushing code changes:
- ✅ ALWAYS push to branches starting with `claude/`
- ✅ ALWAYS use `git push -u origin <branch-name>`
- ❌ NEVER push directly to `main` without PR
- ❌ NEVER force push to main/master

### Commit Conventions

**Format**:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature/bug changes)
- `perf`: Performance improvements
- `test`: Adding/modifying tests
- `chore`: Build process, dependencies, etc.

**Examples**:
```
feat: Add video preview handler

Implement video preview with HTML5 video player.
Supports MP4, WebM, OGG formats up to 500MB.

Closes #42

---

fix: Correct QR scanner package name

Changed from @nimiq/qr-scanner to qr-scanner.
Root cause was incorrect npm package name.

Fixes #38
```

### Pre-Push Checklist

- [ ] Code follows conventions (check this document)
- [ ] No hardcoded values (use `app-config.js`)
- [ ] No direct DOM manipulation (use `ui-manager.js`)
- [ ] Console has no errors (check browser DevTools)
- [ ] Tested on at least one platform (desktop/mobile)
- [ ] Documentation updated if needed
- [ ] Commit message is descriptive

### Retry Logic for Push Failures

If `git push` fails due to network errors:
```bash
# Retry up to 4 times with exponential backoff
git push -u origin branch-name || sleep 2
git push -u origin branch-name || sleep 4
git push -u origin branch-name || sleep 8
git push -u origin branch-name || sleep 16
```

**Note**: This is for network errors only, not merge conflicts.

---

## Important Notes for AI Assistants

### ⚠️ CRITICAL: Generator/Scanner Compatibility (MOST IMPORTANT)

**BEFORE MAKING ANY CHANGES TO SCANNER CODE, YOU MUST UNDERSTAND:**

**THE SCANNER MUST ALWAYS BE ABLE TO SCAN AND RECONSTRUCT QR CODES GENERATED BY THE GENERATOR.**

This is the **PRIMARY CONSTRAINT** that overrides all other considerations. This is a military-grade air-gapped system where generator and scanner are on physically separate devices with NO communication. If scanner cannot decode generator output → **SYSTEM FAILS IN THE FIELD.**

#### Why This is Critical for AI Assistants

When you modify scanner code:
- You CANNOT test with real generator (you only have documentation)
- You CANNOT verify end-to-end compatibility (no real QR codes to test)
- You MUST rely on protocol specification to ensure compatibility
- Your changes deploy to production where failure = mission failure

**ONE MISTAKE = BREAKS DEPLOYED SYSTEMS WITH NO RECOVERY**

#### Mandatory Actions Before Changing Scanner Code

**1. Read generator specification:**
- `generator/IMPLEMENTATION.md` - Section 3: Protocol V3 Data Format
- `ENTERPRISE_GUIDE.md` - Section: Protocol V3 Specification

**2. Verify binary format compatibility:**
```
Generator encodes: [sid:16][idx:4][total:4][data][hash:32]
Scanner must parse: bytes 0-15=sid, 16-19=idx, 20-23=total, 24-N=data, N+1-end=hash

ANY deviation breaks compatibility!
```

**3. Check compression algorithm support:**
```
Generator ALWAYS uses: Brotli level 11 ONLY (BEST compression, native browser support)
Scanner MUST support: Brotli level 11 ONLY (native DecompressionStream API)
NEVER remove Brotli decompression support - system will break!
```

**4. Verify chunk assembly logic:**
```
Generator displays QRs sequentially (0, 1, 2, 3, ...)
Scanner MUST handle ANY scan order (45, 12, 0, 99, ...)
NEVER assume sequential scanning!
```

#### Changes That WILL Break Compatibility (DO NOT DO)

❌ **Changing binary parser byte offsets**
```javascript
// WRONG - breaks compatibility!
const idx = new DataView(bytes.buffer, 20, 4);  // Generator encodes at 16!

// CORRECT
const idx = new DataView(bytes.buffer, 16, 4);  // bytes 16-19
const total = new DataView(bytes.buffer, 20, 4); // bytes 20-23
```

❌ **Removing or modifying Brotli decompression**
```javascript
// WRONG - generator ALWAYS uses Brotli-11!
case 'brotli':
    throw new Error('Not supported');

// CORRECT - MUST support Brotli (generator ONLY uses this)
case 'brotli':
    return await this.decompressBrotli(compressedData);  // Native DecompressionStream API
```

❌ **Adding validation that rejects valid generator output**
```javascript
// WRONG - rejects valid large files!
if (totalChunks > 1000) throw new Error('Too many chunks');

// CORRECT - no arbitrary limits
if (totalChunks > 0) { /* process */ }
```

❌ **Changing metadata field names**
```javascript
// WRONG - generator uses "compression" not "comp"
const algorithm = metadata.comp;

// CORRECT - use exact field names from generator
const algorithm = metadata.compression;
```

#### Testing Requirements for Scanner Changes

**After ANY scanner modification, you MUST:**

1. **Document what changed** and why it preserves compatibility
2. **Identify affected modules**: Protocol parser? Compression? Assembly?
3. **Verify against generator spec**: Does binary format still match?
4. **Check byte offsets**: Are they still exactly as generator encodes?
5. **Confirm algorithm support**: Still supports Brotli-11? (ONLY algorithm needed, native API)

**Include in commit message:**
```
COMPATIBILITY VERIFIED:
- Binary format: [sid:16][idx:4][total:4][data][hash:32] ✓
- Compression: Brotli-11 ONLY (native browser API, generator uses exclusively) ✓
- Encryption: AES-256-GCM ONLY (hardware accelerated, if used) ✓
- Assembly: Out-of-order scanning handled ✓
- Generator spec reviewed: generator/IMPLEMENTATION.md Section 3 ✓
```

#### Red Flags (Stop and Review)

These changes require IMMEDIATE compatibility review:

🚩 Modifying `qr_receiver/js/protocol-bridge.js` (protocol parsing)
🚩 Modifying `qr_receiver/js/data-processor.js` (compression/decompression)
🚩 Modifying `qr_receiver/js/chunk-manager.js` (assembly logic)
🚩 Changing binary QR parser byte extraction
🚩 Removing Brotli-11 decompression support (BREAKS SYSTEM)
🚩 Removing AES-256-GCM decryption support (BREAKS ENCRYPTED TRANSFERS)
🚩 Changing completion detection logic
🚩 Modifying metadata field parsing

**If you make ANY of these changes → STOP. Review generator spec FIRST.**

#### Emergency Compatibility Fix Protocol

If you discover scanner CANNOT decode generator output:

1. **DO NOT make experimental fixes** - this makes it worse
2. **Read generator specification** - understand what it ACTUALLY encodes
3. **Compare scanner parser** - find exact mismatch
4. **Fix scanner to match generator** - generator is source of truth
5. **Document the bug** - explain what was wrong and how fixed
6. **Test rigorously** - verify Brotli-11 decompression, all file sizes, with/without encryption

**Generator specification is ALWAYS correct. Scanner MUST adapt to generator.**

---

### Critical Files - Read Before Modifications

Always read these files before making related changes:

1. **`config/app-config.js`**: Before changing any thresholds, timeouts, or settings
2. **`js/interfaces.js`**: Before creating/modifying services
3. **`js/service-bootstrap.js`**: Before adding services or changing initialization
4. **`qr-scanner.html`**: Before adding scripts or changing load order
5. **`css/styles.css`**: Before modifying UI/layout

### Architectural Principles

1. **ROOT CAUSE SOLUTIONS**: Always fix fundamental issues, not symptoms
2. **DEPENDENCY INJECTION**: Use ServiceContainer, avoid tight coupling
3. **CONFIGURATION-DRIVEN**: Use AppConfig, avoid hardcoded values
4. **INTERFACE CONTRACTS**: Define interfaces, implement contracts
5. **SEPARATION OF CONCERNS**: One responsibility per class/module

### Common Mistakes to Avoid

❌ **DON'T**: Create direct dependencies between services
✅ **DO**: Use ServiceContainer for all dependencies

❌ **DON'T**: Hardcode configuration values
✅ **DO**: Use AppConfig with device-adaptive settings

❌ **DON'T**: Manipulate DOM directly in service classes
✅ **DO**: Use UIManager for all DOM operations

❌ **DON'T**: Add scripts to HTML without considering load order
✅ **DO**: Follow the dependency order in `qr-scanner.html`

❌ **DON'T**: Use `@nimiq/qr-scanner` package
✅ **DO**: Use `qr-scanner` package (version 1.4.2)

❌ **DON'T**: Ignore error handling in async methods
✅ **DO**: Always wrap async operations in try-catch

❌ **DON'T**: Mix Python receiver with JavaScript receiver
✅ **DO**: Know that JavaScript receiver is current, Python is legacy

### Code Review Checklist

When suggesting code changes:

- [ ] Uses dependency injection (no `new Service()` in other services)
- [ ] Gets config from AppConfig (no hardcoded values)
- [ ] Updates DOM through UIManager (no direct getElementById)
- [ ] Implements defined interface (check `interfaces.js`)
- [ ] Handles errors properly (try-catch with errorManager)
- [ ] Adapts to device capabilities (uses performanceConfig)
- [ ] Follows naming conventions (camelCase, PascalCase)
- [ ] Includes JSDoc comments (especially public methods)
- [ ] Works cross-platform (iOS, Android, desktop)
- [ ] Maintains backward compatibility (protocol support)

### When to Use Which Tool

**Edit Tool**:
- Modifying existing functions/classes
- Fixing bugs in specific sections
- Updating configuration values

**Write Tool**:
- Creating new service files
- Adding new preview handlers
- Creating documentation files

**Bash Tool**:
- Git operations (commit, push, pull)
- Testing Python sender
- File system operations
- Running local server

**Read Tool**:
- Understanding current implementation before changes
- Checking interfaces before implementing
- Reviewing error patterns

### Testing Strategy

When making changes:

1. **Read related files first** (understand current implementation)
2. **Make minimal changes** (surgical fixes, not rewrites)
3. **Test in browser console** (check for errors)
4. **Test cross-platform** (at least one mobile + desktop)
5. **Verify protocol compatibility** (test with sender)
6. **Check performance** (especially on low-end devices)

### Protocol Compatibility

**CRITICAL**: Maintain backward compatibility with existing QR protocols:

- `qrfile/v1`: Simple JSON format (must always work)
- `qrfile/v2`: Extended format with compression (must always work)
- Simple base64: Legacy format (should still work)

**Test**: After changes, verify with `qr_sender_final.py` that all formats still work.

### Performance Implications

Always consider device capability tiers:

- **High tier** (8GB+ RAM, 8+ cores): Can handle aggressive settings
- **Medium tier** (4GB RAM, 4 cores): Balanced settings
- **Low tier** (<4GB RAM, <4 cores): Conservative settings

**Access via**: `window.AppConfig.performance.tier`

### Security Considerations

This is an **air-gapped security tool**. Maintain security principles:

1. **No network required** (except CDN for initial load)
2. **No data persistence** (except user-initiated IndexedDB)
3. **No external APIs** (all processing local)
4. **No tracking** (no analytics, no telemetry)
5. **Minimal attack surface** (CSP headers, HTTPS enforcement)

**Never add**: Analytics, external APIs, data collection, telemetry

### Documentation Standards

When adding features:

1. **Update this file** (`CLAUDE.md`) with new patterns/conventions
2. **Update relevant README** (root or qr_receiver)
3. **Add JSDoc comments** to public methods
4. **Update interfaces.js** if adding service contracts
5. **Document configuration** in app-config.js comments

### Emergency Recovery

If something breaks badly:

1. **Check git history**: Recent commits that might have caused issue
2. **Check console**: Browser console for JavaScript errors
3. **Check service status**: Use `window.App.bootstrap.container.services`
4. **Revert if needed**: `git revert <commit-hash>`
5. **Archive reference**: Check `/archive/` for older working versions

### Support Resources

- **Main README**: `/qr_app/README.md` - Overview and quick start
- **Receiver README**: `/qr_app/qr_receiver/README.md` - Detailed receiver docs
- **iPad Guide**: `/qr_app/qr_receiver/IPAD_DIRECT.md` - iOS-specific setup
- **Archive Summary**: `/qr_app/qr_receiver/archive/ARCHIVE_SUMMARY.md` - History
- **Protocol Docs**: `/qr_app/qr_receiver/docs/format-comparison.md` - Format specs

### Quick Reference

**Key global objects**:
```javascript
window.AppConfig          // Configuration singleton
window.QRScannerConfig    // Config object (frozen)
window.App               // Main application instance
window.Interfaces        // Interface definitions
window.debugConfig()     // Debug helper (dev mode)
```

**Common service access**:
```javascript
const container = window.App.bootstrap.container;
const camera = container.get('cameraManager');
const chunks = container.get('chunkManager');
const ui = container.get('uiManager');
const storage = container.get('storageManager');
```

**Configuration paths**:
```javascript
'app.name'                          // App name
'device.platform'                   // ios|android|windows|macos|linux
'performance.tier'                  // high|medium|low
'scanner.maxScansPerSecond'        // Scan rate limit
'storage.memoryThreshold'          // Memory limit
'ui.animations.enabled'            // Animation toggle
'network.quality'                  // poor|fair|good
```

---

## Version History

**v2.0.0** (Current):
- World-class modular architecture
- Dependency injection pattern
- Centralized configuration system
- Progressive Web App support
- Cross-platform compatibility

**v1.x** (Archived):
- Monolithic HTML implementations
- Python backend server
- Direct dependencies
- Platform-specific versions

---

## Maintenance Notes

### Periodic Tasks

**Monthly**:
- Check CDN availability (jsdelivr.net, unpkg.com)
- Test on latest browser versions (Chrome, Safari, Firefox)
- Review performance metrics
- Update documentation

**Quarterly**:
- Update dependencies (qr-scanner library)
- Review security headers
- Audit error logs
- Cleanup archive if needed

**Annually**:
- Major dependency updates
- Browser compatibility review
- Performance optimization pass
- Security audit

### Known Future Work

- [ ] Add formal unit tests (Jest/Mocha)
- [ ] Add E2E tests (Playwright/Cypress)
- [ ] TypeScript migration (optional)
- [ ] Service worker enhancement (better offline support)
- [ ] WebAssembly for compression (performance boost)
- [ ] Native app wrappers (Electron, Capacitor)

---

## Contact & Support

For questions or issues:
1. Check this document first
2. Review relevant README files
3. Check browser console for errors
4. Review recent commits for similar changes
5. Test in isolated environment

---

**Last Updated**: 2025-11-13
**Document Version**: 1.0.0
**Codebase Version**: 2.0.0

---

*This document is maintained for AI assistants working on the QR File Transfer codebase. Keep it updated when making architectural changes or adding new patterns.*
