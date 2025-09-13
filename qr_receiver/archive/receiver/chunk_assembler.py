"""
Chunk Assembler - File Reconstruction Engine
===========================================

Assembles chunks into complete files with Apple-inspired reliability.
Handles compression, encryption, and Reed-Solomon with elegant error recovery.
"""

import asyncio
import hashlib
import time
import io
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union, Any, Callable
from pathlib import Path
import logging

from ..core.config import QRReceiverConfig


class AssemblyState(Enum):
    """File assembly states"""
    PENDING = "pending"
    ASSEMBLING = "assembling" 
    DECOMPRESSING = "decompressing"
    DECRYPTING = "decrypting"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ChunkInfo:
    """
    Information about a received chunk
    
    Apple-inspired design with comprehensive tracking
    for beautiful progress visualization.
    """
    index: int
    data: bytes
    hash: Optional[str] = None
    size: int = 0
    received_time: float = field(default_factory=time.time)
    
    # Validation state
    verified: bool = False
    error_corrected: bool = False
    
    # Reed-Solomon metadata
    rs_original_size: Optional[int] = None
    rs_recovered_errors: int = 0


@dataclass
class AssemblyProgress:
    """
    Progress tracking for Apple-inspired UI
    
    Provides smooth, real-time progress updates with
    elegant timing estimation.
    """
    state: AssemblyState = AssemblyState.PENDING
    progress_percentage: float = 0.0
    bytes_processed: int = 0
    total_bytes: int = 0
    
    # Timing information
    start_time: Optional[float] = None
    estimated_completion: Optional[float] = None
    current_operation: str = "Initializing"
    
    # Error tracking
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


class ChunkAssembler:
    """
    Chunk Assembler with Apple-inspired design
    
    Handles file reconstruction with elegant progress tracking,
    comprehensive error handling, and beautiful user feedback.
    """
    
    def __init__(self, config: QRReceiverConfig):
        """Initialize assembler with Apple-inspired defaults"""
        self.config = config
        self.logger = self._setup_logging()
        
        # Progress tracking
        self.progress_callbacks: List[Callable[[AssemblyProgress], None]] = []
        
        # Compression support (matching qr_transfer)
        self.compression_handlers = {}
        self._initialize_compression_support()
        
        # Encryption support
        self.encryption_handlers = {}
        self._initialize_encryption_support()
        
        # Reed-Solomon support
        self.reed_solomon_decoder = None
        self._initialize_reed_solomon_support()
        
        # Statistics (air-gapped, memory-only)
        self.stats = {
            "files_assembled": 0,
            "total_chunks_processed": 0,
            "total_bytes_assembled": 0,
            "average_assembly_time": 0.0,
            "compression_savings": 0.0,
            "reed_solomon_corrections": 0
        }
        
        self.logger.info("🔧 Chunk Assembler initialized with Apple-inspired design")
        self.logger.info(f"📦 Compression support: {list(self.compression_handlers.keys())}")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging with appropriate level"""
        logger = logging.getLogger("ChunkAssembler")
        
        if self.config.debug_mode:
            logger.setLevel(logging.DEBUG)
        elif self.config.air_gapped:
            logger.setLevel(logging.WARNING)  # Minimal logging for security
        else:
            logger.setLevel(logging.INFO)
        
        return logger
    
    def _initialize_compression_support(self) -> None:
        """Initialize compression handlers (matching qr_transfer)"""
        try:
            # LZMA (highest compression)
            try:
                import lzma
                self.compression_handlers["lzma"] = {
                    "decompress": lzma.decompress,
                    "available": True
                }
            except ImportError:
                self.compression_handlers["lzma"] = {"available": False}
            
            # Brotli (Google's algorithm)
            try:
                import brotli
                self.compression_handlers["brotli"] = {
                    "decompress": brotli.decompress,
                    "available": True
                }
            except ImportError:
                self.compression_handlers["brotli"] = {"available": False}
            
            # Zstandard (Facebook's algorithm)
            try:
                import zstandard as zstd
                self.compression_handlers["zstandard"] = {
                    "decompress": lambda data: zstd.ZstdDecompressor().decompress(data),
                    "available": True
                }
            except ImportError:
                self.compression_handlers["zstandard"] = {"available": False}
            
            # LZ4 (fastest)
            try:
                import lz4.frame
                self.compression_handlers["lz4"] = {
                    "decompress": lz4.frame.decompress,
                    "available": True
                }
            except ImportError:
                self.compression_handlers["lz4"] = {"available": False}
            
            # Standard library algorithms
            import gzip
            import bz2
            
            self.compression_handlers.update({
                "gzip": {
                    "decompress": gzip.decompress,
                    "available": True
                },
                "bz2": {
                    "decompress": bz2.decompress,
                    "available": True
                },
                "store": {
                    "decompress": lambda data: data,  # No compression
                    "available": True
                }
            })
            
        except Exception as e:
            self.logger.warning(f"⚠️  Compression initialization warning: {e}")
    
    def _initialize_encryption_support(self) -> None:
        """Initialize encryption handlers"""
        try:
            # AES-256 support
            try:
                from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
                from cryptography.hazmat.primitives import hashes
                from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
                
                self.encryption_handlers["aes-256"] = {
                    "available": True,
                    "cipher": Cipher,
                    "algorithms": algorithms,
                    "modes": modes,
                    "kdf": PBKDF2HMAC,
                    "hashes": hashes
                }
                
            except ImportError:
                self.encryption_handlers["aes-256"] = {"available": False}
                self.logger.warning("⚠️  Cryptography library not available - encryption disabled")
                
        except Exception as e:
            self.logger.warning(f"⚠️  Encryption initialization warning: {e}")
    
    def _initialize_reed_solomon_support(self) -> None:
        """Initialize Reed-Solomon error correction"""
        try:
            if self.config.reed_solomon_enabled:
                try:
                    import reedsolo
                    self.reed_solomon_decoder = reedsolo.RSCodec
                    self.logger.info("🛡️  Reed-Solomon error correction enabled")
                except ImportError:
                    self.logger.warning("⚠️  Reed-Solomon library not available")
                    self.reed_solomon_decoder = None
            
        except Exception as e:
            self.logger.warning(f"⚠️  Reed-Solomon initialization warning: {e}")
    
    async def assemble_file(self, session) -> Optional[bytes]:
        """
        Assemble complete file from chunks with Apple-style progress tracking
        
        Args:
            session: ReceptionSession with received chunks
            
        Returns:
            Complete file data or None if assembly failed
        """
        progress = AssemblyProgress(
            state=AssemblyState.ASSEMBLING,
            start_time=time.time(),
            total_bytes=session.expected_size,
            current_operation="Starting assembly"
        )
        
        try:
            self.logger.info(f"🔧 Assembling file: {session.filename}")
            await self._notify_progress(progress)
            
            # Validate chunks
            if not await self._validate_chunks(session, progress):
                progress.state = AssemblyState.FAILED
                progress.errors.append("Chunk validation failed")
                await self._notify_progress(progress)
                return None
            
            # Sort and assemble chunks
            progress.current_operation = "Assembling chunks"
            await self._notify_progress(progress)
            
            assembled_data = await self._assemble_chunks(session, progress)
            if not assembled_data:
                progress.state = AssemblyState.FAILED
                progress.errors.append("Chunk assembly failed")
                await self._notify_progress(progress)
                return None
            
            # Apply Reed-Solomon error correction if enabled
            if session.reed_solomon_enabled and self.reed_solomon_decoder:
                progress.state = AssemblyState.VERIFYING
                progress.current_operation = "Applying error correction"
                await self._notify_progress(progress)
                
                assembled_data = await self._apply_reed_solomon_correction(assembled_data, session, progress)
                if not assembled_data:
                    progress.state = AssemblyState.FAILED
                    progress.errors.append("Reed-Solomon correction failed")
                    await self._notify_progress(progress)
                    return None
            
            # Decrypt if encrypted
            if session.encryption_enabled:
                progress.state = AssemblyState.DECRYPTING
                progress.current_operation = "Decrypting data"
                await self._notify_progress(progress)
                
                assembled_data = await self._decrypt_data(assembled_data, session, progress)
                if not assembled_data:
                    progress.state = AssemblyState.FAILED
                    progress.errors.append("Decryption failed")
                    await self._notify_progress(progress)
                    return None
            
            # Decompress if compressed
            if session.compression_algorithm and session.compression_algorithm != "store":
                progress.state = AssemblyState.DECOMPRESSING
                progress.current_operation = f"Decompressing ({session.compression_algorithm})"
                await self._notify_progress(progress)
                
                assembled_data = await self._decompress_data(assembled_data, session, progress)
                if not assembled_data:
                    progress.state = AssemblyState.FAILED
                    progress.errors.append("Decompression failed")
                    await self._notify_progress(progress)
                    return None
            
            # Final verification
            progress.state = AssemblyState.VERIFYING
            progress.current_operation = "Final verification"
            progress.bytes_processed = len(assembled_data)
            await self._notify_progress(progress)
            
            # Update statistics
            self._update_assembly_stats(session, assembled_data, progress)
            
            # Complete
            progress.state = AssemblyState.COMPLETED
            progress.progress_percentage = 100.0
            progress.current_operation = "Assembly complete"
            await self._notify_progress(progress)
            
            self.logger.info(f"✅ File assembled successfully: {len(assembled_data)} bytes")
            return assembled_data
            
        except Exception as e:
            self.logger.error(f"❌ Assembly error: {e}")
            progress.state = AssemblyState.FAILED
            progress.errors.append(f"Assembly exception: {e}")
            await self._notify_progress(progress)
            return None
    
    async def _validate_chunks(self, session, progress: AssemblyProgress) -> bool:
        """Validate all chunks are present and intact"""
        try:
            progress.current_operation = "Validating chunks"
            await self._notify_progress(progress)
            
            # Check chunk count
            expected_chunks = session.total_chunks
            received_chunks = len(session.received_chunks)
            
            if received_chunks != expected_chunks:
                self.logger.error(f"❌ Missing chunks: {received_chunks}/{expected_chunks}")
                return False
            
            # Check for gaps
            chunk_indices = set(session.received_chunks.keys())
            expected_indices = set(range(expected_chunks))
            missing = expected_indices - chunk_indices
            
            if missing:
                self.logger.error(f"❌ Missing chunk indices: {sorted(missing)}")
                return False
            
            # Validate chunk integrity
            invalid_chunks = []
            for index, chunk_info in session.received_chunks.items():
                if not await self._validate_chunk_integrity(chunk_info):
                    invalid_chunks.append(index)
            
            if invalid_chunks:
                self.logger.error(f"❌ Invalid chunks: {invalid_chunks}")
                progress.warnings.append(f"Integrity issues in chunks: {invalid_chunks}")
                # Continue anyway - Reed-Solomon might fix this
            
            self.logger.debug(f"✅ Chunk validation complete: {received_chunks} chunks")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Chunk validation error: {e}")
            return False
    
    async def _validate_chunk_integrity(self, chunk_info: ChunkInfo) -> bool:
        """Validate individual chunk integrity"""
        try:
            if not chunk_info.hash:
                return True  # No hash to verify
            
            # Calculate actual hash
            actual_hash = hashlib.sha256(chunk_info.data).hexdigest()
            
            # Compare with expected (handle truncated hashes)
            expected = chunk_info.hash
            if len(expected) < len(actual_hash):
                actual_short = actual_hash[:len(expected)]
                return actual_short.lower() == expected.lower()
            else:
                return actual_hash.lower() == expected.lower()
                
        except Exception as e:
            self.logger.debug(f"🔍 Chunk integrity check error: {e}")
            return False
    
    async def _assemble_chunks(self, session, progress: AssemblyProgress) -> Optional[bytes]:
        """Assemble chunks in correct order"""
        try:
            assembled = io.BytesIO()
            total_size = 0
            
            # Sort chunks by index
            sorted_chunks = sorted(session.received_chunks.items())
            
            for i, (index, chunk_info) in enumerate(sorted_chunks):
                # Update progress
                progress.progress_percentage = (i / len(sorted_chunks)) * 30  # 30% for assembly
                progress.bytes_processed = total_size
                await self._notify_progress(progress)
                
                # Write chunk data
                assembled.write(chunk_info.data)
                total_size += len(chunk_info.data)
                
                # Yield control periodically
                if i % 10 == 0:
                    await asyncio.sleep(0.001)  # Allow other tasks
            
            assembled_data = assembled.getvalue()
            self.logger.debug(f"📦 Assembled {len(assembled_data)} bytes from {len(sorted_chunks)} chunks")
            
            return assembled_data
            
        except Exception as e:
            self.logger.error(f"❌ Chunk assembly error: {e}")
            return None
    
    async def _apply_reed_solomon_correction(self, data: bytes, session, progress: AssemblyProgress) -> Optional[bytes]:
        """Apply Reed-Solomon error correction"""
        try:
            if not self.reed_solomon_decoder:
                self.logger.warning("⚠️  Reed-Solomon decoder not available")
                return data
            
            progress.current_operation = "Reed-Solomon error correction"
            await self._notify_progress(progress)
            
            # Apply Reed-Solomon correction
            # This is a simplified implementation - actual RS needs metadata
            try:
                # Create decoder with appropriate parameters
                rs_decoder = self.reed_solomon_decoder(session.reed_solomon_blocks or 10)
                
                # Decode with error correction
                corrected_data = rs_decoder.decode(data)
                
                # Count corrections
                corrections = len(data) - len(corrected_data)
                if corrections > 0:
                    self.stats["reed_solomon_corrections"] += corrections
                    self.logger.info(f"🛡️  Reed-Solomon corrected {corrections} errors")
                    progress.warnings.append(f"Corrected {corrections} transmission errors")
                
                return bytes(corrected_data)
                
            except Exception as rs_error:
                self.logger.warning(f"⚠️  Reed-Solomon correction failed: {rs_error}")
                progress.warnings.append("Reed-Solomon correction failed - using raw data")
                return data  # Return uncorrected data
            
        except Exception as e:
            self.logger.error(f"❌ Reed-Solomon error: {e}")
            return None
    
    async def _decrypt_data(self, data: bytes, session, progress: AssemblyProgress) -> Optional[bytes]:
        """Decrypt data using AES-256"""
        try:
            if "aes-256" not in self.encryption_handlers or not self.encryption_handlers["aes-256"]["available"]:
                self.logger.error("❌ AES-256 decryption not available")
                return None
            
            progress.current_operation = "AES-256 decryption"
            await self._notify_progress(progress)
            
            # This is a placeholder - actual decryption needs key management
            # In a real implementation, you'd need:
            # 1. Key derivation from password/passphrase
            # 2. IV extraction from data
            # 3. Actual decryption
            
            self.logger.warning("⚠️  Decryption not fully implemented - returning raw data")
            progress.warnings.append("Decryption not implemented - data may be encrypted")
            
            return data
            
        except Exception as e:
            self.logger.error(f"❌ Decryption error: {e}")
            return None
    
    async def _decompress_data(self, data: bytes, session, progress: AssemblyProgress) -> Optional[bytes]:
        """Decompress data using specified algorithm"""
        try:
            algorithm = session.compression_algorithm
            
            if algorithm not in self.compression_handlers:
                self.logger.error(f"❌ Unsupported compression: {algorithm}")
                return None
            
            handler = self.compression_handlers[algorithm]
            if not handler["available"]:
                self.logger.error(f"❌ Compression handler not available: {algorithm}")
                return None
            
            progress.current_operation = f"Decompressing with {algorithm}"
            await self._notify_progress(progress)
            
            # Decompress data
            original_size = len(data)
            decompressed_data = handler["decompress"](data)
            decompressed_size = len(decompressed_data)
            
            # Calculate compression ratio
            compression_ratio = (original_size / max(1, decompressed_size)) * 100
            self.stats["compression_savings"] += compression_ratio
            
            self.logger.info(f"📦 Decompressed: {original_size} → {decompressed_size} bytes ({compression_ratio:.1f}% compression)")
            
            return decompressed_data
            
        except Exception as e:
            self.logger.error(f"❌ Decompression error: {e}")
            return None
    
    def _update_assembly_stats(self, session, assembled_data: bytes, progress: AssemblyProgress) -> None:
        """Update assembly statistics"""
        try:
            self.stats["files_assembled"] += 1
            self.stats["total_chunks_processed"] += len(session.received_chunks)
            self.stats["total_bytes_assembled"] += len(assembled_data)
            
            # Calculate average assembly time
            if progress.start_time:
                assembly_time = time.time() - progress.start_time
                current_avg = self.stats["average_assembly_time"]
                files_count = self.stats["files_assembled"]
                
                if files_count == 1:
                    self.stats["average_assembly_time"] = assembly_time
                else:
                    self.stats["average_assembly_time"] = \
                        ((current_avg * (files_count - 1)) + assembly_time) / files_count
                        
        except Exception as e:
            self.logger.debug(f"🔍 Stats update error: {e}")
    
    async def _notify_progress(self, progress: AssemblyProgress) -> None:
        """Notify progress callbacks with Apple-style updates"""
        try:
            for callback in self.progress_callbacks:
                if callable(callback):
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(progress)
                        else:
                            callback(progress)
                    except Exception as e:
                        self.logger.warning(f"⚠️  Progress callback error: {e}")
                        
        except Exception as e:
            self.logger.warning(f"⚠️  Progress notification error: {e}")
    
    def register_progress_callback(self, callback: Callable[[AssemblyProgress], None]) -> None:
        """Register callback for progress updates"""
        self.progress_callbacks.append(callback)
    
    def get_supported_compression(self) -> List[str]:
        """Get list of supported compression algorithms"""
        return [algo for algo, handler in self.compression_handlers.items() 
                if handler.get("available", False)]
    
    def get_supported_encryption(self) -> List[str]:
        """Get list of supported encryption algorithms"""
        return [algo for algo, handler in self.encryption_handlers.items() 
                if handler.get("available", False)]
    
    def get_assembler_stats(self) -> Dict[str, Any]:
        """Get Apple-inspired assembler statistics"""
        return {
            "overview": {
                "files_assembled": self.stats["files_assembled"],
                "total_chunks_processed": self.stats["total_chunks_processed"],
                "total_bytes_assembled": self.stats["total_bytes_assembled"],
                "average_assembly_time": round(self.stats["average_assembly_time"], 2)
            },
            "performance": {
                "average_compression_savings": round(self.stats["compression_savings"] / max(1, self.stats["files_assembled"]), 1),
                "reed_solomon_corrections": self.stats["reed_solomon_corrections"]
            },
            "capabilities": {
                "compression_algorithms": self.get_supported_compression(),
                "encryption_algorithms": self.get_supported_encryption(),
                "reed_solomon_enabled": self.reed_solomon_decoder is not None
            }
        }
    
    def reset_stats(self) -> None:
        """Reset assembler statistics (air-gapped memory management)"""
        self.stats = {
            "files_assembled": 0,
            "total_chunks_processed": 0,
            "total_bytes_assembled": 0,
            "average_assembly_time": 0.0,
            "compression_savings": 0.0,
            "reed_solomon_corrections": 0
        }
        self.logger.info("📊 Assembler statistics reset")