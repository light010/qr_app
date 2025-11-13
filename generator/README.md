# QR Generator - Enterprise Edition

> Enterprise-grade QR code generator for secure, air-gapped file transfers

## 📋 Overview

The QR Generator is a robust, production-ready application for encoding files into QR code sequences. It supports multiple interfaces (CLI, GUI, API), adaptive chunking strategies, and comprehensive security features.

### Key Features

- ✅ **Multi-Interface**: CLI, GUI (Tkinter/Qt), and REST API
- ✅ **Large Files**: Support for files up to 100MB+ through adaptive chunking
- ✅ **Compression**: Multiple algorithms (Brotli, Zstandard, LZ4)
- ✅ **Encryption**: AES-256-GCM for sensitive data
- ✅ **Error Correction**: Reed-Solomon encoding
- ✅ **Protocol Versions**: v1, v2, v3 with backward compatibility
- ✅ **Performance**: Optimized for speed and memory efficiency
- ✅ **Cross-Platform**: Windows, macOS, Linux

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- pip or Poetry for dependency management

### Installation

```bash
# Clone repository
cd generator/

# Install dependencies
pip install -r requirements.txt

# Or using Poetry
poetry install
```

### Basic Usage

#### CLI Mode

```bash
# Generate QR codes from a file
python -m src.main generate /path/to/file.txt

# With compression
python -m src.main generate /path/to/file.txt --compression zstd

# With encryption
python -m src.main generate /path/to/file.txt --encrypt --password mypassword

# Custom chunk size
python -m src.main generate /path/to/file.txt --chunk-size 200
```

#### GUI Mode

```bash
# Launch GUI application
python -m src.main gui
```

#### API Mode

```bash
# Start API server
python -m src.main api --host 0.0.0.0 --port 8000

# Or using uvicorn directly
uvicorn src.interfaces.api.app:app --host 0.0.0.0 --port 8000
```

---

## 📖 Documentation

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, design patterns, component overview
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Implementation details, code structure, examples

### Quick Reference

#### CLI Commands

```bash
# Generate QR codes
generate <file_path>
    --compression <brotli|zstd|lz4|none>  # Compression algorithm
    --encrypt                              # Enable encryption
    --password <password>                  # Encryption password
    --chunk-size <bytes>                   # Custom chunk size
    --fps <float>                          # Display framerate
    --protocol <1.0|2.0|3.0>              # Protocol version
    --output <directory>                   # Save QR codes

# Replay previous session
replay <session_id>

# List sessions
list-sessions
```

#### Python API

```python
from src.core.use_cases.generate_qr_codes import (
    GenerateQRCodesUseCase,
    GenerateQRCodesRequest
)

# Create use case with dependencies
use_case = GenerateQRCodesUseCase(
    file_processor=...,
    qr_generator=...,
    protocol_factory=...,
    logger=...
)

# Execute
request = GenerateQRCodesRequest(
    file_path=Path('/path/to/file.txt'),
    compression_algorithm='zstd',
    encryption_password='secret',
    protocol_version='3.0'
)

response = await use_case.execute(request)

# Access results
for qr_code in response.qr_codes:
    print(f"Chunk {qr_code.chunk_index}/{response.total_chunks}")
```

#### REST API

```bash
# Generate QR codes via API
curl -X POST http://localhost:8000/api/v1/generate \
  -F "file=@/path/to/file.txt" \
  -F "compression=zstd" \
  -F "protocol_version=3.0"

# Response
{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_chunks": 42,
    "metadata": {
        "filename": "file.txt",
        "size": 10240,
        "compression": "zstd",
        "checksum": "a1b2c3..."
    }
}
```

---

## 🏗️ Project Structure

```
generator/
├── src/
│   ├── core/              # Business logic
│   ├── infrastructure/    # External integrations
│   ├── interfaces/        # CLI, GUI, API
│   ├── protocols/         # Protocol implementations
│   └── strategies/        # Chunking, compression strategies
├── tests/                 # Test suite
├── config/                # Configuration files
├── docs/                  # Additional documentation
├── ARCHITECTURE.md        # Architecture documentation
├── IMPLEMENTATION.md      # Implementation guide
└── README.md              # This file
```

---

## ⚙️ Configuration

### Configuration Files

- `config/default.yaml` - Default settings
- `config/development.yaml` - Development overrides
- `config/production.yaml` - Production overrides
- `.env` - Environment variables and secrets

### Key Configuration Options

```yaml
# config/default.yaml
file_processing:
  max_file_size: 104857600  # 100MB
  chunk_size_strategy: "adaptive"

compression:
  default_algorithm: "zstd"
  level: 3

encryption:
  enabled: true
  algorithm: "aes256gcm"

qr_generation:
  error_correction_level: "M"  # L, M, Q, H
  scale: 10
  format: "png"

display:
  fps: 2.0
  fullscreen: true
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
pytest

# Unit tests only
pytest tests/unit/

# Integration tests
pytest tests/integration/

# With coverage
pytest --cov=src --cov-report=html
```

### Test Structure

```
tests/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for workflows
├── e2e/              # End-to-end tests
└── fixtures/         # Test data and fixtures
```

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t qr-generator:3.0.0 .

# Run API server
docker run -p 8000:8000 qr-generator:3.0.0

# Or using docker-compose
docker-compose up -d
```

### Standalone Executable

```bash
# Using PyInstaller
pyinstaller --onefile --windowed src/main.py

# Executable will be in dist/
./dist/main
```

---

## 🔒 Security

### Best Practices

1. **Encryption**: Always encrypt sensitive data
2. **Passwords**: Use strong passwords (12+ characters)
3. **Hash Verification**: Verify file hashes after reconstruction
4. **No Persistence**: Use zero-persistence mode for sensitive operations
5. **Secure Defaults**: Encryption enabled by default in production

### Security Features

- AES-256-GCM encryption
- SHA-256 hash verification
- Reed-Solomon error correction
- Input validation and sanitization
- Secure password derivation (PBKDF2)

---

## 📈 Performance

### Optimization Tips

1. **Chunk Size**: Smaller chunks = more reliable, larger chunks = faster
2. **Compression**: Zstandard offers best speed/ratio balance
3. **Parallel Processing**: Use `--workers` flag for faster generation
4. **Caching**: Enable QR code caching for replay scenarios
5. **GPU Acceleration**: Available for supported systems

### Benchmarks

| File Size | Chunk Size | Total Chunks | Generation Time | Transfer Time @2FPS |
|-----------|------------|--------------|-----------------|---------------------|
| 100 KB    | 120 bytes  | ~850         | ~2s             | ~7 min              |
| 1 MB      | 100 bytes  | ~10,000      | ~15s            | ~83 min             |
| 10 MB     | 80 bytes   | ~125,000     | ~3 min          | ~17 hrs             |

*Note: Transfer times assume 2 FPS display rate*

---

## 🤝 Contributing

### Development Setup

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Setup pre-commit hooks
pre-commit install

# Run linting
ruff check src/

# Run formatting
black src/
```

### Code Style

- Follow PEP 8 guidelines
- Use type hints for all functions
- Write docstrings for public APIs
- Maintain 80%+ test coverage

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support

- **Documentation**: See `docs/` folder
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

---

## 🗺️ Roadmap

### Version 3.1
- [ ] Video streaming mode
- [ ] WebAssembly QR generation
- [ ] Mobile app (iOS/Android)

### Version 4.0
- [ ] Quantum-resistant encryption
- [ ] Advanced error correction (LDPC)
- [ ] Multi-device synchronization

---

**Version**: 3.0.0
**Last Updated**: 2025-11-13
**Status**: Production Ready
