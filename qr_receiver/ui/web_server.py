"""
Apple-Inspired Web Server - QR Receiver Interface
=================================================

Beautiful, modern web interface for QR code reception with camera access.
Designed with Apple's principles: simplicity, elegance, and user delight.
"""

import asyncio
import json
import time
import mimetypes
import weakref
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable
from urllib.parse import unquote
import logging

# Web server imports - dependencies are required
from aiohttp import web
from aiohttp.web_ws import WebSocketResponse, WSMsgType
import aiohttp_cors

from ..core.config import QRReceiverConfig
from ..receiver.qr_receiver_engine import QRReceiverEngine


class AppleInspiredWebServer:
    """
    Apple-Inspired Web Server for QR Reception
    
    Features beautiful UI with smooth animations, camera access,
    real-time progress tracking, and elegant error handling.
    """
    
    def __init__(self, config: QRReceiverConfig, receiver_engine: QRReceiverEngine):
        """Initialize web server with Apple-inspired defaults"""
        
        self.config = config
        self.receiver_engine = receiver_engine
        self.logger = self._setup_logging()
        
        # Web server components
        self.app = None
        self.runner = None
        self.site = None
        
        # WebSocket connections for real-time updates
        self.websockets: List[WebSocketResponse] = []
        self.websocket_cleanup_refs = []
        
        # Session tracking for Apple-inspired UI
        self.ui_sessions: Dict[str, Dict[str, Any]] = {}
        
        # Statistics for beautiful analytics
        self.server_stats = {
            "start_time": time.time(),
            "total_connections": 0,
            "active_connections": 0,
            "qr_codes_processed": 0,
            "files_received": 0,
            "total_bytes_received": 0
        }
        
        self.logger.info("🍎 Apple-Inspired Web Server initialized")
        self.logger.info(f"🌐 Will serve at http://{config.host}:{config.port}")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging with appropriate level"""
        logger = logging.getLogger("AppleWebServer")
        
        if self.config.debug_mode:
            logger.setLevel(logging.DEBUG)
        elif self.config.air_gapped:
            logger.setLevel(logging.WARNING)  # Minimal logging for security
        else:
            logger.setLevel(logging.INFO)
        
        return logger
    
    async def start(self) -> None:
        """Start the Apple-inspired web server"""
        try:
            # Create aiohttp application
            self.app = web.Application()
            
            # Setup CORS for camera access
            cors = aiohttp_cors.setup(self.app, defaults={
                "*": aiohttp_cors.ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods="*"
                )
            })
            
            # Setup routes
            await self._setup_routes(cors)
            
            # Setup WebSocket cleanup
            self.app.on_cleanup.append(self._cleanup_websockets)
            
            # Create and start server
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            
            self.site = web.TCPSite(
                self.runner, 
                self.config.host, 
                self.config.port
            )
            
            await self.site.start()
            
            self.logger.info(f"🚀 Apple-inspired server started at http://{self.config.host}:{self.config.port}")
            
            # Keep server running
            try:
                while True:
                    await asyncio.sleep(1)
                    # Periodic cleanup
                    await self._periodic_cleanup()
            except KeyboardInterrupt:
                self.logger.info("🛑 Server shutdown requested")
            finally:
                await self.stop()
                
        except Exception as e:
            self.logger.error(f"❌ Server startup error: {e}")
            raise
    
    async def stop(self) -> None:
        """Stop the web server gracefully"""
        try:
            self.logger.info("🔄 Stopping Apple-inspired web server...")
            
            # Close all WebSocket connections
            for ws in self.websockets.copy():
                if not ws.closed:
                    await ws.close()
            
            # Stop server components
            if self.site:
                await self.site.stop()
            
            if self.runner:
                await self.runner.cleanup()
            
            self.logger.info("✅ Web server stopped successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Server shutdown error: {e}")
    
    async def _setup_routes(self, cors) -> None:
        """Setup all server routes with Apple-inspired endpoints"""
        try:
            # Main UI route
            main_route = self.app.router.add_get('/', self._serve_main_ui)
            cors.add(main_route)
            
            # API routes
            api_routes = [
                ('GET', '/api/status', self._api_status),
                ('GET', '/api/config', self._api_config),
                ('POST', '/api/qr', self._api_process_qr),
                ('GET', '/api/sessions', self._api_sessions),
                ('GET', '/api/stats', self._api_stats),
                ('GET', '/ws', self._websocket_handler),
            ]
            
            for method, path, handler in api_routes:
                route = self.app.router.add_route(method, path, handler)
                cors.add(route)
            
            # Static file serving
            static_routes = [
                ('/static/css/{filename}', self._serve_css),
                ('/static/js/{filename}', self._serve_js),
                ('/static/assets/{filename}', self._serve_assets),
            ]
            
            for path_template, handler in static_routes:
                route = self.app.router.add_get(path_template, handler)
                cors.add(route)
            
            self.logger.debug("🛤️  Routes configured successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Route setup error: {e}")
            raise
    
    async def _serve_main_ui(self, request) -> web.Response:
        """Serve the main Apple-inspired UI"""
        try:
            html_content = self._generate_apple_ui_html()
            return web.Response(
                text=html_content,
                content_type='text/html',
                headers={'Cache-Control': 'no-cache'}
            )
        except Exception as e:
            self.logger.error(f"❌ UI serving error: {e}")
            return web.Response(text="Error loading interface", status=500)
    
    def _generate_apple_ui_html(self) -> str:
        """Generate Apple-inspired HTML interface"""
        ui_config = self.config.get_apple_ui_config()
        
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍎 QR Receiver - Apple Design</title>
    <style>
        /* Apple-Inspired CSS */
        :root {{
            --primary-color: {ui_config['colors']['primary']};
            --secondary-color: {ui_config['colors']['secondary']};
            --success-color: {ui_config['colors']['success']};
            --warning-color: {ui_config['colors']['warning']};
            --error-color: {ui_config['colors']['error']};
            --background-color: {ui_config['colors']['background']};
            --surface-color: {ui_config['colors']['surface']};
            --text-color: {ui_config['colors']['on_surface']};
            
            --corner-radius: {ui_config['design']['corner_radius']}px;
            --animation-duration: {ui_config['animations']['duration']}ms;
            --animation-easing: {ui_config['animations']['easing']};
            
            --font-family: {ui_config['typography']['font_family']};
            --spacing-sm: {ui_config['spacing']['sm']}px;
            --spacing-md: {ui_config['spacing']['md']}px;
            --spacing-lg: {ui_config['spacing']['lg']}px;
            --spacing-xl: {ui_config['spacing']['xl']}px;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: var(--font-family);
            background: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
            overflow-x: hidden;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--spacing-lg);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }}
        
        /* Header */
        .header {{
            text-align: center;
            margin-bottom: var(--spacing-xl);
            animation: fadeInDown var(--animation-duration) var(--animation-easing);
        }}
        
        .header h1 {{
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: var(--spacing-sm);
        }}
        
        .header p {{
            font-size: 1.1rem;
            color: var(--text-color);
            opacity: 0.8;
        }}
        
        /* Main Content */
        .main-content {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-xl);
            flex: 1;
        }}
        
        @media (max-width: 768px) {{
            .main-content {{
                grid-template-columns: 1fr;
            }}
        }}
        
        /* Camera Section */
        .camera-section {{
            background: var(--surface-color);
            border-radius: var(--corner-radius);
            padding: var(--spacing-lg);
            position: relative;
            overflow: hidden;
            animation: fadeInLeft var(--animation-duration) var(--animation-easing);
        }}
        
        .camera-section::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, 
                rgba(0, 122, 255, 0.1), 
                rgba(88, 86, 214, 0.1));
            pointer-events: none;
        }}
        
        .camera-container {{
            position: relative;
            z-index: 1;
        }}
        
        .camera-header {{
            text-align: center;
            margin-bottom: var(--spacing-lg);
        }}
        
        .camera-header h2 {{
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
        }}
        
        #videoElement {{
            width: 100%;
            max-width: 400px;
            border-radius: var(--corner-radius);
            background: #000;
            display: block;
            margin: 0 auto;
        }}
        
        .camera-controls {{
            display: flex;
            justify-content: center;
            gap: var(--spacing-md);
            margin-top: var(--spacing-lg);
        }}
        
        .btn {{
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--corner-radius);
            padding: var(--spacing-sm) var(--spacing-lg);
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all var(--animation-duration) var(--animation-easing);
            position: relative;
            overflow: hidden;
        }}
        
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
        }}
        
        .btn:active {{
            transform: translateY(0);
        }}
        
        .btn-secondary {{
            background: var(--secondary-color);
        }}
        
        .btn:disabled {{
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }}
        
        /* Progress Section */
        .progress-section {{
            background: var(--surface-color);
            border-radius: var(--corner-radius);
            padding: var(--spacing-lg);
            animation: fadeInRight var(--animation-duration) var(--animation-easing);
        }}
        
        .progress-header {{
            text-align: center;
            margin-bottom: var(--spacing-lg);
        }}
        
        .progress-header h2 {{
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
        }}
        
        .session-list {{
            max-height: 400px;
            overflow-y: auto;
            border-radius: var(--corner-radius);
        }}
        
        .session-item {{
            background: var(--background-color);
            border-radius: var(--corner-radius);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-sm);
            border-left: 4px solid var(--primary-color);
            transition: all var(--animation-duration) var(--animation-easing);
        }}
        
        .session-item:hover {{
            transform: translateX(4px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }}
        
        .session-filename {{
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
        }}
        
        .session-progress {{
            background: rgba(0, 122, 255, 0.1);
            border-radius: calc(var(--corner-radius) / 2);
            height: 8px;
            overflow: hidden;
            margin: var(--spacing-sm) 0;
        }}
        
        .session-progress-bar {{
            background: var(--primary-color);
            height: 100%;
            transition: width var(--animation-duration) var(--animation-easing);
            border-radius: calc(var(--corner-radius) / 2);
        }}
        
        .session-stats {{
            font-size: 0.9rem;
            opacity: 0.8;
            display: flex;
            justify-content: space-between;
            margin-top: var(--spacing-sm);
        }}
        
        /* Status Messages */
        .status-message {{
            background: var(--surface-color);
            border-radius: var(--corner-radius);
            padding: var(--spacing-md);
            margin: var(--spacing-md) 0;
            border-left: 4px solid var(--success-color);
            animation: slideInRight var(--animation-duration) var(--animation-easing);
        }}
        
        .status-message.error {{
            border-left-color: var(--error-color);
            background: rgba(255, 69, 58, 0.1);
        }}
        
        .status-message.warning {{
            border-left-color: var(--warning-color);
            background: rgba(255, 149, 0, 0.1);
        }}
        
        /* Footer */
        .footer {{
            text-align: center;
            margin-top: var(--spacing-xl);
            padding-top: var(--spacing-lg);
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            opacity: 0.6;
        }}
        
        /* Animations */
        @keyframes fadeInDown {{
            from {{
                opacity: 0;
                transform: translateY(-30px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        @keyframes fadeInLeft {{
            from {{
                opacity: 0;
                transform: translateX(-30px);
            }}
            to {{
                opacity: 1;
                transform: translateX(0);
            }}
        }}
        
        @keyframes fadeInRight {{
            from {{
                opacity: 0;
                transform: translateX(30px);
            }}
            to {{
                opacity: 1;
                transform: translateX(0);
            }}
        }}
        
        @keyframes slideInRight {{
            from {{
                opacity: 0;
                transform: translateX(20px);
            }}
            to {{
                opacity: 1;
                transform: translateX(0);
            }}
        }}
        
        /* Loading Spinner */
        .spinner {{
            border: 3px solid rgba(0, 122, 255, 0.1);
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }}
        
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {{
            :root {{
                --background-color: #000000;
                --surface-color: #1C1C1E;
                --text-color: #FFFFFF;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🍎 QR Receiver</h1>
            <p>Scan QR codes with your camera to receive files securely</p>
        </header>
        
        <main class="main-content">
            <section class="camera-section">
                <div class="camera-container">
                    <div class="camera-header">
                        <h2>📱 Camera Scanner</h2>
                        <p>Point your camera at QR codes to receive files</p>
                    </div>
                    
                    <video id="videoElement" autoplay muted playsinline></video>
                    
                    <div class="camera-controls">
                        <button id="startCamera" class="btn">Start Camera</button>
                        <button id="stopCamera" class="btn btn-secondary" disabled>Stop Camera</button>
                    </div>
                    
                    <div id="scanStatus"></div>
                </div>
            </section>
            
            <section class="progress-section">
                <div class="progress-header">
                    <h2>📊 Transfer Progress</h2>
                    <p>Real-time file reception status</p>
                </div>
                
                <div id="sessionList" class="session-list">
                    <div class="status-message">
                        <p>No active transfers. Scan a QR code to begin.</p>
                    </div>
                </div>
            </section>
        </main>
        
        <footer class="footer">
            <p>🔒 Air-gapped • Zero persistence • Apple-inspired design</p>
        </footer>
    </div>
    
    <script>
        // Apple-Inspired JavaScript
        class AppleQRReceiver {{
            constructor() {{
                this.ws = null;
                this.videoElement = document.getElementById('videoElement');
                this.startButton = document.getElementById('startCamera');
                this.stopButton = document.getElementById('stopCamera');
                this.scanStatus = document.getElementById('scanStatus');
                this.sessionList = document.getElementById('sessionList');
                
                this.stream = null;
                this.scanning = false;
                this.sessions = new Map();
                
                this.initializeEventListeners();
                this.connectWebSocket();
            }}
            
            initializeEventListeners() {{
                this.startButton.addEventListener('click', () => this.startCamera());
                this.stopButton.addEventListener('click', () => this.stopCamera());
            }}
            
            async startCamera() {{
                try {{
                    this.showStatus('Starting camera...', 'info');
                    
                    const constraints = {{
                        video: {{
                            facingMode: 'environment', // Back camera
                            width: {{ ideal: 1280 }},
                            height: {{ ideal: 720 }}
                        }}
                    }};
                    
                    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                    this.videoElement.srcObject = this.stream;
                    
                    this.startButton.disabled = true;
                    this.stopButton.disabled = false;
                    this.scanning = true;
                    
                    this.showStatus('Camera started. Scan QR codes!', 'success');
                    this.startScanning();
                    
                }} catch (error) {{
                    this.showStatus('Camera access denied: ' + error.message, 'error');
                    console.error('Camera error:', error);
                }}
            }}
            
            stopCamera() {{
                if (this.stream) {{
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }}
                
                this.videoElement.srcObject = null;
                this.scanning = false;
                
                this.startButton.disabled = false;
                this.stopButton.disabled = true;
                
                this.showStatus('Camera stopped', 'info');
            }}
            
            startScanning() {{
                // QR scanning would be implemented here
                // For now, show placeholder
                this.showStatus('QR scanning active (implementation pending)', 'info');
            }}
            
            connectWebSocket() {{
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${{protocol}}//${{window.location.host}}/ws`;
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {{
                    console.log('WebSocket connected');
                }};
                
                this.ws.onmessage = (event) => {{
                    try {{
                        const data = JSON.parse(event.data);
                        this.handleWebSocketMessage(data);
                    }} catch (error) {{
                        console.error('WebSocket message error:', error);
                    }}
                }};
                
                this.ws.onclose = () => {{
                    console.log('WebSocket disconnected');
                    // Reconnect after delay
                    setTimeout(() => this.connectWebSocket(), 3000);
                }};
                
                this.ws.onerror = (error) => {{
                    console.error('WebSocket error:', error);
                }};
            }}
            
            handleWebSocketMessage(data) {{
                switch (data.type) {{
                    case 'session_update':
                        this.updateSession(data.session);
                        break;
                    case 'qr_processed':
                        this.showStatus(`QR processed: ${{data.message}}`, 'success');
                        break;
                    case 'error':
                        this.showStatus(`Error: ${{data.message}}`, 'error');
                        break;
                    default:
                        console.log('Unknown message type:', data.type);
                }}
            }}
            
            updateSession(session) {{
                this.sessions.set(session.session_id, session);
                this.renderSessions();
            }}
            
            renderSessions() {{
                if (this.sessions.size === 0) {{
                    this.sessionList.innerHTML = `
                        <div class="status-message">
                            <p>No active transfers. Scan a QR code to begin.</p>
                        </div>
                    `;
                    return;
                }}
                
                let html = '';
                for (const [id, session] of this.sessions) {{
                    const progress = session.progress || {{}};
                    const timing = session.timing || {{}};
                    
                    html += `
                        <div class="session-item">
                            <div class="session-filename">${{session.filename || 'Unknown File'}}</div>
                            <div class="session-progress">
                                <div class="session-progress-bar" style="width: ${{progress.percentage || 0}}%"></div>
                            </div>
                            <div class="session-stats">
                                <span>${{progress.chunks_received || 0}} / ${{progress.total_chunks || 0}} chunks</span>
                                <span>${{session.state || 'unknown'}}</span>
                            </div>
                        </div>
                    `;
                }}
                
                this.sessionList.innerHTML = html;
            }}
            
            showStatus(message, type = 'info') {{
                const statusElement = document.createElement('div');
                statusElement.className = `status-message ${{type}}`;
                statusElement.innerHTML = `<p>${{message}}</p>`;
                
                // Replace existing status or add new one
                const existing = this.scanStatus.querySelector('.status-message');
                if (existing) {{
                    existing.remove();
                }}
                
                this.scanStatus.appendChild(statusElement);
                
                // Remove after delay
                setTimeout(() => {{
                    if (statusElement.parentNode) {{
                        statusElement.remove();
                    }}
                }}, 5000);
            }}
        }}
        
        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {{
            new AppleQRReceiver();
        }});
    </script>
</body>
</html>"""
    
    # API Endpoints
    async def _api_status(self, request) -> web.Response:
        """API endpoint for server status"""
        try:
            status = {
                "status": "running",
                "version": "1.0.0",
                "uptime": time.time() - self.server_stats["start_time"],
                "connections": self.server_stats["active_connections"],
                "air_gapped": self.config.air_gapped,
                "theme": self.config.theme
            }
            return web.json_response(status)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def _api_config(self, request) -> web.Response:
        """API endpoint for UI configuration"""
        try:
            config = self.config.get_apple_ui_config()
            return web.json_response(config)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def _api_process_qr(self, request) -> web.Response:
        """API endpoint for processing QR data"""
        try:
            data = await request.json()
            qr_data = data.get('qr_data')
            
            if not qr_data:
                return web.json_response({"error": "No QR data provided"}, status=400)
            
            # Process through receiver engine
            result = await self.receiver_engine.process_qr_data(qr_data)
            
            # Update statistics
            self.server_stats["qr_codes_processed"] += 1
            
            # Notify WebSocket clients
            await self._broadcast_websocket({
                "type": "qr_processed",
                "result": result
            })
            
            return web.json_response(result)
            
        except Exception as e:
            self.logger.error(f"❌ QR processing error: {e}")
            return web.json_response({"error": str(e)}, status=500)
    
    async def _api_sessions(self, request) -> web.Response:
        """API endpoint for session information"""
        try:
            sessions = self.receiver_engine.get_all_sessions_status()
            return web.json_response(sessions)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    async def _api_stats(self, request) -> web.Response:
        """API endpoint for server statistics"""
        try:
            stats = {
                "server": self.server_stats.copy(),
                "receiver": self.receiver_engine.get_apple_inspired_stats()
            }
            return web.json_response(stats)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)
    
    # WebSocket Handler
    async def _websocket_handler(self, request) -> WebSocketResponse:
        """Handle WebSocket connections for real-time updates"""
        try:
            ws = WebSocketResponse()
            await ws.prepare(request)
            
            # Add to active connections
            self.websockets.append(ws)
            self.server_stats["total_connections"] += 1
            self.server_stats["active_connections"] += 1
            
            # Setup cleanup
            def cleanup_ref():
                if ws in self.websockets:
                    self.websockets.remove(ws)
                    self.server_stats["active_connections"] -= 1
            
            # Store weak reference for cleanup
            self.websocket_cleanup_refs.append(weakref.finalize(ws, cleanup_ref))
            
            self.logger.debug(f"🔌 WebSocket connected: {self.server_stats['active_connections']} active")
            
            # Send initial status
            await ws.send_str(json.dumps({
                "type": "connected",
                "message": "WebSocket connected successfully"
            }))
            
            # Handle messages
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        await self._handle_websocket_message(ws, data)
                    except json.JSONDecodeError:
                        await ws.send_str(json.dumps({
                            "type": "error",
                            "message": "Invalid JSON format"
                        }))
                elif msg.type == WSMsgType.ERROR:
                    self.logger.warning(f"WebSocket error: {ws.exception()}")
            
            return ws
            
        except Exception as e:
            self.logger.error(f"❌ WebSocket error: {e}")
            return web.Response(text="WebSocket error", status=500)
    
    async def _handle_websocket_message(self, ws: WebSocketResponse, data: Dict[str, Any]) -> None:
        """Handle incoming WebSocket messages"""
        try:
            message_type = data.get("type")
            
            if message_type == "ping":
                await ws.send_str(json.dumps({"type": "pong"}))
            elif message_type == "get_sessions":
                sessions = self.receiver_engine.get_all_sessions_status()
                await ws.send_str(json.dumps({
                    "type": "sessions",
                    "data": sessions
                }))
            else:
                await ws.send_str(json.dumps({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }))
                
        except Exception as e:
            self.logger.error(f"❌ WebSocket message handling error: {e}")
    
    async def _broadcast_websocket(self, message: Dict[str, Any]) -> None:
        """Broadcast message to all connected WebSocket clients"""
        try:
            if not self.websockets:
                return
            
            message_json = json.dumps(message)
            
            # Send to all connected clients
            for ws in self.websockets.copy():
                try:
                    if not ws.closed:
                        await ws.send_str(message_json)
                except Exception as e:
                    self.logger.warning(f"⚠️  WebSocket send error: {e}")
                    # Remove failed connection
                    if ws in self.websockets:
                        self.websockets.remove(ws)
                        self.server_stats["active_connections"] -= 1
                        
        except Exception as e:
            self.logger.error(f"❌ WebSocket broadcast error: {e}")
    
    # Static file serving
    async def _serve_css(self, request) -> web.Response:
        """Serve CSS files"""
        filename = request.match_info['filename']
        # Return 404 for now - CSS is inline
        return web.Response(text="Not found", status=404)
    
    async def _serve_js(self, request) -> web.Response:
        """Serve JavaScript files"""
        filename = request.match_info['filename']
        # Return 404 for now - JS is inline
        return web.Response(text="Not found", status=404)
    
    async def _serve_assets(self, request) -> web.Response:
        """Serve asset files"""
        filename = request.match_info['filename']
        # Return 404 for now - no external assets
        return web.Response(text="Not found", status=404)
    
    # Cleanup
    async def _cleanup_websockets(self, app) -> None:
        """Cleanup WebSocket connections on shutdown"""
        for ws in self.websockets.copy():
            if not ws.closed:
                await ws.close()
        self.websockets.clear()
    
    async def _periodic_cleanup(self) -> None:
        """Periodic cleanup tasks"""
        try:
            # Clean up closed WebSocket connections
            for ws in self.websockets.copy():
                if ws.closed:
                    self.websockets.remove(ws)
                    self.server_stats["active_connections"] -= 1
            
            # Other cleanup tasks can be added here
            
        except Exception as e:
            self.logger.debug(f"🧹 Cleanup task error: {e}")
    
    def get_server_stats(self) -> Dict[str, Any]:
        """Get Apple-inspired server statistics"""
        uptime = time.time() - self.server_stats["start_time"]
        
        return {
            "overview": {
                "status": "running",
                "uptime_seconds": round(uptime, 1),
                "uptime_formatted": self._format_duration(uptime)
            },
            "connections": {
                "total_connections": self.server_stats["total_connections"],
                "active_connections": self.server_stats["active_connections"],
                "websocket_connections": len(self.websockets)
            },
            "activity": {
                "qr_codes_processed": self.server_stats["qr_codes_processed"],
                "files_received": self.server_stats["files_received"],
                "total_bytes_received": self.server_stats["total_bytes_received"]
            }
        }
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in human-readable format"""
        if seconds < 60:
            return f"{seconds:.0f}s"
        elif seconds < 3600:
            return f"{seconds/60:.1f}m"
        else:
            return f"{seconds/3600:.1f}h"