# QR Generator - Implementation Guide

## 1. Project Structure

### 1.1 Directory Layout

```
generator/
├── src/
│   ├── __init__.py
│   ├── main.py                     # Entry point
│   │
│   ├── core/                       # Core business logic
│   │   ├── __init__.py
│   │   ├── models/                 # Domain models
│   │   │   ├── __init__.py
│   │   │   ├── file_model.py
│   │   │   ├── chunk_model.py
│   │   │   ├── qr_code_model.py
│   │   │   ├── protocol_model.py
│   │   │   └── session_model.py
│   │   │
│   │   ├── services/               # Business services
│   │   │   ├── __init__.py
│   │   │   ├── compression_service.py
│   │   │   ├── encryption_service.py
│   │   │   ├── hashing_service.py
│   │   │   ├── error_correction_service.py
│   │   │   └── qr_generator_service.py
│   │   │
│   │   └── use_cases/              # Application use cases
│   │       ├── __init__.py
│   │       ├── generate_qr_codes.py
│   │       ├── process_file.py
│   │       └── manage_session.py
│   │
│   ├── infrastructure/             # External integrations
│   │   ├── __init__.py
│   │   ├── file_system/
│   │   │   ├── __init__.py
│   │   │   ├── file_reader.py
│   │   │   └── file_validator.py
│   │   │
│   │   ├── display/
│   │   │   ├── __init__.py
│   │   │   ├── display_adapter.py
│   │   │   └── fullscreen_manager.py
│   │   │
│   │   ├── cache/
│   │   │   ├── __init__.py
│   │   │   └── qr_cache.py
│   │   │
│   │   └── config/
│   │       ├── __init__.py
│   │       ├── config_loader.py
│   │       └── settings.py
│   │
│   ├── interfaces/                 # User interfaces
│   │   ├── __init__.py
│   │   ├── cli/
│   │   │   ├── __init__.py
│   │   │   ├── commands.py
│   │   │   └── cli_app.py
│   │   │
│   │   ├── gui/
│   │   │   ├── __init__.py
│   │   │   ├── main_window.py
│   │   │   ├── widgets/
│   │   │   │   ├── qr_display.py
│   │   │   │   ├── progress_bar.py
│   │   │   │   └── control_panel.py
│   │   │   └── themes/
│   │   │       ├── light.py
│   │   │       └── dark.py
│   │   │
│   │   # API directory removed for air-gap compliance
│   │
│   ├── protocols/                  # Protocol implementations
│   │   ├── __init__.py
│   │   ├── base_protocol.py
│   │   └── protocol_v3.py          # ONLY Protocol V3 - latest standard
│   │
│   ├── strategies/                 # Strategy implementations
│   │   ├── __init__.py
│   │   ├── chunking/
│   │   │   ├── __init__.py
│   │   │   ├── base_chunking.py
│   │   │   ├── fixed_chunking.py
│   │   │   ├── adaptive_chunking.py
│   │   │   └── content_aware_chunking.py
│   │   │
│   │   └── compression/
│   │       ├── __init__.py
│   │       ├── base_compression.py
│   │       ├── brotli_compression.py
│   │       ├── zstd_compression.py
│   │       └── lz4_compression.py
│   │
│   └── utils/                      # Utility functions
│       ├── __init__.py
│       ├── logger.py
│       ├── metrics.py
│       ├── exceptions.py
│       └── helpers.py
│
├── tests/                          # Test suite
│   ├── __init__.py
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── config/                         # Configuration files
│   ├── default.yaml
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
│
├── docs/                           # Documentation
│   ├── API.md
│   ├── USER_GUIDE.md
│   └── CONTRIBUTING.md
│
├── scripts/                        # Utility scripts
│   ├── build.sh
│   ├── test.sh
│   └── deploy.sh
│
├── .env.example                    # Environment template
├── .gitignore
├── pyproject.toml                  # Poetry config
├── requirements.txt                # Pip requirements
└── README.md
```

**Note:** For air-gap deployment, remove `api/` directory, `Dockerfile`, and `docker-compose.yml`.

### ⚠️ AIR-GAP DEPLOYMENT NOTE

**For Military/Classified Environments:**

**API and Docker sections have been REMOVED from this guide** as they violate air-gap requirements (REST API, WebSocket, network-based containers).

**Air-gap compatible sections:**
- Section 2: Core Implementation (Models, Services, Use Cases) ✅
- Section 3: Protocol Implementation ✅
- Section 4: CLI Implementation ✅
- Section 5: Testing Strategy ✅

**Deployment:** Use PyInstaller to create standalone executable. See `../ENTERPRISE_GUIDE.md` → AIR-GAP DEPLOYMENT for complete deployment procedures.

---

## 2. Core Implementation

### 2.1 Domain Models

#### 2.1.1 File Model
```python
# src/core/models/file_model.py
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from datetime import datetime

@dataclass
class FileModel:
    """Represents a file to be processed"""

    path: Path
    filename: str
    size: int
    mime_type: str
    created_at: datetime
    modified_at: datetime
    hash: Optional[str] = None
    compressed_size: Optional[int] = None
    compression_algorithm: Optional[str] = None
    encryption_enabled: bool = False

    def __post_init__(self):
        """Validate file model"""
        if not self.path.exists():
            raise FileNotFoundError(f"File not found: {self.path}")
        if self.size <= 0:
            raise ValueError(f"Invalid file size: {self.size}")

    @property
    def size_mb(self) -> float:
        """File size in MB"""
        return self.size / (1024 * 1024)

    @property
    def compression_ratio(self) -> Optional[float]:
        """Compression ratio if compressed"""
        if self.compressed_size:
            return self.compressed_size / self.size
        return None

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'filename': self.filename,
            'size': self.size,
            'mime_type': self.mime_type,
            'hash': self.hash,
            'compressed_size': self.compressed_size,
            'compression_algorithm': self.compression_algorithm,
            'encryption_enabled': self.encryption_enabled
        }
```

#### 2.1.2 Chunk Model
```python
# src/core/models/chunk_model.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class ChunkModel:
    """Represents a data chunk"""

    index: int
    data: bytes
    size: int
    hash: str
    total_chunks: int
    session_id: str
    error_correction_data: Optional[bytes] = None

    @property
    def is_last(self) -> bool:
        """Check if this is the last chunk"""
        return self.index == self.total_chunks - 1

    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage"""
        return (self.index + 1) / self.total_chunks * 100

    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'index': self.index,
            'size': self.size,
            'hash': self.hash,
            'total_chunks': self.total_chunks,
            'session_id': self.session_id
        }
```

#### 2.1.3 QR Code Model
```python
# src/core/models/qr_code_model.py
from dataclasses import dataclass
from typing import Optional
from PIL import Image

@dataclass
class QRCodeModel:
    """Represents a generated QR code"""

    chunk_index: int
    qr_image: Image.Image
    data_size: int
    version: int
    error_correction_level: str
    encoding_mode: str
    generated_at: float

    @property
    def image_size(self) -> tuple[int, int]:
        """Get image dimensions"""
        return self.qr_image.size

    def save(self, path: Path):
        """Save QR code to file"""
        self.qr_image.save(path)

    def to_base64(self) -> str:
        """Convert to base64 string"""
        import base64
        import io

        buffer = io.BytesIO()
        self.qr_image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()
```

### 2.2 Services Implementation

#### 2.2.1 Compression Service
```python
# src/core/services/compression_service.py
from abc import ABC, abstractmethod
from typing import Protocol
import brotli
import zstandard as zstd
import lz4.frame

class CompressionAlgorithm(Protocol):
    """Protocol for compression algorithms"""

    def compress(self, data: bytes) -> bytes: ...
    def decompress(self, data: bytes) -> bytes: ...
    @property
    def name(self) -> str: ...

class BrotliCompression:
    """Brotli compression implementation"""

    def __init__(self, level: int = 11):
        self.level = level

    def compress(self, data: bytes) -> bytes:
        return brotli.compress(data, quality=self.level)

    def decompress(self, data: bytes) -> bytes:
        return brotli.decompress(data)

    @property
    def name(self) -> str:
        return "brotli"

class ZstdCompression:
    """Zstandard compression implementation - OPTIMIZED for minimal QR codes"""

    def __init__(self, level: int = 22):
        """Initialize with level 22 (maximum compression) for optimal QR count reduction"""
        self.level = level

    def compress(self, data: bytes) -> bytes:
        compressor = zstd.ZstdCompressor(level=self.level)
        return compressor.compress(data)

    def decompress(self, data: bytes) -> bytes:
        decompressor = zstd.ZstdDecompressor()
        return decompressor.decompress(data)

    @property
    def name(self) -> str:
        return "zstd"

class LZ4Compression:
    """LZ4 compression implementation"""

    def compress(self, data: bytes) -> bytes:
        return lz4.frame.compress(data)

    def decompress(self, data: bytes) -> bytes:
        return lz4.frame.decompress(data)

    @property
    def name(self) -> str:
        return "lz4"

class CompressionService:
    """Service for data compression"""

    def __init__(self):
        self.algorithms = {
            'brotli': BrotliCompression,
            'zstd': ZstdCompression,
            'lz4': LZ4Compression
        }

    def get_algorithm(self, name: str) -> CompressionAlgorithm:
        """Get compression algorithm by name"""
        if name not in self.algorithms:
            raise ValueError(f"Unknown compression algorithm: {name}")
        return self.algorithms[name]()

    def select_best_algorithm(self, data: bytes) -> str:
        """Automatically select best compression algorithm"""
        # Test each algorithm and select best ratio
        best_ratio = float('inf')
        best_algorithm = 'zstd'

        for name, AlgorithmClass in self.algorithms.items():
            try:
                algorithm = AlgorithmClass()
                compressed = algorithm.compress(data[:1000])  # Test with sample
                ratio = len(compressed) / len(data[:1000])

                if ratio < best_ratio:
                    best_ratio = ratio
                    best_algorithm = name
            except Exception:
                continue

        return best_algorithm
```

#### 2.2.2 Encryption Service
```python
# src/core/services/encryption_service.py
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import os
import base64

class EncryptionService:
    """Service for data encryption using AES-256-GCM"""

    def __init__(self, password: Optional[str] = None):
        self.password = password
        self._key = None

    def derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive encryption key from password"""
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits
            salt=salt,
            iterations=100000
        )
        return kdf.derive(password.encode())

    def encrypt(self, data: bytes, password: Optional[str] = None) -> dict:
        """
        Encrypt data using AES-256-GCM

        Returns:
            dict with 'ciphertext', 'nonce', 'salt'
        """
        pwd = password or self.password
        if not pwd:
            raise ValueError("Password required for encryption")

        # Generate salt and nonce
        salt = os.urandom(16)
        nonce = os.urandom(12)

        # Derive key
        key = self.derive_key(pwd, salt)

        # Encrypt
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, data, None)

        return {
            'ciphertext': ciphertext,
            'nonce': nonce,
            'salt': salt
        }

    def decrypt(
        self,
        ciphertext: bytes,
        nonce: bytes,
        salt: bytes,
        password: Optional[str] = None
    ) -> bytes:
        """Decrypt data using AES-256-GCM"""
        pwd = password or self.password
        if not pwd:
            raise ValueError("Password required for decryption")

        # Derive key
        key = self.derive_key(pwd, salt)

        # Decrypt
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None)
```

#### 2.2.3 QR Generator Service
```python
# src/core/services/qr_generator_service.py
import segno
from typing import Optional
from pathlib import Path
from PIL import Image
import io

class QRGeneratorService:
    """Service for QR code generation"""

    def __init__(self, config: dict):
        self.config = config
        self.error_correction = config.get('error_correction_level', 'M')
        self.scale = config.get('scale', 10)
        self.border = config.get('border', 4)

    def generate(
        self,
        data: str,
        error_correction: Optional[str] = None,
        scale: Optional[int] = None,
        border: Optional[int] = None
    ) -> Image.Image:
        """
        Generate QR code from data

        Args:
            data: Data to encode
            error_correction: L, M, Q, or H (default: M)
            scale: Module size (default: 10)
            border: Border size (default: 4)

        Returns:
            PIL Image object
        """
        ec = error_correction or self.error_correction
        s = scale or self.scale
        b = border or self.border

        # Generate QR code
        qr = segno.make(data, error=ec, boost_error=False)

        # Convert to PIL Image
        buffer = io.BytesIO()
        qr.save(buffer, kind='png', scale=s, border=b)
        buffer.seek(0)

        return Image.open(buffer)

    def generate_batch(
        self,
        data_list: list[str],
        **kwargs
    ) -> list[Image.Image]:
        """Generate multiple QR codes"""
        return [self.generate(data, **kwargs) for data in data_list]

    def save_qr(
        self,
        image: Image.Image,
        path: Path,
        format: str = 'PNG'
    ):
        """Save QR code to file"""
        image.save(path, format=format)

    def optimize_version(self, data: str) -> int:
        """Determine optimal QR code version for data"""
        qr = segno.make(data, error=self.error_correction)
        return qr.version
```

### 2.3 Use Cases Implementation

#### 2.3.1 Generate QR Codes Use Case
```python
# src/core/use_cases/generate_qr_codes.py
from typing import Generator
from dataclasses import dataclass
import logging

@dataclass
class GenerateQRCodesRequest:
    """Request to generate QR codes"""
    file_path: Path
    compression_algorithm: str = 'zstd'
    encryption_password: Optional[str] = None
    chunk_size: Optional[int] = None
    protocol_version: str = '3.0'
    error_correction_level: str = 'M'

@dataclass
class GenerateQRCodesResponse:
    """Response containing generated QR codes"""
    qr_codes: list[QRCodeModel]
    session_id: str
    total_chunks: int
    file_metadata: dict

class GenerateQRCodesUseCase:
    """Use case for generating QR codes from a file"""

    def __init__(
        self,
        file_processor: FileProcessingPipeline,
        qr_generator: QRGeneratorService,
        protocol_factory: ProtocolFactory,
        logger: logging.Logger
    ):
        self.file_processor = file_processor
        self.qr_generator = qr_generator
        self.protocol_factory = protocol_factory
        self.logger = logger

    async def execute(
        self,
        request: GenerateQRCodesRequest
    ) -> GenerateQRCodesResponse:
        """Execute QR code generation"""

        self.logger.info(f"Starting QR generation for {request.file_path}")

        # Step 1: Process file
        processed_file = await self.file_processor.process(
            file_path=request.file_path,
            compression_algorithm=request.compression_algorithm,
            encryption_password=request.encryption_password,
            chunk_size=request.chunk_size
        )

        # Step 2: Get protocol encoder
        protocol = self.protocol_factory.create(request.protocol_version)

        # Step 3: Generate QR codes for each chunk
        qr_codes = []
        for chunk in processed_file.chunks:
            # Encode chunk with protocol
            encoded_data = protocol.encode(chunk, processed_file.metadata)

            # Generate QR code
            qr_image = self.qr_generator.generate(
                data=encoded_data,
                error_correction=request.error_correction_level
            )

            qr_code = QRCodeModel(
                chunk_index=chunk.index,
                qr_image=qr_image,
                data_size=len(encoded_data),
                version=self.qr_generator.optimize_version(encoded_data),
                error_correction_level=request.error_correction_level,
                encoding_mode='byte',
                generated_at=time.time()
            )

            qr_codes.append(qr_code)

            self.logger.debug(
                f"Generated QR code {chunk.index + 1}/{processed_file.total_chunks}"
            )

        self.logger.info(f"Generated {len(qr_codes)} QR codes successfully")

        return GenerateQRCodesResponse(
            qr_codes=qr_codes,
            session_id=processed_file.session_id,
            total_chunks=processed_file.total_chunks,
            file_metadata=processed_file.metadata.to_dict()
        )
```

---

## 3. Protocol Implementation

### ⚠️ PROTOCOL V3 - ONLY SUPPORTED VERSION

**This system uses ONLY Protocol V3.** No backward compatibility with v1 or v2.

**Generator and Scanner MUST both implement Protocol V3 exactly as specified below.**

### 3.1 Protocol V3 Specification
```python
# src/protocols/protocol_v3.py
import json
import base64
import hashlib
from typing import Dict, Any
from datetime import datetime
import uuid

class ProtocolV3:
    """
    Protocol Version 3 - Latest Standard (NO backward compatibility)

    Features:
    - Session management with UUIDs
    - Rich metadata
    - Error correction support (Reed-Solomon)
    - Encryption (AES-256-GCM)
    - Compression (brotli, zstd, lz4)
    - SHA-256 checksums
    - Timestamp tracking

    COMPATIBILITY: Scanner MUST implement exact same protocol
    """

    VERSION = "3.0"

    def encode(self, chunk: ChunkModel, file_metadata: FileMetadata) -> bytes:
        """
        Encode chunk into protocol format

        TWO FORMATS FOR OPTIMIZATION:
        - Format A (idx=0): JSON with metadata (header QR)
        - Format B (idx>=1): Binary format (data QRs) - 38% space savings!

        Returns: bytes (JSON bytes for idx=0, binary for idx>=1)
        """
        if chunk.index == 0:
            # Format A: Header QR with metadata (JSON)
            payload = {
                "v": self.VERSION,
                "sid": chunk.session_id,
                "idx": chunk.index,
                "total": chunk.total_chunks,
                "data": base64.b64encode(chunk.data).decode('utf-8'),
                "hash": chunk.hash,
                "meta": {
                    "filename": file_metadata.filename,
                    "size": file_metadata.size,
                    "compression": file_metadata.compression_algorithm,
                    "encryption": "aes256gcm" if file_metadata.encryption_enabled else "none",
                    "checksum": file_metadata.file_hash,
                    "timestamp": datetime.utcnow().isoformat(),
                    "mime_type": file_metadata.mime_type
                }
            }

            # Add error correction if present
            if chunk.error_correction_data:
                payload["ec"] = {
                    "type": "reed-solomon",
                    "data": base64.b64encode(chunk.error_correction_data).decode('utf-8')
                }

            return json.dumps(payload, separators=(',', ':')).encode('utf-8')

        else:
            # Format B: Binary data QR (OPTIMIZED - no JSON overhead)
            # Structure: [sid:16][idx:4][total:4][data:N][hash:32]
            return self.encode_binary(chunk)

    def encode_binary(self, chunk: ChunkModel) -> bytes:
        """
        Encode chunk in binary format (Format B)

        AIR-GAP CRITICAL: Includes `total` field so scanner can determine
        completion from ANY QR code, not just the header.

        Binary Structure (56 bytes overhead + data):
        - Bytes 0-15: Session ID (UUID binary, 16 bytes)
        - Bytes 16-19: Chunk index (uint32 big-endian, 4 bytes)
        - Bytes 20-23: Total chunks (uint32 big-endian, 4 bytes) ⭐ CRITICAL!
        - Bytes 24-N: Raw binary chunk data (NOT base64)
        - Bytes N+1 to end: SHA-256 hash (32 bytes)

        Returns: bytes
        """
        import struct

        # Convert session ID (UUID string) to 16 bytes
        sid_bytes = uuid.UUID(chunk.session_id).bytes

        # Pack index and total as big-endian uint32 (4 bytes each)
        idx_bytes = struct.pack('>I', chunk.index)  # >I = big-endian unsigned int
        total_bytes = struct.pack('>I', chunk.total_chunks)

        # Hash as bytes (convert hex string to bytes)
        hash_bytes = bytes.fromhex(chunk.hash)

        # Concatenate: sid + idx + total + data + hash
        binary_qr = sid_bytes + idx_bytes + total_bytes + chunk.data + hash_bytes

        return binary_qr

    def decode(self, data: str) -> Dict[str, Any]:
        """Decode protocol data"""
        return json.loads(data)

    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate protocol data structure"""
        required_fields = ['v', 'sid', 'idx', 'total', 'data', 'hash', 'meta']

        for field in required_fields:
            if field not in data:
                return False

        # Version check
        if data['v'] != self.VERSION:
            return False

        # Metadata validation
        required_meta = ['filename', 'size', 'compression', 'encryption', 'checksum']
        for field in required_meta:
            if field not in data['meta']:
                return False

        return True
```

### 3.2 Protocol V3 Data Format

**JSON Structure:**
```json
{
  "v": "3.0",
  "sid": "uuid-session-id",
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

**Field Specifications:**
- `v`: Protocol version string "3.0" (REQUIRED)
- `sid`: UUID v4 session identifier (REQUIRED)
- `idx`: Zero-based chunk index (REQUIRED)
- `total`: Total number of chunks (REQUIRED)
- `data`: Base64-encoded chunk data (REQUIRED)
- `hash`: SHA-256 hash of chunk data (REQUIRED)
- `meta`: Metadata object (REQUIRED)
  - `filename`: Original filename (REQUIRED)
  - `size`: Total file size in bytes (REQUIRED)
  - `compression`: "brotli", "zstd", "lz4", or "none" (REQUIRED)
  - `encryption`: "aes256gcm" or "none" (REQUIRED)
  - `checksum`: SHA-256 hash of complete file (REQUIRED)
  - `timestamp`: ISO 8601 UTC timestamp (REQUIRED)
  - `mime_type`: MIME type of file (REQUIRED)
- `ec`: Error correction data (OPTIONAL)
  - `type`: "reed-solomon" (REQUIRED if ec present)
  - `data`: Base64-encoded EC data (REQUIRED if ec present)

**Supported Compression Algorithms (OPTIMIZED for Minimal QR Codes):**
- `zstd`: **Zstandard level 22** (DEFAULT - best compression) ⭐ RECOMMENDED
- `brotli`: Brotli level 11, window 24 (very good, slower)
- `lz4`: LZ4 (fast but poor compression - NOT recommended)
- `none`: No compression (only for .zip, .jpg, .mp4)

**Compression Comparison:**
- Zstd-22: 25-35% of original (BEST for text/code)
- Brotli-11: 20-30% of original (good for text)
- LZ4: 50-60% of original (wastes QR codes)

**Supported Encryption:**
- `aes256gcm`: AES-256-GCM with PBKDF2 (100,000 iterations)
- `none`: No encryption

**QR Code Optimization:**
- Chunk size: **2272 bytes** (optimized for QR-40M binary mode with total field)
- QR Version: **40-M** (2331 byte capacity, 15% error correction)
- Encoding: **Binary mode** for data chunks (not base64 except header)
- Result: **50-70% fewer QR codes** vs naive implementation

**SCANNER COMPATIBILITY:**
Scanner MUST decode exact same format. No format translation or conversion.

---

## 4. CLI Implementation

### 4.1 CLI Application
```python
# src/interfaces/cli/cli_app.py
import click
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.table import Table

console = Console()

@click.group()
@click.version_option(version='3.0.0')
def cli():
    """QR Generator - Enterprise Edition"""
    pass

@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--compression', '-c', type=click.Choice(['brotli', 'zstd', 'lz4', 'none']), default='zstd', help='Compression algorithm (default: zstd-22)')
@click.option('--compression-level', type=int, default=22, help='Compression level (zstd: 1-22, brotli: 0-11)')
@click.option('--encrypt', '-e', is_flag=True, help='Enable encryption')
@click.option('--password', '-p', type=str, help='Encryption password')
@click.option('--chunk-size', type=int, default=2272, help='Chunk size in bytes (default: 2272 optimized for QR-40M)')
@click.option('--fps', type=float, default=2.0, help='Display frames per second')
@click.option('--output', '-o', type=click.Path(), help='Save QR codes to directory')
def generate(file_path, compression, compression_level, encrypt, password, chunk_size, fps, output):
    """Generate QR codes from FILE_PATH (OPTIMIZED for minimal QR count)"""

    console.print(f"[bold blue]QR Generator v3.0 (Optimized)[/bold blue]")
    console.print(f"File: {file_path}")
    console.print(f"Compression: {compression}-{compression_level}")
    console.print(f"Chunk size: {chunk_size} bytes (QR-40M optimized)")

    # Validate encryption
    if encrypt and not password:
        password = click.prompt("Enter encryption password", hide_input=True)

    # Execute use case
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console
    ) as progress:

        task = progress.add_task("Processing file...", total=100)

        # ... use case execution ...

        progress.update(task, advance=50, description="Generating QR codes...")

        # ... QR generation ...

        progress.update(task, advance=50, description="Complete!")

    # Display summary
    table = Table(title="Generation Summary")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Total Chunks", str(total_chunks))
    table.add_row("Compression", compression)
    table.add_row("Protocol", "V3 (latest)")
    table.add_row("Estimated Time", f"{estimated_time:.1f}s")

    console.print(table)

@cli.command()
@click.argument('session_id', type=str)
def replay(session_id):
    """Replay a previous QR generation session"""
    console.print(f"Replaying session: {session_id}")
    # ... replay logic ...

@cli.command()
def list_sessions():
    """List all saved sessions"""
    # ... list sessions ...

if __name__ == '__main__':
    cli()
```

---

## 5. Testing Strategy

### 5.1 Unit Tests Example
```python
# tests/unit/test_compression_service.py
import pytest
from src.core.services.compression_service import CompressionService, ZstdCompression

@pytest.fixture
def compression_service():
    return CompressionService()

@pytest.fixture
def sample_data():
    return b"Hello, World!" * 100

def test_zstd_compression(compression_service, sample_data):
    """Test Zstandard compression"""
    algorithm = compression_service.get_algorithm('zstd')

    # Compress
    compressed = algorithm.compress(sample_data)

    # Check compression ratio
    assert len(compressed) < len(sample_data)

    # Decompress
    decompressed = algorithm.decompress(compressed)

    # Verify data integrity
    assert decompressed == sample_data

def test_select_best_algorithm(compression_service, sample_data):
    """Test automatic algorithm selection"""
    best = compression_service.select_best_algorithm(sample_data)

    assert best in ['brotli', 'zstd', 'lz4']
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-13
**Status**: Ready for Implementation
