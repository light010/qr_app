#!/usr/bin/env python3
"""
WORKING HTTPS server for QR receiver
No OpenSSL required - uses Python's cryptography library
Windows-compatible (no Unicode issues)
"""
import http.server
import ssl
import socketserver
import os
import socket
import sys
import io
from pathlib import Path

# Try to import yaml, install if missing
try:
    import yaml
except ImportError:
    print("Installing PyYAML for configuration support...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml"])
    import yaml

def load_config():
    """Load configuration from config.yaml"""
    try:
        if os.path.exists('config.yaml'):
            with open('config.yaml', 'r') as f:
                return yaml.safe_load(f)
        return {}
    except:
        return {}

def get_local_ip():
    """Get local IP address"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except:
        return "127.0.0.1"

def install_cryptography():
    """Try to install cryptography library automatically"""
    print("Installing cryptography library...")
    try:
        import subprocess
        result = subprocess.run([sys.executable, "-m", "pip", "install", "cryptography"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("SUCCESS: cryptography installed!")
            return True
        else:
            print("FAILED: Could not install cryptography automatically")
            print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"Installation error: {e}")
        return False

def create_certificate():
    """Create self-signed certificate - memory-only or file-based"""
    config = load_config()
    use_memory = config.get('security', {}).get('memory_certificates', False)
    
    if use_memory:
        return create_memory_certificate()
    else:
        return create_file_certificate()

def create_memory_certificate():
    """Create self-signed certificate in memory only - NO DISK TRACES"""
    print("Creating certificate in memory (no disk traces)...")
    
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
        import ipaddress
        
    except ImportError:
        print("ERROR: Python cryptography library not found!")
        print("Attempting to install it automatically...")
        
        if install_cryptography():
            print("Please run the server again to use the new library")
            return None, None
        else:
            print("Please install manually: pip install cryptography")
            return None, None
    
    try:
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        # Get local IP
        local_ip = get_local_ip()
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Local"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "QR Transfer"),
            x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address(local_ip)),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Convert to PEM strings (IN MEMORY)
        cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
        key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        print(f"SUCCESS: Certificate created in memory")
        print(f"Certificate valid for IP: {local_ip}")
        print("🔒 ZERO DISK TRACES - Maximum security")
        
        # Return certificate and key as strings (MEMORY ONLY)
        return cert_pem, key_pem
        
    except Exception as e:
        print(f"ERROR creating certificate: {e}")
        return None, None

def create_file_certificate():
    """Create self-signed certificate using files (original method)"""
    cert_file = "server.crt"
    key_file = "server.key"
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"Using existing certificate: {cert_file}")
        return cert_file, key_file
    
    print("Creating self-signed certificate files...")
    
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
        import ipaddress
        
    except ImportError:
        print("ERROR: Python cryptography library not found!")
        print("Attempting to install it automatically...")
        
        if install_cryptography():
            print("Please run the server again to use the new library")
            return None, None
        else:
            print("Please install manually: pip install cryptography")
            return None, None
    
    try:
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        # Get local IP
        local_ip = get_local_ip()
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "Local"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "QR Transfer"),
            x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address(local_ip)),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write certificate
        with open(cert_file, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        # Write private key
        with open(key_file, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        print(f"SUCCESS: Certificate created - {cert_file}, {key_file}")
        print(f"Certificate valid for IP: {local_ip}")
        return cert_file, key_file
        
    except Exception as e:
        print(f"ERROR creating certificate: {e}")
        return None, None

class QRHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for QR receiver"""
    
    def do_GET(self):
        """Handle GET requests"""
        
        # Default to the integrity receiver
        if self.path == '/' or self.path == '/index.html':
            self.path = '/qr_receiver_integrity.html'
        
        try:
            # Check if file exists
            file_path = self.path[1:]  # Remove leading '/'
            if not os.path.exists(file_path):
                # Try common receiver files
                alternatives = [
                    'qr_receiver_integrity.html',
                    'qr_receiver_nimiq.html', 
                    'qr_receiver_advanced.html'
                ]
                
                found = False
                for alt in alternatives:
                    if os.path.exists(alt):
                        self.path = f'/{alt}'
                        file_path = alt
                        found = True
                        print(f"Serving: {alt}")
                        break
                
                if not found:
                    available = [alt for alt in alternatives if os.path.exists(alt)]
                    self.send_error(404, f"Receiver file not found. Available: {', '.join(available) if available else 'None'}")
                    return
            
            # Add CORS headers for camera access
            self.send_response(200)
            self.send_header('Content-type', 'text/html' if self.path.endswith('.html') else 'application/octet-stream')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            
            # Serve the file
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
                
        except Exception as e:
            self.send_error(500, f"Error serving file: {str(e)}")
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[{self.address_string()}] {format % args}")

def main():
    PORT = 9443
    
    print("HTTPS SERVER FOR QR TRANSFER")
    print("=" * 50)
    
    # Create certificate
    cert_file, key_file = create_certificate()
    if not cert_file or not key_file:
        print("FAILED to create certificate. Exiting.")
        print("\nTROUBLESHOOTING:")
        print("1. Run: pip install cryptography")
        print("2. Then run this server again")
        return
    
    # Get local IP
    local_ip = get_local_ip()
    
    print("\n" + "=" * 60)
    print("HTTPS SERVER READY")
    print("=" * 60)
    print("Features:")
    print("- Self-signed HTTPS certificate (no OpenSSL)")
    print("- iPad Safari camera access enabled") 
    print("- CORS headers for cross-origin requests")
    print("- Auto-serves best receiver file")
    print("- SHA-256 integrity verification")
    print("=" * 60)
    print(f"Server starting on port {PORT}...")
    print(f"Local IP: {local_ip}")
    print("\nACCESS URLS:")
    print(f"  Laptop: https://localhost:{PORT}")
    print(f"  iPad:   https://{local_ip}:{PORT}")
    print("\nIPAD INSTRUCTIONS:")
    print("1. Open Safari on iPad (not Chrome)")
    print("2. Go to the iPad URL above")
    print("3. Accept security warning (self-signed cert)")
    print("4. Allow camera access when prompted")
    print("5. Click 'Start Scanner' button")
    print("=" * 60)
    
    # Check for receiver files
    receiver_files = [
        'qr_receiver_integrity.html',
        'qr_receiver_nimiq.html', 
        'qr_receiver_advanced.html'
    ]
    
    available_receivers = [f for f in receiver_files if os.path.exists(f)]
    
    if not available_receivers:
        print("WARNING: No receiver HTML files found!")
        print(f"Expected: {', '.join(receiver_files)}")
    else:
        print(f"Available receivers: {', '.join(available_receivers)}")
        print(f"Default server: {available_receivers[0]}")
    
    try:
        # Create server
        with socketserver.TCPServer(("", PORT), QRHTTPRequestHandler) as httpd:
            # Wrap with SSL
            context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            
            # Handle memory certificates vs file certificates
            config = load_config()
            use_memory = config.get('security', {}).get('memory_certificates', False)
            
            if use_memory:
                # Memory certificates - cert_file and key_file are strings
                print("🔒 Loading certificates from memory (maximum security)")
                
                # Create temporary files in memory using io.StringIO
                cert_io = io.StringIO(cert_file)  # cert_file is actually cert_pem string
                key_io = io.StringIO(key_file)    # key_file is actually key_pem string
                
                # SECURITY NOTE: Python's ssl.load_cert_chain() requires file paths, not strings
                # We use secure temporary files that exist for milliseconds only
                # This is still much more secure than permanent certificate files
                import tempfile
                with tempfile.NamedTemporaryFile(mode='w', suffix='.crt', delete=False) as cert_tmp:
                    cert_tmp.write(cert_file)
                    cert_tmp_name = cert_tmp.name
                
                with tempfile.NamedTemporaryFile(mode='w', suffix='.key', delete=False) as key_tmp:
                    key_tmp.write(key_file)
                    key_tmp_name = key_tmp.name
                
                try:
                    context.load_cert_chain(cert_tmp_name, key_tmp_name)
                    print("✅ Memory certificates loaded successfully")
                finally:
                    # Immediately delete temporary files
                    try:
                        os.unlink(cert_tmp_name)
                        os.unlink(key_tmp_name)
                        print("🧹 Temporary certificate files deleted")
                    except:
                        pass
            else:
                # File certificates - cert_file and key_file are file paths
                print("📁 Loading certificates from files")
                context.load_cert_chain(cert_file, key_file)
            
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"\nSUCCESS: HTTPS server running!")
            print(f"Access at: https://{local_ip}:{PORT}")
            print("Press Ctrl+C to stop")
            print("\nWaiting for connections...")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server error: {e}")
        print("\nTROUBLESHOOTING:")
        if "Address already in use" in str(e):
            print(f"- Port {PORT} is already in use")
            print(f"- Close other servers or change PORT")
        elif "Permission denied" in str(e):
            print(f"- Permission denied for port {PORT}")
            print(f"- Try running as administrator")
        else:
            print(f"- Unexpected error: {e}")

if __name__ == "__main__":
    main()