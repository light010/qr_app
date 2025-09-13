#!/usr/bin/env python3
"""
QR Receiver - GitHub Launch Script
=================================

One-command launcher for QR Receiver from GitHub.
Handles dependency installation and automatic setup.
"""

import sys
import os
import subprocess
import platform
import urllib.request
import tempfile
import shutil
from pathlib import Path

def check_python():
    """Check Python version compatibility"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required, found {version.major}.{version.minor}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_pip():
    """Check if pip is available"""
    try:
        subprocess.run([sys.executable, '-m', 'pip', '--version'], 
                      capture_output=True, check=True)
        print("✅ pip is available")
        return True
    except subprocess.CalledProcessError:
        print("❌ pip not found")
        return False

def install_dependencies():
    """Install required dependencies"""
    print("\n📦 Installing dependencies...")
    
    # Core dependencies for basic functionality
    core_deps = [
        "aiohttp>=3.12.0",
        "aiohttp-cors>=0.8.0", 
        "segno>=1.6.0",
        "pillow>=10.0.0"
    ]
    
    # Optional dependencies for full features
    optional_deps = [
        "brotli>=1.1.0",
        "zstandard>=0.24.0",
        "lz4>=4.4.0",
        "reedsolo>=1.7.0",
        "cryptography>=41.0.0",
        "psutil>=5.9.0"
    ]
    
    # Install core dependencies (required)
    for dep in core_deps:
        try:
            print(f"   Installing {dep}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', dep],
                          capture_output=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {dep}")
            return False
    
    # Install optional dependencies (best effort)
    optional_installed = 0
    for dep in optional_deps:
        try:
            print(f"   Installing {dep}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', dep],
                          capture_output=True, check=True)
            optional_installed += 1
        except subprocess.CalledProcessError:
            print(f"⚠️  Could not install {dep} (optional)")
    
    print(f"✅ Core dependencies installed")
    print(f"📊 Optional features: {optional_installed}/{len(optional_deps)} available")
    return True

def download_from_github():
    """Download QR receiver from GitHub"""
    print("\n📥 Downloading from GitHub...")
    
    # GitHub raw file URLs (update these with your actual repository)
    base_url = "https://raw.githubusercontent.com/your-username/qr-transfer-system/main/qr_receiver_project"
    
    files_to_download = [
        "main.py",
        "core/__init__.py",
        "core/config.py", 
        "receiver/__init__.py",
        "receiver/qr_receiver_engine.py",
        "receiver/data_parser.py",
        "receiver/chunk_assembler.py",
        "ui/__init__.py",
        "ui/web_server.py",
        "utils/__init__.py",
        "utils/security.py",
        "utils/secure_memory.py"
    ]
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp(prefix="qr_receiver_")
    print(f"   Download location: {temp_dir}")
    
    try:
        for file_path in files_to_download:
            # Create directories if needed
            full_path = Path(temp_dir) / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Download file
            url = f"{base_url}/{file_path}"
            try:
                print(f"   Downloading {file_path}...")
                urllib.request.urlretrieve(url, full_path)
            except Exception as e:
                print(f"⚠️  Could not download {file_path}: {e}")
        
        print(f"✅ Downloaded to {temp_dir}")
        return temp_dir
        
    except Exception as e:
        print(f"❌ Download failed: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return None

def launch_receiver(download_dir, host="localhost", port=8000):
    """Launch the QR receiver"""
    print(f"\n🚀 Launching QR Receiver at http://{host}:{port}")
    
    # Change to download directory
    original_dir = os.getcwd()
    os.chdir(download_dir)
    
    try:
        # Add current directory to Python path
        sys.path.insert(0, download_dir)
        
        # Launch the receiver
        cmd = [sys.executable, "main.py", 
               "--host", host, "--port", str(port), "--verbose"]
        
        print("🌟 Starting server...")
        print(f"📱 Open http://{host}:{port} in your browser")
        print("🎯 Point QR codes at your camera to receive files")
        print("⌨️  Press Ctrl+C to stop\n")
        
        # Run the server
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Launch failed: {e}")
    finally:
        os.chdir(original_dir)
        # Cleanup temporary directory
        try:
            shutil.rmtree(download_dir, ignore_errors=True)
        except:
            pass

def get_local_ip():
    """Get local IP address for network access"""
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

def main():
    """Main launcher"""
    print("🍎 QR Receiver - GitHub Launcher")
    print("=" * 40)
    
    # Check requirements
    if not check_python():
        return 1
    
    if not check_pip():
        print("Please install pip and try again")
        return 1
    
    # Get launch options
    print("\n⚙️ Launch Options:")
    print("1. Localhost only (secure)")
    print("2. Network access (all devices)")
    print("3. Custom configuration")
    
    try:
        choice = input("\nSelect option (1-3) [1]: ").strip() or "1"
        
        if choice == "1":
            host = "localhost"
            port = 8000
        elif choice == "2":
            host = "0.0.0.0"
            port = 8000
            local_ip = get_local_ip()
            print(f"📱 Access from other devices: http://{local_ip}:8000")
        elif choice == "3":
            host = input("Host [localhost]: ").strip() or "localhost"
            port = int(input("Port [8000]: ").strip() or "8000")
        else:
            print("Invalid choice, using localhost")
            host = "localhost"
            port = 8000
        
    except (ValueError, KeyboardInterrupt):
        print("\nUsing default settings: localhost:8000")
        host = "localhost"
        port = 8000
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Dependency installation failed")
        return 1
    
    # Download from GitHub
    download_dir = download_from_github()
    if not download_dir:
        print("❌ GitHub download failed")
        return 1
    
    # Launch receiver
    launch_receiver(download_dir, host, port)
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n🛑 Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)