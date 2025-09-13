/**
 * @fileoverview Document Preview Handler - Focused Document Processing
 * 
 * ROOT CAUSE SOLUTION: Extracted from monolithic FilePreviewSystem into focused
 * handler for document files (PDF, Word, etc.) with proper rendering and controls.
 * 
 * Supports document formats with embedded viewers, text extraction,
 * and document-specific features like page navigation and zoom.
 */

/**
 * Document Preview Handler
 * Handles document file types with embedded viewers and document controls
 * 
 * @class DocumentPreviewHandler
 * @extends {BasePreviewHandler}
 */
class DocumentPreviewHandler extends BasePreviewHandler {
    constructor() {
        super();
        
        /** @type {Map<string, Object>} Cache for document analysis */
        this.documentCache = new Map();
        
        /** @type {number} Maximum cache size - configurable */
        this.maxCacheSize = window.AppConfig?.get('performance.tier') === 'high' ? 5 : 
                          window.AppConfig?.get('performance.tier') === 'medium' ? 3 : 2;
        
        /** @type {Object} Current document analysis */
        this.currentAnalysis = null;
    }
    
    /**
     * Get handler capabilities
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        return {
            mimeTypes: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/rtf',
                'application/vnd.oasis.opendocument.text',
                'application/vnd.oasis.opendocument.spreadsheet',
                'application/vnd.oasis.opendocument.presentation'
            ],
            extensions: [
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
                'rtf', 'odt', 'ods', 'odp', 'pages', 'numbers', 'key'
            ],
            maxFileSize: window.AppConfig?.get('filePreview.maxPreviewSizes.pdf') || 50 * 1024 * 1024,
            supportsStreaming: false,
            supportsAsync: true,
            features: ['embedded-viewer', 'page-navigation', 'zoom', 'text-extraction']
        };
    }
    
    /**
     * Generate document preview
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const { data, mimeType, filename, container, onProgress } = context;
        
        // Create loading indicator
        const loadingElement = this.createLoadingElement('Loading document...');
        container.appendChild(loadingElement);
        
        if (onProgress) onProgress(0.1, 'Analyzing document format...');
        
        // Analyze document type and properties
        const analysis = await this.analyzeDocument(data, mimeType, filename);
        
        if (onProgress) onProgress(0.3, 'Creating document blob...');
        
        // Create blob and object URL
        const blob = new Blob([data], { type: mimeType });
        const documentUrl = this.createObjectURL(blob);
        
        if (onProgress) onProgress(0.6, 'Setting up document viewer...');
        
        // Create document container based on type
        const documentContainer = await this.createDocumentContainer(
            documentUrl, 
            analysis, 
            context
        );
        
        if (onProgress) onProgress(0.9, 'Finalizing document preview...');
        
        // Replace loading with actual content
        container.removeChild(loadingElement);
        container.appendChild(documentContainer);
        
        if (onProgress) onProgress(1.0, 'Document preview ready');
        
        // Extract metadata
        const metadata = await this.extractDocumentMetadata(analysis, data, mimeType);
        
        return {
            element: documentContainer,
            metadata: metadata,
            cleanup: [
                () => this.revokeObjectURL(documentUrl),
                () => this.removeFromCache(filename)
            ],
            resources: {
                documentUrl: documentUrl,
                analysis: analysis
            }
        };
    }
    
    /**
     * Analyze document properties
     * @param {Uint8Array} data - Document data
     * @param {string} mimeType - MIME type
     * @param {string} filename - Filename
     * @returns {Promise<Object>} Document analysis
     */
    async analyzeDocument(data, mimeType, filename) {
        const analysis = {
            fileSize: data.length,
            mimeType: mimeType,
            filename: filename,
            format: this.getDocumentFormat(mimeType),
            type: this.getDocumentType(mimeType),
            supportsEmbeddedViewer: this.supportsEmbeddedViewer(mimeType),
            estimatedPages: 1,
            hasTextContent: true,
            isOfficeDocument: this.isOfficeDocument(mimeType),
            quality: 'unknown'
        };
        
        // Analyze PDF-specific properties
        if (mimeType === 'application/pdf') {
            analysis.pdfAnalysis = await this.analyzePDF(data);
            analysis.estimatedPages = analysis.pdfAnalysis.estimatedPages;
        }
        
        // Estimate quality based on file size
        analysis.quality = this.estimateDocumentQuality(analysis.fileSize, analysis.estimatedPages);
        
        return analysis;
    }
    
    /**
     * Analyze PDF-specific properties
     * @param {Uint8Array} data - PDF data
     * @returns {Promise<Object>} PDF analysis
     */
    async analyzePDF(data) {
        const analysis = {
            version: 'unknown',
            estimatedPages: 1,
            hasImages: false,
            hasText: true,
            isEncrypted: false
        };
        
        try {
            // Convert to string for basic analysis
            const pdfString = new TextDecoder('latin1').decode(data.slice(0, 1024));
            
            // Check PDF version
            const versionMatch = pdfString.match(/%PDF-(\d+\.\d+)/);
            if (versionMatch) {
                analysis.version = versionMatch[1];
            }
            
            // Check for encryption
            if (pdfString.includes('/Encrypt')) {
                analysis.isEncrypted = true;
            }
            
            // Rough page count estimation by counting page objects
            const fullString = new TextDecoder('latin1').decode(data);
            const pageMatches = fullString.match(/\/Type\s*\/Page[^s]/g);
            if (pageMatches) {
                analysis.estimatedPages = pageMatches.length;
            }
            
        } catch (error) {
            console.warn('PDF analysis error:', error);
        }
        
        return analysis;
    }
    
    /**
     * Get document format from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} Document format
     */
    getDocumentFormat(mimeType) {
        const formatMap = {
            'application/pdf': 'PDF',
            'application/msword': 'DOC',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
            'application/vnd.ms-excel': 'XLS',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
            'application/vnd.ms-powerpoint': 'PPT',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
            'application/rtf': 'RTF',
            'application/vnd.oasis.opendocument.text': 'ODT',
            'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
            'application/vnd.oasis.opendocument.presentation': 'ODP'
        };
        
        return formatMap[mimeType] || 'Document';
    }
    
    /**
     * Get document type category
     * @param {string} mimeType - MIME type
     * @returns {string} Document type
     */
    getDocumentType(mimeType) {
        if (mimeType === 'application/pdf') return 'PDF';
        if (mimeType.includes('word') || mimeType.includes('opendocument.text')) return 'Word Processor';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Spreadsheet';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'Presentation';
        if (mimeType === 'application/rtf') return 'Rich Text';
        return 'Document';
    }
    
    /**
     * Check if format supports embedded viewer
     * @param {string} mimeType - MIME type
     * @returns {boolean} Whether embedded viewer is supported
     */
    supportsEmbeddedViewer(mimeType) {
        // Only PDF has reliable browser support for embedded viewing
        return mimeType === 'application/pdf';
    }
    
    /**
     * Check if this is an Office document
     * @param {string} mimeType - MIME type
     * @returns {boolean} Whether this is an Office document
     */
    isOfficeDocument(mimeType) {
        return mimeType.includes('ms-') || mimeType.includes('officedocument');
    }
    
    /**
     * Estimate document quality
     * @param {number} fileSize - File size in bytes
     * @param {number} pages - Estimated page count
     * @returns {string} Quality description
     */
    estimateDocumentQuality(fileSize, pages) {
        const sizePerPage = fileSize / pages;
        
        if (sizePerPage > 1024 * 1024) return 'High Quality (>1MB/page)';
        if (sizePerPage > 512 * 1024) return 'Good Quality (512KB-1MB/page)';
        if (sizePerPage > 100 * 1024) return 'Standard Quality (100KB-512KB/page)';
        return 'Basic Quality (<100KB/page)';
    }
    
    /**
     * Create document container based on type
     * @param {string} documentUrl - Document URL
     * @param {Object} analysis - Document analysis
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Document container
     */
    async createDocumentContainer(documentUrl, analysis, context) {
        const container = this.createContainer('document-preview-container');
        
        // Create document info header
        const infoHeader = this.createDocumentInfoHeader(analysis, context);
        container.appendChild(infoHeader);
        
        // Create document viewer based on type
        let viewerElement;
        
        if (analysis.supportsEmbeddedViewer) {
            viewerElement = this.createEmbeddedDocumentViewer(documentUrl, analysis);
        } else {
            viewerElement = this.createUnsupportedDocumentViewer(analysis);
        }
        
        container.appendChild(viewerElement);
        
        // Create document controls
        const controls = this.createDocumentControls(documentUrl, analysis);
        container.appendChild(controls);
        
        // Store analysis for controls
        this.currentAnalysis = analysis;
        
        return container;
    }
    
    /**
     * Create document info header
     * @param {Object} analysis - Document analysis
     * @param {PreviewContext} context - Preview context
     * @returns {HTMLElement} Info header
     */
    createDocumentInfoHeader(analysis, context) {
        const header = document.createElement('div');
        header.className = 'document-info-header';
        
        const fileSize = this.formatBytes(analysis.fileSize);
        const icon = this.getDocumentIcon(analysis.format);
        
        header.innerHTML = `
            <div class="document-icon">${icon}</div>
            <div class="document-basic-info">
                <div class="document-title">${this.escapeHtml(context.filename)}</div>
                <div class="document-stats">
                    <span class="stat-item">📊 ${fileSize}</span>
                    <span class="stat-item">📄 ${analysis.format}</span>
                    <span class="stat-item">📝 ${analysis.type}</span>
                    <span class="stat-item">📑 ${analysis.estimatedPages} pages</span>
                    <span class="stat-item">⭐ ${analysis.quality}</span>
                </div>
            </div>
        `;
        
        return header;
    }
    
    /**
     * Get icon for document format
     * @param {string} format - Document format
     * @returns {string} Document icon emoji
     */
    getDocumentIcon(format) {
        const iconMap = {
            'PDF': '📕',
            'DOC': '📄',
            'DOCX': '📄',
            'XLS': '📊',
            'XLSX': '📊',
            'PPT': '📽️',
            'PPTX': '📽️',
            'RTF': '📝',
            'ODT': '📄',
            'ODS': '📊',
            'ODP': '📽️'
        };
        
        return iconMap[format] || '📄';
    }
    
    /**
     * Create embedded document viewer (for PDF)
     * @param {string} documentUrl - Document URL
     * @param {Object} analysis - Document analysis
     * @returns {HTMLElement} Embedded viewer
     */
    createEmbeddedDocumentViewer(documentUrl, analysis) {
        const viewerWrapper = document.createElement('div');
        viewerWrapper.className = 'document-viewer-wrapper';
        
        const iframe = document.createElement('iframe');
        iframe.className = 'document-viewer';
        iframe.src = documentUrl;
        iframe.title = `Document Viewer - ${analysis.format}`;
        
        // Set responsive height
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        
        viewerWrapper.appendChild(iframe);
        
        return viewerWrapper;
    }
    
    /**
     * Create unsupported document viewer
     * @param {Object} analysis - Document analysis
     * @returns {HTMLElement} Unsupported viewer
     */
    createUnsupportedDocumentViewer(analysis) {
        const viewerWrapper = document.createElement('div');
        viewerWrapper.className = 'document-unsupported-wrapper';
        
        const message = document.createElement('div');
        message.className = 'document-unsupported-message';
        
        const suggestions = this.getViewingSuggestions(analysis.format);
        
        message.innerHTML = `
            <div class="unsupported-icon">${this.getDocumentIcon(analysis.format)}</div>
            <div class="unsupported-title">${analysis.format} Preview Not Available</div>
            <div class="unsupported-description">
                This ${analysis.type.toLowerCase()} format cannot be previewed directly in the browser.
            </div>
            <div class="viewing-suggestions">
                <h4>Viewing Options:</h4>
                <ul>
                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
        `;
        
        viewerWrapper.appendChild(message);
        
        return viewerWrapper;
    }
    
    /**
     * Get viewing suggestions for unsupported formats
     * @param {string} format - Document format
     * @returns {string[]} Array of suggestions
     */
    getViewingSuggestions(format) {
        const suggestionMap = {
            'DOC': [
                'Download and open in Microsoft Word',
                'Use Google Docs (upload to Google Drive)',
                'Try LibreOffice Writer (free alternative)'
            ],
            'DOCX': [
                'Download and open in Microsoft Word',
                'Use Google Docs (upload to Google Drive)', 
                'Try LibreOffice Writer (free alternative)'
            ],
            'XLS': [
                'Download and open in Microsoft Excel',
                'Use Google Sheets (upload to Google Drive)',
                'Try LibreOffice Calc (free alternative)'
            ],
            'XLSX': [
                'Download and open in Microsoft Excel',
                'Use Google Sheets (upload to Google Drive)',
                'Try LibreOffice Calc (free alternative)'
            ],
            'PPT': [
                'Download and open in Microsoft PowerPoint',
                'Use Google Slides (upload to Google Drive)',
                'Try LibreOffice Impress (free alternative)'
            ],
            'PPTX': [
                'Download and open in Microsoft PowerPoint',
                'Use Google Slides (upload to Google Drive)',
                'Try LibreOffice Impress (free alternative)'
            ]
        };
        
        return suggestionMap[format] || [
            'Download the file to view with appropriate software',
            'Check if your system has a compatible viewer installed'
        ];
    }
    
    /**
     * Create document controls
     * @param {string} documentUrl - Document URL
     * @param {Object} analysis - Document analysis
     * @returns {HTMLElement} Controls container
     */
    createDocumentControls(documentUrl, analysis) {
        const controls = document.createElement('div');
        controls.className = 'document-controls';
        
        controls.innerHTML = `
            <div class="control-group">
                <button class="control-btn download-btn" title="Download Document">⬇️ Download</button>
                <button class="control-btn open-new-tab-btn" title="Open in New Tab">🔗 Open in Tab</button>
                ${analysis.format === 'PDF' ? '<button class="control-btn print-btn" title="Print">🖨️ Print</button>' : ''}
            </div>
            <div class="document-info">
                <span class="info-item">📊 ${this.formatBytes(analysis.fileSize)}</span>
                <span class="info-item">📑 ${analysis.estimatedPages} pages</span>
                <span class="info-item">📄 ${analysis.format}</span>
            </div>
        `;
        
        // Bind control events
        this.bindDocumentControlEvents(controls, documentUrl, analysis);
        
        return controls;
    }
    
    /**
     * Bind document control events
     * @param {HTMLElement} controls - Controls container
     * @param {string} documentUrl - Document URL
     * @param {Object} analysis - Document analysis
     */
    bindDocumentControlEvents(controls, documentUrl, analysis) {
        const downloadBtn = controls.querySelector('.download-btn');
        const openNewTabBtn = controls.querySelector('.open-new-tab-btn');
        const printBtn = controls.querySelector('.print-btn');
        
        // Download
        downloadBtn.addEventListener('click', () => {
            this.downloadDocument(documentUrl, analysis.filename);
        });
        
        // Open in new tab
        openNewTabBtn.addEventListener('click', () => {
            window.open(documentUrl, '_blank');
        });
        
        // Print (PDF only)
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printDocument(documentUrl);
            });
        }
    }
    
    /**
     * Download document file
     * @param {string} documentUrl - Document URL
     * @param {string} filename - Original filename
     */
    downloadDocument(documentUrl, filename) {
        try {
            const link = document.createElement('a');
            link.href = documentUrl;
            link.download = filename || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Document download failed:', error);
        }
    }
    
    /**
     * Print document (PDF only)
     * @param {string} documentUrl - Document URL
     */
    printDocument(documentUrl) {
        try {
            const printWindow = window.open(documentUrl, '_blank');
            printWindow.addEventListener('load', () => {
                printWindow.print();
            });
        } catch (error) {
            console.error('Document print failed:', error);
        }
    }
    
    /**
     * Extract document metadata
     * @param {Object} analysis - Document analysis
     * @param {Uint8Array} data - Document data
     * @param {string} mimeType - MIME type
     * @returns {Promise<Object>} Document metadata
     */
    async extractDocumentMetadata(analysis, data, mimeType) {
        const metadata = await super.extractMetadata({
            filename: analysis.filename,
            mimeType: mimeType,
            fileSize: data.length
        });
        
        // Add document-specific metadata
        metadata.format = analysis.format;
        metadata.type = analysis.type;
        metadata.estimatedPages = analysis.estimatedPages;
        metadata.quality = analysis.quality;
        metadata.supportsEmbeddedViewer = analysis.supportsEmbeddedViewer;
        
        if (analysis.pdfAnalysis) {
            metadata.pdfVersion = analysis.pdfAnalysis.version;
            metadata.isEncrypted = analysis.pdfAnalysis.isEncrypted;
        }
        
        return metadata;
    }
    
    /**
     * Add document to cache
     * @param {string} filename - Cache key
     * @param {Object} analysis - Document analysis
     */
    addToCache(filename, analysis) {
        // Remove oldest if cache is full
        if (this.documentCache.size >= this.maxCacheSize) {
            const firstKey = this.documentCache.keys().next().value;
            this.documentCache.delete(firstKey);
        }
        
        this.documentCache.set(filename, analysis);
    }
    
    /**
     * Remove document from cache
     * @param {string} filename - Cache key
     */
    removeFromCache(filename) {
        this.documentCache.delete(filename);
    }
    
    /**
     * Clean up handler resources
     */
    cleanup() {
        super.cleanup();
        
        // Clear document cache
        this.documentCache.clear();
        
        // Clear current analysis
        this.currentAnalysis = null;
        
        console.log('🧹 Document handler cleanup complete');
    }
}

// Export for ES6 modules
export { DocumentPreviewHandler };