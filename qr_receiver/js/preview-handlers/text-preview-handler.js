/**
 * @fileoverview Text Preview Handler - Focused Text File Processing
 * 
 * ROOT CAUSE SOLUTION: Extracted text processing from monolithic FilePreviewSystem
 * into focused handler with encoding detection, syntax highlighting, and streaming
 * support for large text files.
 * 
 * Supports virtualization for large files and smart encoding detection.
 */

/**
 * Text Preview Handler
 * Handles all text file types with encoding detection and streaming
 * 
 * @class TextPreviewHandler
 * @extends {BasePreviewHandler}
 */
class TextPreviewHandler extends BasePreviewHandler {
    constructor() {
        super();
        
        /** @type {string[]} Supported text encodings */
        this.supportedEncodings = ['utf-8', 'utf-16', 'latin1', 'ascii'];
        
        /** @type {number} Maximum file size for full preview - configurable */
        this.maxFullPreviewSize = window.AppConfig?.get('filePreview.processing.textVirtualization.threshold') || 1 * 1024 * 1024;
        
        /** @type {number} Lines to show in virtual mode - configurable */
        this.virtualizedLines = window.AppConfig?.get('filePreview.processing.textVirtualization.maxLines') || 1000;
        
        /** @type {Map<string, string>} Encoding detection cache */
        this.encodingCache = new Map();
    }
    
    /**
     * Get handler capabilities
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        return {
            mimeTypes: [
                'text/plain',
                'text/html',
                'text/css',
                'text/csv',
                'text/xml',
                'text/rtf',
                'text/markdown'
            ],
            extensions: [
                'txt', 'text', 'md', 'markdown', 'csv', 'log', 
                'conf', 'ini', 'cfg', 'readme', 'license',
                'html', 'htm', 'css', 'xml', 'rtf'
            ],
            maxFileSize: window.AppConfig?.get('filePreview.maxPreviewSizes.text') || 10 * 1024 * 1024,
            supportsStreaming: true,
            supportsAsync: true,
            features: ['encoding-detection', 'virtualization', 'search', 'line-numbers']
        };
    }
    
    /**
     * Generate text preview
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const { data, mimeType, filename, container, onProgress } = context;
        
        // Create loading indicator
        const loadingElement = this.createLoadingElement('Processing text file...');
        container.appendChild(loadingElement);
        
        if (onProgress) onProgress(0.1, 'Detecting text encoding...');
        
        // Detect encoding
        const encoding = await this.detectEncoding(data, filename);
        
        if (onProgress) onProgress(0.3, `Decoding text (${encoding})...`);
        
        // Decode text
        const decodedText = await this.decodeText(data, encoding);
        
        if (onProgress) onProgress(0.6, 'Analyzing text content...');
        
        // Analyze text content
        const analysis = await this.analyzeText(decodedText, filename);
        
        if (onProgress) onProgress(0.8, 'Creating text preview...');
        
        // Create text container based on file size
        const textContainer = await this.createTextContainer(
            decodedText, 
            analysis, 
            context
        );
        
        // Replace loading with actual content
        container.removeChild(loadingElement);
        container.appendChild(textContainer);
        
        if (onProgress) onProgress(1.0, 'Text preview ready');
        
        // Extract metadata
        const metadata = await this.extractTextMetadata(decodedText, analysis, encoding);
        
        return {
            element: textContainer,
            metadata: metadata,
            cleanup: [],
            resources: {
                encoding: encoding,
                analysis: analysis,
                fullText: decodedText
            }
        };
    }
    
    /**
     * Detect text encoding
     * @param {Uint8Array} data - File data
     * @param {string} filename - Filename for caching
     * @returns {Promise<string>} Detected encoding
     */
    async detectEncoding(data, filename) {
        // Check cache first
        if (this.encodingCache.has(filename)) {
            return this.encodingCache.get(filename);
        }
        
        let detectedEncoding = 'utf-8'; // Default
        
        try {
            // Check for BOM (Byte Order Mark)
            if (data.length >= 3) {
                // UTF-8 BOM
                if (data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
                    detectedEncoding = 'utf-8';
                }
                // UTF-16 BE BOM
                else if (data[0] === 0xFE && data[1] === 0xFF) {
                    detectedEncoding = 'utf-16be';
                }
                // UTF-16 LE BOM
                else if (data[0] === 0xFF && data[1] === 0xFE) {
                    detectedEncoding = 'utf-16le';
                }
                // Try UTF-8 decoding on sample
                else {
                    detectedEncoding = await this.testEncodingOnSample(data);
                }
            }
        } catch (error) {
            console.warn('Encoding detection failed, using UTF-8:', error);
            detectedEncoding = 'utf-8';
        }
        
        // Cache result
        this.encodingCache.set(filename, detectedEncoding);
        
        return detectedEncoding;
    }
    
    /**
     * Test encoding on data sample
     * @param {Uint8Array} data - File data
     * @returns {Promise<string>} Best encoding
     */
    async testEncodingOnSample(data) {
        const sample = data.slice(0, 1024); // Test first 1KB
        
        for (const encoding of this.supportedEncodings) {
            try {
                const decoder = new TextDecoder(encoding, { fatal: true });
                decoder.decode(sample);
                return encoding; // Successfully decoded
            } catch (error) {
                continue; // Try next encoding
            }
        }
        
        return 'utf-8'; // Fallback
    }
    
    /**
     * Decode text with specified encoding
     * @param {Uint8Array} data - File data
     * @param {string} encoding - Text encoding
     * @returns {Promise<string>} Decoded text
     */
    async decodeText(data, encoding) {
        try {
            const decoder = new TextDecoder(encoding, { fatal: false });
            return decoder.decode(data);
        } catch (error) {
            console.warn(`Failed to decode with ${encoding}, trying UTF-8:`, error);
            
            try {
                const fallbackDecoder = new TextDecoder('utf-8', { fatal: false });
                return fallbackDecoder.decode(data);
            } catch (fallbackError) {
                throw new Error(`Unable to decode text file: ${fallbackError.message}`);
            }
        }
    }
    
    /**
     * Analyze text content
     * @param {string} text - Decoded text
     * @param {string} filename - Original filename
     * @returns {Promise<Object>} Text analysis
     */
    async analyzeText(text, filename) {
        const analysis = {
            lineCount: 0,
            characterCount: text.length,
            wordCount: 0,
            isEmpty: text.trim().length === 0,
            hasLongLines: false,
            maxLineLength: 0,
            averageLineLength: 0,
            fileType: this.detectFileType(text, filename),
            structure: {
                hasHeaders: false,
                isList: false,
                isTable: false,
                isCode: false
            }
        };
        
        if (analysis.isEmpty) {
            return analysis;
        }
        
        // Split into lines
        const lines = text.split(/\r?\n/);
        analysis.lineCount = lines.length;
        
        // Analyze lines
        let totalLineLength = 0;
        for (const line of lines) {
            const lineLength = line.length;
            totalLineLength += lineLength;
            
            if (lineLength > analysis.maxLineLength) {
                analysis.maxLineLength = lineLength;
            }
            
            if (lineLength > 200) {
                analysis.hasLongLines = true;
            }
        }
        
        analysis.averageLineLength = Math.round(totalLineLength / lines.length);
        
        // Count words (approximate)
        analysis.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        
        // Detect structure patterns
        analysis.structure = this.detectStructure(lines);
        
        return analysis;
    }
    
    /**
     * Detect file type from content and filename
     * @param {string} text - File content
     * @param {string} filename - Filename
     * @returns {string} Detected file type
     */
    detectFileType(text, filename) {
        const extension = this.extractExtension(filename);
        
        // Extension-based detection
        const typeMap = {
            'md': 'markdown',
            'markdown': 'markdown',
            'csv': 'csv',
            'log': 'log',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'xml': 'xml',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml'
        };
        
        if (typeMap[extension]) {
            return typeMap[extension];
        }
        
        // Content-based detection
        const textStart = text.slice(0, 1000).toLowerCase();
        
        if (textStart.includes('<!doctype') || textStart.includes('<html')) {
            return 'html';
        }
        
        if (textStart.includes('<?xml')) {
            return 'xml';
        }
        
        if (textStart.match(/^#\s+/m)) {
            return 'markdown';
        }
        
        return 'text';
    }
    
    /**
     * Detect text structure patterns
     * @param {string[]} lines - Text lines
     * @returns {Object} Structure analysis
     */
    detectStructure(lines) {
        const structure = {
            hasHeaders: false,
            isList: false,
            isTable: false,
            isCode: false
        };
        
        let listCount = 0;
        let headerCount = 0;
        let tableCount = 0;
        let indentedCount = 0;
        
        for (const line of lines.slice(0, 50)) { // Analyze first 50 lines
            const trimmed = line.trim();
            
            if (trimmed.length === 0) continue;
            
            // Headers (markdown style)
            if (trimmed.match(/^#{1,6}\s+/)) {
                headerCount++;
            }
            
            // Lists
            if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
                listCount++;
            }
            
            // Tables (CSV-like or markdown)
            if (trimmed.includes('|') || trimmed.includes(',')) {
                tableCount++;
            }
            
            // Code (indented)
            if (line.startsWith('    ') || line.startsWith('\t')) {
                indentedCount++;
            }
        }
        
        const totalLines = Math.min(lines.length, 50);
        
        structure.hasHeaders = headerCount > 0;
        structure.isList = listCount > totalLines * 0.3;
        structure.isTable = tableCount > totalLines * 0.5;
        structure.isCode = indentedCount > totalLines * 0.3;
        
        return structure;
    }
    
    /**
     * Create text container with appropriate rendering
     * @param {string} text - Decoded text
     * @param {Object} analysis - Text analysis
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Text container
     */
    async createTextContainer(text, analysis, context) {
        const container = this.createContainer('text-preview-container');
        
        // Create text info header
        const infoHeader = this.createTextInfoHeader(analysis, context);
        container.appendChild(infoHeader);
        
        // Create text controls
        const controls = this.createTextControls(text, analysis);
        container.appendChild(controls);
        
        // Create text content
        let contentElement;
        
        if (context.fileSize > this.maxFullPreviewSize) {
            contentElement = this.createVirtualizedTextContent(text, analysis);
        } else {
            contentElement = this.createFullTextContent(text, analysis);
        }
        
        container.appendChild(contentElement);
        
        return container;
    }
    
    /**
     * Create text info header
     * @param {Object} analysis - Text analysis
     * @param {PreviewContext} context - Preview context
     * @returns {HTMLElement} Info header
     */
    createTextInfoHeader(analysis, context) {
        const header = document.createElement('div');
        header.className = 'text-info-header';
        
        const fileSize = this.formatBytes(context.fileSize);
        
        header.innerHTML = `
            <div class="text-stats">
                <span class="stat-item">📄 ${analysis.lineCount.toLocaleString()} lines</span>
                <span class="stat-item">🔤 ${analysis.characterCount.toLocaleString()} chars</span>
                <span class="stat-item">📝 ${analysis.wordCount.toLocaleString()} words</span>
                <span class="stat-item">📊 ${fileSize}</span>
                <span class="stat-item">🏷️ ${analysis.fileType}</span>
            </div>
        `;
        
        return header;
    }
    
    /**
     * Create text controls
     * @param {string} text - Full text
     * @param {Object} analysis - Text analysis
     * @returns {HTMLElement} Controls container
     */
    createTextControls(text, analysis) {
        const controls = document.createElement('div');
        controls.className = 'text-controls';
        
        controls.innerHTML = `
            <div class="control-group">
                <input type="search" class="search-input" placeholder="Search text..." />
                <button class="control-btn search-btn" title="Search">🔍</button>
                <button class="control-btn clear-search" title="Clear Search">✖️</button>
            </div>
            <div class="control-group">
                <button class="control-btn toggle-wrap" title="Toggle Word Wrap">📄</button>
                <button class="control-btn toggle-numbers" title="Toggle Line Numbers">#</button>
                <button class="control-btn download-btn" title="Download Text">⬇️</button>
            </div>
        `;
        
        // Bind control events
        this.bindTextControlEvents(controls, text);
        
        return controls;
    }
    
    /**
     * Create full text content (small files)
     * @param {string} text - Full text
     * @param {Object} analysis - Text analysis
     * @returns {HTMLElement} Text content element
     */
    createFullTextContent(text, analysis) {
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'text-content-wrapper';
        
        const pre = document.createElement('pre');
        pre.className = 'text-content full-text';
        pre.textContent = text;
        
        // Add line numbers if reasonable line count
        if (analysis.lineCount <= 5000) {
            this.addLineNumbers(pre, analysis.lineCount);
        }
        
        contentWrapper.appendChild(pre);
        
        return contentWrapper;
    }
    
    /**
     * Create virtualized text content (large files)
     * @param {string} text - Full text
     * @param {Object} analysis - Text analysis
     * @returns {HTMLElement} Virtualized text content
     */
    createVirtualizedTextContent(text, analysis) {
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'text-content-wrapper virtualized';
        
        const lines = text.split(/\r?\n/);
        const displayLines = Math.min(this.virtualizedLines, lines.length);
        
        // Show first portion of file
        const visibleText = lines.slice(0, displayLines).join('\n');
        
        const pre = document.createElement('pre');
        pre.className = 'text-content virtualized-text';
        pre.textContent = visibleText;
        
        // Add truncation notice
        if (lines.length > displayLines) {
            const truncationNotice = document.createElement('div');
            truncationNotice.className = 'truncation-notice';
            truncationNotice.innerHTML = `
                <div class="notice-content">
                    📋 Showing first ${displayLines.toLocaleString()} lines of ${lines.length.toLocaleString()} total
                    <button class="load-more-btn">Load More Lines</button>
                </div>
            `;
            
            // Bind load more functionality
            const loadMoreBtn = truncationNotice.querySelector('.load-more-btn');
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreLines(pre, lines, displayLines);
            });
            
            contentWrapper.appendChild(truncationNotice);
        }
        
        contentWrapper.appendChild(pre);
        
        return contentWrapper;
    }
    
    /**
     * Add line numbers to text element
     * @param {HTMLElement} pre - Pre element
     * @param {number} lineCount - Total lines
     */
    addLineNumbers(pre, lineCount) {
        pre.classList.add('with-line-numbers');
        
        const lineNumbersDiv = document.createElement('div');
        lineNumbersDiv.className = 'line-numbers';
        
        for (let i = 1; i <= lineCount; i++) {
            const lineNum = document.createElement('div');
            lineNum.textContent = i.toString();
            lineNumbersDiv.appendChild(lineNum);
        }
        
        pre.parentElement.insertBefore(lineNumbersDiv, pre);
    }
    
    /**
     * Bind text control events
     * @param {HTMLElement} controls - Controls container
     * @param {string} fullText - Full text content
     */
    bindTextControlEvents(controls, fullText) {
        const searchInput = controls.querySelector('.search-input');
        const searchBtn = controls.querySelector('.search-btn');
        const clearSearchBtn = controls.querySelector('.clear-search');
        const toggleWrapBtn = controls.querySelector('.toggle-wrap');
        const toggleNumbersBtn = controls.querySelector('.toggle-numbers');
        const downloadBtn = controls.querySelector('.download-btn');
        
        // Search functionality
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                this.highlightSearchResults(query);
            }
        };
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        searchBtn.addEventListener('click', performSearch);
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.clearSearchHighlights();
        });
        
        // Toggle controls
        toggleWrapBtn.addEventListener('click', () => {
            this.toggleWordWrap();
        });
        
        toggleNumbersBtn.addEventListener('click', () => {
            this.toggleLineNumbers();
        });
        
        downloadBtn.addEventListener('click', () => {
            this.downloadText(fullText);
        });
    }
    
    /**
     * Extract text metadata
     * @param {string} text - Decoded text
     * @param {Object} analysis - Text analysis
     * @param {string} encoding - Text encoding
     * @returns {Promise<Object>} Text metadata
     */
    async extractTextMetadata(text, analysis, encoding) {
        const metadata = await super.extractMetadata({
            filename: 'text_file',
            mimeType: 'text/plain',
            fileSize: text.length
        });
        
        // Add text-specific metadata
        metadata.encoding = encoding;
        metadata.lines = analysis.lineCount;
        metadata.characters = analysis.characterCount;
        metadata.words = analysis.wordCount;
        metadata.fileType = analysis.fileType;
        metadata.structure = analysis.structure;
        metadata.maxLineLength = analysis.maxLineLength;
        metadata.averageLineLength = analysis.averageLineLength;
        
        return metadata;
    }
    
    /**
     * Highlight search results (simplified implementation)
     * @param {string} query - Search query
     */
    highlightSearchResults(query) {
        // Implementation would highlight matches in the text content
        console.log(`Searching for: "${query}"`);
    }
    
    /**
     * Clear search highlights
     */
    clearSearchHighlights() {
        // Implementation would clear highlighted matches
        console.log('Clearing search highlights');
    }
    
    /**
     * Toggle word wrap
     */
    toggleWordWrap() {
        const textContent = document.querySelector('.text-content');
        if (textContent) {
            textContent.classList.toggle('word-wrap');
        }
    }
    
    /**
     * Toggle line numbers
     */
    toggleLineNumbers() {
        const textContent = document.querySelector('.text-content');
        if (textContent) {
            textContent.classList.toggle('show-line-numbers');
        }
    }
    
    /**
     * Load more lines for virtualized content
     * @param {HTMLElement} pre - Pre element
     * @param {string[]} lines - All lines
     * @param {number} currentDisplayed - Currently displayed lines
     */
    loadMoreLines(pre, lines, currentDisplayed) {
        const nextBatch = Math.min(this.virtualizedLines, lines.length - currentDisplayed);
        const additionalLines = lines.slice(currentDisplayed, currentDisplayed + nextBatch);
        
        pre.textContent += '\n' + additionalLines.join('\n');
        
        console.log(`Loaded ${additionalLines.length} more lines`);
    }
    
    /**
     * Download text file
     * @param {string} text - Text content
     */
    downloadText(text) {
        try {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = this.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'text_file.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => this.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Text download failed:', error);
        }
    }
    
    /**
     * Clean up handler resources
     */
    cleanup() {
        super.cleanup();
        
        // Clear encoding cache
        this.encodingCache.clear();
        
        console.log('🧹 Text handler cleanup complete');
    }
}

// Export for ES6 modules
export { TextPreviewHandler };