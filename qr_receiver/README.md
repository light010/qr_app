# 🍎 QR Receiver - Apple-Inspired Design

Modern, elegant QR code receiver with Apple-inspired UI/UX. Companion to the QR Transfer system with full protocol compatibility.

## ✨ Features

- **🎨 Apple-Inspired Design**: Clean, minimal interface following Apple's design principles
- **📱 Camera Access**: Real-time QR code scanning through web browser
- **🔒 Air-Gapped Security**: Zero persistence, forensic-resistant operation
- **🌐 Cross-Platform**: Works on iOS, Android, Windows, macOS, Linux
- **📊 Real-Time Progress**: Beautiful progress tracking with smooth animations
- **🛡️ Full Protocol Support**: Compatible with all QR Transfer features

## 🚀 Quick Start

### Option 1: Direct Launch (Recommended)

```bash
# Clone and run directly
git clone https://github.com/your-username/qr-transfer-system.git
cd qr-transfer-system/qr_receiver_project
pip install -r requirements.txt
python main.py
```

### Option 2: One-Command Install

```bash
# Install and run in one command
pip install git+https://github.com/your-username/qr-transfer-system.git
qr-receiver
```

### Option 3: Local Development

```bash
git clone https://github.com/your-username/qr-transfer-system.git
cd qr-transfer-system
python install.py  # Automated installer
cd qr_receiver_project
python main.py --verbose
```

## 📖 Usage

### Basic Usage

```bash
# Start with default settings (localhost:8000)
python main.py

# Start with custom host/port
python main.py --host 0.0.0.0 --port 8080

# Enable debug mode
python main.py --debug --verbose

# Dark mode
python main.py --theme dark
```

### Web Interface

1. **Start the server**: `python main.py`
2. **Open browser**: Navigate to `http://localhost:8000`
3. **Allow camera access** when prompted
4. **Scan QR codes** to receive files

### Security Modes

```bash
# Maximum security (air-gapped)
python main.py --theme light

# Development mode (allows debugging)
python main.py --debug --verbose --host 0.0.0.0
```

## 🏗️ Architecture

```
qr_receiver_project/
├── core/           # Configuration and settings
├── receiver/       # QR processing engine
├── ui/            # Apple-inspired web interface
├── utils/         # Security and memory management
├── main.py        # Entry point
└── requirements.txt
```

### Core Components

- **🧠 QR Receiver Engine**: Protocol-compatible reception and parsing
- **🎨 Apple Web UI**: Beautiful, responsive interface with camera access
- **🔍 Data Parser**: Multi-format QR code parsing (qrfile/v1, v2, simple)
- **🔧 Chunk Assembler**: File reconstruction with compression/encryption support
- **🛡️ Security Layer**: Air-gapped operation with secure memory management

## 🔧 Dependencies

### Required
```bash
segno>=1.6.0          # QR code processing
pillow>=10.0.0        # Image processing
aiohttp>=3.12.0       # Web server
aiohttp-cors>=0.8.0   # Camera access support
```

### Optional (Full Features)
```bash
brotli>=1.1.0         # Compression support
zstandard>=0.24.0     # Fast compression
lz4>=4.4.0            # Ultra-fast compression  
reedsolo>=1.7.0       # Error correction
cryptography>=41.0.0  # Encryption support
psutil>=5.9.0         # System monitoring
```

## 🌐 Browser Compatibility

| Browser | Desktop | Mobile | Camera Support |
|---------|---------|---------|----------------|
| Chrome  | ✅      | ✅      | ✅             |
| Firefox | ✅      | ✅      | ✅             |
| Safari  | ✅      | ✅      | ✅             |
| Edge    | ✅      | ✅      | ✅             |

## 🔒 Security Features

- **Zero Persistence**: No data stored on disk
- **Air-Gapped Operation**: Works completely offline
- **Secure Memory**: Automatic memory clearing
- **Forensic Resistance**: No recoverable traces
- **Protocol Validation**: Input sanitization and validation

## 📱 iOS/Android Usage

### iOS (Safari)
1. Open Safari and navigate to the receiver URL
2. Tap "Allow" for camera access
3. Position QR codes in the camera view
4. Files download automatically to Downloads folder

### Android (Chrome/Firefox)
1. Open browser and navigate to receiver URL  
2. Grant camera permissions when prompted
3. Scan QR codes with rear camera
4. Files save to Downloads folder

## 🎨 UI Themes

### Light Mode (Default)
- Clean white background
- iOS-style blue accents
- Optimal for bright environments

### Dark Mode
- Dark background with iOS colors
- Reduced eye strain
- Perfect for low-light environments

### Auto Mode
- Follows system preference
- Automatic switching based on time

## ⚙️ Configuration

### Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--host` | localhost | Server host |
| `--port` | 8000 | Server port |
| `--theme` | auto | UI theme (light/dark/auto) |
| `--verbose` | false | Detailed output |
| `--debug` | false | Debug mode |

### Environment Variables

```bash
export QR_RECEIVER_HOST=0.0.0.0
export QR_RECEIVER_PORT=8080
export QR_RECEIVER_THEME=dark
export QR_RECEIVER_DEBUG=true
```

## 🐛 Troubleshooting

### Camera Access Issues
```bash
# Check HTTPS requirement
# Modern browsers require HTTPS for camera access
# Use localhost for development or deploy with SSL

# Camera permissions
# Ensure browser has camera permissions enabled
# Check browser settings -> Privacy -> Camera
```

### Connection Issues
```bash
# Firewall settings
# Make sure port 8000 (or custom) is not blocked

# Network access
# For external access, use --host 0.0.0.0
python main.py --host 0.0.0.0 --port 8080
```

### Performance Issues
```bash
# Increase workers for better performance
# Edit qr_receiver_engine.py: max_workers=8

# Reduce animation for low-end devices
# Add ?reduce_motion=true to URL
```

## 📊 API Endpoints

### REST API
- `GET /` - Main web interface
- `GET /api/status` - Server status
- `GET /api/sessions` - Active sessions
- `POST /api/qr` - Process QR data
- `GET /ws` - WebSocket connection

### WebSocket Events
```javascript
// Real-time progress updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch(data.type) {
    case 'session_update':
      updateProgress(data.session);
      break;
    case 'qr_processed':
      showStatus(data.message);
      break;
  }
};
```

## 🛠️ Development

### Local Development
```bash
git clone https://github.com/your-username/qr-transfer-system.git
cd qr-transfer-system/qr_receiver_project

# Install in development mode
pip install -e .

# Run with hot reload
python main.py --debug --verbose --host 0.0.0.0
```

### Testing
```bash
# Unit tests
python -m pytest tests/

# Integration tests
python -m pytest tests/integration/

# Coverage report
python -m pytest --cov=qr_receiver_project
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes following Apple's design principles
4. Test thoroughly on multiple devices
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Projects

- **QR Transfer**: [Main sender application](../README.md)
- **Protocol Spec**: [QRFile format documentation](../docs/protocol.md)

## 💡 Tips

- **Performance**: Use wired internet for best results
- **Camera**: Ensure good lighting for QR scanning
- **Security**: Run on localhost for maximum security
- **Mobile**: Works great on iPhone/Android browsers
- **Accessibility**: Full keyboard navigation support

---

Made with ❤️ following Apple's design principles