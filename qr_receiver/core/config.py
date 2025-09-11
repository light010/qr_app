"""
QR Receiver Configuration - Apple-Inspired Design
================================================

Configuration system following Apple's design principles:
- Simplicity: Sensible defaults that just work
- Clarity: Clear, understandable options
- Delight: Smooth animations and beautiful UI
"""

import os
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pathlib import Path


class UITheme(Enum):
    """Apple-inspired UI themes"""
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"  # Follows system preference


class SecurityLevel(Enum):
    """Security levels for air-gapped operation"""
    STANDARD = "standard"
    ENHANCED = "enhanced"
    MAXIMUM = "maximum"  # Air-gapped, zero-persistence


@dataclass
class QRReceiverConfig:
    """
    Apple-inspired QR receiver configuration
    
    Follows Apple's design philosophy:
    - Beautiful by default
    - Powerful when needed
    - Secure by design
    """
    
    # Network Configuration
    host: str = "localhost"
    port: int = 8000
    debug_mode: bool = False
    
    # Apple-Inspired UI Configuration
    theme: str = "auto"
    ui_style: str = "apple"
    animation_duration: int = 300  # Apple's standard 300ms
    corner_radius: int = 12        # Apple's design language
    blur_effect: bool = True       # iOS-style background blur
    haptic_feedback: bool = True   # iOS-style haptic feedback
    reduce_motion: bool = False    # Accessibility support
    
    # Security Configuration (Air-gapped by default)
    air_gapped: bool = True
    memory_only: bool = True
    zero_persistence: bool = True
    security_level: SecurityLevel = SecurityLevel.MAXIMUM
    
    # Protocol Configuration (Compatible with qr_transfer)
    supported_formats: List[str] = field(default_factory=lambda: ["qrfile/v2", "qrfile/v1"])
    max_file_size: str = "500MB"
    chunk_timeout: int = 30
    max_chunks: int = 10000
    
    # Performance Configuration
    max_concurrent_sessions: int = 10
    camera_fps: int = 30
    qr_detection_rate: int = 10  # QR codes per second
    
    # File Handling Configuration
    download_directory: Optional[str] = None
    auto_download: bool = True
    verify_integrity: bool = True
    
    # Compression Support (matching qr_transfer)
    supported_compression: List[str] = field(default_factory=lambda: [
        "lzma", "brotli", "zstandard", "lz4", "gzip", "bz2", "store"
    ])
    
    # Encryption Support (matching qr_transfer)
    supported_encryption: List[str] = field(default_factory=lambda: ["aes-256"])
    
    # Error Correction Support (matching qr_transfer)
    reed_solomon_enabled: bool = True
    
    def __post_init__(self):
        """Initialize computed properties and validate configuration"""
        # Set download directory to user's Downloads folder if not specified
        if self.download_directory is None:
            self.download_directory = str(Path.home() / "Downloads" / "QR_Transfers")
        
        # Validate theme
        if self.theme not in ["light", "dark", "auto"]:
            self.theme = "auto"
        
        # Validate security level
        if self.air_gapped:
            self.memory_only = True
            self.zero_persistence = True
    
    @classmethod
    def create_default(cls) -> 'QRReceiverConfig':
        """Create default Apple-inspired configuration"""
        return cls()
    
    @classmethod
    def create_development(cls) -> 'QRReceiverConfig':
        """Create development configuration with debug enabled"""
        return cls(
            debug_mode=True,
            air_gapped=False,  # Allow more debugging in dev
            security_level=SecurityLevel.STANDARD
        )
    
    @classmethod
    def create_production(cls) -> 'QRReceiverConfig':
        """Create production configuration with maximum security"""
        return cls(
            debug_mode=False,
            air_gapped=True,
            memory_only=True,
            zero_persistence=True,
            security_level=SecurityLevel.MAXIMUM
        )
    
    def get_apple_ui_config(self) -> Dict[str, Any]:
        """Get Apple-inspired UI configuration for frontend"""
        return {
            "theme": self.theme,
            "style": self.ui_style,
            "animations": {
                "duration": self.animation_duration,
                "easing": "cubic-bezier(0.25, 0.1, 0.25, 1)",  # Apple's easing
                "reduced_motion": self.reduce_motion
            },
            "design": {
                "corner_radius": self.corner_radius,
                "blur_effect": self.blur_effect,
                "haptic_feedback": self.haptic_feedback
            },
            "colors": self._get_apple_color_scheme(),
            "typography": self._get_apple_typography(),
            "spacing": self._get_apple_spacing()
        }
    
    def _get_apple_color_scheme(self) -> Dict[str, str]:
        """Get Apple-inspired color scheme"""
        if self.theme == "dark":
            return {
                "primary": "#007AFF",      # iOS Blue
                "secondary": "#5856D6",    # iOS Purple
                "success": "#30D158",      # iOS Green
                "warning": "#FF9500",      # iOS Orange
                "error": "#FF453A",        # iOS Red
                "background": "#000000",   # iOS Dark Background
                "surface": "#1C1C1E",      # iOS Dark Surface
                "on_surface": "#FFFFFF",   # iOS Dark Text
                "on_background": "#FFFFFF" # iOS Dark Text
            }
        else:  # light theme
            return {
                "primary": "#007AFF",      # iOS Blue
                "secondary": "#5856D6",    # iOS Purple  
                "success": "#30D158",      # iOS Green
                "warning": "#FF9500",      # iOS Orange
                "error": "#FF453A",        # iOS Red
                "background": "#FFFFFF",   # iOS Light Background
                "surface": "#F2F2F7",      # iOS Light Surface
                "on_surface": "#000000",   # iOS Light Text
                "on_background": "#000000" # iOS Light Text
            }
    
    def _get_apple_typography(self) -> Dict[str, str]:
        """Get Apple-inspired typography settings"""
        return {
            "font_family": "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            "font_weight_regular": "400",
            "font_weight_medium": "500", 
            "font_weight_semibold": "600",
            "font_weight_bold": "700",
            "line_height": "1.4"
        }
    
    def _get_apple_spacing(self) -> Dict[str, int]:
        """Get Apple-inspired spacing system"""
        return {
            "xs": 4,   # 4px
            "sm": 8,   # 8px
            "md": 16,  # 16px
            "lg": 24,  # 24px
            "xl": 32,  # 32px
            "xxl": 48  # 48px
        }
    
    def get_security_config(self) -> Dict[str, Any]:
        """Get security configuration"""
        return {
            "air_gapped": self.air_gapped,
            "memory_only": self.memory_only,
            "zero_persistence": self.zero_persistence,
            "security_level": self.security_level.value,
            "verify_integrity": self.verify_integrity
        }
    
    def get_protocol_config(self) -> Dict[str, Any]:
        """Get protocol configuration for compatibility with qr_transfer"""
        return {
            "supported_formats": self.supported_formats,
            "max_file_size": self.max_file_size,
            "chunk_timeout": self.chunk_timeout,
            "max_chunks": self.max_chunks,
            "compression": self.supported_compression,
            "encryption": self.supported_encryption,
            "reed_solomon": self.reed_solomon_enabled
        }
    
    def get_performance_config(self) -> Dict[str, Any]:
        """Get performance configuration"""
        return {
            "max_concurrent_sessions": self.max_concurrent_sessions,
            "camera_fps": self.camera_fps,
            "qr_detection_rate": self.qr_detection_rate
        }
    
    def validate(self) -> bool:
        """Validate configuration settings"""
        try:
            # Validate port range
            if not (1 <= self.port <= 65535):
                return False
            
            # Validate timing settings
            if self.animation_duration < 0 or self.animation_duration > 1000:
                return False
            
            if self.chunk_timeout < 5 or self.chunk_timeout > 300:
                return False
            
            # Validate performance settings
            if self.max_concurrent_sessions < 1 or self.max_concurrent_sessions > 100:
                return False
            
            if self.camera_fps < 1 or self.camera_fps > 60:
                return False
            
            if self.qr_detection_rate < 1 or self.qr_detection_rate > 30:
                return False
            
            return True
            
        except Exception:
            return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "network": {
                "host": self.host,
                "port": self.port,
                "debug_mode": self.debug_mode
            },
            "ui": self.get_apple_ui_config(),
            "security": self.get_security_config(),
            "protocol": self.get_protocol_config(),
            "performance": self.get_performance_config()
        }
    
    def __str__(self) -> str:
        """String representation for debugging"""
        return f"QRReceiverConfig(host={self.host}, port={self.port}, theme={self.theme}, security={self.security_level.value})"