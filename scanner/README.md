# QR Scanner - Enterprise Edition

> Enterprise-grade Progressive Web App for scanning and reconstructing files from QR codes

## 📋 Overview

The QR Scanner is a client-side Progressive Web App that scans QR code sequences and reconstructs files. It works entirely in the browser with no server required, supports offline operation, and runs on all modern platforms.

### Key Features

- ✅ **Progressive Web App**: Installable, works offline
- ✅ **Cross-Platform**: iOS, Android, Windows, macOS, Linux
- ✅ **Real-Time Scanning**: Adaptive scan rate (5-30 FPS)
- ✅ **Large Files**: Support for 100MB+ files with chunked assembly
- ✅ **Smart Storage**: Automatic RAM/IndexedDB selection
- ✅ **File Preview**: 20+ file types supported
- ✅ **Decompression**: Brotli, Zstandard, LZ4
- ✅ **Decryption**: AES-256-GCM support
- ✅ **Protocol Support**: v1, v2, v3 compatibility

---

## 🚀 Quick Start

### Option 1: Direct Access (Simplest)

```bash
# Serve the public directory
cd scanner/public/
python -m http.server 8000

# Or using Node.js
npx serve public/

# Access at: http://localhost:8000
```

### Option 2: Development Mode

```bash
# Install dependencies
npm install

# Start development server with HTTPS (required for camera)
npm run dev

# Access at: https://localhost:3000
```

### Option 3: Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy the dist/ folder to any static hosting
```

---

## 📱 Usage

### Basic Workflow

1. **Open App**: Navigate to the scanner URL in your browser
2. **Grant Permission**: Allow camera access when prompted
3. **Start Scanning**: Click "Start Scanning" button
4. **Position QR Codes**: Point camera at QR codes from generator
5. **Wait for Completion**: Watch progress as chunks are received
6. **Download File**: File downloads automatically when complete

### Platform-Specific Instructions

#### iOS (Safari)

```
1. Open Safari (required for camera access)
2. Navigate to scanner URL
3. Tap "Allow" when prompted for camera
4. Use rear camera for best results
5. Keep device steady while scanning
6. Files download to Downloads folder
```

#### Android (Chrome/Firefox)

```
1. Open Chrome or Firefox
2. Navigate to scanner URL
3. Grant camera permissions
4. Use rear camera for scanning
5. Ensure good lighting
6. Files save to Downloads folder
```

#### Desktop (All Browsers)

```
1. Use Chrome, Firefox, Safari, or Edge
2. Navigate to scanner URL
3. Allow camera access (webcam)
4. Position QR codes in front of webcam
5. Files download to default location
```

---

## 📖 Documentation

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, PWA features, state management
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Code structure, component details, examples

### Quick Reference

#### Browser Requirements

| Browser | Version | Camera | IndexedDB | Service Worker |
|---------|---------|--------|-----------|----------------|
| Chrome  | 90+     | ✅     | ✅        | ✅             |
| Firefox | 88+     | ✅     | ✅        | ✅             |
| Safari  | 14+     | ✅     | ✅        | ✅             |
| Edge    | 90+     | ✅     | ✅        | ✅             |

#### Supported File Types

**Preview Supported:**
- Images: JPEG, PNG, GIF, WebP, SVG
- Text: TXT, JSON, XML, CSV, Markdown
- Code: JavaScript, Python, HTML, CSS
- Documents: PDF
- Audio: MP3, WAV, OGG
- Video: MP4, WebM

**All File Types:**
- All file types can be received and downloaded
- Preview limited to above types
- Others download directly

#### Performance Tiers

| Tier   | Memory | Cores | Scan Rate | Features          |
|--------|--------|-------|-----------|-------------------|
| High   | 8GB+   | 8+    | 30 FPS    | All features      |
| Medium | 4GB+   | 4+    | 15 FPS    | All features      |
| Low    | <4GB   | <4    | 5 FPS     | Reduced animation |

---

## 🏗️ Project Structure

```
scanner/
├── public/
│   ├── index.html         # Main entry point
│   ├── manifest.json      # PWA manifest
│   ├── sw.js             # Service worker
│   │
│   ├── js/
│   │   ├── app.js        # Application entry
│   │   ├── core/         # Business logic
│   │   ├── services/     # Reusable services
│   │   ├── ui/          # UI components
│   │   ├── protocols/   # Protocol parsers
│   │   └── config/      # Configuration
│   │
│   ├── css/
│   │   └── styles.css    # Main stylesheet
│   │
│   └── icons/           # PWA icons
│
├── tests/               # Test suite
├── ARCHITECTURE.md      # Architecture docs
├── IMPLEMENTATION.md    # Implementation guide
└── README.md           # This file
```

---

## ⚙️ Configuration

### Application Configuration

```javascript
// public/js/config/app-config.js

// Configuration is automatic and adaptive
const config = new AppConfig();

// Override if needed
config.get('scanner.maxScansPerSecond');  // Get value
config.set('scanner.maxScansPerSecond', 10);  // Override
```

### Camera Settings

```javascript
{
    camera: {
        // Mobile: rear camera, Desktop: front camera
        facingMode: 'environment',  // or 'user'

        // Resolution
        width: { ideal: 1920, max: 2560 },
        height: { ideal: 1080, max: 1440 },

        // Frame rate
        frameRate: { ideal: 30, max: 60 }
    }
}
```

### Storage Settings

```javascript
{
    storage: {
        dbName: 'QRScannerStorage',
        version: 1,

        // Auto-switch to IndexedDB above threshold
        memoryThreshold: 50 * 1024 * 1024  // 50MB
    }
}
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Manual Testing

```bash
# Start test server
npm run dev

# Test camera access
1. Open https://localhost:3000
2. Grant camera permission
3. Verify video feed appears

# Test scanning
1. Generate QR codes with generator
2. Scan codes with scanner
3. Verify file downloads correctly
```

---

## 🚢 Deployment

### Static Hosting (Recommended)

```bash
# Build for production
npm run build

# Deploy dist/ folder to:
# - GitHub Pages
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Any static hosting
```

### GitHub Pages

```bash
# Build
npm run build

# Deploy to gh-pages branch
npm run deploy
```

### Docker

```bash
# Build image
docker build -t qr-scanner:3.0.0 .

# Run container
docker run -p 8080:80 qr-scanner:3.0.0
```

### PWA Installation

**Desktop:**
```
1. Visit scanner URL in Chrome/Edge
2. Click install icon in address bar
3. App installs to desktop
```

**Mobile:**
```
iOS: Safari → Share → Add to Home Screen
Android: Chrome → Menu → Add to Home screen
```

---

## 🔒 Security

### Security Features

- ✅ **No Server**: 100% client-side processing
- ✅ **HTTPS Required**: Enforced for camera access
- ✅ **CSP Headers**: Content Security Policy
- ✅ **No Tracking**: Zero analytics or telemetry
- ✅ **Optional Storage**: Memory-only mode available
- ✅ **Encryption**: AES-256-GCM decryption support

### Privacy

- Camera access only while actively scanning
- No data sent to external servers
- No cookies or tracking
- Optional IndexedDB storage (can be disabled)
- All processing happens locally

---

## 📈 Performance

### Optimization Tips

1. **Good Lighting**: Ensure adequate lighting for camera
2. **Stable Position**: Keep camera steady during scanning
3. **Close Enough**: Position 6-12 inches from QR codes
4. **Clear View**: Ensure QR codes fill scan frame
5. **Fast Device**: Use device with 4GB+ RAM for best results

### Performance Metrics

| Metric             | High Tier | Medium Tier | Low Tier |
|--------------------|-----------|-------------|----------|
| Scan Rate          | 30 FPS    | 15 FPS      | 5 FPS    |
| Max File Size      | 100MB+    | 50MB        | 25MB     |
| Memory Usage       | <500MB    | <250MB      | <100MB   |
| Startup Time       | <1s       | <2s         | <3s      |

---

## 🐛 Troubleshooting

### Camera Not Working

```
Problem: Camera permission denied
Solution: Check browser settings → Site permissions → Camera

Problem: Black screen
Solution: iOS requires Safari, ensure playsinline attribute

Problem: Wrong camera
Solution: Use camera switch button in app

Problem: Slow scanning
Solution: Ensure good lighting, clean camera lens
```

### Scanning Issues

```
Problem: QR codes not detected
Solution:
- Ensure QR codes are fully visible
- Move closer or farther
- Improve lighting
- Check QR code quality

Problem: Duplicate scans
Solution: Normal - deduplication is automatic

Problem: Slow progress
Solution:
- Reduce display FPS on generator
- Use larger chunk sizes
- Ensure stable camera position
```

### File Assembly Issues

```
Problem: Missing chunks
Solution:
- Ensure all QR codes scanned
- Check missing chunks indicator
- Rescan any skipped codes

Problem: Hash verification failed
Solution:
- Indicates data corruption
- Rescan from beginning
- Check generator/scanner protocol match

Problem: Download failed
Solution:
- Check browser download settings
- Ensure sufficient storage space
- Try different browser
```

---

## 🤝 Contributing

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd scanner/

# Install dependencies
npm install

# Start development server
npm run dev
```

### Code Style

- Use ES6+ features (async/await, classes, modules)
- Follow ESLint configuration
- Use Prettier for formatting
- Write JSDoc comments for public APIs
- Maintain test coverage >80%

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support

### Getting Help

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues for bugs
- **Discussions**: GitHub Discussions for questions

### Common Questions

**Q: Does this require an internet connection?**
A: Only for initial load. After PWA install, works fully offline.

**Q: Is my data sent to any servers?**
A: No, all processing happens in your browser.

**Q: Can I scan from image files?**
A: Not currently, camera scanning only.

**Q: What's the maximum file size?**
A: Technically unlimited, practically 100MB+ depending on device.

---

## 🗺️ Roadmap

### Version 3.1
- [ ] Image file import for scanning
- [ ] Multi-camera support
- [ ] Session resume across devices

### Version 4.0
- [ ] WebRTC peer-to-peer mode
- [ ] Batch processing
- [ ] Advanced file previews

---

**Version**: 3.0.0
**Last Updated**: 2025-11-13
**Status**: Production Ready
