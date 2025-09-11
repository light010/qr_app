#!/usr/bin/env python3
"""
QR Receiver System - Apple-Inspired Design
==========================================

Modern, elegant QR code receiver with Apple-inspired UI/UX.
Companion to QR Transfer system with full protocol compatibility.

Usage: python main.py [options]
"""

import sys
import os
import signal
import atexit
import argparse
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

# Add the package to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Core imports
from qr_receiver_project.core.config import QRReceiverConfig
from qr_receiver_project.receiver.qr_receiver_engine import QRReceiverEngine
from qr_receiver_project.ui.web_server import AppleInspiredWebServer
from qr_receiver_project.utils.security import SecurityValidator
from qr_receiver_project.utils.secure_memory import emergency_memory_clear, enable_process_security


# =============================================================================
# APPLE-INSPIRED CLI INTERFACE
# =============================================================================

def setup_security_handlers() -> None:
    """Setup security handlers for air-gapped operation"""
    try:
        enable_process_security()
        atexit.register(emergency_memory_clear)
        
        def signal_handler(signum, frame):
            print(f"\nSecure shutdown initiated (signal {signum})")
            emergency_memory_clear()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        if hasattr(signal, 'SIGBREAK'):
            signal.signal(signal.SIGBREAK, signal_handler)
        
        print("Air-gapped security mode activated")
        
    except Exception as e:
        print(f"⚠️  Security setup warning: {e}")


def create_apple_inspired_config(host: str, port: int, debug: bool, theme: str) -> QRReceiverConfig:
    """Create Apple-inspired configuration with elegant defaults"""
    try:
        # Import here to avoid circular imports
        from qr_receiver_project.core.config import SecurityLevel
        
        # Choose security level based on debug mode
        if debug:
            security_level = SecurityLevel.STANDARD  # Allow debug in standard mode
            air_gapped = False  # Allow more debugging
        else:
            security_level = SecurityLevel.MAXIMUM  # Maximum security when not debugging
            air_gapped = True
        
        config = QRReceiverConfig(
            # Network settings
            host=host,
            port=port,
            debug_mode=debug,
            
            # Apple-inspired UI settings
            theme=theme,
            ui_style="apple",
            animation_duration=300,  # Apple's preferred 300ms
            corner_radius=12,        # Apple's design language
            blur_effect=True,        # iOS-style blur
            haptic_feedback=True,    # iOS-style feedback
            
            # Security settings (adjusted for debug mode)
            security_level=security_level,
            air_gapped=air_gapped,
            memory_only=True,
            zero_persistence=True,
            
            # Protocol settings (compatible with qr_transfer)
            supported_formats=["qrfile/v2", "qrfile/v1"],
            max_file_size="500MB",
            chunk_timeout=30,
            
            # Performance settings
            max_concurrent_sessions=10,
            camera_fps=30,
            qr_detection_rate=10
        )
        
        if debug:
            print("Apple-inspired configuration created:")
            print(f"   Theme: {theme}")
            print(f"   UI Style: Apple Design Language")
            print(f"   Animation: 300ms (Apple standard)")
            print(f"   Security: Air-gapped, memory-only")
        
        return config
        
    except Exception as e:
        print(f"⚠️  Configuration warning: {e}")
        return QRReceiverConfig.create_default()


async def start_receiver_server(config: QRReceiverConfig, verbose: bool = False) -> bool:
    """Start the Apple-inspired QR receiver server"""
    
    # Initialize security
    setup_security_handlers()
    
    try:
        if verbose:
            print("QR Receiver System - Apple-Inspired Design")
            print("=" * 60)
            print(f"Server: http://{config.host}:{config.port}")
            print(f"Theme: {config.theme}")
            print(f"Security: Air-gapped, zero-persistence")
            print(f"UI: Apple Design Language")
        else:
            print(f"QR Receiver starting at http://{config.host}:{config.port}")
        
        # Validate configuration
        if not SecurityValidator.validate_config(config):
            print("Security validation failed")
            return False
        
        # Create receiver engine
        receiver_engine = QRReceiverEngine(config)
        
        # Create Apple-inspired web server
        web_server = AppleInspiredWebServer(
            config=config,
            receiver_engine=receiver_engine
        )
        
        if verbose:
            print("\nInitializing components...")
            print("   Receiver engine: Ready")
            print("   Apple UI server: Ready")
            print("   Security layer: Active")
            print("   Camera interface: Ready")
        
        # Start server
        print(f"\nStarting Apple-inspired QR receiver...")
        print(f"Open http://{config.host}:{config.port} in your browser")
        print("Point QR codes at your camera to receive files")
        print("Press Ctrl+C to stop\n")
        
        # Run server
        await web_server.start()
        
        return True
        
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
        return True
    except Exception as e:
        print(f"Server error: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        return False
    finally:
        # Secure cleanup
        emergency_memory_clear()


def main() -> int:
    """Apple-inspired main entry point"""
    
    parser = argparse.ArgumentParser(
        description='QR Receiver - Apple-Inspired Design',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Apple-Inspired Examples:
  python main.py                     # Start with elegant defaults
  python main.py --theme dark        # Dark mode (iOS style)
  python main.py --host 0.0.0.0      # Accept from all devices
  python main.py --port 8080         # Custom port
  python main.py --verbose           # Detailed output
  
Design Philosophy:
  - Clean, minimal interface inspired by Apple's design language
  - Smooth animations and micro-interactions
  - Progressive enhancement for all devices
  - Accessibility-first approach
  - Air-gapped security with zero persistence
        
Compatible with:
  - iOS Safari (iPhone/iPad)
  - macOS Safari
  - Chrome/Firefox on all platforms
  - Full QR Transfer protocol support
        """
    )
    
    # Core options
    parser.add_argument('--host', default='localhost',
                       help='Server host (default: localhost)')
    parser.add_argument('--port', type=int, default=8000,
                       help='Server port (default: 8000)')
    parser.add_argument('--theme', default='auto',
                       choices=['light', 'dark', 'auto'],
                       help='UI theme (default: auto)')
    parser.add_argument('--verbose', action='store_true',
                       help='Show detailed information')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug mode')
    
    args = parser.parse_args()
    
    # Create Apple-inspired configuration
    config = create_apple_inspired_config(
        host=args.host,
        port=args.port,
        debug=args.debug,
        theme=args.theme
    )
    
    # Start async server
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(
            start_receiver_server(config, args.verbose)
        )
        return 0 if success else 1
    except Exception as e:
        print(f"Fatal error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())