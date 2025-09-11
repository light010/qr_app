"""
QR Data Parser - Protocol Compatibility
======================================

Parser for QR code data formats with full qr_transfer protocol compatibility.
Designed with Apple's attention to detail and robust error handling.
"""

import json
import base64
import hashlib
import re
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Any, Union, List
import logging

from ..core.config import QRReceiverConfig


class QRFormat(Enum):
    """Supported QR data formats"""
    QRFILE_V2 = "qrfile/v2"
    QRFILE_V1 = "qrfile/v1"
    SIMPLE = "simple"
    UNKNOWN = "unknown"


@dataclass
class ParsedQRData:
    """
    Parsed QR data with comprehensive metadata
    
    Apple-inspired design with elegant error handling and
    complete protocol compatibility.
    """
    # Core chunk data
    chunk_index: int
    chunk_data: Optional[bytes] = None
    chunk_hash: Optional[str] = None
    
    # File metadata
    filename: Optional[str] = None
    total_chunks: int = 0
    file_size: Optional[int] = None
    file_hash: Optional[str] = None
    
    # Protocol information
    format_version: str = "unknown"
    algorithm: str = "sha256"
    
    # Compression & encryption
    compression_algorithm: Optional[str] = None
    compression_ratio: Optional[float] = None
    encryption_enabled: bool = False
    
    # Error correction
    reed_solomon_enabled: bool = False
    reed_solomon_blocks: int = 0
    reed_solomon_parity: int = 0
    
    # Validation state
    is_valid: bool = False
    error: Optional[str] = None
    
    # Raw data for debugging
    raw_data: Optional[str] = None
    parsed_json: Optional[Dict[str, Any]] = None


class QRDataParser:
    """
    QR Data Parser with Apple-inspired design
    
    Handles multiple protocol formats with elegant error recovery
    and beautiful logging for debugging.
    """
    
    def __init__(self, config: QRReceiverConfig):
        """Initialize parser with Apple-inspired defaults"""
        self.config = config
        self.logger = self._setup_logging()
        self.supported_formats = set(config.supported_formats)
        
        # Statistics for Apple-inspired analytics
        self.stats = {
            "total_parsed": 0,
            "successful_parses": 0,
            "failed_parses": 0,
            "format_counts": {},
            "average_chunk_size": 0,
            "error_types": {}
        }
        
        self.logger.info("🔍 QR Data Parser initialized with Apple-inspired design")
        self.logger.info(f"📄 Supported formats: {', '.join(config.supported_formats)}")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging with appropriate level"""
        logger = logging.getLogger("QRDataParser")
        
        if self.config.debug_mode:
            logger.setLevel(logging.DEBUG)
        elif self.config.air_gapped:
            logger.setLevel(logging.WARNING)  # Minimal logging for security
        else:
            logger.setLevel(logging.INFO)
        
        return logger
    
    async def parse(self, qr_data: str) -> ParsedQRData:
        """
        Parse QR data with Apple-style error handling
        
        Args:
            qr_data: Raw QR code data string
            
        Returns:
            ParsedQRData with validation results
        """
        try:
            self.stats["total_parsed"] += 1
            
            # Validate input
            if not qr_data or not isinstance(qr_data, str):
                return self._create_error_result("Empty or invalid QR data", qr_data)
            
            # Detect format
            format_type = self._detect_format(qr_data)
            self.stats["format_counts"][format_type.value] = \
                self.stats["format_counts"].get(format_type.value, 0) + 1
            
            # Parse based on format
            if format_type == QRFormat.QRFILE_V2:
                result = await self._parse_qrfile_v2(qr_data)
            elif format_type == QRFormat.QRFILE_V1:
                result = await self._parse_qrfile_v1(qr_data)
            elif format_type == QRFormat.SIMPLE:
                result = await self._parse_simple_format(qr_data)
            else:
                result = self._create_error_result("Unsupported QR format", qr_data)
            
            # Update statistics
            if result.is_valid:
                self.stats["successful_parses"] += 1
                if result.chunk_data:
                    self._update_chunk_size_stats(len(result.chunk_data))
            else:
                self.stats["failed_parses"] += 1
                error_type = result.error or "unknown"
                self.stats["error_types"][error_type] = \
                    self.stats["error_types"].get(error_type, 0) + 1
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Parser error: {e}")
            return self._create_error_result(f"Parser exception: {e}", qr_data)
    
    def _detect_format(self, qr_data: str) -> QRFormat:
        """Detect QR data format with Apple-style pattern matching"""
        try:
            # Try JSON parsing first (most common)
            if qr_data.strip().startswith('{') and qr_data.strip().endswith('}'):
                try:
                    data = json.loads(qr_data)
                    if isinstance(data, dict):
                        fmt = data.get("fmt", "").lower()
                        if fmt == "qrfile/v2":
                            return QRFormat.QRFILE_V2
                        elif fmt == "qrfile/v1":
                            return QRFormat.QRFILE_V1
                except json.JSONDecodeError:
                    pass
            
            # Check simple format pattern (F:filename:I:index:T:total:D:data)
            if re.match(r'^F:[^:]+:I:\d+:T:\d+:D:', qr_data):
                return QRFormat.SIMPLE
            
            # Default to unknown
            return QRFormat.UNKNOWN
            
        except Exception as e:
            self.logger.debug(f"🔍 Format detection error: {e}")
            return QRFormat.UNKNOWN
    
    async def _parse_qrfile_v2(self, qr_data: str) -> ParsedQRData:
        """Parse qrfile/v2 format (main format)"""
        try:
            # Parse JSON
            data = json.loads(qr_data)
            
            # Validate required fields
            required_fields = ["fmt", "index", "total", "data_b64"]
            for field in required_fields:
                if field not in data:
                    return self._create_error_result(f"Missing required field: {field}", qr_data)
            
            # Extract core data
            chunk_index = data["index"]
            total_chunks = data["total"]
            
            # Validate indices
            if not isinstance(chunk_index, int) or chunk_index < 0:
                return self._create_error_result("Invalid chunk index", qr_data)
            
            if not isinstance(total_chunks, int) or total_chunks <= 0:
                return self._create_error_result("Invalid total chunks", qr_data)
            
            if chunk_index >= total_chunks:
                return self._create_error_result("Chunk index exceeds total", qr_data)
            
            # Decode chunk data
            try:
                chunk_data = base64.b64decode(data["data_b64"])
            except Exception as e:
                return self._create_error_result(f"Base64 decode error: {e}", qr_data)
            
            # Create result
            result = ParsedQRData(
                chunk_index=chunk_index,
                chunk_data=chunk_data,
                chunk_hash=data.get("chunk_sha256"),
                filename=data.get("name"),
                total_chunks=total_chunks,
                file_size=data.get("size"),
                file_hash=data.get("file_sha256"),
                format_version="qrfile/v2",
                algorithm=data.get("algo", "sha256"),
                compression_algorithm=data.get("compression_algorithm"),
                compression_ratio=data.get("compression_ratio"),
                encryption_enabled=data.get("encryption_enabled", False),
                reed_solomon_enabled=data.get("rs_enabled", False),
                reed_solomon_blocks=data.get("rs_blocks", 0),
                reed_solomon_parity=data.get("rs_parity", 0),
                is_valid=True,
                raw_data=qr_data,
                parsed_json=data
            )
            
            self.logger.debug(f"📄 qrfile/v2 parsed: chunk {chunk_index}/{total_chunks}")
            return result
            
        except json.JSONDecodeError as e:
            return self._create_error_result(f"JSON decode error: {e}", qr_data)
        except Exception as e:
            return self._create_error_result(f"qrfile/v2 parse error: {e}", qr_data)
    
    async def _parse_qrfile_v1(self, qr_data: str) -> ParsedQRData:
        """Parse qrfile/v1 format (legacy compatibility)"""
        try:
            # Parse JSON
            data = json.loads(qr_data)
            
            # Validate required fields (v1 has fewer requirements)
            required_fields = ["fmt", "index", "total", "data_b64"]
            for field in required_fields:
                if field not in data:
                    return self._create_error_result(f"Missing required field: {field}", qr_data)
            
            # Extract core data
            chunk_index = data["index"]
            total_chunks = data["total"]
            
            # Validate indices
            if not isinstance(chunk_index, int) or chunk_index < 0:
                return self._create_error_result("Invalid chunk index", qr_data)
            
            if not isinstance(total_chunks, int) or total_chunks <= 0:
                return self._create_error_result("Invalid total chunks", qr_data)
            
            # Decode chunk data
            try:
                chunk_data = base64.b64decode(data["data_b64"])
            except Exception as e:
                return self._create_error_result(f"Base64 decode error: {e}", qr_data)
            
            # Create result (v1 has limited metadata)
            result = ParsedQRData(
                chunk_index=chunk_index,
                chunk_data=chunk_data,
                chunk_hash=data.get("chunk_hash"),  # Different field name in v1
                filename=data.get("name"),
                total_chunks=total_chunks,
                file_size=data.get("size"),
                format_version="qrfile/v1",
                algorithm=data.get("algo", "sha256"),
                reed_solomon_enabled=False,  # Not supported in v1
                is_valid=True,
                raw_data=qr_data,
                parsed_json=data
            )
            
            self.logger.debug(f"📄 qrfile/v1 parsed: chunk {chunk_index}/{total_chunks}")
            return result
            
        except json.JSONDecodeError as e:
            return self._create_error_result(f"JSON decode error: {e}", qr_data)
        except Exception as e:
            return self._create_error_result(f"qrfile/v1 parse error: {e}", qr_data)
    
    async def _parse_simple_format(self, qr_data: str) -> ParsedQRData:
        """Parse simple format (F:filename:I:index:T:total:D:data)"""
        try:
            # Split by colons
            parts = qr_data.split(':')
            
            if len(parts) < 6 or parts[0] != 'F' or parts[2] != 'I' or parts[4] != 'T' or parts[6] != 'D':
                return self._create_error_result("Invalid simple format structure", qr_data)
            
            # Extract data
            filename = parts[1]
            chunk_index = int(parts[3])
            total_chunks = int(parts[5])
            
            # Reconstruct data part (may contain colons)
            data_part = ':'.join(parts[7:]) if len(parts) > 7 else parts[6] if len(parts) > 6 else ""
            
            # Decode base64 data
            try:
                chunk_data = base64.b64decode(data_part)
            except Exception as e:
                return self._create_error_result(f"Base64 decode error: {e}", qr_data)
            
            # Create result
            result = ParsedQRData(
                chunk_index=chunk_index,
                chunk_data=chunk_data,
                filename=filename,
                total_chunks=total_chunks,
                format_version="simple",
                algorithm="unknown",
                is_valid=True,
                raw_data=qr_data
            )
            
            self.logger.debug(f"📄 Simple format parsed: chunk {chunk_index}/{total_chunks}")
            return result
            
        except (ValueError, IndexError) as e:
            return self._create_error_result(f"Simple format parse error: {e}", qr_data)
        except Exception as e:
            return self._create_error_result(f"Simple format error: {e}", qr_data)
    
    def _create_error_result(self, error_message: str, raw_data: Optional[str] = None) -> ParsedQRData:
        """Create error result with Apple-style error handling"""
        result = ParsedQRData(
            chunk_index=-1,
            is_valid=False,
            error=error_message,
            raw_data=raw_data
        )
        
        self.logger.warning(f"❌ Parse error: {error_message}")
        if self.config.debug_mode and raw_data:
            self.logger.debug(f"🔍 Raw data: {raw_data[:100]}...")
        
        return result
    
    def _update_chunk_size_stats(self, chunk_size: int) -> None:
        """Update average chunk size statistics"""
        try:
            current_avg = self.stats["average_chunk_size"]
            total_successful = self.stats["successful_parses"]
            
            if total_successful == 1:
                self.stats["average_chunk_size"] = chunk_size
            else:
                # Running average calculation
                self.stats["average_chunk_size"] = \
                    ((current_avg * (total_successful - 1)) + chunk_size) / total_successful
                    
        except Exception as e:
            self.logger.debug(f"🔍 Stats update error: {e}")
    
    def get_format_info(self, format_type: QRFormat) -> Dict[str, Any]:
        """Get information about a specific format"""
        format_info = {
            QRFormat.QRFILE_V2: {
                "name": "QRFile Version 2",
                "description": "Advanced JSON format with compression, encryption, and Reed-Solomon support",
                "features": ["compression", "encryption", "reed_solomon", "integrity_check", "metadata"],
                "compatibility": "Full"
            },
            QRFormat.QRFILE_V1: {
                "name": "QRFile Version 1", 
                "description": "Legacy JSON format with basic metadata",
                "features": ["basic_metadata", "integrity_check"],
                "compatibility": "Limited"
            },
            QRFormat.SIMPLE: {
                "name": "Simple Format",
                "description": "Colon-separated format for basic transfers",
                "features": ["basic_transfer"],
                "compatibility": "Basic"
            },
            QRFormat.UNKNOWN: {
                "name": "Unknown Format",
                "description": "Unsupported or corrupted format",
                "features": [],
                "compatibility": "None"
            }
        }
        
        return format_info.get(format_type, format_info[QRFormat.UNKNOWN])
    
    def get_parser_stats(self) -> Dict[str, Any]:
        """Get Apple-inspired parser statistics"""
        total = self.stats["total_parsed"]
        successful = self.stats["successful_parses"]
        
        return {
            "overview": {
                "total_parsed": total,
                "successful_parses": successful,
                "failed_parses": self.stats["failed_parses"],
                "success_rate": round((successful / max(1, total)) * 100, 1)
            },
            "formats": self.stats["format_counts"],
            "performance": {
                "average_chunk_size": round(self.stats["average_chunk_size"], 1),
                "most_common_format": max(self.stats["format_counts"], 
                                        key=self.stats["format_counts"].get) if self.stats["format_counts"] else "none"
            },
            "errors": self.stats["error_types"]
        }
    
    def validate_chunk_integrity(self, parsed_data: ParsedQRData) -> bool:
        """Validate chunk integrity using hash verification"""
        try:
            if not parsed_data.is_valid or not parsed_data.chunk_data:
                return False
            
            if not parsed_data.chunk_hash:
                return True  # No hash to verify against
            
            # Calculate actual hash
            actual_hash = hashlib.sha256(parsed_data.chunk_data).hexdigest()
            
            # Compare with expected (handle truncated hashes)
            expected = parsed_data.chunk_hash
            if len(expected) < len(actual_hash):
                actual_short = actual_hash[:len(expected)]
                return actual_short.lower() == expected.lower()
            else:
                return actual_hash.lower() == expected.lower()
                
        except Exception as e:
            self.logger.error(f"❌ Integrity validation error: {e}")
            return False
    
    def get_supported_formats(self) -> List[str]:
        """Get list of supported format versions"""
        return list(self.supported_formats)
    
    def is_format_supported(self, format_version: str) -> bool:
        """Check if format version is supported"""
        return format_version in self.supported_formats
    
    def reset_stats(self) -> None:
        """Reset parser statistics (air-gapped memory management)"""
        self.stats = {
            "total_parsed": 0,
            "successful_parses": 0,
            "failed_parses": 0,
            "format_counts": {},
            "average_chunk_size": 0,
            "error_types": {}
        }
        self.logger.info("📊 Parser statistics reset")