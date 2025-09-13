/**
 * Camera UI Component with Professional Controls
 * Provides camera switching, zoom, torch, and permission handling UI
 */
class CameraUI {
    constructor(cameraManager) {
        this.cameraManager = cameraManager;
        this.elements = {};
        this.isUIVisible = true;
        this.zoomLevel = 1.0;
        
        this.setupStyles();
        this.createUI();
        this.bindEvents();
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Camera Controls Container */
            .camera-controls {
                position: fixed;
                bottom: calc(var(--safe-area-bottom, 20px) + 100px);
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
                z-index: 85;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .camera-controls.hidden {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
                pointer-events: none;
            }
            
            /* Camera Control Button */
            .camera-control-btn {
                width: 48px;
                height: 48px;
                border-radius: 24px;
                background: var(--blur-bg, rgba(0, 0, 0, 0.7));
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 2px solid var(--border-color, rgba(255, 255, 255, 0.2));
                color: var(--text-primary, white);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 20px;
                position: relative;
            }
            
            .camera-control-btn:active {
                transform: scale(0.95);
            }
            
            .camera-control-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .camera-control-btn.active {
                background: var(--primary-blue);
                border-color: var(--primary-blue);
            }
            
            /* Camera Selector */
            .camera-selector {
                position: fixed;
                bottom: calc(var(--safe-area-bottom, 20px) + 160px);
                left: 50%;
                transform: translateX(-50%);
                background: var(--blur-bg, rgba(0, 0, 0, 0.9));
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 16px;
                padding: 8px;
                box-shadow: 0 4px 20px var(--shadow-color, rgba(0, 0, 0, 0.3));
                z-index: 86;
                opacity: 0;
                transform: translateX(-50%) scale(0.9);
                pointer-events: none;
                transition: all 0.3s ease;
                max-width: 300px;
            }
            
            .camera-selector.visible {
                opacity: 1;
                transform: translateX(-50%) scale(1);
                pointer-events: auto;
            }
            
            .camera-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.2s ease;
                color: var(--text-primary, white);
                font-size: 15px;
            }
            
            .camera-option:hover {
                background: var(--bg-secondary, rgba(255, 255, 255, 0.1));
            }
            
            .camera-option.active {
                background: var(--primary-blue);
            }
            
            .camera-option .camera-icon {
                font-size: 18px;
            }
            
            .camera-option .camera-info {
                flex: 1;
            }
            
            .camera-option .camera-label {
                font-weight: 500;
            }
            
            .camera-option .camera-type {
                font-size: 13px;
                opacity: 0.7;
                text-transform: capitalize;
            }
            
            /* Zoom Slider */
            .zoom-control {
                position: fixed;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
                width: 48px;
                height: 200px;
                background: var(--blur-bg, rgba(0, 0, 0, 0.7));
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 24px;
                padding: 12px 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                z-index: 85;
                opacity: 0;
                transform: translateY(-50%) translateX(20px);
                pointer-events: none;
                transition: all 0.3s ease;
            }
            
            .zoom-control.visible {
                opacity: 1;
                transform: translateY(-50%) translateX(0);
                pointer-events: auto;
            }
            
            .zoom-label {
                font-size: 12px;
                color: var(--text-primary, white);
                font-weight: 600;
            }
            
            .zoom-slider {
                width: 120px;
                transform: rotate(-90deg);
                margin: 40px 0;
            }
            
            .zoom-slider input[type="range"] {
                width: 100%;
                appearance: none;
                background: transparent;
                cursor: pointer;
            }
            
            .zoom-slider input[type="range"]::-webkit-slider-track {
                width: 100%;
                height: 4px;
                background: var(--border-color, rgba(255, 255, 255, 0.2));
                border-radius: 2px;
            }
            
            .zoom-slider input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                background: var(--primary-blue);
                border-radius: 50%;
                cursor: pointer;
            }
            
            /* Permission UI */
            .camera-permission-prompt {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--blur-bg, rgba(0, 0, 0, 0.9));
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 32px;
                text-align: center;
                z-index: 200;
                max-width: 340px;
                box-shadow: 0 10px 40px var(--shadow-color, rgba(0, 0, 0, 0.3));
                display: none;
            }
            
            .camera-permission-prompt.visible {
                display: block;
            }
            
            .permission-icon {
                font-size: 64px;
                margin-bottom: 16px;
            }
            
            .permission-title {
                font-size: 20px;
                font-weight: 600;
                color: var(--text-primary, white);
                margin-bottom: 8px;
            }
            
            .permission-text {
                font-size: 15px;
                color: var(--text-secondary, rgba(255, 255, 255, 0.7));
                line-height: 1.5;
                margin-bottom: 24px;
            }
            
            .permission-button {
                background: var(--primary-blue);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .permission-button:active {
                transform: scale(0.95);
            }
            
            /* Touch Focus Indicator */
            .focus-indicator {
                position: fixed;
                width: 80px;
                height: 80px;
                border: 2px solid var(--warning-orange);
                border-radius: 50%;
                pointer-events: none;
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.5);
                transition: all 0.3s ease;
                z-index: 84;
            }
            
            .focus-indicator.visible {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        `;
        document.head.appendChild(style);
    }
    
    createUI() {
        // Camera Controls Container
        const controls = document.createElement('div');
        controls.className = 'camera-controls';
        
        // Switch Camera Button
        const switchBtn = document.createElement('button');
        switchBtn.className = 'camera-control-btn';
        switchBtn.id = 'cameraSwitchBtn';
        switchBtn.innerHTML = '🔄';
        switchBtn.title = 'Switch camera';
        controls.appendChild(switchBtn);
        
        // Torch Button
        const torchBtn = document.createElement('button');
        torchBtn.className = 'camera-control-btn';
        torchBtn.id = 'cameraTorchBtn';
        torchBtn.innerHTML = '🔦';
        torchBtn.title = 'Toggle flashlight';
        controls.appendChild(torchBtn);
        
        // Zoom Button
        const zoomBtn = document.createElement('button');
        zoomBtn.className = 'camera-control-btn';
        zoomBtn.id = 'cameraZoomBtn';
        zoomBtn.innerHTML = '🔍';
        zoomBtn.title = 'Zoom control';
        controls.appendChild(zoomBtn);
        
        // Camera Selector Menu
        const selector = document.createElement('div');
        selector.className = 'camera-selector';
        selector.id = 'cameraSelector';
        
        // Zoom Control
        const zoomControl = document.createElement('div');
        zoomControl.className = 'zoom-control';
        zoomControl.id = 'zoomControl';
        zoomControl.innerHTML = `
            <div class="zoom-label">2x</div>
            <div class="zoom-slider">
                <input type="range" id="zoomSlider" min="1" max="5" step="0.1" value="1">
            </div>
            <div class="zoom-label">1x</div>
        `;
        
        // Permission Prompt
        const permissionPrompt = document.createElement('div');
        permissionPrompt.className = 'camera-permission-prompt';
        permissionPrompt.id = 'cameraPermissionPrompt';
        permissionPrompt.innerHTML = `
            <div class="permission-icon">📷</div>
            <div class="permission-title">Camera Access Required</div>
            <div class="permission-text">
                To scan QR codes, please allow access to your camera.
            </div>
            <button class="permission-button" id="requestPermissionBtn">Allow Camera Access</button>
        `;
        
        // Focus Indicator
        const focusIndicator = document.createElement('div');
        focusIndicator.className = 'focus-indicator';
        focusIndicator.id = 'focusIndicator';
        
        // Add to DOM
        document.body.appendChild(controls);
        document.body.appendChild(selector);
        document.body.appendChild(zoomControl);
        document.body.appendChild(permissionPrompt);
        document.body.appendChild(focusIndicator);
        
        // Store references
        this.elements = {
            controls,
            switchBtn,
            torchBtn,
            zoomBtn,
            selector,
            zoomControl,
            zoomSlider: document.getElementById('zoomSlider'),
            permissionPrompt,
            requestPermissionBtn: document.getElementById('requestPermissionBtn'),
            focusIndicator
        };
    }
    
    bindEvents() {
        // Camera switch button
        this.elements.switchBtn.addEventListener('click', () => {
            this.toggleCameraSelector();
        });
        
        // Torch toggle
        this.elements.torchBtn.addEventListener('click', async () => {
            const enabled = await this.cameraManager.toggleTorch();
            this.elements.torchBtn.classList.toggle('active', enabled);
        });
        
        // Zoom control
        this.elements.zoomBtn.addEventListener('click', () => {
            this.toggleZoomControl();
        });
        
        // Zoom slider
        this.elements.zoomSlider.addEventListener('input', async (e) => {
            const zoom = parseFloat(e.target.value);
            await this.cameraManager.setZoom(zoom);
            this.updateZoomLabels(zoom);
        });
        
        // Permission button
        this.elements.requestPermissionBtn.addEventListener('click', () => {
            this.requestCameraPermission();
        });
        
        // Touch focus (on video element)
        const video = document.getElementById('video');
        if (video) {
            video.addEventListener('click', (e) => {
                this.handleTouchFocus(e);
            });
        }
        
        // Close selectors on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.camera-controls') && 
                !e.target.closest('.camera-selector') && 
                !e.target.closest('.zoom-control')) {
                this.hideSelector();
                this.hideZoomControl();
            }
        });
        
        // Set up camera manager callbacks
        this.cameraManager.setCallbacks({
            onCameraChange: (camera) => this.updateCameraUI(camera),
            onPermissionChange: (state) => this.handlePermissionChange(state),
            onError: (error) => this.handleCameraError(error)
        });
    }
    
    async initialize() {
        // Update UI based on camera capabilities
        await this.updateAvailableControls();
        
        // Check initial permission state
        if (this.cameraManager.permissionState === 'prompt') {
            this.showPermissionPrompt();
        } else if (this.cameraManager.permissionState === 'denied') {
            this.showPermissionDenied();
        }
    }
    
    async updateAvailableControls() {
        const hasMultiple = this.cameraManager.hasMultipleCameras();
        const canTorch = this.cameraManager.canToggleTorch();
        const canZoom = this.cameraManager.canZoom();
        
        this.elements.switchBtn.disabled = !hasMultiple;
        this.elements.switchBtn.style.display = hasMultiple ? 'flex' : 'none';
        
        this.elements.torchBtn.disabled = !canTorch;
        this.elements.torchBtn.style.display = canTorch ? 'flex' : 'none';
        
        this.elements.zoomBtn.disabled = !canZoom;
        this.elements.zoomBtn.style.display = canZoom ? 'flex' : 'none';
        
        // Update zoom range
        if (canZoom) {
            const range = this.cameraManager.getZoomRange();
            this.elements.zoomSlider.min = range.min;
            this.elements.zoomSlider.max = range.max;
            this.elements.zoomSlider.value = this.cameraManager.settings.zoomLevel;
        }
    }
    
    toggleCameraSelector() {
        const isVisible = this.elements.selector.classList.contains('visible');
        
        if (!isVisible) {
            this.populateCameraSelector();
            this.elements.selector.classList.add('visible');
        } else {
            this.hideSelector();
        }
    }
    
    populateCameraSelector() {
        const cameras = this.cameraManager.getCameraList();
        
        this.elements.selector.innerHTML = cameras.map(camera => `
            <div class="camera-option ${camera.current ? 'active' : ''}" 
                 data-camera-id="${camera.id}">
                <div class="camera-icon">${camera.facingMode === 'environment' ? '📷' : '🤳'}</div>
                <div class="camera-info">
                    <div class="camera-label">${camera.label}</div>
                    <div class="camera-type">${camera.facingMode}</div>
                </div>
            </div>
        `).join('');
        
        // Bind click events
        this.elements.selector.querySelectorAll('.camera-option').forEach(option => {
            option.addEventListener('click', () => {
                const cameraId = option.dataset.cameraId;
                this.cameraManager.switchCamera(cameraId);
                this.hideSelector();
            });
        });
    }
    
    hideSelector() {
        this.elements.selector.classList.remove('visible');
    }
    
    toggleZoomControl() {
        const isVisible = this.elements.zoomControl.classList.contains('visible');
        
        if (!isVisible) {
            this.elements.zoomControl.classList.add('visible');
        } else {
            this.hideZoomControl();
        }
    }
    
    hideZoomControl() {
        this.elements.zoomControl.classList.remove('visible');
    }
    
    updateZoomLabels(zoom) {
        const labels = this.elements.zoomControl.querySelectorAll('.zoom-label');
        labels[0].textContent = `${zoom.toFixed(1)}x`;
    }
    
    showPermissionPrompt() {
        this.elements.permissionPrompt.classList.add('visible');
    }
    
    hidePermissionPrompt() {
        this.elements.permissionPrompt.classList.remove('visible');
    }
    
    showPermissionDenied() {
        this.elements.permissionPrompt.querySelector('.permission-title').textContent = 
            'Camera Access Denied';
        this.elements.permissionPrompt.querySelector('.permission-text').textContent = 
            'Please enable camera access in your browser settings and refresh the page.';
        this.elements.requestPermissionBtn.textContent = 'Open Settings';
        this.elements.requestPermissionBtn.onclick = () => {
            // Try to open settings (browser-specific)
            alert('Please go to your browser settings and enable camera access for this site.');
        };
        this.showPermissionPrompt();
    }
    
    async requestCameraPermission() {
        this.hidePermissionPrompt();
        try {
            const video = document.getElementById('video');
            if (video) {
                await this.cameraManager.startCamera(video);
            }
        } catch (error) {
            console.error('Failed to request camera permission:', error);
        }
    }
    
    handlePermissionChange(state) {
        if (state === 'granted') {
            this.hidePermissionPrompt();
        } else if (state === 'denied') {
            this.showPermissionDenied();
        }
    }
    
    updateCameraUI(camera) {
        // Update UI after camera change
        this.updateAvailableControls();
        
        // Update selector if visible
        if (this.elements.selector.classList.contains('visible')) {
            this.populateCameraSelector();
        }
    }
    
    handleCameraError(error) {
        console.error('Camera error:', error);
        
        // Show appropriate error message
        let message = error.userAction || 'Camera error occurred';
        
        // You can integrate this with your notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--error-red);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 15px;
            z-index: 300;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    async handleTouchFocus(event) {
        const rect = event.target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        // Show focus indicator
        this.elements.focusIndicator.style.left = event.clientX + 'px';
        this.elements.focusIndicator.style.top = event.clientY + 'px';
        this.elements.focusIndicator.classList.add('visible');
        
        // Attempt to focus
        await this.cameraManager.focus(x, y);
        
        // Hide focus indicator after animation
        setTimeout(() => {
            this.elements.focusIndicator.classList.remove('visible');
        }, 1500);
    }
    
    showControls() {
        this.elements.controls.classList.remove('hidden');
        this.isUIVisible = true;
    }
    
    hideControls() {
        this.elements.controls.classList.add('hidden');
        this.hideSelector();
        this.hideZoomControl();
        this.isUIVisible = false;
    }
    
    toggleControls() {
        if (this.isUIVisible) {
            this.hideControls();
        } else {
            this.showControls();
        }
    }
}

// Export for ES6 modules
export { CameraUI };