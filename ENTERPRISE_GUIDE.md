# QR File Transfer - Enterprise Implementation Guide

> Complete enterprise-level system for secure, air-gapped file transfers via QR codes

## 📋 Executive Summary

This document provides a comprehensive guide for implementing an enterprise-grade QR code file transfer system consisting of two applications:

1. **QR Generator** (Python) - Encodes files into QR code sequences
2. **QR Scanner** (PWA) - Scans and reconstructs files from QR codes

### Business Value

- **Security**: Air-gapped transfer with no network dependencies
- **Compliance**: Zero data persistence options for regulated environments
- **Reliability**: Error correction and integrity verification
- **Scalability**: Support for files up to 100MB+
- **Accessibility**: Works on all platforms without special hardware

### Target Use Cases

- Government/military secure data transfer
- Healthcare data exchange (HIPAA compliance)
- Financial transactions (air-gapped security)
- Industrial control systems (OT/IT separation)
- Disaster recovery scenarios (network-independent)

---

## 🏗️ System Architecture

### High-Level System View

```
┌─────────────────────┐                    ┌─────────────────────┐
│   QR GENERATOR      │                    │    QR SCANNER       │
│   (Python App)      │                    │    (PWA - Web)      │
├─────────────────────┤                    ├─────────────────────┤
│                     │                    │                     │
│  ┌──────────────┐   │                    │  ┌──────────────┐   │
│  │ File Input   │   │                    │  │ Camera       │   │
│  └──────┬───────┘   │                    │  │ Scanner      │   │
│         │           │                    │  └──────┬───────┘   │
│  ┌──────▼───────┐   │                    │         │           │
│  │ Compression  │   │                    │  ┌──────▼───────┐   │
│  │ Encryption   │   │                    │  │ QR Detection │   │
│  └──────┬───────┘   │                    │  │ & Parsing    │   │
│         │           │                    │  └──────┬───────┘   │
│  ┌──────▼───────┐   │                    │         │           │
│  │ Chunking     │   │                    │  ┌──────▼───────┐   │
│  └──────┬───────┘   │                    │  │ Chunk        │   │
│         │           │                    │  │ Assembly     │   │
│  ┌──────▼───────┐   │     ┌────────┐    │  └──────┬───────┘   │
│  │ QR Code      │───┼─────▶  AIR   ├────┼─────────│           │
│  │ Generation   │   │     │  GAP   │    │         │           │
│  └──────┬───────┘   │     └────────┘    │  ┌──────▼───────┐   │
│         │           │                    │  │ Decompression│   │
│  ┌──────▼───────┐   │                    │  │ Decryption   │   │
│  │ Display      │   │                    │  └──────┬───────┘   │
│  │ (GUI/CLI)    │   │                    │         │           │
│  └──────────────┘   │                    │  ┌──────▼───────┐   │
│                     │                    │  │ File Output  │   │
└─────────────────────┘                    │  └──────────────┘   │
                                          │                     │
                                          └─────────────────────┘
```

### Data Flow

1. **Generation Phase** (Generator)
   - File → Validation → Compression → Encryption → Chunking → Error Correction → QR Encoding → Display

2. **Transfer Phase** (Air Gap)
   - QR codes displayed on one screen
   - Camera scans from another device
   - No network, no physical connection

3. **Reception Phase** (Scanner)
   - Camera → QR Detection → Protocol Parsing → Chunk Assembly → Decompression → Decryption → File Output

---

## 📡 Protocol V3 Specification

### ⚠️ SINGLE PROTOCOL STANDARD

**This system uses ONLY Protocol V3.** No backward compatibility with v1 or v2.

**Both Generator and Scanner MUST implement Protocol V3 exactly as specified.**

### JSON Format Structure

```json
{
  "v": "3.0",
  "sid": "uuid-v4-session-id",
  "idx": 0,
  "total": 100,
  "data": "base64_encoded_chunk_data",
  "hash": "sha256_chunk_hash",
  "meta": {
    "filename": "example.txt",
    "size": 1048576,
    "compression": "zstd",
    "encryption": "aes256gcm",
    "checksum": "sha256_file_hash",
    "timestamp": "2025-11-13T12:00:00Z",
    "mime_type": "text/plain"
  },
  "ec": {
    "type": "reed-solomon",
    "data": "base64_encoded_ec_data"
  }
}
```

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | string | ✅ | Protocol version "3.0" |
| `sid` | string | ✅ | UUID v4 session identifier |
| `idx` | number | ✅ | Zero-based chunk index |
| `total` | number | ✅ | Total number of chunks |
| `data` | string | ✅ | Base64-encoded chunk data |
| `hash` | string | ✅ | SHA-256 hash of chunk data |
| `meta` | object | ✅ | File metadata (see below) |
| `ec` | object | ❌ | Error correction data (optional) |

### Metadata Fields

| Field | Type | Required | Valid Values |
|-------|------|----------|--------------|
| `filename` | string | ✅ | Original filename |
| `size` | number | ✅ | Total file size in bytes |
| `compression` | string | ✅ | `brotli`, `zstd`, `lz4`, `none` |
| `encryption` | string | ✅ | `aes256gcm`, `none` |
| `checksum` | string | ✅ | SHA-256 hash of complete file |
| `timestamp` | string | ✅ | ISO 8601 UTC timestamp |
| `mime_type` | string | ✅ | MIME type of file |

### Supported Algorithms

**Compression:**
- `brotli`: Brotli compression (level 11)
- `zstd`: Zstandard compression (level 3)
- `lz4`: LZ4 compression
- `none`: No compression

**Encryption:**
- `aes256gcm`: AES-256-GCM with PBKDF2 (100,000 iterations)
- `none`: No encryption

**Hash:**
- SHA-256 for all checksums and hashes

**Error Correction (Optional):**
- Reed-Solomon erasure coding

### Compatibility Requirements

**Generator MUST:**
1. Always set `v` to "3.0"
2. Generate UUID v4 for `sid`
3. Base64-encode all binary data
4. Calculate SHA-256 hashes correctly
5. Include all required metadata fields
6. Use ISO 8601 format for timestamps

**Scanner MUST:**
1. Reject any version other than "3.0"
2. Validate all required fields present
3. Verify chunk hashes match data
4. Support all compression algorithms
5. Support AES-256-GCM encryption
6. Parse metadata correctly

### Example Implementation

See:
- Generator: `generator/IMPLEMENTATION.md` Section 3
- Scanner: `scanner/IMPLEMENTATION.md` Section 2.1

---

## 🎯 Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)

#### Generator Implementation

```bash
generator/
├── Set up project structure
├── Implement core domain models
├── Create file processing pipeline
├── Implement compression service
├── Implement encryption service
├── Create QR generation service
└── Build CLI interface
```

**Deliverables:**
- Working CLI generator
- Unit tests for core services
- Basic documentation

#### Scanner Implementation

```bash
scanner/
├── Set up PWA structure
├── Implement camera service
├── Create QR scanning engine
├── Implement chunk assembly
├── Create storage service
└── Build basic UI
```

**Deliverables:**
- Working PWA scanner
- Camera access on all platforms
- Basic chunk assembly

### Phase 2: Features (Weeks 3-4)

#### Generator Features

- [ ] GUI interface (Tkinter)
- [ ] REST API interface
- [ ] Protocol v3 implementation
- [ ] Reed-Solomon error correction
- [ ] Session management
- [ ] Performance monitoring

#### Scanner Features

- [ ] Protocol v3 support
- [ ] File preview system
- [ ] Error correction decoding
- [ ] Theme management
- [ ] IndexedDB persistence
- [ ] Download management

### Phase 3: Enterprise Features (Weeks 5-6)

#### Advanced Capabilities

- [ ] Automated testing (E2E)
- [ ] Performance benchmarking
- [ ] Security audit
- [ ] Documentation completion
- [ ] Docker deployment
- [ ] CI/CD pipeline

#### Quality Assurance

- [ ] Cross-platform testing
- [ ] Load testing
- [ ] Security penetration testing
- [ ] User acceptance testing
- [ ] Production hardening

### Phase 4: Production (Week 7+)

- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Incident response plan
- [ ] User training materials
- [ ] Support documentation
- [ ] Maintenance plan

---

## 💻 Development Workflows

### Generator Development

```bash
# Setup
cd generator/
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Development
# 1. Write tests first (TDD)
pytest tests/unit/test_new_feature.py

# 2. Implement feature
# Edit src/core/services/new_service.py

# 3. Run tests
pytest

# 4. Check code quality
ruff check src/
black src/
mypy src/

# 5. Commit changes
git add .
git commit -m "feat: add new feature"
```

### Scanner Development

```bash
# Setup
cd scanner/
npm install

# Development
# 1. Start dev server
npm run dev

# 2. Open in browser
# https://localhost:3000

# 3. Make changes
# Edit public/js/...

# 4. Hot reload automatic

# 5. Test
npm test

# 6. Lint
npm run lint

# 7. Commit
git add .
git commit -m "feat: add new feature"
```

---

## 🔄 Integration Testing

### End-to-End Workflow Test

```bash
# Terminal 1: Start Generator
cd generator/
python -m src.main generate test_file.txt --compression zstd --fps 2.0

# Terminal 2: Start Scanner
cd scanner/
npm run dev

# Browser: Open https://localhost:3000
# 1. Click "Start Scanning"
# 2. Point camera at QR codes
# 3. Verify file downloads correctly
# 4. Compare checksums
```

### Automated E2E Test

```python
# tests/e2e/test_full_transfer.py
import pytest
from playwright.sync_api import sync_playwright

def test_full_file_transfer():
    """Test complete file transfer workflow"""

    with sync_playwright() as p:
        # Start generator (Python)
        generator = subprocess.Popen([
            'python', '-m', 'src.main', 'generate',
            'test_data/sample.txt', '--fps', '10'
        ])

        # Start scanner (Browser)
        browser = p.chromium.launch()
        page = browser.new_page()

        # Grant camera permissions
        context = browser.new_context(permissions=['camera'])
        page = context.new_page()

        # Navigate to scanner
        page.goto('https://localhost:3000')

        # Start scanning
        page.click('#start-btn')

        # Wait for completion
        page.wait_for_selector('#download-btn')

        # Verify download
        download = page.wait_for_download()
        assert download.suggested_filename == 'sample.txt'

        # Cleanup
        generator.terminate()
        browser.close()
```

---

## 📊 Performance Benchmarks

### Target Performance Metrics

| Metric                    | Target      | Measured    | Status |
|---------------------------|-------------|-------------|--------|
| Generator Startup Time    | <2s         | -           | ⏳     |
| QR Generation Rate        | >10 QR/s    | -           | ⏳     |
| Scanner Startup Time      | <1s         | -           | ⏳     |
| QR Detection Rate         | 5-30 FPS    | -           | ⏳     |
| Memory Usage (Generator)  | <500MB      | -           | ⏳     |
| Memory Usage (Scanner)    | <250MB      | -           | ⏳     |
| CPU Usage (Generator)     | <50%        | -           | ⏳     |
| CPU Usage (Scanner)       | <30%        | -           | ⏳     |

### Benchmark Tests

```bash
# Generator Benchmarks
cd generator/
pytest tests/performance/test_benchmarks.py --benchmark-only

# Scanner Benchmarks
cd scanner/
npm run test:performance
```

---

## 🔒 Security Implementation

### Security Checklist

#### Generator

- [ ] Input validation (file size, format)
- [ ] Encryption enabled by default
- [ ] Secure password storage (never in plaintext)
- [ ] Memory cleanup after processing
- [ ] No logging of sensitive data
- [ ] Code signing for executables

#### Scanner

- [ ] Content Security Policy headers
- [ ] HTTPS enforcement
- [ ] Camera permission management
- [ ] Input sanitization (QR data)
- [ ] Secure IndexedDB access
- [ ] No external API calls
- [ ] Memory cleanup after assembly

### Security Testing

```bash
# Static Analysis
cd generator/
bandit -r src/

cd scanner/
npm audit

# Penetration Testing
# Use OWASP ZAP or similar tools
# Test for:
# - XSS vulnerabilities
# - Injection attacks
# - CSRF attacks
# - Data exposure
```

---

## 🚀 Deployment Guide

### Generator Deployment

#### Option 1: PyInstaller Executable

```bash
# Build standalone executable
cd generator/
pyinstaller --onefile --windowed \
    --name "QR Generator" \
    --icon icon.ico \
    src/main.py

# Distribute dist/QR Generator.exe
```

#### Option 2: Docker API

```bash
# Build Docker image
cd generator/
docker build -t qr-generator:3.0.0 .

# Run API server
docker run -d \
    -p 8000:8000 \
    -v /data:/data \
    qr-generator:3.0.0

# Access API at http://localhost:8000
```

#### Option 3: System Package

```bash
# Create Python package
cd generator/
python setup.py sdist bdist_wheel

# Install system-wide
pip install dist/qr_generator-3.0.0-py3-none-any.whl

# Run from anywhere
qr-generate /path/to/file.txt
```

### Scanner Deployment

#### Option 1: Static Hosting (Recommended)

```bash
# Build production bundle
cd scanner/
npm run build

# Deploy dist/ to:
# - GitHub Pages
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Any CDN

# Example: Netlify
netlify deploy --prod --dir=dist
```

#### Option 2: Docker (Nginx)

```bash
# Build Docker image
cd scanner/
docker build -t qr-scanner:3.0.0 .

# Run container
docker run -d \
    -p 443:443 \
    -v /certs:/etc/nginx/certs \
    qr-scanner:3.0.0

# Access at https://localhost
```

#### Option 3: Self-Hosted

```bash
# Build
cd scanner/
npm run build

# Serve with any web server
# Nginx:
server {
    listen 443 ssl http2;
    server_name qr-scanner.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/qr-scanner;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

---

## 📈 Monitoring & Observability

### Metrics to Track

#### Generator Metrics

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram

qr_generation_total = Counter(
    'qr_generation_total',
    'Total QR codes generated'
)

qr_generation_duration = Histogram(
    'qr_generation_duration_seconds',
    'Time spent generating QR codes'
)

file_size_bytes = Histogram(
    'file_size_bytes',
    'Size of files being processed'
)
```

#### Scanner Metrics

```javascript
// Custom metrics
const metrics = {
    scansTotal: 0,
    scanSuccesses: 0,
    scanErrors: 0,
    averageScanTime: 0,
    chunksReceived: 0,
    transfersCompleted: 0
};

// Send to analytics endpoint
if (config.metrics.enabled) {
    fetch('/api/metrics', {
        method: 'POST',
        body: JSON.stringify(metrics)
    });
}
```

### Logging

```yaml
# logging.yaml
version: 1
formatters:
  json:
    format: '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'

handlers:
  console:
    class: logging.StreamHandler
    formatter: json

  file:
    class: logging.RotatingFileHandler
    filename: /var/log/qr-generator/app.log
    maxBytes: 10485760  # 10MB
    backupCount: 5
    formatter: json

root:
  level: INFO
  handlers: [console, file]
```

---

## 🧪 Testing Strategy

### Testing Pyramid

```
                /\
               /  \
              /E2E \
             /Tests \
            /────────\
           /          \
          / Integration\
         /    Tests     \
        /────────────────\
       /                  \
      /   Unit Tests       \
     /______________________\
```

### Test Coverage Targets

| Component          | Unit | Integration | E2E | Total |
|--------------------|------|-------------|-----|-------|
| Generator Core     | 90%  | 80%         | -   | 85%   |
| Generator API      | 80%  | 90%         | 70% | 80%   |
| Scanner Core       | 85%  | 75%         | -   | 80%   |
| Scanner UI         | 70%  | 80%         | 90% | 80%   |
| **Overall**        | 80%+ | 80%+        | 70%+| 80%+  |

### Running All Tests

```bash
# Generator
cd generator/
pytest --cov=src --cov-report=html

# Scanner
cd scanner/
npm test -- --coverage
npm run test:e2e

# View coverage
# generator/htmlcov/index.html
# scanner/coverage/index.html
```

---

## 📚 Documentation Standards

### Required Documentation

#### Generator
- [x] ARCHITECTURE.md - System design
- [x] IMPLEMENTATION.md - Code guide
- [x] README.md - Getting started
- [ ] API.md - API reference
- [ ] SECURITY.md - Security guide
- [ ] DEPLOYMENT.md - Deployment guide

#### Scanner
- [x] ARCHITECTURE.md - System design
- [x] IMPLEMENTATION.md - Code guide
- [x] README.md - Getting started
- [ ] USER_GUIDE.md - End-user guide
- [ ] TROUBLESHOOTING.md - Common issues
- [ ] DEPLOYMENT.md - Deployment guide

### Documentation Template

```markdown
# [Feature Name]

## Overview
Brief description of feature

## Architecture
How it fits in the system

## Implementation
Code examples and details

## Configuration
Settings and options

## Testing
How to test this feature

## Deployment
Deployment considerations

## Troubleshooting
Common issues and solutions

## References
Links to related documentation
```

---

## 🎓 Training & Onboarding

### Developer Onboarding Checklist

#### Week 1: Setup & Basics
- [ ] Development environment setup
- [ ] Read ARCHITECTURE.md (both apps)
- [ ] Run generator locally
- [ ] Run scanner locally
- [ ] Complete first end-to-end transfer

#### Week 2: Deep Dive
- [ ] Read IMPLEMENTATION.md (both apps)
- [ ] Write first unit test
- [ ] Fix a "good first issue"
- [ ] Code review participation

#### Week 3: Advanced
- [ ] Implement a small feature
- [ ] Write integration test
- [ ] Deploy to test environment
- [ ] Present work to team

### User Training Materials

- [ ] User guide (PDF)
- [ ] Video tutorials
- [ ] Quick reference cards
- [ ] FAQ document
- [ ] Troubleshooting guide

---

## 🆘 Support & Maintenance

### Support Tiers

**Tier 1: Self-Service**
- Documentation
- FAQ
- Knowledge base
- Community forums

**Tier 2: Standard Support**
- Email support
- Response time: 24-48 hours
- Business hours only
- Bug fixes in next release

**Tier 3: Premium Support**
- Priority email + phone
- Response time: 4 hours
- 24/7 availability
- Hotfix releases
- Custom development

### Maintenance Schedule

```
Daily:
- Monitor error logs
- Check system health
- Respond to critical issues

Weekly:
- Review metrics
- Update documentation
- Triage new issues
- Plan next sprint

Monthly:
- Security updates
- Dependency updates
- Performance review
- Release planning

Quarterly:
- Security audit
- Architecture review
- Capacity planning
- User feedback session
```

---

## 🗺️ Roadmap

### Version 3.1 (Q2 2025)
- Video streaming mode
- Multi-device sync
- Advanced error recovery
- Mobile apps (iOS/Android)

### Version 4.0 (Q4 2025)
- Quantum-resistant encryption
- WebRTC peer-to-peer
- Blockchain verification
- AI-powered optimization

### Version 5.0 (2026)
- Satellite communication mode
- Mesh network support
- Hardware security module integration
- Advanced analytics platform

---

## 📝 License & Legal

### License
MIT License - see LICENSE file for details

### Compliance
- GDPR compliant (no data collection)
- HIPAA ready (air-gapped design)
- SOC 2 compatible
- ISO 27001 aligned

### Intellectual Property
- All code is open source
- QR code technology is patent-free
- Encryption algorithms are public domain

---

## 👥 Team Structure

### Recommended Team

**Development Team:**
- 1x Technical Lead
- 2x Backend Developers (Generator)
- 2x Frontend Developers (Scanner)
- 1x DevOps Engineer
- 1x QA Engineer

**Support Team:**
- 1x Product Manager
- 1x Technical Writer
- 1x Support Engineer

**Part-Time:**
- 1x Security Consultant
- 1x UX Designer

---

## 📞 Contact & Resources

### Project Resources
- **Repository**: https://github.com/your-org/qr-transfer
- **Documentation**: https://docs.qr-transfer.com
- **Issues**: https://github.com/your-org/qr-transfer/issues
- **Discussions**: https://github.com/your-org/qr-transfer/discussions

### Communication Channels
- **Slack**: #qr-transfer-dev
- **Email**: dev@qr-transfer.com
- **Status Page**: https://status.qr-transfer.com

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-13
**Status**: Ready for Implementation
**Next Review**: 2025-12-13

---

## 🔒 AIR-GAP DEPLOYMENT (MILITARY-GRADE)

### Critical Requirements for Air-Gap Compliance

**⚠️ IMPORTANT**: True air-gap deployment means **ZERO network connectivity**. The following features must be REMOVED or deployed offline-only:

#### Generator Requirements
- ❌ **NO REST API** - Remove FastAPI/web server code entirely
- ❌ **NO WebSocket** - Remove all network communication
- ❌ **NO Docker Hub** - Use offline Docker images only or skip Docker
- ❌ **NO Cloud Monitoring** - Use local file logging only
- ✅ **CLI/GUI Only** - Standalone executable deployment
- ✅ **USB Deployment** - Physical media transfer only

#### Scanner Requirements  
- ❌ **NO CDN Libraries** - Bundle ALL JavaScript libraries locally
- ❌ **NO Web Hosting** - Deploy to local file system only
- ❌ **NO Service Worker Network Fallback** - Offline-only mode
- ✅ **Single HTML File** - All dependencies inlined (~500KB)
- ✅ **USB/CD Deployment** - Physical media distribution

### Air-Gap Deployment Process

```
DEVELOPMENT MACHINE (Connected)
    ↓
[Build & Package]
    ↓
[Hash Verification]
    ↓
[Copy to USB/CD with Write-Protection]
    ↓
[Apply Tamper-Evident Seal]
    ↓
[Physical Transport - Secure Courier]
    ↓
AIR-GAPPED ENVIRONMENT (Isolated)
    ↓
[Verify Seal & Hash]
    ↓
[Install Locally]
    ↓
[Test - Verify NO Network Activity]
    ↓
[Destroy/Secure Media]
```

### Generator: Build for Air-Gap

```bash
# 1. Build single executable (NO network code)
cd generator/
pyinstaller --onefile --name QRGenerator src/main.py

# 2. Verify no network symbols
nm dist/QRGenerator | grep -E "socket|connect|http" || echo "✅ Clean"

# 3. Calculate hash
sha256sum dist/QRGenerator > deployment_hash.txt

# 4. Copy to USB (write-protected)
cp dist/QRGenerator /mnt/usb/
cp deployment_hash.txt /mnt/usb/

# 5. Verify and seal USB
```

### Scanner: Build for Air-Gap

```bash
# 1. Bundle ALL dependencies locally
cd scanner/public/

# Download qr-scanner library locally
mkdir -p lib/
curl -o lib/qr-scanner.umd.min.js \
  https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js

# 2. Update index.html to use local library
sed -i 's|https://cdn.jsdelivr.net.*qr-scanner.*|./lib/qr-scanner.umd.min.js|g' index.html

# 3. Create single-file version (all inlined)
cat > scanner_airgap.html << 'HTML'
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>QR Scanner</title>
<style>/* All CSS inlined here */</style>
</head>
<body>
<!-- All HTML here -->
<script>/* All JS including qr-scanner library inlined */</script>
</body>
</html>
HTML

# 4. Calculate hash
sha256sum scanner_airgap.html > scanner_hash.txt

# 5. Burn to CD-R (recommended) or copy to USB
```

### Verification Checklist

**Before Deployment:**
- [ ] Generator: No network imports in code
- [ ] Generator: No URLs in binary (check with `strings`)
- [ ] Generator: Single executable with no dependencies
- [ ] Scanner: No `http://` or `https://` in HTML
- [ ] Scanner: All libraries present in `lib/` folder
- [ ] Scanner: Works offline (test with network disabled)
- [ ] Both: Hashes calculated and documented
- [ ] Both: Physical media write-protected

**After Deployment:**
- [ ] Hashes verified on air-gap machine
- [ ] No network activity detected (use `tcpdump` or `wireshark`)
- [ ] Applications function correctly offline
- [ ] Test file transfer successful
- [ ] Audit trail documented

### Deployment to Classified Environment

```bash
# On air-gap machine (after transport):

# 1. Verify hash
sha256sum QRGenerator  # Compare with deployment_hash.txt
sha256sum scanner_airgap.html  # Compare with scanner_hash.txt

# 2. Install generator
sudo cp QRGenerator /opt/qr/
sudo chmod +x /opt/qr/QRGenerator

# 3. Install scanner
cp scanner_airgap.html ~/Desktop/qr_scanner.html

# 4. Test with network monitoring
sudo tcpdump -i any &  # Monitor ALL network activity
/opt/qr/QRGenerator generate test.txt
# Open scanner_airgap.html in browser
# Scan QR codes
# Verify: tcpdump shows ZERO network packets
kill %1

# 5. If test passes, approve for use
```

### Security Compliance

**Classification Levels Supported:**
- UNCLASSIFIED (code itself)
- SECRET (operational deployment)
- TOP SECRET (with additional controls)

**Required Controls:**
- Physical security of deployment media
- Chain of custody documentation
- Hash verification at source and destination
- Network activity monitoring during testing
- Incident response procedures
- Periodic security audits

### Incident Response

**If Network Activity Detected:**
1. IMMEDIATELY power off system
2. Preserve all logs
3. Notify security officer
4. Document incident
5. Await security investigation
6. Do NOT restart until cleared

**If Hash Mismatch:**
1. Do NOT install/use
2. Quarantine media
3. Notify security officer
4. Request new deployment
5. Document in audit trail

