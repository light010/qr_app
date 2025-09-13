/**
 * @fileoverview Archive Preview Handler - Focused Archive File Processing
 * 
 * ROOT CAUSE SOLUTION: Extracted from monolithic FilePreviewSystem into focused
 * handler for archive files (ZIP, RAR, etc.) with content listing and extraction.
 * 
 * Supports archive formats with content preview, file listing,
 * and selective extraction capabilities.
 */

/**
 * Archive Preview Handler
 * Handles archive file types with content listing and extraction
 * 
 * @class ArchivePreviewHandler
 * @extends {BasePreviewHandler}
 */
class ArchivePreviewHandler extends BasePreviewHandler {
    constructor() {
        super();
        
        /** @type {Map<string, Object>} Cache for archive analysis */
        this.archiveCache = new Map();
        
        /** @type {number} Maximum cache size */
        this.maxCacheSize = 5;
        
        /** @type {Object} Current archive analysis */
        this.currentAnalysis = null;
    }
    
    /**
     * Get handler capabilities
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        return {
            mimeTypes: [
                'application/zip',
                'application/x-zip-compressed',
                'application/x-rar-compressed',
                'application/x-7z-compressed',
                'application/gzip',
                'application/x-gzip',
                'application/x-tar',
                'application/x-bzip2'
            ],
            extensions: [
                'zip', 'rar', '7z', 'gz', 'gzip', 'tar', 'bz2', 'xz', 'lz', 'lzma'
            ],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            supportsStreaming: false,
            supportsAsync: true,
            features: ['content-listing', 'file-preview', 'selective-extraction', 'compression-info']
        };
    }
    
    /**
     * Generate archive preview
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const { data, mimeType, filename, container, onProgress } = context;
        
        // Create loading indicator
        const loadingElement = this.createLoadingElement('Analyzing archive...');
        container.appendChild(loadingElement);
        
        if (onProgress) onProgress(0.1, 'Detecting archive format...');
        
        // Analyze archive properties and contents
        const analysis = await this.analyzeArchive(data, mimeType, filename);
        
        if (onProgress) onProgress(0.5, 'Extracting file list...');
        
        // Extract file listing
        const fileList = await this.extractFileList(data, analysis);
        
        if (onProgress) onProgress(0.8, 'Creating archive preview...');
        
        // Create archive container
        const archiveContainer = await this.createArchiveContainer(
            fileList,
            analysis, 
            context
        );
        
        // Replace loading with actual content
        container.removeChild(loadingElement);
        container.appendChild(archiveContainer);
        
        if (onProgress) onProgress(1.0, 'Archive preview ready');
        
        // Extract metadata
        const metadata = await this.extractArchiveMetadata(analysis, fileList, data, mimeType);
        
        return {
            element: archiveContainer,
            metadata: metadata,
            cleanup: [
                () => this.removeFromCache(filename)
            ],
            resources: {
                analysis: analysis,
                fileList: fileList
            }
        };
    }
    
    /**
     * Analyze archive properties
     * @param {Uint8Array} data - Archive data
     * @param {string} mimeType - MIME type
     * @param {string} filename - Filename
     * @returns {Promise<Object>} Archive analysis
     */
    async analyzeArchive(data, mimeType, filename) {
        const analysis = {
            fileSize: data.length,
            mimeType: mimeType,
            filename: filename,
            format: this.getArchiveFormat(mimeType, filename),
            type: 'Archive',
            supportsListing: this.supportsListing(mimeType),
            supportsExtraction: this.supportsExtraction(mimeType),
            isEncrypted: false,
            estimatedFiles: 0,
            compressionRatio: 0
        };
        
        // Analyze specific archive formats
        try {
            if (analysis.format === 'ZIP') {
                analysis.zipAnalysis = await this.analyzeZIP(data);
                analysis.estimatedFiles = analysis.zipAnalysis.estimatedFiles;
                analysis.isEncrypted = analysis.zipAnalysis.isEncrypted;
            } else if (analysis.format === 'GZIP') {
                analysis.gzipAnalysis = await this.analyzeGZIP(data);
            }
        } catch (error) {
            console.warn('Archive-specific analysis failed:', error);
        }
        
        return analysis;
    }
    
    /**
     * Analyze ZIP-specific properties
     * @param {Uint8Array} data - ZIP data
     * @returns {Promise<Object>} ZIP analysis
     */
    async analyzeZIP(data) {
        const analysis = {
            version: 'unknown',
            estimatedFiles: 0,
            isEncrypted: false,
            hasDirectories: false,
            totalUncompressedSize: 0
        };
        
        try {
            // Look for ZIP file signature
            const view = new DataView(data.buffer);
            
            // Check for local file header signature (0x04034b50)
            let offset = 0;
            let fileCount = 0;
            
            while (offset < data.length - 30) {
                const signature = view.getUint32(offset, true);
                
                if (signature === 0x04034b50) { // Local file header
                    fileCount++;
                    
                    // Skip to next entry (simplified)
                    const filenameLength = view.getUint16(offset + 26, true);
                    const extraLength = view.getUint16(offset + 28, true);
                    const compressedSize = view.getUint32(offset + 18, true);
                    
                    offset += 30 + filenameLength + extraLength + compressedSize;
                } else if (signature === 0x02014b50) { // Central directory
                    break;
                } else {
                    offset++;
                }
                
                if (fileCount > 1000) break; // Safety limit
            }
            
            analysis.estimatedFiles = fileCount;
            
        } catch (error) {
            console.warn('ZIP analysis error:', error);
        }
        
        return analysis;
    }
    
    /**
     * Analyze GZIP-specific properties
     * @param {Uint8Array} data - GZIP data
     * @returns {Promise<Object>} GZIP analysis
     */
    async analyzeGZIP(data) {
        const analysis = {
            method: 'unknown',
            originalSize: 0,
            hasFilename: false,
            hasComment: false
        };
        
        try {
            if (data.length >= 10) {
                // Check GZIP magic number
                if (data[0] === 0x1f && data[1] === 0x8b) {
                    analysis.method = data[2] === 8 ? 'deflate' : 'unknown';
                    
                    const flags = data[3];
                    analysis.hasFilename = (flags & 0x08) !== 0;
                    analysis.hasComment = (flags & 0x10) !== 0;
                    
                    // Original size is in last 4 bytes (little endian)
                    if (data.length >= 4) {
                        const view = new DataView(data.buffer);
                        analysis.originalSize = view.getUint32(data.length - 4, true);
                    }
                }
            }
        } catch (error) {
            console.warn('GZIP analysis error:', error);
        }
        
        return analysis;
    }
    
    /**
     * Get archive format from MIME type and filename
     * @param {string} mimeType - MIME type
     * @param {string} filename - Filename
     * @returns {string} Archive format
     */
    getArchiveFormat(mimeType, filename) {
        // Check MIME type first
        const formatMap = {
            'application/zip': 'ZIP',
            'application/x-zip-compressed': 'ZIP',
            'application/x-rar-compressed': 'RAR',
            'application/x-7z-compressed': '7Z',
            'application/gzip': 'GZIP',
            'application/x-gzip': 'GZIP',
            'application/x-tar': 'TAR',
            'application/x-bzip2': 'BZIP2'
        };
        
        if (formatMap[mimeType]) {
            return formatMap[mimeType];
        }
        
        // Fallback to extension
        const extension = this.extractExtension(filename).toLowerCase();
        const extensionMap = {
            'zip': 'ZIP',
            'rar': 'RAR',
            '7z': '7Z',
            'gz': 'GZIP',
            'gzip': 'GZIP',
            'tar': 'TAR',
            'bz2': 'BZIP2',
            'xz': 'XZ',
            'lzma': 'LZMA'
        };
        
        return extensionMap[extension] || 'Archive';
    }
    
    /**
     * Check if format supports content listing
     * @param {string} mimeType - MIME type
     * @returns {boolean} Whether listing is supported
     */
    supportsListing(mimeType) {
        // ZIP has the best support for listing in browsers
        return mimeType.includes('zip');
    }
    
    /**
     * Check if format supports extraction
     * @param {string} mimeType - MIME type
     * @returns {boolean} Whether extraction is supported
     */
    supportsExtraction(mimeType) {
        // Only ZIP can be reliably extracted in browsers with JS libraries
        return mimeType.includes('zip');
    }
    
    /**
     * Extract file list from archive
     * @param {Uint8Array} data - Archive data
     * @param {Object} analysis - Archive analysis
     * @returns {Promise<Array>} File list
     */
    async extractFileList(data, analysis) {
        const fileList = [];
        
        try {
            if (analysis.format === 'ZIP' && analysis.supportsListing) {
                return await this.extractZIPFileList(data);
            } else {
                // For unsupported formats, create mock file list
                return this.createMockFileList(analysis);
            }
        } catch (error) {
            console.warn('File list extraction failed:', error);
            return this.createMockFileList(analysis);
        }
    }
    
    /**
     * Extract ZIP file list (simplified implementation)
     * @param {Uint8Array} data - ZIP data
     * @returns {Promise<Array>} ZIP file list
     */
    async extractZIPFileList(data) {
        const files = [];
        
        try {
            // In production, would use JSZip or similar library
            // This is a simplified mock implementation
            
            const view = new DataView(data.buffer);
            let offset = 0;
            let fileIndex = 0;
            
            while (offset < data.length - 30 && fileIndex < 100) { // Safety limits
                const signature = view.getUint32(offset, true);
                
                if (signature === 0x04034b50) { // Local file header
                    const filenameLength = view.getUint16(offset + 26, true);
                    const extraLength = view.getUint16(offset + 28, true);
                    const compressedSize = view.getUint32(offset + 18, true);
                    const uncompressedSize = view.getUint32(offset + 22, true);
                    
                    // Extract filename
                    const filenameBytes = new Uint8Array(data.buffer, offset + 30, filenameLength);
                    const filename = new TextDecoder('utf-8').decode(filenameBytes);
                    
                    files.push({
                        name: filename,
                        size: uncompressedSize,
                        compressedSize: compressedSize,
                        ratio: uncompressedSize > 0 ? (compressedSize / uncompressedSize * 100).toFixed(1) + '%' : '0%',
                        type: filename.endsWith('/') ? 'directory' : 'file',
                        extension: this.extractExtension(filename)
                    });
                    
                    offset += 30 + filenameLength + extraLength + compressedSize;
                    fileIndex++;
                } else {
                    offset++;
                }
            }
            
        } catch (error) {
            console.warn('ZIP file list extraction error:', error);
        }
        
        return files;
    }
    
    /**
     * Create mock file list for unsupported formats
     * @param {Object} analysis - Archive analysis
     * @returns {Array} Mock file list
     */
    createMockFileList(analysis) {
        return [{
            name: analysis.filename,
            size: analysis.fileSize,
            compressedSize: analysis.fileSize,
            ratio: '100%',
            type: 'archive',
            extension: analysis.format.toLowerCase(),
            note: 'File listing not available for this format'
        }];
    }
    
    /**
     * Create archive container
     * @param {Array} fileList - Extracted file list
     * @param {Object} analysis - Archive analysis
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Archive container
     */
    async createArchiveContainer(fileList, analysis, context) {
        const container = this.createContainer('archive-preview-container');
        
        // Create archive info header
        const infoHeader = this.createArchiveInfoHeader(analysis, fileList, context);
        container.appendChild(infoHeader);
        
        // Create file list display
        const fileListElement = this.createFileListDisplay(fileList, analysis);
        container.appendChild(fileListElement);
        
        // Create archive controls
        const controls = this.createArchiveControls(analysis);
        container.appendChild(controls);
        
        // Store analysis for controls
        this.currentAnalysis = analysis;
        
        return container;
    }
    
    /**
     * Create archive info header
     * @param {Object} analysis - Archive analysis
     * @param {Array} fileList - File list
     * @param {PreviewContext} context - Preview context
     * @returns {HTMLElement} Info header
     */
    createArchiveInfoHeader(analysis, fileList, context) {
        const header = document.createElement('div');
        header.className = 'archive-info-header';
        
        const fileSize = this.formatBytes(analysis.fileSize);
        const fileCount = fileList.length;
        const icon = this.getArchiveIcon(analysis.format);
        
        // Calculate total uncompressed size
        const totalUncompressed = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
        const compressionRatio = totalUncompressed > 0 ? 
            ((1 - analysis.fileSize / totalUncompressed) * 100).toFixed(1) + '%' : 'Unknown';
        
        header.innerHTML = `
            <div class="archive-icon">${icon}</div>
            <div class="archive-basic-info">
                <div class="archive-title">${this.escapeHtml(context.filename)}</div>
                <div class="archive-stats">
                    <span class="stat-item">📦 ${fileCount} files</span>
                    <span class="stat-item">📊 ${fileSize}</span>
                    <span class="stat-item">🗜️ ${analysis.format}</span>
                    <span class="stat-item">📉 ${compressionRatio} compression</span>
                    ${analysis.isEncrypted ? '<span class="stat-item">🔒 Encrypted</span>' : ''}
                </div>
            </div>
        `;
        
        return header;
    }
    
    /**
     * Get icon for archive format
     * @param {string} format - Archive format
     * @returns {string} Archive icon emoji
     */
    getArchiveIcon(format) {
        const iconMap = {
            'ZIP': '📦',
            'RAR': '📚',
            '7Z': '🗜️',
            'GZIP': '🔧',
            'TAR': '📋',
            'BZIP2': '🔧'
        };
        
        return iconMap[format] || '📦';
    }
    
    /**
     * Create file list display
     * @param {Array} fileList - File list
     * @param {Object} analysis - Archive analysis
     * @returns {HTMLElement} File list element
     */
    createFileListDisplay(fileList, analysis) {
        const listContainer = document.createElement('div');
        listContainer.className = 'archive-file-list';
        
        if (fileList.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-archive">
                    <div class="empty-icon">📂</div>
                    <div class="empty-text">No files found in archive</div>
                </div>
            `;
            return listContainer;
        }
        
        // Create file list header
        const header = document.createElement('div');
        header.className = 'file-list-header';
        header.innerHTML = `
            <div class="header-cell name-header">Name</div>
            <div class="header-cell size-header">Size</div>
            <div class="header-cell ratio-header">Compression</div>
            <div class="header-cell type-header">Type</div>
        `;
        listContainer.appendChild(header);
        
        // Create scrollable file list
        const fileListScroll = document.createElement('div');
        fileListScroll.className = 'file-list-scroll';
        
        // Add file entries
        fileList.forEach((file, index) => {
            const fileEntry = this.createFileEntry(file, index);
            fileListScroll.appendChild(fileEntry);
        });
        
        listContainer.appendChild(fileListScroll);
        
        return listContainer;
    }
    
    /**
     * Create individual file entry
     * @param {Object} file - File information
     * @param {number} index - File index
     * @returns {HTMLElement} File entry element
     */
    createFileEntry(file, index) {
        const entry = document.createElement('div');
        entry.className = `file-entry ${file.type}`;
        entry.setAttribute('data-index', index);
        
        const fileIcon = this.getFileIcon(file);
        const formattedSize = file.size ? this.formatBytes(file.size) : 'Unknown';
        
        entry.innerHTML = `
            <div class="entry-cell name-cell">
                <span class="file-icon">${fileIcon}</span>
                <span class="file-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
            </div>
            <div class="entry-cell size-cell">${formattedSize}</div>
            <div class="entry-cell ratio-cell">${file.ratio || 'N/A'}</div>
            <div class="entry-cell type-cell">${file.extension || file.type}</div>
        `;
        
        // Add click handler for file preview (if supported)
        if (file.type === 'file') {
            entry.addEventListener('click', () => {
                this.previewArchiveFile(file, index);
            });
            entry.style.cursor = 'pointer';
        }
        
        return entry;
    }
    
    /**
     * Get icon for file type
     * @param {Object} file - File information
     * @returns {string} File icon emoji
     */
    getFileIcon(file) {
        if (file.type === 'directory') return '📁';
        
        const extension = file.extension?.toLowerCase();
        const iconMap = {
            'txt': '📄',
            'doc': '📄',
            'docx': '📄',
            'pdf': '📕',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'mp3': '🎵',
            'wav': '🎵',
            'mp4': '🎥',
            'avi': '🎥',
            'zip': '📦',
            'js': '📜',
            'html': '🌐',
            'css': '🎨'
        };
        
        return iconMap[extension] || '📄';
    }
    
    /**
     * Create archive controls
     * @param {Object} analysis - Archive analysis
     * @returns {HTMLElement} Controls container
     */
    createArchiveControls(analysis) {
        const controls = document.createElement('div');
        controls.className = 'archive-controls';
        
        controls.innerHTML = `
            <div class="control-group">
                <button class="control-btn download-btn" title="Download Archive">⬇️ Download Archive</button>
                ${analysis.supportsExtraction ? '<button class="control-btn extract-btn" title="Extract Files">📤 Extract All</button>' : ''}
                <button class="control-btn info-btn" title="Archive Information">ℹ️ Information</button>
            </div>
            <div class="archive-summary">
                <span class="summary-item">📦 ${analysis.estimatedFiles || 'Unknown'} files</span>
                <span class="summary-item">🗜️ ${analysis.format}</span>
                <span class="summary-item">📊 ${this.formatBytes(analysis.fileSize)}</span>
            </div>
        `;
        
        // Bind control events
        this.bindArchiveControlEvents(controls, analysis);
        
        return controls;
    }
    
    /**
     * Bind archive control events
     * @param {HTMLElement} controls - Controls container
     * @param {Object} analysis - Archive analysis
     */
    bindArchiveControlEvents(controls, analysis) {
        const downloadBtn = controls.querySelector('.download-btn');
        const extractBtn = controls.querySelector('.extract-btn');
        const infoBtn = controls.querySelector('.info-btn');
        
        // Download
        downloadBtn.addEventListener('click', () => {
            this.downloadArchive(analysis.filename);
        });
        
        // Extract (if supported)
        if (extractBtn) {
            extractBtn.addEventListener('click', () => {
                this.extractArchive(analysis);
            });
        }
        
        // Information
        infoBtn.addEventListener('click', () => {
            this.showArchiveInformation(analysis);
        });
    }
    
    /**
     * Preview file within archive
     * @param {Object} file - File information
     * @param {number} index - File index
     */
    previewArchiveFile(file, index) {
        console.log(`👁️ Previewing archive file: ${file.name} (${index})`);
        // In production, would extract and preview the specific file
        alert(`File preview not yet implemented.\n\nFile: ${file.name}\nSize: ${this.formatBytes(file.size)}\nType: ${file.extension || file.type}`);
    }
    
    /**
     * Download archive file
     * @param {string} filename - Archive filename
     */
    downloadArchive(filename) {
        console.log(`⬇️ Downloading archive: ${filename}`);
        // Implementation would trigger download
    }
    
    /**
     * Extract archive contents
     * @param {Object} analysis - Archive analysis
     */
    extractArchive(analysis) {
        console.log(`📤 Extracting archive: ${analysis.filename}`);
        // In production, would use JSZip or similar library to extract files
        alert(`Archive extraction not yet implemented.\n\nFormat: ${analysis.format}\nFiles: ${analysis.estimatedFiles}`);
    }
    
    /**
     * Show archive information
     * @param {Object} analysis - Archive analysis
     */
    showArchiveInformation(analysis) {
        const info = [
            `Format: ${analysis.format}`,
            `Size: ${this.formatBytes(analysis.fileSize)}`,
            `Files: ${analysis.estimatedFiles || 'Unknown'}`,
            `Supports Listing: ${analysis.supportsListing ? 'Yes' : 'No'}`,
            `Supports Extraction: ${analysis.supportsExtraction ? 'Yes' : 'No'}`,
            `Encrypted: ${analysis.isEncrypted ? 'Yes' : 'No'}`
        ].join('\n');
        
        alert(`Archive Information:\n\n${info}`);
    }
    
    /**
     * Extract archive metadata
     * @param {Object} analysis - Archive analysis
     * @param {Array} fileList - File list
     * @param {Uint8Array} data - Archive data
     * @param {string} mimeType - MIME type
     * @returns {Promise<Object>} Archive metadata
     */
    async extractArchiveMetadata(analysis, fileList, data, mimeType) {
        const metadata = await super.extractMetadata({
            filename: analysis.filename,
            mimeType: mimeType,
            fileSize: data.length
        });
        
        // Add archive-specific metadata
        metadata.format = analysis.format;
        metadata.type = analysis.type;
        metadata.fileCount = fileList.length;
        metadata.isEncrypted = analysis.isEncrypted;
        metadata.supportsListing = analysis.supportsListing;
        metadata.supportsExtraction = analysis.supportsExtraction;
        
        // Calculate total uncompressed size
        metadata.totalUncompressedSize = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
        
        if (metadata.totalUncompressedSize > 0) {
            metadata.compressionRatio = ((1 - data.length / metadata.totalUncompressedSize) * 100).toFixed(1) + '%';
        }
        
        return metadata;
    }
    
    /**
     * Add archive to cache
     * @param {string} filename - Cache key
     * @param {Object} analysis - Archive analysis
     */
    addToCache(filename, analysis) {
        // Remove oldest if cache is full
        if (this.archiveCache.size >= this.maxCacheSize) {
            const firstKey = this.archiveCache.keys().next().value;
            this.archiveCache.delete(firstKey);
        }
        
        this.archiveCache.set(filename, analysis);
    }
    
    /**
     * Remove archive from cache
     * @param {string} filename - Cache key
     */
    removeFromCache(filename) {
        this.archiveCache.delete(filename);
    }
    
    /**
     * Clean up handler resources
     */
    cleanup() {
        super.cleanup();
        
        // Clear archive cache
        this.archiveCache.clear();
        
        // Clear current analysis
        this.currentAnalysis = null;
        
        console.log('🧹 Archive handler cleanup complete');
    }
}

// Export for ES6 modules
export { ArchivePreviewHandler };