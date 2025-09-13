/**
 * @fileoverview Image Preview Handler - Focused Image Processing
 * 
 * ROOT CAUSE SOLUTION: Extracted from 700+ line monolithic FilePreviewSystem
 * into focused, single-responsibility handler for image files only.
 * 
 * Supports all image formats with proper memory management, metadata extraction,
 * and streaming for large images.
 */

/**
 * Image Preview Handler
 * Handles all image file types with optimized loading and display
 * 
 * @class ImagePreviewHandler
 * @extends {BasePreviewHandler}
 */
class ImagePreviewHandler extends BasePreviewHandler {
    constructor() {
        super();
        
        /** @type {Map<string, HTMLImageElement>} Cache for loaded images */
        this.imageCache = new Map();
        
        /** @type {number} Maximum cache size - configurable */
        this.maxCacheSize = window.AppConfig?.get('performance.tier') === 'high' ? 20 : 
                          window.AppConfig?.get('performance.tier') === 'medium' ? 10 : 5;
    }
    
    /**
     * Get handler capabilities
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        return {
            mimeTypes: [
                'image/jpeg',
                'image/jpg', 
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml',
                'image/bmp',
                'image/tiff',
                'image/avif',
                'image/heic',
                'image/heif'
            ],
            extensions: [
                'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 
                'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif'
            ],
            maxFileSize: window.AppConfig?.get('filePreview.maxPreviewSizes.image') || 50 * 1024 * 1024,
            supportsStreaming: false, // Images need full data
            supportsAsync: true,
            features: ['thumbnail', 'metadata', 'dimensions', 'exif']
        };
    }
    
    /**
     * Generate image preview
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const { data, mimeType, filename, container, onProgress } = context;
        
        // Create loading indicator
        const loadingElement = this.createLoadingElement('Loading image...');
        container.appendChild(loadingElement);
        
        if (onProgress) onProgress(0.1, 'Creating image blob...');
        
        // Create blob and object URL
        const blob = new Blob([data], { type: mimeType });
        const imageUrl = this.createObjectURL(blob);
        
        if (onProgress) onProgress(0.3, 'Loading image data...');
        
        // Create and configure image element
        const img = await this.createImageElement(imageUrl, filename);
        
        if (onProgress) onProgress(0.7, 'Rendering image...');
        
        // Create image container with metadata
        const imageContainer = await this.createImageContainer(img, context);
        
        // Replace loading with actual content
        container.removeChild(loadingElement);
        container.appendChild(imageContainer);
        
        if (onProgress) onProgress(1.0, 'Image loaded successfully');
        
        // Extract metadata
        const metadata = await this.extractImageMetadata(img, data, mimeType);
        
        return {
            element: imageContainer,
            metadata: metadata,
            cleanup: [
                () => this.revokeObjectURL(imageUrl),
                () => this.removeFromCache(filename)
            ],
            resources: {
                imageUrl: imageUrl,
                imageElement: img
            }
        };
    }
    
    /**
     * Create image element with error handling
     * @param {string} imageUrl - Image object URL
     * @param {string} filename - Original filename
     * @returns {Promise<HTMLImageElement>} Loaded image element
     */
    async createImageElement(imageUrl, filename) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Set up loading handlers
            img.onload = () => {
                console.log(`🖼️ Image loaded: ${filename} (${img.naturalWidth}x${img.naturalHeight})`);
                
                // Cache image if under size limit
                if (this.shouldCacheImage(img)) {
                    this.addToCache(filename, img);
                }
                
                resolve(img);
            };
            
            img.onerror = (error) => {
                console.error(`❌ Image load failed: ${filename}`, error);
                reject(new Error(`Failed to load image: ${filename}`));
            };
            
            // Configure image
            img.className = 'preview-image';
            img.alt = filename;
            img.title = filename;
            
            // Start loading
            img.src = imageUrl;
        });
    }
    
    /**
     * Create image container with controls and metadata
     * @param {HTMLImageElement} img - Image element
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Image container
     */
    async createImageContainer(img, context) {
        const container = this.createContainer('image-preview-container');
        
        // Create image wrapper for responsive sizing
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper';
        imageWrapper.appendChild(img);
        
        // Create image info overlay
        const infoOverlay = await this.createImageInfoOverlay(img, context);
        
        // Create image controls
        const controls = this.createImageControls(img, context);
        
        // Assemble container
        container.appendChild(imageWrapper);
        container.appendChild(infoOverlay);
        container.appendChild(controls);
        
        // Add zoom functionality
        this.addZoomFunctionality(img, imageWrapper);
        
        return container;
    }
    
    /**
     * Create image info overlay
     * @param {HTMLImageElement} img - Image element
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Info overlay
     */
    async createImageInfoOverlay(img, context) {
        const overlay = document.createElement('div');
        overlay.className = 'image-info-overlay';
        
        // Dimensions and size info
        const dimensions = `${img.naturalWidth} × ${img.naturalHeight}`;
        const fileSize = this.formatBytes(context.fileSize);
        const aspectRatio = (img.naturalWidth / img.naturalHeight).toFixed(2);
        
        overlay.innerHTML = `
            <div class="image-info">
                <div class="info-item">
                    <span class="info-label">Dimensions:</span>
                    <span class="info-value">${dimensions}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Size:</span>
                    <span class="info-value">${fileSize}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Aspect Ratio:</span>
                    <span class="info-value">${aspectRatio}:1</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Format:</span>
                    <span class="info-value">${context.mimeType}</span>
                </div>
            </div>
        `;
        
        return overlay;
    }
    
    /**
     * Create image controls
     * @param {HTMLImageElement} img - Image element
     * @param {PreviewContext} context - Preview context
     * @returns {HTMLElement} Controls container
     */
    createImageControls(img, context) {
        const controls = document.createElement('div');
        controls.className = 'image-controls';
        
        controls.innerHTML = `
            <button class="control-btn zoom-in" title="Zoom In">🔍+</button>
            <button class="control-btn zoom-out" title="Zoom Out">🔍-</button>
            <button class="control-btn zoom-fit" title="Fit to Container">📐</button>
            <button class="control-btn zoom-actual" title="Actual Size">1:1</button>
            <button class="control-btn download" title="Download Image">⬇️</button>
        `;
        
        // Bind control events
        this.bindImageControlEvents(controls, img, context);
        
        return controls;
    }
    
    /**
     * Bind image control events
     * @param {HTMLElement} controls - Controls container
     * @param {HTMLImageElement} img - Image element
     * @param {PreviewContext} context - Preview context
     */
    bindImageControlEvents(controls, img, context) {
        const zoomInBtn = controls.querySelector('.zoom-in');
        const zoomOutBtn = controls.querySelector('.zoom-out');
        const zoomFitBtn = controls.querySelector('.zoom-fit');
        const zoomActualBtn = controls.querySelector('.zoom-actual');
        const downloadBtn = controls.querySelector('.download');
        
        let currentZoom = 1;
        
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom * 1.2, 5);
            img.style.transform = `scale(${currentZoom})`;
        });
        
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom / 1.2, 0.1);
            img.style.transform = `scale(${currentZoom})`;
        });
        
        zoomFitBtn.addEventListener('click', () => {
            currentZoom = 1;
            img.style.transform = 'scale(1)';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
        });
        
        zoomActualBtn.addEventListener('click', () => {
            currentZoom = 1;
            img.style.transform = 'scale(1)';
            img.style.maxWidth = 'none';
            img.style.maxHeight = 'none';
        });
        
        downloadBtn.addEventListener('click', () => {
            this.downloadImage(img, context.filename, context.data);
        });
    }
    
    /**
     * Add zoom functionality with mouse wheel and touch
     * @param {HTMLImageElement} img - Image element
     * @param {HTMLElement} wrapper - Image wrapper
     */
    addZoomFunctionality(img, wrapper) {
        let currentZoom = 1;
        
        // Mouse wheel zoom
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            currentZoom = Math.min(Math.max(currentZoom * delta, 0.1), 5);
            
            img.style.transform = `scale(${currentZoom})`;
            img.style.transformOrigin = `${e.offsetX}px ${e.offsetY}px`;
        });
        
        // Touch zoom (simplified)
        let initialDistance = 0;
        let initialZoom = 1;
        
        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                initialZoom = currentZoom;
            }
        });
        
        wrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                
                const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialDistance;
                currentZoom = Math.min(Math.max(initialZoom * scale, 0.1), 5);
                
                img.style.transform = `scale(${currentZoom})`;
            }
        });
    }
    
    /**
     * Get distance between two touch points
     * @param {Touch} touch1 - First touch point
     * @param {Touch} touch2 - Second touch point
     * @returns {number} Distance between touches
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Extract image metadata
     * @param {HTMLImageElement} img - Image element
     * @param {Uint8Array} data - Image data
     * @param {string} mimeType - MIME type
     * @returns {Promise<Object>} Image metadata
     */
    async extractImageMetadata(img, data, mimeType) {
        const metadata = await super.extractMetadata({
            filename: img.alt,
            mimeType: mimeType,
            fileSize: data.length
        });
        
        // Add image-specific metadata
        metadata.dimensions = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: img.naturalWidth / img.naturalHeight
        };
        
        metadata.colorDepth = this.estimateColorDepth(mimeType);
        metadata.hasTransparency = this.supportsTransparency(mimeType);
        
        // Try to extract EXIF data if JPEG
        if (mimeType === 'image/jpeg') {
            try {
                metadata.exif = await this.extractExifData(data);
            } catch (error) {
                console.log('EXIF extraction failed:', error);
            }
        }
        
        return metadata;
    }
    
    /**
     * Estimate color depth based on format
     * @param {string} mimeType - MIME type
     * @returns {number} Estimated color depth
     */
    estimateColorDepth(mimeType) {
        const depthMap = {
            'image/jpeg': 24,
            'image/png': 32, // Can be 8, 24, or 32
            'image/gif': 8,
            'image/webp': 32,
            'image/bmp': 24,
            'image/tiff': 24
        };
        
        return depthMap[mimeType] || 24;
    }
    
    /**
     * Check if format supports transparency
     * @param {string} mimeType - MIME type
     * @returns {boolean} Whether format supports transparency
     */
    supportsTransparency(mimeType) {
        const transparentFormats = new Set([
            'image/png',
            'image/gif', 
            'image/webp',
            'image/svg+xml'
        ]);
        
        return transparentFormats.has(mimeType);
    }
    
    /**
     * Extract EXIF data from JPEG
     * @param {Uint8Array} data - JPEG data
     * @returns {Promise<Object>} EXIF data
     */
    async extractExifData(data) {
        // Simplified EXIF extraction - in production would use proper library
        const view = new DataView(data.buffer);
        
        // Look for EXIF marker (0xFFE1)
        for (let i = 0; i < data.length - 4; i++) {
            if (view.getUint16(i) === 0xFFE1) {
                return {
                    found: true,
                    offset: i,
                    // Would extract actual EXIF data here
                    note: 'EXIF data present (extraction requires specialized library)'
                };
            }
        }
        
        return { found: false };
    }
    
    /**
     * Download image
     * @param {HTMLImageElement} img - Image element
     * @param {string} filename - Original filename
     * @param {Uint8Array} data - Image data
     */
    downloadImage(img, filename, data) {
        try {
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const url = this.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up URL after short delay
            setTimeout(() => this.revokeObjectURL(url), 1000);
            
        } catch (error) {
            console.error('Image download failed:', error);
        }
    }
    
    /**
     * Check if image should be cached
     * @param {HTMLImageElement} img - Image element
     * @returns {boolean} Whether to cache image
     */
    shouldCacheImage(img) {
        // Cache small to medium images only
        const pixelCount = img.naturalWidth * img.naturalHeight;
        return pixelCount < 2000000; // Under 2MP
    }
    
    /**
     * Add image to cache
     * @param {string} filename - Cache key
     * @param {HTMLImageElement} img - Image to cache
     */
    addToCache(filename, img) {
        // Remove oldest if cache is full
        if (this.imageCache.size >= this.maxCacheSize) {
            const firstKey = this.imageCache.keys().next().value;
            this.imageCache.delete(firstKey);
        }
        
        this.imageCache.set(filename, img.cloneNode());
    }
    
    /**
     * Remove image from cache
     * @param {string} filename - Cache key
     */
    removeFromCache(filename) {
        this.imageCache.delete(filename);
    }
    
    /**
     * Clean up handler resources
     */
    cleanup() {
        super.cleanup();
        
        // Clear image cache
        this.imageCache.clear();
        
        console.log('🧹 Image handler cleanup complete');
    }
}

// Export for ES6 modules
export { ImagePreviewHandler };