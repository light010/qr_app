"""
QR Receiver Engine - Main Reception Logic
=========================================

Core engine for receiving QR code transfers with full protocol compatibility.
Designed with Apple's principles: reliability, security, and elegant simplicity.
"""

import asyncio
import hashlib
import json
import time
import weakref
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Callable, Any, Union
from pathlib import Path
import logging

from ..core.config import QRReceiverConfig, SecurityLevel
from .data_parser import QRDataParser, ParsedQRData
from .chunk_assembler import ChunkAssembler, ChunkInfo


class ReceptionState(Enum):
    """Reception session states"""
    IDLE = "idle"
    RECEIVING = "receiving"
    ASSEMBLING = "assembling"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ReceptionSession:
    """
    Reception session for a file transfer
    
    Tracks all chunks for a single file transfer with Apple-inspired
    attention to detail and user experience.
    """
    session_id: str
    filename: str
    total_chunks: int
    expected_size: int
    expected_hash: Optional[str] = None
    
    # Reception tracking
    received_chunks: Dict[int, ChunkInfo] = field(default_factory=dict)
    state: ReceptionState = ReceptionState.IDLE
    start_time: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    
    # Metadata
    compression_algorithm: Optional[str] = None
    encryption_enabled: bool = False
    reed_solomon_enabled: bool = False
    format_version: str = "qrfile/v2"
    
    # Progress tracking
    bytes_received: int = 0
    progress_percentage: float = 0.0
    estimated_completion: Optional[float] = None
    
    # Error tracking
    error_count: int = 0
    failed_chunks: Set[int] = field(default_factory=set)
    integrity_failures: int = 0
    
    def update_progress(self) -> None:
        """Update progress calculation with Apple-style smooth updates"""
        if self.total_chunks > 0:
            self.progress_percentage = (len(self.received_chunks) / self.total_chunks) * 100
            
            # Estimate completion time
            if len(self.received_chunks) > 0:
                elapsed = time.time() - self.start_time
                rate = len(self.received_chunks) / elapsed
                remaining = self.total_chunks - len(self.received_chunks)
                self.estimated_completion = remaining / rate if rate > 0 else None
        
        self.last_activity = time.time()
    
    def is_complete(self) -> bool:
        """Check if all chunks have been received"""
        return len(self.received_chunks) == self.total_chunks
    
    def get_missing_chunks(self) -> List[int]:
        """Get list of missing chunk indices"""
        received_indices = set(self.received_chunks.keys())
        all_indices = set(range(self.total_chunks))
        return sorted(list(all_indices - received_indices))
    
    def get_status_summary(self) -> Dict[str, Any]:
        """Get comprehensive status for Apple-inspired UI"""
        return {
            "session_id": self.session_id,
            "filename": self.filename,
            "state": self.state.value,
            "progress": {
                "percentage": round(self.progress_percentage, 1),
                "chunks_received": len(self.received_chunks),
                "total_chunks": self.total_chunks,
                "missing_chunks": len(self.get_missing_chunks())
            },
            "timing": {
                "start_time": self.start_time,
                "last_activity": self.last_activity,
                "estimated_completion": self.estimated_completion
            },
            "file_info": {
                "expected_size": self.expected_size,
                "bytes_received": self.bytes_received,
                "compression": self.compression_algorithm,
                "encrypted": self.encryption_enabled,
                "reed_solomon": self.reed_solomon_enabled
            },
            "errors": {
                "error_count": self.error_count,
                "integrity_failures": self.integrity_failures,
                "failed_chunks": len(self.failed_chunks)
            }
        }


class QRReceiverEngine:
    """
    Main QR receiver engine with Apple-inspired design
    
    Handles multiple concurrent reception sessions with elegant error
    handling and beautiful progress tracking.
    """
    
    def __init__(self, config: QRReceiverConfig):
        """Initialize receiver engine with Apple-inspired defaults"""
        self.config = config
        self.logger = self._setup_logging()
        
        # Core components
        self.data_parser = QRDataParser(config)
        self.chunk_assembler = ChunkAssembler(config)
        
        # Session management
        self.active_sessions: Dict[str, ReceptionSession] = {}
        self.completed_sessions: Dict[str, ReceptionSession] = {}
        self.session_callbacks: Dict[str, List[Callable]] = {}
        
        # Statistics (air-gapped, memory-only)
        self.stats = {
            "total_sessions": 0,
            "completed_sessions": 0,
            "failed_sessions": 0,
            "total_chunks_received": 0,
            "total_bytes_received": 0,
            "average_session_time": 0.0,
            "error_rate": 0.0
        }
        
        # Security
        self.security_validator = None  # Will be imported on demand
        
        self.logger.info("🍎 QR Receiver Engine initialized with Apple-inspired design")
        self.logger.info(f"🔒 Security: {config.security_level.value}")
        self.logger.info(f"🎨 UI Theme: {config.theme}")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging with appropriate level"""
        logger = logging.getLogger("QRReceiverEngine")
        
        if self.config.debug_mode:
            logger.setLevel(logging.DEBUG)
        elif self.config.air_gapped:
            logger.setLevel(logging.WARNING)  # Minimal logging for security
        else:
            logger.setLevel(logging.INFO)
        
        return logger
    
    async def process_qr_data(self, qr_data: str, source_info: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process incoming QR data with Apple-style error handling
        
        Args:
            qr_data: Raw QR code data string
            source_info: Optional metadata about the source (camera, etc.)
        
        Returns:
            Processing result with status and session info
        """
        try:
            # Parse QR data
            parsed_data = await self.data_parser.parse(qr_data)
            if not parsed_data.is_valid:
                return self._create_error_response("Invalid QR data format", parsed_data.error)
            
            # Get or create session
            session = await self._get_or_create_session(parsed_data)
            
            # Process chunk
            result = await self._process_chunk(session, parsed_data)
            
            # Update session state
            session.update_progress()
            
            # Check if transfer is complete
            if session.is_complete():
                await self._complete_session(session)
            
            # Notify callbacks
            await self._notify_session_callbacks(session.session_id, result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ QR processing error: {e}")
            return self._create_error_response("Processing failed", str(e))
    
    async def _get_or_create_session(self, parsed_data: ParsedQRData) -> ReceptionSession:
        """Get existing session or create new one"""
        session_id = self._generate_session_id(parsed_data)
        
        if session_id not in self.active_sessions:
            # Create new session
            session = ReceptionSession(
                session_id=session_id,
                filename=parsed_data.filename or f"transfer_{int(time.time())}.tar.gz",
                total_chunks=parsed_data.total_chunks,
                expected_size=parsed_data.file_size or 0,
                expected_hash=parsed_data.file_hash,
                compression_algorithm=parsed_data.compression_algorithm,
                encryption_enabled=parsed_data.encryption_enabled,
                reed_solomon_enabled=parsed_data.reed_solomon_enabled,
                format_version=parsed_data.format_version
            )
            
            session.state = ReceptionState.RECEIVING
            self.active_sessions[session_id] = session
            self.stats["total_sessions"] += 1
            
            self.logger.info(f"🆕 New session: {session.filename} ({session.total_chunks} chunks)")
        
        return self.active_sessions[session_id]
    
    async def _process_chunk(self, session: ReceptionSession, parsed_data: ParsedQRData) -> Dict[str, Any]:
        """Process individual chunk with integrity verification"""
        try:
            chunk_index = parsed_data.chunk_index
            
            # Check for duplicate
            if chunk_index in session.received_chunks:
                return self._create_success_response(session, "Duplicate chunk ignored")
            
            # Verify chunk integrity if hash provided
            if parsed_data.chunk_hash:
                if not await self._verify_chunk_integrity(parsed_data):
                    session.integrity_failures += 1
                    session.failed_chunks.add(chunk_index)
                    return self._create_error_response("Chunk integrity verification failed")
            
            # Create chunk info
            chunk_info = ChunkInfo(
                index=chunk_index,
                data=parsed_data.chunk_data,
                hash=parsed_data.chunk_hash,
                size=len(parsed_data.chunk_data) if parsed_data.chunk_data else 0,
                received_time=time.time()
            )
            
            # Store chunk
            session.received_chunks[chunk_index] = chunk_info
            session.bytes_received += chunk_info.size
            self.stats["total_chunks_received"] += 1
            self.stats["total_bytes_received"] += chunk_info.size
            
            self.logger.debug(f"📦 Chunk {chunk_index}/{session.total_chunks} received")
            
            return self._create_success_response(session, f"Chunk {chunk_index} received")
            
        except Exception as e:
            session.error_count += 1
            self.logger.error(f"❌ Chunk processing error: {e}")
            return self._create_error_response("Chunk processing failed", str(e))
    
    async def _verify_chunk_integrity(self, parsed_data: ParsedQRData) -> bool:
        """Verify chunk integrity using SHA-256"""
        try:
            if not parsed_data.chunk_data or not parsed_data.chunk_hash:
                return True  # Skip verification if no hash provided
            
            # Calculate actual hash
            actual_hash = hashlib.sha256(parsed_data.chunk_data).hexdigest()
            
            # Compare with expected (may be truncated)
            expected = parsed_data.chunk_hash
            actual_short = actual_hash[:len(expected)]
            
            return actual_short == expected
            
        except Exception as e:
            self.logger.error(f"❌ Integrity verification error: {e}")
            return False
    
    async def _complete_session(self, session: ReceptionSession) -> None:
        """Complete session and reconstruct file"""
        try:
            session.state = ReceptionState.ASSEMBLING
            self.logger.info(f"🎉 All chunks received for {session.filename}")
            
            # Assemble file
            session.state = ReceptionState.VERIFYING
            file_data = await self.chunk_assembler.assemble_file(session)
            
            if file_data:
                # Verify overall file integrity
                if await self._verify_file_integrity(session, file_data):
                    session.state = ReceptionState.COMPLETED
                    self.stats["completed_sessions"] += 1
                    
                    # Save file (if not air-gapped memory-only mode)
                    if not self.config.memory_only:
                        await self._save_file(session, file_data)
                    
                    self.logger.info(f"✅ Transfer completed: {session.filename}")
                else:
                    session.state = ReceptionState.FAILED
                    self.stats["failed_sessions"] += 1
                    self.logger.error(f"❌ File integrity verification failed: {session.filename}")
            else:
                session.state = ReceptionState.FAILED
                self.stats["failed_sessions"] += 1
                self.logger.error(f"❌ File assembly failed: {session.filename}")
            
            # Move to completed sessions
            self.completed_sessions[session.session_id] = session
            del self.active_sessions[session.session_id]
            
        except Exception as e:
            session.state = ReceptionState.FAILED
            session.error_count += 1
            self.logger.error(f"❌ Session completion error: {e}")
    
    async def _verify_file_integrity(self, session: ReceptionSession, file_data: bytes) -> bool:
        """Verify complete file integrity"""
        try:
            if not session.expected_hash:
                return True  # No hash to verify against
            
            actual_hash = hashlib.sha256(file_data).hexdigest()
            expected = session.expected_hash
            
            # Handle truncated hashes
            if len(expected) < len(actual_hash):
                actual_short = actual_hash[:len(expected)]
                return actual_short == expected
            else:
                return actual_hash == expected
                
        except Exception as e:
            self.logger.error(f"❌ File integrity verification error: {e}")
            return False
    
    async def _save_file(self, session: ReceptionSession, file_data: bytes) -> None:
        """Save reconstructed file to download directory"""
        try:
            if self.config.memory_only:
                return  # Skip saving in memory-only mode
            
            # Create download directory
            download_dir = Path(self.config.download_directory)
            download_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename if needed
            file_path = download_dir / session.filename
            counter = 1
            while file_path.exists():
                name, ext = session.filename.rsplit('.', 1) if '.' in session.filename else (session.filename, '')
                new_name = f"{name}_{counter}.{ext}" if ext else f"{name}_{counter}"
                file_path = download_dir / new_name
                counter += 1
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            self.logger.info(f"💾 File saved: {file_path}")
            
        except Exception as e:
            self.logger.error(f"❌ File save error: {e}")
    
    def _generate_session_id(self, parsed_data: ParsedQRData) -> str:
        """Generate session ID from file metadata"""
        components = [
            parsed_data.filename or "unknown",
            str(parsed_data.total_chunks),
            str(parsed_data.file_size or 0)
        ]
        session_key = "_".join(components)
        return hashlib.md5(session_key.encode()).hexdigest()[:16]
    
    def _create_success_response(self, session: ReceptionSession, message: str) -> Dict[str, Any]:
        """Create successful response with session status"""
        return {
            "success": True,
            "message": message,
            "session": session.get_status_summary()
        }
    
    def _create_error_response(self, message: str, details: Optional[str] = None) -> Dict[str, Any]:
        """Create error response"""
        response = {
            "success": False,
            "error": message
        }
        if details:
            response["details"] = details
        return response
    
    async def _notify_session_callbacks(self, session_id: str, result: Dict[str, Any]) -> None:
        """Notify registered callbacks about session updates"""
        try:
            if session_id in self.session_callbacks:
                for callback in self.session_callbacks[session_id]:
                    if callable(callback):
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(session_id, result)
                            else:
                                callback(session_id, result)
                        except Exception as e:
                            self.logger.error(f"❌ Callback error: {e}")
        except Exception as e:
            self.logger.error(f"❌ Callback notification error: {e}")
    
    def register_session_callback(self, session_id: str, callback: Callable) -> None:
        """Register callback for session updates"""
        if session_id not in self.session_callbacks:
            self.session_callbacks[session_id] = []
        self.session_callbacks[session_id].append(callback)
    
    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get status of specific session"""
        session = self.active_sessions.get(session_id) or self.completed_sessions.get(session_id)
        return session.get_status_summary() if session else None
    
    def get_all_sessions_status(self) -> Dict[str, Any]:
        """Get status of all sessions (Apple-inspired overview)"""
        active = [s.get_status_summary() for s in self.active_sessions.values()]
        completed = [s.get_status_summary() for s in self.completed_sessions.values()]
        
        return {
            "active_sessions": active,
            "completed_sessions": completed,
            "statistics": self.stats.copy()
        }
    
    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """Clean up old completed sessions (air-gapped memory management)"""
        try:
            cutoff_time = time.time() - (max_age_hours * 3600)
            cleaned = 0
            
            # Clean completed sessions
            to_remove = []
            for session_id, session in self.completed_sessions.items():
                if session.last_activity < cutoff_time:
                    to_remove.append(session_id)
            
            for session_id in to_remove:
                del self.completed_sessions[session_id]
                if session_id in self.session_callbacks:
                    del self.session_callbacks[session_id]
                cleaned += 1
            
            if cleaned > 0:
                self.logger.info(f"🧹 Cleaned {cleaned} old sessions")
            
            return cleaned
            
        except Exception as e:
            self.logger.error(f"❌ Session cleanup error: {e}")
            return 0
    
    def get_apple_inspired_stats(self) -> Dict[str, Any]:
        """Get beautifully formatted statistics for Apple-inspired UI"""
        return {
            "overview": {
                "total_sessions": self.stats["total_sessions"],
                "active_sessions": len(self.active_sessions),
                "completed_sessions": self.stats["completed_sessions"],
                "success_rate": round(
                    (self.stats["completed_sessions"] / max(1, self.stats["total_sessions"])) * 100, 1
                )
            },
            "data_transfer": {
                "total_chunks": self.stats["total_chunks_received"],
                "total_bytes": self.stats["total_bytes_received"],
                "human_readable_size": self._format_bytes(self.stats["total_bytes_received"])
            },
            "performance": {
                "average_session_time": round(self.stats["average_session_time"], 1),
                "error_rate": round(self.stats["error_rate"], 2)
            }
        }
    
    def _format_bytes(self, bytes_count: int) -> str:
        """Format bytes in human-readable format (Apple style)"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_count < 1024:
                return f"{bytes_count:.1f} {unit}"
            bytes_count /= 1024
        return f"{bytes_count:.1f} TB"