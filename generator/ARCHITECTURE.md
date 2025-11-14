# QR Generator - Enterprise Architecture

## 1. Executive Summary

### 1.1 Purpose
The QR Generator is an enterprise-grade application for encoding files, data, and streaming content into QR code sequences for air-gapped, secure data transfer. It uses Protocol V3 with Brotli-11 compression (ONLY algorithm - best compression ratio), AES-256-GCM encryption, and error correction.

### 1.2 Design Philosophy
- **Security First**: Zero-trust architecture, air-gapped by design
- **Performance**: Optimized for files up to 100MB+ with adaptive chunking
- **Reliability**: Error correction, checksums, retry mechanisms
- **Scalability**: Modular architecture supporting multiple output targets
- **Maintainability**: Clean architecture, SOLID principles, comprehensive testing

### 1.3 Key Requirements
- Support multiple file formats and sizes (1KB - 100MB+)
- Adaptive QR code generation (size, error correction, encoding)
- Protocol V3 standard (NO backward compatibility with v1/v2)
- Cross-platform compatibility (Windows, macOS, Linux)
- Both GUI and CLI interfaces
- Streaming and batch modes
- Performance monitoring and analytics

---

### ⚠️ AIR-GAP DEPLOYMENT NOTE

**For Military/Classified Environments - REMOVE these sections:**
- Section 2.2.1: API Interface (REST/WebSocket) - Use CLI/GUI only
- Section 5.1: FastAPI Application - Not applicable for air-gap
- Section 7.1: Docker Configuration - Use standalone executable instead
- Section 7.2: Docker Compose - Not applicable for air-gap

**Keep these sections:**
- CLI Interface ✅
- GUI Interface ✅  
- Core business logic ✅
- All services (compression, encryption, etc.) ✅
- Standalone deployment ✅

**See:** `../ENTERPRISE_GUIDE.md` → AIR-GAP DEPLOYMENT section for complete procedures.


## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    QR Generator Application                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ CLI Layer  │  │ GUI Layer  │  │ API Layer  │            │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘            │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│                ┌─────────▼─────────┐                        │
│                │  Application Core  │                        │
│                │  (Business Logic)  │                        │
│                └─────────┬─────────┘                        │
│                          │                                   │
│         ┌────────────────┼────────────────┐                │
│         │                │                │                │
│    ┌────▼────┐     ┌────▼────┐     ┌────▼────┐           │
│    │ Domain  │     │ Service │     │ Infra   │           │
│    │  Layer  │     │  Layer  │     │  Layer  │           │
│    └─────────┘     └─────────┘     └─────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Layered Architecture

#### 2.2.1 Presentation Layer
**Responsibility**: User interaction, input/output
**Components**:
- `CLIInterface`: Command-line interface
- `GUIInterface`: Graphical user interface (Tkinter/Qt)
- `APIInterface`: REST/WebSocket API for programmatic access
- `Validators`: Input validation and sanitization

**Design Patterns**:
- MVC (Model-View-Controller)
- Command Pattern for CLI commands
- Observer Pattern for real-time updates

#### 2.2.2 Application Layer
**Responsibility**: Orchestration, workflows
**Components**:
- `QRGenerationOrchestrator`: Main workflow coordinator
- `FileProcessingPipeline`: File reading and preprocessing
- `ChunkingStrategy`: Adaptive chunking algorithms
- `QREncodingPipeline`: QR code generation pipeline
- `DisplayController`: QR code display management

**Design Patterns**:
- Pipeline Pattern for processing stages
- Strategy Pattern for different chunking algorithms
- Factory Pattern for protocol creation

#### 2.2.3 Domain Layer
**Responsibility**: Core business logic
**Components**:
- `FileModel`: File metadata and content
- `ChunkModel`: Individual chunk representation
- `QRCodeModel`: QR code data structure
- `ProtocolModel`: Transfer protocol definitions
- `TransferSession`: Session management

**Design Patterns**:
- Domain-Driven Design (DDD)
- Value Objects for immutability
- Aggregates for consistency

#### 2.2.4 Service Layer
**Responsibility**: Reusable services
**Components**:
- `CompressionService`: Brotli-11 compression (ONLY algorithm - superior compression ratio)
- `EncryptionService`: AES-256-GCM encryption
- `HashingService`: SHA-256/SHA-512 checksums
- `ErrorCorrectionService`: Reed-Solomon encoding
- `QRCodeGeneratorService`: Low-level QR generation
- `MetricsService`: Performance tracking
- `LoggingService`: Structured logging

**Design Patterns**:
- Service Locator Pattern
- Dependency Injection
- Singleton for stateless services

#### 2.2.5 Infrastructure Layer
**Responsibility**: External integrations
**Components**:
- `FileSystemAdapter`: File I/O operations
- `DisplayAdapter`: Screen/window management
- `NetworkAdapter`: Optional network features
- `CacheAdapter`: Performance caching
- `ConfigurationManager`: Settings management

**Design Patterns**:
- Adapter Pattern for external systems
- Repository Pattern for data access
- Unit of Work for transactions

---

## 3. Core Components Deep Dive

### 3.1 File Processing Pipeline

```python
class FileProcessingPipeline:
    """
    Processes input files through multiple stages

    Pipeline Stages:
    1. Validation: Size, format, permissions
    2. Reading: Chunked reading for large files
    3. Preprocessing: Normalization, metadata extraction
    4. Compression: Adaptive compression selection
    5. Encryption: Optional AES-256-GCM
    6. Chunking: Adaptive chunk size calculation
    7. Hashing: Per-chunk and total file hashing
    8. Error Correction: Reed-Solomon encoding
    """

    def __init__(self, config: Configuration):
        self.validators = [
            SizeValidator(max_size=config.max_file_size),
            FormatValidator(allowed_formats=config.allowed_formats),
            PermissionValidator()
        ]
        self.compression_service = CompressionService()
        self.encryption_service = EncryptionService()
        self.hashing_service = HashingService()

    async def process(self, file_path: Path) -> ProcessedFile:
        """Process file through pipeline"""
        # Implementation with error handling, logging, metrics
```

**Key Features**:
- **Streaming**: Process files larger than available RAM
- **Adaptive**: Automatically select best compression/chunking
- **Resilient**: Checkpointing for resume capability
- **Observable**: Emit progress events for UI updates

### 3.2 Chunking Strategy

```python
class AdaptiveChunkingStrategy:
    """
    Calculates optimal chunk size based on:
    - File size
    - QR scanner capabilities
    - Display refresh rate
    - Network conditions (if applicable)
    - Error correction level
    """

    def calculate_chunk_size(
        self,
        file_size: int,
        scanner_capability: ScannerCapability,
        error_correction: ErrorCorrectionLevel
    ) -> int:
        """
        Formula:
        chunk_size = base_size * capability_factor * error_factor

        base_size: 50-500 bytes depending on file size
        capability_factor: 0.5-2.0 based on scanner
        error_factor: 0.7-1.0 based on error correction level
        """
```

**Chunking Algorithms**:
1. **Fixed Size**: Simple, predictable (50-500 bytes)
2. **Adaptive**: Adjusts based on file characteristics
3. **Dynamic**: Learns from successful transfers
4. **Content-Aware**: Splits at logical boundaries

### 3.3 QR Code Generation

```python
class QRCodeGeneratorService:
    """
    Low-level QR code generation with optimization

    Supports:
    - Multiple error correction levels (L, M, Q, H)
    - Adaptive version selection (1-40)
    - Multiple encoding modes (numeric, alphanumeric, byte)
    - Micro QR codes for small data
    - Color/monochrome output
    - Multiple formats (SVG, PNG, EPS)
    """

    def generate(
        self,
        data: bytes,
        error_correction: ErrorCorrectionLevel = 'M',
        scale: int = 10,
        border: int = 4
    ) -> QRCodeImage:
        """Generate optimized QR code"""
```

**Optimizations**:
- **Version Selection**: Automatic optimal version
- **Error Correction**: Adaptive based on chunk importance
- **Encoding Mode**: Best mode for data type
- **Size Optimization**: Minimize QR complexity
- **Caching**: Cache generated QR codes for replay

### 3.4 Protocol Design

```python
class ProtocolV3(Protocol):
    """
    Enterprise protocol version 3

    Format:
    {
        "v": "3.0",
        "sid": "session-uuid",
        "idx": chunk_index,
        "total": total_chunks,
        "data": base64_encoded_data,
        "hash": "sha256_chunk_hash",
        "meta": {
            "filename": "original.ext",
            "size": file_size_bytes,
            "compression": "brotli",
            "encryption": "aes256gcm|none",
            "checksum": "sha256_file_hash",
            "timestamp": iso_timestamp,
            "priority": 1-5
        },
        "ec": {
            "type": "reed-solomon",
            "data_shards": 10,
            "parity_shards": 3
        }
    }
    """
```

**Protocol Features**:
- **Versioning**: Backward compatible with v1, v2
- **Session Management**: UUID-based sessions
- **Integrity**: Per-chunk and file-level hashing
- **Metadata**: Rich metadata for receiver
- **Error Correction**: Configurable Reed-Solomon
- **Encryption**: Optional end-to-end encryption
- **Priority**: Chunk priority for critical data

---

## 4. Design Patterns & Principles

### 4.1 SOLID Principles

#### Single Responsibility Principle (SRP)
Each class has one reason to change:
- `FileReader`: Only reads files
- `ChunkCreator`: Only creates chunks
- `QRGenerator`: Only generates QR codes
- `DisplayManager`: Only manages display

#### Open/Closed Principle (OCP)
Open for extension, closed for modification:
- Protocol implementations extend `Protocol` base class
- Brotli compression implements `CompressionAlgorithm` interface (single algorithm)
- New chunking strategies implement `ChunkingStrategy` interface

#### Liskov Substitution Principle (LSP)
Derived classes substitutable for base:
- Brotli-11 is the only compression implementation (simplified for air-gap)
- All `Protocol` versions compatible with `ProtocolEncoder`

#### Interface Segregation Principle (ISP)
Small, focused interfaces:
- `IReadable`: read() method
- `IChunkable`: chunk() method
- `IEncodable`: encode() method

#### Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions:
- Services injected via dependency injection container
- Use interfaces/abstract base classes

### 4.2 Key Design Patterns

#### Factory Pattern
```python
class ProtocolFactory:
    """Creates protocol instances - V3 ONLY"""

    @staticmethod
    def create(version: str = "3.0") -> Protocol:
        if version != "3.0":
            raise UnsupportedProtocolError(f"Only Protocol V3 supported, got: {version}")
        return ProtocolV3()
```

#### Strategy Pattern
```python
class CompressionContext:
    """Selects compression strategy dynamically"""

    def __init__(self, strategy: CompressionAlgorithm):
        self.strategy = strategy

    def compress(self, data: bytes) -> bytes:
        return self.strategy.compress(data)
```

#### Observer Pattern
```python
class TransferSession(Observable):
    """Emits events for UI updates"""

    def on_chunk_encoded(self, chunk: Chunk):
        self.notify(ChunkEncodedEvent(chunk))

    def on_progress(self, progress: float):
        self.notify(ProgressEvent(progress))
```

#### Command Pattern
```python
class GenerateQRCommand(Command):
    """Encapsulates QR generation request"""

    def execute(self):
        # Generate QR codes

    def undo(self):
        # Cleanup generated codes
```

---

## 5. Data Flow

### 5.1 End-to-End Data Flow

```
┌──────────┐
│ Input    │
│ File     │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│ Validation       │ ← Size, format, permissions
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ File Reading     │ ← Chunked reading for large files
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Compression      │ ← Adaptive algorithm selection
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Encryption       │ ← Optional AES-256-GCM
│ (Optional)       │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Chunking         │ ← Adaptive chunk size calculation
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Hashing          │ ← Per-chunk SHA-256
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Error Correction │ ← Reed-Solomon encoding
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Protocol Encode  │ ← Wrap in protocol format
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ QR Generation    │ ← Generate QR code images
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Display          │ ← Show on screen with timing
└──────────────────┘
```

### 5.2 Performance Optimization Points

1. **Parallel Processing**: Chunk creation and QR generation in parallel
2. **Caching**: Cache generated QR codes for replay
3. **Lazy Loading**: Generate QR codes just-in-time
4. **Memory Management**: Stream large files, cleanup after display
5. **GPU Acceleration**: Use GPU for QR generation (optional)

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Throughput**: Generate 10+ QR codes per second
- **Latency**: <100ms per QR code generation
- **Memory**: <500MB for 100MB file processing
- **Startup**: <2 seconds cold start

### 6.2 Reliability
- **Availability**: 99.9% uptime for API mode
- **Data Integrity**: 100% with checksums and error correction
- **Error Recovery**: Automatic retry with exponential backoff
- **Resume Capability**: Can resume interrupted transfers

### 6.3 Security
- **Encryption**: AES-256-GCM for sensitive data
- **Hashing**: SHA-256 for integrity verification
- **Input Validation**: Strict validation to prevent injection
- **Zero Persistence**: No data written to disk (optional mode)
- **Secure Defaults**: Encryption on by default for production

### 6.4 Scalability
- **Vertical**: Efficient resource usage, scales with hardware
- **Horizontal**: API mode supports multiple instances
- **File Size**: Supports files up to 1GB (with chunking)
- **Concurrent**: Handle multiple sessions simultaneously

### 6.5 Maintainability
- **Code Coverage**: >80% test coverage
- **Documentation**: Comprehensive API and user docs
- **Logging**: Structured logging for debugging
- **Monitoring**: Metrics for performance tracking
- **Versioning**: Semantic versioning (SemVer)

### 6.6 Usability
- **CLI**: Simple, intuitive command-line interface
- **GUI**: User-friendly graphical interface
- **API**: RESTful API with OpenAPI specification
- **Documentation**: User guides, tutorials, examples
- **Error Messages**: Clear, actionable error messages

---

## 7. Technology Stack

### 7.1 Core Technologies
- **Language**: Python 3.10+
- **QR Library**: `segno` (pure Python, fast, feature-rich)
- **Compression**: `brotli` (ONLY - level 11 for best compression ratio)
- **Encryption**: `cryptography` (AES-256-GCM)
- **Hashing**: `hashlib` (SHA-256, SHA-512)
- **Error Correction**: `reedsolo` (Reed-Solomon)

### 7.2 GUI Framework
- **Primary**: `tkinter` (cross-platform, built-in)
- **Alternative**: `PyQt6` (advanced features)
- **Modernization**: `customtkinter` (modern UI)

### 7.3 API Framework
- **Web Framework**: `FastAPI` (async, OpenAPI)
- **WebSocket**: `websockets` (real-time updates)
- **Validation**: `pydantic` (data validation)

### 7.4 Testing
- **Unit Tests**: `pytest`
- **Mocking**: `pytest-mock`, `unittest.mock`
- **Coverage**: `pytest-cov`
- **Integration**: `pytest-asyncio`
- **Performance**: `pytest-benchmark`

### 7.5 Development Tools
- **Linting**: `ruff` (fast Python linter)
- **Formatting**: `black` (code formatter)
- **Type Checking**: `mypy` (static type checker)
- **Dependency Management**: `poetry` or `pip-tools`
- **Documentation**: `sphinx` (API docs)

### 7.6 Deployment
- **Packaging**: `PyInstaller` (standalone executables)
- **Containerization**: `Docker` (API mode)
- **CI/CD**: `GitHub Actions`
- **Monitoring**: `Prometheus` + `Grafana` (API mode)

---

## 8. Configuration Management

### 8.1 Configuration Hierarchy
```yaml
# config/default.yaml
application:
  name: "QR Generator"
  version: "3.0.0"
  mode: "production"  # development|staging|production

file_processing:
  max_file_size: 104857600  # 100MB
  allowed_formats: ["*"]  # All formats
  chunk_size_strategy: "adaptive"  # fixed|adaptive|dynamic

compression:
  default_algorithm: "brotli"  # ONLY algorithm supported
  level: 11  # Maximum compression for minimum QR codes

encryption:
  enabled: true
  algorithm: "aes256gcm"
  key_derivation: "pbkdf2"

error_correction:
  enabled: true
  type: "reed-solomon"
  data_shards: 10
  parity_shards: 3

qr_generation:
  error_correction_level: "M"  # L|M|Q|H
  scale: 10
  border: 4
  format: "png"  # png|svg|eps

display:
  fps: 2.0
  fullscreen: true
  theme: "light"  # light|dark

protocol:
  version: "3.0"

performance:
  parallel_workers: 4
  cache_enabled: true
  cache_size_mb: 100

logging:
  level: "INFO"  # DEBUG|INFO|WARNING|ERROR
  format: "json"  # text|json
  output: "file"  # console|file|both

monitoring:
  enabled: true
  metrics_port: 9090
```

### 8.2 Environment-Specific Overrides
- `config/development.yaml`: Development settings
- `config/staging.yaml`: Staging settings
- `config/production.yaml`: Production settings
- `.env`: Secrets and environment variables

---

## 9. Error Handling Strategy

### 9.1 Error Hierarchy
```python
class QRGeneratorError(Exception):
    """Base exception for all QR generator errors"""

class ValidationError(QRGeneratorError):
    """Input validation errors"""

class ProcessingError(QRGeneratorError):
    """File processing errors"""

class EncodingError(QRGeneratorError):
    """QR encoding errors"""

class DisplayError(QRGeneratorError):
    """Display-related errors"""

class ConfigurationError(QRGeneratorError):
    """Configuration errors"""
```

### 9.2 Error Handling Patterns
1. **Try-Except-Finally**: Proper resource cleanup
2. **Context Managers**: Automatic resource management
3. **Error Boundaries**: Contain errors at layer boundaries
4. **Logging**: All errors logged with context
5. **User Feedback**: Clear, actionable error messages
6. **Retry Logic**: Exponential backoff for transient errors
7. **Graceful Degradation**: Continue with reduced functionality

---

## 10. Extensibility Points

### 10.1 Plugin Architecture
```python
class Plugin(ABC):
    """Base class for plugins"""

    @abstractmethod
    def initialize(self, context: PluginContext):
        """Initialize plugin"""

    @abstractmethod
    def execute(self, data: Any) -> Any:
        """Execute plugin logic"""
```

**Plugin Types**:
- **Preprocessor**: Modify data before chunking
- **Postprocessor**: Modify QR codes after generation
- **Compression**: Custom compression algorithms
- **Encryption**: Custom encryption schemes
- **Display**: Custom display adapters

### 10.2 Extension Points
1. **Custom Protocols**: Implement `Protocol` interface
2. **Custom Chunking**: Implement `ChunkingStrategy` interface
3. **Custom Compression**: Implement `CompressionAlgorithm` interface
4. **Custom Error Correction**: Implement `ErrorCorrection` interface
5. **Custom Display**: Implement `DisplayAdapter` interface

---

## 11. Future Enhancements

### 11.1 Planned Features
- **Streaming Mode**: Real-time data streaming via QR codes
- **Multi-Device**: Sync across multiple display devices
- **Cloud Integration**: Optional cloud backup/sync
- **Mobile App**: Companion mobile generator app
- **Hardware Acceleration**: GPU-based QR generation
- **Machine Learning**: Adaptive parameter tuning
- **Video Mode**: Embed QR codes in video stream
- **Audio Channel**: Parallel audio data channel

### 11.2 Research Areas
- **Quantum-Resistant Encryption**: Post-quantum cryptography
- **Advanced Error Correction**: LDPC, Turbo codes
- **Dynamic QR Codes**: Animate QR codes for higher throughput
- **Multi-Spectral**: Use multiple colors/frequencies
- **Holographic QR**: 3D QR code displays

---

## 12. References

### 12.1 Standards
- ISO/IEC 18004:2015 (QR Code)
- AES-256-GCM (NIST SP 800-38D)
- SHA-256 (FIPS 180-4)
- Reed-Solomon (ISO/IEC 18004)

### 12.2 Libraries
- segno: https://segno.readthedocs.io/
- cryptography: https://cryptography.io/
- FastAPI: https://fastapi.tiangolo.com/
- pytest: https://pytest.org/

### 12.3 Best Practices
- Clean Architecture (Robert C. Martin)
- Domain-Driven Design (Eric Evans)
- Enterprise Integration Patterns (Gregor Hohpe)
- Design Patterns (Gang of Four)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-13
**Status**: Draft → Review → Approved → Implementation
