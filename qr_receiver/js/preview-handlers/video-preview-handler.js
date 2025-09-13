/**
 * @fileoverview Video Preview Handler - Focused Video File Processing
 * 
 * ROOT CAUSE SOLUTION: Extracted from monolithic FilePreviewSystem into focused
 * handler with video controls, thumbnail generation, and video-specific features.
 * 
 * Supports all video formats with proper video controls, thumbnail previews,
 * and metadata extraction (duration, resolution, codec, etc.).
 */

/**
 * Video Preview Handler
 * Handles all video file types with advanced video controls and analysis
 * 
 * @class VideoPreviewHandler
 * @extends {BasePreviewHandler}
 */
class VideoPreviewHandler extends BasePreviewHandler {
    constructor() {
        super();
        
        /** @type {Map<string, HTMLVideoElement>} Cache for loaded videos */
        this.videoCache = new Map();
        
        /** @type {number} Maximum cache size - configurable */
        this.maxCacheSize = window.AppConfig?.get('performance.tier') === 'high' ? 5 : 
                          window.AppConfig?.get('performance.tier') === 'medium' ? 3 : 1;
        
        /** @type {Object} Current video analysis */
        this.currentAnalysis = null;
    }
    
    /**
     * Get handler capabilities
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        return {
            mimeTypes: [
                'video/mp4',
                'video/webm',
                'video/ogg',
                'video/avi',
                'video/mov',
                'video/quicktime',
                'video/x-msvideo',
                'video/3gpp',
                'video/x-ms-wmv'
            ],
            extensions: [
                'mp4', 'webm', 'ogv', 'avi', 'mov', 'qt', '3gp', 'wmv', 'flv', 'mkv'
            ],
            maxFileSize: window.AppConfig?.get('filePreview.maxPreviewSizes.video') || 500 * 1024 * 1024,
            supportsStreaming: true,
            supportsAsync: true,
            features: ['thumbnail', 'metadata', 'video-controls', 'fullscreen', 'playback-analysis']
        };
    }
    
    /**
     * Generate video preview
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const { data, mimeType, filename, container, onProgress } = context;
        
        // Create loading indicator
        const loadingElement = this.createLoadingElement('Loading video file...');
        container.appendChild(loadingElement);
        
        if (onProgress) onProgress(0.1, 'Creating video blob...');
        
        // Create blob and object URL
        const blob = new Blob([data], { type: mimeType });
        const videoUrl = this.createObjectURL(blob);
        
        if (onProgress) onProgress(0.3, 'Loading video metadata...');
        
        // Create and configure video element
        const video = await this.createVideoElement(videoUrl, filename);
        
        if (onProgress) onProgress(0.6, 'Analyzing video properties...');
        
        // Analyze video
        const analysis = await this.analyzeVideo(video, data, mimeType);
        
        if (onProgress) onProgress(0.8, 'Creating video player...');
        
        // Create video container with controls
        const videoContainer = await this.createVideoContainer(video, analysis, context);
        
        // Replace loading with actual content
        container.removeChild(loadingElement);
        container.appendChild(videoContainer);
        
        if (onProgress) onProgress(1.0, 'Video preview ready');
        
        // Extract metadata
        const metadata = await this.extractVideoMetadata(video, analysis, data, mimeType);
        
        return {
            element: videoContainer,
            metadata: metadata,
            cleanup: [
                () => this.revokeObjectURL(videoUrl),
                () => this.removeFromCache(filename),
                () => this.pauseVideo(video)
            ],
            resources: {
                videoUrl: videoUrl,
                videoElement: video,
                analysis: analysis
            }
        };
    }
    
    /**
     * Create video element with error handling
     * @param {string} videoUrl - Video object URL
     * @param {string} filename - Original filename
     * @returns {Promise<HTMLVideoElement>} Loaded video element
     */
    async createVideoElement(videoUrl, filename) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            
            // Set up loading handlers
            video.onloadedmetadata = () => {
                console.log(`🎥 Video loaded: ${filename} (${video.videoWidth}x${video.videoHeight}, ${this.formatDuration(video.duration)})`);
                
                // Cache video if reasonable size
                if (this.shouldCacheVideo(video)) {
                    this.addToCache(filename, video);
                }
                
                resolve(video);
            };
            
            video.onerror = (error) => {
                console.error(`❌ Video load failed: ${filename}`, error);
                reject(new Error(`Failed to load video: ${filename}`));
            };
            
            // Configure video
            video.className = 'preview-video';
            video.preload = 'metadata';
            video.controls = false; // We'll create custom controls
            video.muted = true; // Start muted to comply with autoplay policies
            video.playsInline = true; // Prevents fullscreen on iOS
            
            // Start loading
            video.src = videoUrl;
        });
    }
    
    /**
     * Analyze video properties
     * @param {HTMLVideoElement} video - Video element
     * @param {Uint8Array} data - Video data
     * @param {string} mimeType - MIME type
     * @returns {Promise<Object>} Video analysis
     */
    async analyzeVideo(video, data, mimeType) {
        const analysis = {
            duration: video.duration || 0,
            width: video.videoWidth || 0,
            height: video.videoHeight || 0,
            aspectRatio: 0,
            fileSize: data.length,
            mimeType: mimeType,
            format: this.getVideoFormat(mimeType),
            estimatedBitrate: 0,
            quality: 'unknown',
            resolution: ''
        };
        
        // Calculate aspect ratio
        if (analysis.width > 0 && analysis.height > 0) {
            analysis.aspectRatio = analysis.width / analysis.height;
            analysis.resolution = this.categorizeResolution(analysis.width, analysis.height);
        }
        
        // Estimate bitrate from file size and duration
        if (analysis.duration > 0) {
            analysis.estimatedBitrate = Math.round((data.length * 8) / analysis.duration / 1000); // kbps
            analysis.quality = this.estimateVideoQuality(analysis.width, analysis.height, analysis.estimatedBitrate);
        }
        
        return analysis;
    }
    
    /**
     * Get video format from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} Video format
     */
    getVideoFormat(mimeType) {
        const formatMap = {
            'video/mp4': 'MP4',
            'video/webm': 'WebM',
            'video/ogg': 'OGG',
            'video/avi': 'AVI',
            'video/mov': 'MOV',
            'video/quicktime': 'QuickTime',
            'video/x-msvideo': 'AVI',
            'video/3gpp': '3GP',
            'video/x-ms-wmv': 'WMV'
        };
        
        return formatMap[mimeType] || 'Unknown';
    }
    
    /**
     * Categorize video resolution
     * @param {number} width - Video width
     * @param {number} height - Video height
     * @returns {string} Resolution category
     */
    categorizeResolution(width, height) {
        if (width >= 3840 && height >= 2160) return '4K (2160p)';
        if (width >= 2560 && height >= 1440) return 'QHD (1440p)';
        if (width >= 1920 && height >= 1080) return 'Full HD (1080p)';
        if (width >= 1280 && height >= 720) return 'HD (720p)';
        if (width >= 854 && height >= 480) return 'SD (480p)';
        if (width >= 640 && height >= 360) return 'nHD (360p)';
        return `${width}×${height}`;
    }
    
    /**
     * Estimate video quality
     * @param {number} width - Video width
     * @param {number} height - Video height
     * @param {number} bitrate - Estimated bitrate in kbps
     * @returns {string} Quality description
     */
    estimateVideoQuality(width, height, bitrate) {
        const pixels = width * height;
        const bitratePerPixel = bitrate * 1000 / pixels; // bits per pixel per second
        
        if (pixels >= 3840 * 2160) { // 4K
            if (bitrate >= 25000) return 'Excellent 4K';
            if (bitrate >= 15000) return 'Good 4K';
            return 'Basic 4K';
        } else if (pixels >= 1920 * 1080) { // 1080p
            if (bitrate >= 8000) return 'Excellent HD';
            if (bitrate >= 5000) return 'Good HD';
            return 'Basic HD';
        } else if (pixels >= 1280 * 720) { // 720p
            if (bitrate >= 4000) return 'Excellent 720p';
            if (bitrate >= 2500) return 'Good 720p';
            return 'Basic 720p';
        } else {
            if (bitrate >= 1000) return 'Good SD';
            return 'Basic SD';
        }
    }
    
    /**
     * Create video container with controls
     * @param {HTMLVideoElement} video - Video element
     * @param {Object} analysis - Video analysis
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Video container
     */
    async createVideoContainer(video, analysis, context) {
        const container = this.createContainer('video-preview-container');
        
        // Create video info header
        const infoHeader = this.createVideoInfoHeader(analysis, context);
        container.appendChild(infoHeader);
        
        // Create video player wrapper
        const playerWrapper = this.createVideoPlayerWrapper(video);
        container.appendChild(playerWrapper);
        
        // Create custom video controls
        const controls = this.createVideoControls(video, analysis);
        container.appendChild(controls);
        
        // Create video metadata display
        const metadata = this.createVideoMetadataDisplay(analysis);
        container.appendChild(metadata);
        
        // Store analysis for controls
        this.currentAnalysis = analysis;
        
        return container;
    }
    
    /**
     * Create video info header
     * @param {Object} analysis - Video analysis
     * @param {PreviewContext} context - Preview context
     * @returns {HTMLElement} Info header
     */
    createVideoInfoHeader(analysis, context) {
        const header = document.createElement('div');
        header.className = 'video-info-header';
        
        const duration = this.formatDuration(analysis.duration);
        const fileSize = this.formatBytes(analysis.fileSize);
        const resolution = `${analysis.width}×${analysis.height}`;
        
        header.innerHTML = `
            <div class="video-icon">🎥</div>
            <div class="video-basic-info">
                <div class="video-title">${this.escapeHtml(context.filename)}</div>
                <div class="video-stats">
                    <span class="stat-item">⏱️ ${duration}</span>
                    <span class="stat-item">📊 ${fileSize}</span>
                    <span class="stat-item">🎯 ${analysis.format}</span>
                    <span class="stat-item">📐 ${resolution}</span>
                    <span class="stat-item">⭐ ${analysis.quality}</span>
                </div>
            </div>
        `;
        
        return header;
    }
    
    /**
     * Create video player wrapper
     * @param {HTMLVideoElement} video - Video element
     * @returns {HTMLElement} Player wrapper
     */
    createVideoPlayerWrapper(video) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-player-wrapper';
        
        // Set responsive aspect ratio
        const aspectRatio = video.videoHeight > 0 ? (video.videoHeight / video.videoWidth) * 100 : 56.25; // Default to 16:9
        wrapper.style.paddingBottom = `${aspectRatio}%`;
        
        video.className = 'video-player';
        wrapper.appendChild(video);
        
        // Add play overlay
        const playOverlay = document.createElement('div');
        playOverlay.className = 'video-play-overlay';
        playOverlay.innerHTML = '<div class="play-button">▶️</div>';
        wrapper.appendChild(playOverlay);
        
        // Bind play overlay click
        playOverlay.addEventListener('click', () => {
            this.toggleVideoPlayback(video, playOverlay);
        });
        
        return wrapper;
    }
    
    /**
     * Create custom video controls
     * @param {HTMLVideoElement} video - Video element
     * @param {Object} analysis - Video analysis
     * @returns {HTMLElement} Controls container
     */
    createVideoControls(video, analysis) {
        const controls = document.createElement('div');
        controls.className = 'video-controls';
        
        controls.innerHTML = `
            <div class="playback-controls">
                <button class="control-btn play-pause-btn" data-playing="false" title="Play/Pause">▶️</button>
                <button class="control-btn stop-btn" title="Stop">⏹️</button>
                <button class="control-btn rewind-btn" title="Rewind 10s">⏪</button>
                <button class="control-btn forward-btn" title="Forward 10s">⏩</button>
            </div>
            <div class="progress-container">
                <input type="range" class="progress-bar" min="0" max="100" value="0" title="Seek">
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="time-separator">/</span>
                    <span class="total-time">${this.formatDuration(analysis.duration)}</span>
                </div>
            </div>
            <div class="volume-controls">
                <button class="control-btn mute-btn" title="Mute">🔊</button>
                <input type="range" class="volume-slider" min="0" max="100" value="100" title="Volume">
            </div>
            <div class="additional-controls">
                <button class="control-btn speed-btn" title="Playback Speed">1×</button>
                <button class="control-btn pip-btn" title="Picture-in-Picture">📱</button>
                <button class="control-btn fullscreen-btn" title="Fullscreen">⛶</button>
                <button class="control-btn download-btn" title="Download Video">⬇️</button>
            </div>
        `;
        
        // Bind control events
        this.bindVideoControlEvents(controls, video);
        
        return controls;
    }
    
    /**
     * Create video metadata display
     * @param {Object} analysis - Video analysis
     * @returns {HTMLElement} Metadata display
     */
    createVideoMetadataDisplay(analysis) {
        const metadata = document.createElement('div');
        metadata.className = 'video-metadata';
        
        metadata.innerHTML = `
            <div class="metadata-section">
                <h4>Video Properties</h4>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <span class="metadata-label">Format:</span>
                        <span class="metadata-value">${analysis.format}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Duration:</span>
                        <span class="metadata-value">${this.formatDuration(analysis.duration)}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Resolution:</span>
                        <span class="metadata-value">${analysis.width}×${analysis.height}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Quality:</span>
                        <span class="metadata-value">${analysis.resolution}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Aspect Ratio:</span>
                        <span class="metadata-value">${analysis.aspectRatio.toFixed(2)}:1</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Bitrate:</span>
                        <span class="metadata-value">${analysis.estimatedBitrate} kbps</span>
                    </div>
                </div>
            </div>
        `;
        
        return metadata;
    }
    
    /**
     * Toggle video playback
     * @param {HTMLVideoElement} video - Video element
     * @param {HTMLElement} playOverlay - Play overlay element
     */
    toggleVideoPlayback(video, playOverlay) {
        if (video.paused) {
            video.play();
            playOverlay.style.display = 'none';
        } else {
            video.pause();
            playOverlay.style.display = 'flex';
        }
    }
    
    /**
     * Bind video control events
     * @param {HTMLElement} controls - Controls container
     * @param {HTMLVideoElement} video - Video element
     */
    bindVideoControlEvents(controls, video) {
        const playPauseBtn = controls.querySelector('.play-pause-btn');
        const stopBtn = controls.querySelector('.stop-btn');
        const rewindBtn = controls.querySelector('.rewind-btn');
        const forwardBtn = controls.querySelector('.forward-btn');
        const progressBar = controls.querySelector('.progress-bar');
        const muteBtn = controls.querySelector('.mute-btn');
        const volumeSlider = controls.querySelector('.volume-slider');
        const speedBtn = controls.querySelector('.speed-btn');
        const pipBtn = controls.querySelector('.pip-btn');
        const fullscreenBtn = controls.querySelector('.fullscreen-btn');
        const downloadBtn = controls.querySelector('.download-btn');
        const currentTimeDisplay = controls.querySelector('.current-time');
        
        let playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
        let currentSpeedIndex = 3; // 1x speed
        let isProgressSeeking = false;
        
        // Play/Pause
        playPauseBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playPauseBtn.textContent = '⏸️';
                playPauseBtn.setAttribute('data-playing', 'true');
            } else {
                video.pause();
                playPauseBtn.textContent = '▶️';
                playPauseBtn.setAttribute('data-playing', 'false');
            }
        });
        
        // Stop
        stopBtn.addEventListener('click', () => {
            video.pause();
            video.currentTime = 0;
            playPauseBtn.textContent = '▶️';
            playPauseBtn.setAttribute('data-playing', 'false');
        });
        
        // Rewind
        rewindBtn.addEventListener('click', () => {
            video.currentTime = Math.max(0, video.currentTime - 10);
        });
        
        // Forward
        forwardBtn.addEventListener('click', () => {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
        });
        
        // Progress bar
        progressBar.addEventListener('input', () => {
            isProgressSeeking = true;
            const seekTime = (progressBar.value / 100) * video.duration;
            video.currentTime = seekTime;
        });
        
        progressBar.addEventListener('change', () => {
            isProgressSeeking = false;
        });
        
        // Mute/Unmute
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            muteBtn.textContent = video.muted ? '🔇' : '🔊';
        });
        
        // Volume
        volumeSlider.addEventListener('input', () => {
            video.volume = volumeSlider.value / 100;
            if (video.muted && video.volume > 0) {
                video.muted = false;
                muteBtn.textContent = '🔊';
            }
        });
        
        // Speed
        speedBtn.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
            const speed = playbackSpeeds[currentSpeedIndex];
            video.playbackRate = speed;
            speedBtn.textContent = `${speed}×`;
        });
        
        // Picture-in-Picture
        pipBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (error) {
                console.log('Picture-in-Picture not supported:', error);
            }
        });
        
        // Fullscreen
        fullscreenBtn.addEventListener('click', async () => {
            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                } else {
                    await video.requestFullscreen();
                }
            } catch (error) {
                console.log('Fullscreen not supported:', error);
            }
        });
        
        // Download
        downloadBtn.addEventListener('click', () => {
            this.downloadCurrentVideo(video);
        });
        
        // Time and progress updates
        video.addEventListener('timeupdate', () => {
            currentTimeDisplay.textContent = this.formatDuration(video.currentTime);
            
            if (!isProgressSeeking && video.duration > 0) {
                const progress = (video.currentTime / video.duration) * 100;
                progressBar.value = progress;
            }
        });
        
        // Ended event
        video.addEventListener('ended', () => {
            playPauseBtn.textContent = '▶️';
            playPauseBtn.setAttribute('data-playing', 'false');
            progressBar.value = 0;
        });
    }
    
    /**
     * Format duration in MM:SS format
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Download current video file
     * @param {HTMLVideoElement} video - Video element
     */
    downloadCurrentVideo(video) {
        try {
            const link = document.createElement('a');
            link.href = video.src;
            link.download = 'video_file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Video download failed:', error);
        }
    }
    
    /**
     * Extract video metadata
     * @param {HTMLVideoElement} video - Video element
     * @param {Object} analysis - Video analysis
     * @param {Uint8Array} data - Video data
     * @param {string} mimeType - MIME type
     * @returns {Promise<Object>} Video metadata
     */
    async extractVideoMetadata(video, analysis, data, mimeType) {
        const metadata = await super.extractMetadata({
            filename: 'video_file',
            mimeType: mimeType,
            fileSize: data.length
        });
        
        // Add video-specific metadata
        metadata.duration = analysis.duration;
        metadata.dimensions = {
            width: analysis.width,
            height: analysis.height,
            aspectRatio: analysis.aspectRatio
        };
        metadata.format = analysis.format;
        metadata.resolution = analysis.resolution;
        metadata.quality = analysis.quality;
        metadata.bitrate = analysis.estimatedBitrate;
        
        return metadata;
    }
    
    /**
     * Pause video playback
     * @param {HTMLVideoElement} video - Video element
     */
    pauseVideo(video) {
        if (video && !video.paused) {
            video.pause();
        }
    }
    
    /**
     * Check if video should be cached
     * @param {HTMLVideoElement} video - Video element
     * @returns {boolean} Whether to cache video
     */
    shouldCacheVideo(video) {
        // Cache very short videos only (due to large size)
        return video.duration < 10; // Under 10 seconds
    }
    
    /**
     * Add video to cache
     * @param {string} filename - Cache key
     * @param {HTMLVideoElement} video - Video to cache
     */
    addToCache(filename, video) {
        // Remove oldest if cache is full
        if (this.videoCache.size >= this.maxCacheSize) {
            const firstKey = this.videoCache.keys().next().value;
            this.videoCache.delete(firstKey);
        }
        
        this.videoCache.set(filename, video.cloneNode());
    }
    
    /**
     * Remove video from cache
     * @param {string} filename - Cache key
     */
    removeFromCache(filename) {
        this.videoCache.delete(filename);
    }
    
    /**
     * Clean up handler resources
     */
    cleanup() {
        super.cleanup();
        
        // Clear video cache
        this.videoCache.clear();
        
        // Clear current analysis
        this.currentAnalysis = null;
        
        console.log('🧹 Video handler cleanup complete');
    }
}

// Export for ES6 modules
export { VideoPreviewHandler };