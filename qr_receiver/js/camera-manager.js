/**
 * @fileoverview Advanced Camera Manager with Multiple Device Support
 * Handles camera selection, permissions, settings, and error recovery
 */

/**
 * @interface CameraInfo
 * @description Information about an available camera
 * @typedef {Object} CameraInfo
 * @property {string} deviceId - Unique device identifier
 * @property {string} label - Human-readable camera name
 * @property {string} groupId - Device group identifier
 * @property {'environment'|'user'|'unknown'} facingMode - Camera facing direction
 * @property {Object} capabilities - Camera capabilities (populated when active)
 */

/**
 * @interface CameraConstraints
 * @description Camera constraints for getUserMedia
 * @typedef {Object} CameraConstraints
 * @property {Object} video - Video constraints
 * @property {Object} video.facingMode - Preferred facing mode
 * @property {Object} video.width - Width constraints
 * @property {Object} video.height - Height constraints
 * @property {Object} video.frameRate - Frame rate constraints
 */

/**
 * @interface CameraSettings
 * @description Camera settings configuration
 * @typedef {Object} CameraSettings
 * @property {boolean} autoSwitchOnError - Auto-switch camera on error
 * @property {'environment'|'user'} preferredCamera - Preferred camera type
 * @property {boolean} enableTorch - Enable torch/flash
 * @property {number} zoomLevel - Zoom level (1.0 = no zoom)
 * @property {'continuous'|'manual'} focusMode - Focus mode
 * @property {'continuous'|'manual'} exposureMode - Exposure mode
 */

/**
 * @interface CameraCallbacks
 * @description Callbacks for camera events
 * @typedef {Object} CameraCallbacks
 * @property {function(CameraInfo): void} onCameraChange - Camera changed
 * @property {function(string): void} onPermissionChange - Permission state changed
 * @property {function(Object): void} onError - Camera error occurred
 */

/**
 * @interface CameraErrorInfo
 * @description Detailed camera error information
 * @typedef {Object} CameraErrorInfo
 * @property {'permission'|'not-found'|'in-use'|'constraints'|'not-secure'|'unknown'} type - Error type
 * @property {string} message - Error message
 * @property {boolean} recoverable - Whether error is recoverable
 * @property {string} userAction - Suggested user action
 */

/**
 * @interface CameraManagerAPI
 * @description Public API contract for CameraManager
 * @typedef {Object} CameraManagerAPI
 * @property {function(): Promise<void>} initialize - Initialize camera manager
 * @property {function(HTMLVideoElement, string=): Promise<MediaStream>} startCamera - Start camera
 * @property {function(): void} stopCamera - Stop camera
 * @property {function(string): Promise<void>} switchCamera - Switch to specific camera
 * @property {function(): Promise<void>} toggleCamera - Toggle between cameras
 * @property {function(number): Promise<void>} setZoom - Set zoom level
 * @property {function(): Promise<boolean>} toggleTorch - Toggle torch/flash
 * @property {function(number, number): Promise<void>} focus - Focus at point
 * @property {function(): CameraInfo[]} getCameraList - Get available cameras
 * @property {function(): CameraInfo} getCurrentCamera - Get current camera
 * @property {function(): boolean} hasMultipleCameras - Check if multiple cameras available
 * @property {function(): boolean} canToggleTorch - Check if torch available
 * @property {function(): boolean} canZoom - Check if zoom available
 * @property {function(CameraCallbacks): void} setCallbacks - Set event callbacks
 */
/**
 * Advanced Camera Manager with Multiple Device Support
 * Handles camera selection, permissions, settings, and error recovery
 * 
 * @class CameraManager
 * @implements {CameraManagerAPI}
 */
class CameraManager {
    constructor() {
        this.cameras = [];
        this.currentCamera = null;
        this.currentStream = null;
        this.videoElement = null;
        this.constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { 
                    ideal: window.AppConfig?.get('camera.video.width.ideal') || 1280, 
                    max: window.AppConfig?.get('camera.video.width.max') || 1920 
                },
                height: { 
                    ideal: window.AppConfig?.get('camera.video.height.ideal') || 720, 
                    max: window.AppConfig?.get('camera.video.height.max') || 1080 
                },
                frameRate: { 
                    ideal: window.AppConfig?.get('camera.video.frameRate.ideal') || 15, 
                    max: window.AppConfig?.get('camera.video.frameRate.max') || 30 
                }
            }
        };
        this.permissionState = 'prompt'; // 'granted', 'denied', 'prompt'
        this.callbacks = {
            onCameraChange: null,
            onPermissionChange: null,
            onError: null
        };
        
        this.settings = {
            autoSwitchOnError: true,
            preferredCamera: 'environment', // 'environment' or 'user'
            enableTorch: false,
            zoomLevel: 1.0,
            focusMode: 'continuous',
            exposureMode: 'continuous'
        };
    }
    
    async initialize() {
        try {
            // Check if camera API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not available');
            }
            
            // Check permission state
            await this.checkPermissions();
            
            // Enumerate available cameras
            await this.enumerateCameras();
            
            // Listen for device changes
            navigator.mediaDevices.addEventListener('devicechange', async () => {
                console.log('📷 Camera devices changed');
                await this.enumerateCameras();
            });
            
            console.log('✅ Camera Manager initialized');
        } catch (error) {
            console.error('Camera Manager initialization failed:', error);
            throw error;
        }
    }
    
    async checkPermissions() {
        try {
            // Try to query camera permission
            const result = await navigator.permissions.query({ name: 'camera' });
            this.permissionState = result.state;
            
            // Listen for permission changes
            result.addEventListener('change', () => {
                this.permissionState = result.state;
                if (this.callbacks.onPermissionChange) {
                    this.callbacks.onPermissionChange(result.state);
                }
                console.log(`📷 Camera permission changed to: ${result.state}`);
            });
        } catch (error) {
            // Permissions API might not be available
            console.log('Permissions API not available, will check on getUserMedia');
        }
    }
    
    async enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');
            
            // Map camera information
            this.cameras = this.cameras.map((camera, index) => ({
                deviceId: camera.deviceId,
                label: camera.label || `Camera ${index + 1}`,
                groupId: camera.groupId,
                facingMode: this.guessFacingMode(camera.label),
                capabilities: null // Will be populated when camera is activated
            }));
            
            console.log(`📷 Found ${this.cameras.length} camera(s):`, this.cameras);
            
            // Select default camera
            if (!this.currentCamera && this.cameras.length > 0) {
                const preferredCamera = this.cameras.find(cam => 
                    cam.facingMode === this.settings.preferredCamera
                ) || this.cameras[0];
                this.currentCamera = preferredCamera;
            }
            
            return this.cameras;
        } catch (error) {
            console.error('Failed to enumerate cameras:', error);
            return [];
        }
    }
    
    guessFacingMode(label) {
        const labelLower = label.toLowerCase();
        if (labelLower.includes('back') || labelLower.includes('rear')) {
            return 'environment';
        } else if (labelLower.includes('front')) {
            return 'user';
        }
        return 'unknown';
    }
    
    async startCamera(videoElement, cameraId = null) {
        try {
            this.videoElement = videoElement;
            
            // Stop current stream if exists
            if (this.currentStream) {
                this.stopCamera();
            }
            
            // Select camera
            if (cameraId) {
                const camera = this.cameras.find(cam => cam.deviceId === cameraId);
                if (camera) {
                    this.currentCamera = camera;
                }
            }
            
            // Build constraints
            const constraints = { ...this.constraints };
            if (this.currentCamera?.deviceId) {
                constraints.video.deviceId = { exact: this.currentCamera.deviceId };
            }
            
            // Request camera access
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Update permission state
            this.permissionState = 'granted';
            
            // Attach to video element
            this.videoElement.srcObject = this.currentStream;
            
            // Get camera capabilities
            await this.updateCameraCapabilities();
            
            // Apply settings
            await this.applySettings();
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = resolve;
                this.videoElement.onerror = () => reject(new Error('Video loading failed'));
                const videoTimeout = window.AppConfig?.get('camera.videoLoadTimeout') || 10000;
                setTimeout(() => reject(new Error('Video loading timeout')), videoTimeout);
            });
            
            console.log('✅ Camera started successfully');
            
            if (this.callbacks.onCameraChange) {
                this.callbacks.onCameraChange(this.currentCamera);
            }
            
            return this.currentStream;
            
        } catch (error) {
            console.error('Failed to start camera:', error);
            this.handleCameraError(error);
            throw error;
        }
    }
    
    async updateCameraCapabilities() {
        if (!this.currentStream) return;
        
        const videoTrack = this.currentStream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        try {
            // Get capabilities if supported
            if ('getCapabilities' in videoTrack) {
                const capabilities = videoTrack.getCapabilities();
                if (this.currentCamera) {
                    this.currentCamera.capabilities = capabilities;
                }
                console.log('📷 Camera capabilities:', capabilities);
            }
            
            // Get current settings
            if ('getSettings' in videoTrack) {
                const settings = videoTrack.getSettings();
                console.log('📷 Current settings:', settings);
            }
        } catch (error) {
            console.log('Could not get camera capabilities:', error);
        }
    }
    
    async applySettings() {
        if (!this.currentStream) return;
        
        const videoTrack = this.currentStream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        try {
            const constraints = {};
            const capabilities = this.currentCamera?.capabilities;
            
            // Apply torch/flashlight
            if (capabilities?.torch && 'applyConstraints' in videoTrack) {
                constraints.torch = this.settings.enableTorch;
            }
            
            // Apply zoom
            if (capabilities?.zoom && this.settings.zoomLevel !== 1.0) {
                const { min, max } = capabilities.zoom;
                constraints.zoom = Math.max(min, Math.min(max, this.settings.zoomLevel));
            }
            
            // Apply focus mode
            if (capabilities?.focusMode && capabilities.focusMode.includes(this.settings.focusMode)) {
                constraints.focusMode = this.settings.focusMode;
            }
            
            // Apply exposure mode
            if (capabilities?.exposureMode && capabilities.exposureMode.includes(this.settings.exposureMode)) {
                constraints.exposureMode = this.settings.exposureMode;
            }
            
            if (Object.keys(constraints).length > 0 && 'applyConstraints' in videoTrack) {
                await videoTrack.applyConstraints(constraints);
                console.log('📷 Applied camera constraints:', constraints);
            }
        } catch (error) {
            console.log('Could not apply camera settings:', error);
        }
    }
    
    async switchCamera(cameraId) {
        if (!cameraId || cameraId === this.currentCamera?.deviceId) {
            return;
        }
        
        console.log(`📷 Switching to camera: ${cameraId}`);
        await this.startCamera(this.videoElement, cameraId);
    }
    
    async toggleCamera() {
        if (this.cameras.length < 2) {
            console.log('Only one camera available');
            return;
        }
        
        const currentIndex = this.cameras.findIndex(cam => 
            cam.deviceId === this.currentCamera?.deviceId
        );
        const nextIndex = (currentIndex + 1) % this.cameras.length;
        const nextCamera = this.cameras[nextIndex];
        
        await this.switchCamera(nextCamera.deviceId);
    }
    
    async setZoom(level) {
        this.settings.zoomLevel = level;
        await this.applySettings();
    }
    
    async toggleTorch() {
        this.settings.enableTorch = !this.settings.enableTorch;
        await this.applySettings();
        return this.settings.enableTorch;
    }
    
    async focus(x, y) {
        // Attempt to focus at specific point (if supported)
        if (!this.currentStream) return;
        
        const videoTrack = this.currentStream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        try {
            // This is experimental and might not be supported
            if ('applyConstraints' in videoTrack) {
                await videoTrack.applyConstraints({
                    focusMode: 'manual',
                    focusPointX: x,
                    focusPointY: y
                });
                
                // Return to continuous focus after a delay
                const focusReturnDelay = window.AppConfig?.get('camera.focusReturnDelay') || 3000;
                setTimeout(() => {
                    videoTrack.applyConstraints({ focusMode: 'continuous' });
                }, focusReturnDelay);
            }
        } catch (error) {
            console.log('Manual focus not supported:', error);
        }
    }
    
    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        console.log('📷 Camera stopped');
    }
    
    async handleCameraError(error) {
        const errorInfo = this.getCameraErrorInfo(error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(errorInfo);
        }
        
        // Auto-switch to another camera if available
        if (this.settings.autoSwitchOnError && this.cameras.length > 1) {
            console.log('📷 Attempting to switch to another camera...');
            
            const otherCameras = this.cameras.filter(cam => 
                cam.deviceId !== this.currentCamera?.deviceId
            );
            
            for (const camera of otherCameras) {
                try {
                    await this.startCamera(this.videoElement, camera.deviceId);
                    console.log('✅ Successfully switched to backup camera');
                    return;
                } catch (switchError) {
                    console.log(`Failed to switch to camera ${camera.label}`);
                }
            }
        }
    }
    
    getCameraErrorInfo(error) {
        const info = {
            type: 'unknown',
            message: error.message,
            recoverable: false,
            userAction: 'Please check camera permissions and try again'
        };
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            info.type = 'permission';
            info.userAction = 'Please allow camera access in your browser settings';
            this.permissionState = 'denied';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            info.type = 'not-found';
            info.userAction = 'No camera found. Please connect a camera and try again';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            info.type = 'in-use';
            info.userAction = 'Camera is already in use by another application';
            info.recoverable = true;
        } else if (error.name === 'OverconstrainedError') {
            info.type = 'constraints';
            info.userAction = 'Camera does not support requested settings';
            info.recoverable = true;
        } else if (error.name === 'TypeError') {
            info.type = 'not-secure';
            info.userAction = 'Camera requires a secure connection (HTTPS)';
        }
        
        return info;
    }
    
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }
    
    getCameraList() {
        return this.cameras.map(camera => ({
            id: camera.deviceId,
            label: camera.label,
            facingMode: camera.facingMode,
            current: camera.deviceId === this.currentCamera?.deviceId,
            capabilities: camera.capabilities
        }));
    }
    
    getCurrentCamera() {
        return this.currentCamera;
    }
    
    hasMultipleCameras() {
        return this.cameras.length > 1;
    }
    
    canToggleTorch() {
        return this.currentCamera?.capabilities?.torch || false;
    }
    
    canZoom() {
        return this.currentCamera?.capabilities?.zoom || false;
    }
    
    getZoomRange() {
        const zoom = this.currentCamera?.capabilities?.zoom;
        return zoom ? { min: zoom.min, max: zoom.max } : { min: 1, max: 1 };
    }
}

// Export for ES6 modules
export { CameraManager };