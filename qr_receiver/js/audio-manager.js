/**
 * @fileoverview Professional Audio Manager for QR Scanner
 * Provides high-quality audio feedback with volume control and customization
 */

/**
 * @interface SoundDefinition
 * @description Configuration for a sound effect
 * @typedef {Object} SoundDefinition
 * @property {number|number[]} frequency - Sound frequency/frequencies in Hz
 * @property {number} duration - Duration in seconds
 * @property {number} volume - Volume level (0-1)
 * @property {'success'|'error'|'info'|'warning'} type - Sound type
 */

/**
 * @interface PlaySoundOptions
 * @description Options for playing sounds
 * @typedef {Object} PlaySoundOptions
 * @property {number} volume - Volume override (0-1)
 * @property {number} pitch - Pitch adjustment (playback rate)
 */

/**
 * @interface AudioPreferences
 * @description User audio preferences
 * @typedef {Object} AudioPreferences
 * @property {boolean} enabled - Whether audio is enabled
 * @property {number} volume - Master volume (0-1)
 */

/**
 * @interface AudioManagerAPI
 * @description Public API contract for AudioManager
 * @typedef {Object} AudioManagerAPI
 * @property {function(): Promise<void>} initialize - Initialize audio system
 * @property {function(string, PlaySoundOptions=): Promise<void>} playSound - Play a sound
 * @property {function(): Promise<void>} scanSuccess - Play scan success sound
 * @property {function(): Promise<void>} scanError - Play scan error sound
 * @property {function(number, number): Promise<void>} chunkReceived - Play chunk received sound
 * @property {function(): Promise<void>} transferComplete - Play transfer complete sound
 * @property {function(string, Object=): Promise<void>} feedback - Combined audio/haptic feedback
 * @property {function(boolean): void} setEnabled - Enable/disable audio
 * @property {function(number): void} setMasterVolume - Set master volume
 * @property {function(): void} showAudioControls - Show audio controls
 * @property {function(): void} hideAudioControls - Hide audio controls
 * @property {function(): void} toggleAudioControls - Toggle audio controls
 */
/**
 * Professional Audio Manager for QR Scanner
 * Provides high-quality audio feedback with volume control and customization
 * 
 * @class AudioManager
 * @implements {AudioManagerAPI}
 */
class AudioManager {
    constructor(ui = null) {
        // UI Manager for DOM operations - ROOT CAUSE FIX
        this.ui = ui;
        this.audioContext = null;
        this.masterVolume = 0.7;
        this.isEnabled = true;
        this.sounds = new Map();
        this.audioBuffers = new Map();
        
        this.soundDefinitions = {
            scanSuccess: {
                frequency: [800, 1200, 800],
                duration: 0.15,
                volume: 0.8,
                type: 'success'
            },
            scanError: {
                frequency: [400, 300],
                duration: 0.3,
                volume: 0.6,
                type: 'error'
            },
            chunkReceived: {
                frequency: [600, 900],
                duration: 0.1,
                volume: 0.4,
                type: 'info'
            },
            transferComplete: {
                frequency: [523.25, 659.25, 783.99, 1046.5], // C-E-G-C chord
                duration: 0.8,
                volume: 0.9,
                type: 'success'
            },
            transferStart: {
                frequency: [1046.5, 783.99],
                duration: 0.2,
                volume: 0.6,
                type: 'info'
            },
            retryAttempt: {
                frequency: [500, 700, 500],
                duration: 0.25,
                volume: 0.5,
                type: 'warning'
            },
            cameraReady: {
                frequency: [880],
                duration: 0.1,
                volume: 0.3,
                type: 'info'
            },
            permissionGranted: {
                frequency: [698.46, 880, 1174.66], // F-A-D
                duration: 0.4,
                volume: 0.7,
                type: 'success'
            }
        };
        
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.setupUI();
        }
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize Web Audio API
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
                console.log('✅ Audio Manager initialized');
                
                // Generate sound buffers
                await this.generateSoundBuffers();
                
                // Load user preferences
                this.loadPreferences();
            } else {
                console.warn('⚠️ Web Audio API not available');
                this.isEnabled = false;
            }
        } catch (error) {
            console.error('Audio Manager initialization failed:', error);
            this.isEnabled = false;
        }
    }
    
    async generateSoundBuffers() {
        for (const [name, definition] of Object.entries(this.soundDefinitions)) {
            try {
                const buffer = await this.createSoundBuffer(definition);
                this.audioBuffers.set(name, buffer);
            } catch (error) {
                console.warn(`Failed to generate sound buffer for ${name}:`, error);
            }
        }
    }
    
    async createSoundBuffer(definition) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(sampleRate * definition.duration);
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        const frequencies = Array.isArray(definition.frequency) ? definition.frequency : [definition.frequency];
        const segmentLength = Math.floor(length / frequencies.length);
        
        for (let i = 0; i < length; i++) {
            const segmentIndex = Math.floor(i / segmentLength);
            const frequency = frequencies[Math.min(segmentIndex, frequencies.length - 1)];
            const time = i / sampleRate;
            
            // Create envelope (fade in/out)
            let envelope = 1;
            const fadeTime = 0.02; // 20ms fade
            const fadeSamples = Math.floor(fadeTime * sampleRate);
            
            if (i < fadeSamples) {
                envelope = i / fadeSamples; // Fade in
            } else if (i > length - fadeSamples) {
                envelope = (length - i) / fadeSamples; // Fade out
            }
            
            // Generate waveform (using a mix of sine and triangle for pleasant tone)
            const sine = Math.sin(2 * Math.PI * frequency * time);
            const triangle = this.triangleWave(frequency * time);
            const wave = 0.7 * sine + 0.3 * triangle;
            
            data[i] = wave * envelope * definition.volume;
        }
        
        return buffer;
    }
    
    triangleWave(x) {
        const fract = x - Math.floor(x);
        return fract < 0.5 ? 4 * fract - 1 : 3 - 4 * fract;
    }
    
    async playSound(soundName, options = {}) {
        if (!this.isEnabled || !this.audioContext || this.masterVolume === 0) {
            return;
        }
        
        try {
            // Resume audio context if suspended (required after user interaction)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const buffer = this.audioBuffers.get(soundName);
            if (!buffer) {
                console.warn(`Sound '${soundName}' not found`);
                return;
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            
            // Apply volume
            const volume = (options.volume || 1) * this.masterVolume;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            
            // Apply pitch shift if specified
            if (options.pitch) {
                source.playbackRate.value = options.pitch;
            }
            
            // Connect audio graph
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play sound
            source.start(0);
            
            // Clean up after playing
            source.onended = () => {
                try {
                    source.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Already disconnected
                }
            };
            
        } catch (error) {
            console.warn('Failed to play sound:', error);
        }
    }
    
    // Convenience methods for common sounds
    async scanSuccess() {
        await this.playSound('scanSuccess');
    }
    
    async scanError() {
        await this.playSound('scanError');
    }
    
    async chunkReceived(chunkIndex, totalChunks) {
        // Vary pitch based on progress
        const progress = chunkIndex / totalChunks;
        const pitch = 0.8 + (progress * 0.4); // 0.8 to 1.2
        await this.playSound('chunkReceived', { pitch });
    }
    
    async transferComplete() {
        await this.playSound('transferComplete');
    }
    
    async transferStart() {
        await this.playSound('transferStart');
    }
    
    async retryAttempt(attemptNumber) {
        // Lower pitch for repeated attempts
        const pitch = Math.max(0.7, 1.0 - (attemptNumber - 1) * 0.1);
        await this.playSound('retryAttempt', { pitch });
    }
    
    async cameraReady() {
        await this.playSound('cameraReady');
    }
    
    async permissionGranted() {
        await this.playSound('permissionGranted');
    }
    
    // Custom sound sequences
    async playProgressSequence(progress) {
        // Play a sequence of tones representing progress
        const tones = Math.floor(progress * 8) + 1;
        const baseFreq = 440; // A4
        
        for (let i = 0; i < tones; i++) {
            const frequency = baseFreq * Math.pow(2, i / 12); // Chromatic scale
            await this.playCustomTone(frequency, 0.08, 0.3);
            await this.sleep(50);
        }
    }
    
    async playCustomTone(frequency, duration, volume = 0.5) {
        if (!this.isEnabled || !this.audioContext) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            const vol = volume * this.masterVolume;
            gainNode.gain.setValueAtTime(vol, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
            
        } catch (error) {
            console.warn('Failed to play custom tone:', error);
        }
    }
    
    setupUI() {
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (!this.ui) return;
        
        const cssContent = `
            /* Audio Controls */
            .audio-controls {
                position: fixed;
                top: calc(var(--safe-area-top, 20px) + 70px);
                right: 20px;
                background: var(--blur-bg, rgba(0, 0, 0, 0.7));
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 12px;
                padding: 12px;
                z-index: 89;
                opacity: 0;
                transform: translateX(20px);
                pointer-events: none;
                transition: all 0.3s ease;
                min-width: 200px;
            }
            
            .audio-controls.visible {
                opacity: 1;
                transform: translateX(0);
                pointer-events: auto;
            }
            
            .audio-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                color: var(--text-primary, white);
                font-size: 14px;
                font-weight: 500;
            }
            
            .audio-toggle input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: var(--primary-blue);
            }
            
            .volume-control {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-primary, white);
                font-size: 12px;
            }
            
            .volume-slider {
                flex: 1;
            }
            
            .volume-slider input[type="range"] {
                width: 100%;
                height: 4px;
                background: var(--border-color, rgba(255, 255, 255, 0.2));
                border-radius: 2px;
                appearance: none;
                outline: none;
            }
            
            .volume-slider input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                background: var(--primary-blue);
                border-radius: 50%;
                cursor: pointer;
            }
            
            .volume-slider input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: var(--primary-blue);
                border-radius: 50%;
                border: none;
                cursor: pointer;
            }
            
            .sound-test-btn {
                background: var(--primary-blue);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                margin-top: 8px;
                width: 100%;
                transition: opacity 0.2s ease;
            }
            
            .sound-test-btn:active {
                opacity: 0.8;
            }
        `;
        
        // Use UIManager to add styles - ROOT CAUSE FIX
        this.ui.addStyles(cssContent);
        
        // Create audio controls UI
        this.createAudioControls();
    }
    
    createAudioControls() {
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (!this.ui) return;
        
        const htmlContent = `
            <label class="audio-toggle">
                <input type="checkbox" id="audioEnabled" ${this.isEnabled ? 'checked' : ''}>
                Sound Effects
            </label>
            <div class="volume-control">
                <span>🔊</span>
                <div class="volume-slider">
                    <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${this.masterVolume}">
                </div>
                <span id="volumePercent">${Math.round(this.masterVolume * 100)}%</span>
            </div>
            <button class="sound-test-btn" id="soundTestBtn">Test Sound</button>
        `;
        
        // Use UIManager to create controls - ROOT CAUSE FIX
        const controls = this.ui.createAudioControls(htmlContent);
        
        // Use UIManager to bind events - ROOT CAUSE FIX
        this.ui.bindAudioControlEvent('audioEnabled', 'change', (e) => {
            this.setEnabled(e.target.checked);
        });
        
        this.ui.bindAudioControlEvent('volumeSlider', 'input', (e) => {
            const volume = parseFloat(e.target.value);
            this.setMasterVolume(volume);
            this.ui.updateAudioControl('volumePercent', 'textContent', Math.round(volume * 100) + '%');
        });
        
        this.ui.bindAudioControlEvent('soundTestBtn', 'click', () => {
            this.playSound('transferComplete');
        });
        
        return controls;
    }
    
    showAudioControls() {
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.ui.showAudioControls();
        }
    }
    
    hideAudioControls() {
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.ui.hideAudioControls();
        }
    }
    
    toggleAudioControls() {
        // Use UIManager for DOM operations - ROOT CAUSE FIX
        if (this.ui) {
            this.ui.toggleAudioControls();
        }
    }
    
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.savePreferences();
        
        if (enabled && this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
        
        console.log(`🔊 Audio ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.savePreferences();
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('qr-scanner-audio-preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.isEnabled = prefs.enabled !== false;
                this.masterVolume = prefs.volume || 0.7;
                
                // Use UIManager to update UI - ROOT CAUSE FIX
                if (this.ui) {
                    this.ui.updateAudioControl('audioEnabled', 'checked', this.isEnabled);
                    this.ui.updateAudioControl('volumeSlider', 'value', this.masterVolume);
                    this.ui.updateAudioControl('volumePercent', 'textContent', Math.round(this.masterVolume * 100) + '%');
                }
            }
        } catch (error) {
            console.log('Could not load audio preferences:', error);
        }
    }
    
    savePreferences() {
        try {
            const prefs = {
                enabled: this.isEnabled,
                volume: this.masterVolume
            };
            localStorage.setItem('qr-scanner-audio-preferences', JSON.stringify(prefs));
        } catch (error) {
            console.log('Could not save audio preferences:', error);
        }
    }
    
    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    isAudioEnabled() {
        return this.isEnabled && this.masterVolume > 0;
    }
    
    getMasterVolume() {
        return this.masterVolume;
    }
    
    getSoundDefinitions() {
        return { ...this.soundDefinitions };
    }
    
    // Create haptic feedback for mobile devices
    vibrate(pattern = [50]) {
        if (navigator.vibrate && this.isEnabled) {
            navigator.vibrate(pattern);
        }
    }
    
    // Combined audio and haptic feedback
    async feedback(type, options = {}) {
        switch (type) {
            case 'success':
                await this.scanSuccess();
                this.vibrate([50]);
                break;
            case 'error':
                await this.scanError();
                this.vibrate([100, 50, 100]);
                break;
            case 'complete':
                await this.transferComplete();
                this.vibrate([200, 100, 200]);
                break;
            case 'progress':
                await this.chunkReceived(options.index || 0, options.total || 1);
                this.vibrate([30]);
                break;
            default:
                await this.playSound(type, options);
        }
    }
}

// Export for ES6 modules
export { AudioManager };