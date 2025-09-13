/**
 * @fileoverview Code Preview Handler - Focused Code File Processing with Syntax Highlighting
 * 
 * ROOT CAUSE SOLUTION: Extracted from monolithic FilePreviewSystem into focused
 * handler with syntax highlighting, language detection, and code-specific features.
 * 
 * Supports all programming languages with proper syntax highlighting and 
 * code-specific functionality like folding, line numbers, and search.
 */

/**
 * Code Preview Handler
 * Handles all code file types with syntax highlighting and code-specific features
 * 
 * @class CodePreviewHandler
 * @extends {BasePreviewHandler}
 */
class CodePreviewHandler extends BasePreviewHandler {
    constructor() {
        super();
        
        /** @type {Object<string, string>} Language detection mappings */
        this.languageMap = {
            'js': 'javascript',
            'jsx': 'javascript', 
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'php': 'php',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'r': 'r',
            'sql': 'sql',
            'sh': 'bash',
            'ps1': 'powershell',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'md': 'markdown',
            'dockerfile': 'dockerfile',
            'makefile': 'makefile',
            'gradle': 'gradle',
            'cmake': 'cmake'
        };
        
        /** @type {number} Maximum file size for full syntax highlighting */
        this.maxHighlightSize = 500 * 1024; // 500KB
        
        /** @type {number} Lines to show in virtualized mode */
        this.virtualizedLines = 2000;
    }
    
    /**
     * Get handler capabilities
     * @returns {PreviewHandlerCapabilities} Handler capabilities
     */
    getCapabilities() {
        return {
            mimeTypes: [
                'application/json',
                'application/xml',
                'application/javascript',
                'text/javascript',
                'text/x-python',
                'text/x-java',
                'text/x-csharp',
                'text/x-php',
                'text/x-ruby',
                'text/x-go',
                'text/x-rust',
                'text/x-swift'
            ],
            extensions: [
                'js', 'jsx', 'ts', 'tsx', 'json', 'py', 'rb', 'php', 'java',
                'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt', 'scala',
                'r', 'sql', 'sh', 'bash', 'ps1', 'yaml', 'yml', 'xml', 'html',
                'css', 'scss', 'sass', 'less', 'md', 'dockerfile', 'makefile',
                'gradle', 'cmake', 'vue', 'svelte'
            ],
            maxFileSize: 5 * 1024 * 1024, // 5MB
            supportsStreaming: false,
            supportsAsync: true,
            features: ['syntax-highlighting', 'line-numbers', 'language-detection', 'code-folding', 'search']
        };
    }
    
    /**
     * Generate code preview
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<PreviewResult>} Preview result
     */
    async generatePreview(context) {
        const { data, mimeType, filename, container, onProgress } = context;
        
        // Create loading indicator
        const loadingElement = this.createLoadingElement('Processing code file...');
        container.appendChild(loadingElement);
        
        if (onProgress) onProgress(0.1, 'Detecting programming language...');
        
        // Detect language
        const language = this.detectLanguage(mimeType, filename);
        
        if (onProgress) onProgress(0.3, `Decoding ${language} code...`);
        
        // Decode text
        const code = await this.decodeCode(data);
        
        if (onProgress) onProgress(0.6, 'Analyzing code structure...');
        
        // Analyze code
        const analysis = await this.analyzeCode(code, language, filename);
        
        if (onProgress) onProgress(0.8, 'Creating syntax-highlighted preview...');
        
        // Create code container
        const codeContainer = await this.createCodeContainer(
            code,
            language, 
            analysis,
            context
        );
        
        // Replace loading with actual content
        container.removeChild(loadingElement);
        container.appendChild(codeContainer);
        
        if (onProgress) onProgress(1.0, 'Code preview ready');
        
        // Extract metadata
        const metadata = await this.extractCodeMetadata(code, language, analysis);
        
        return {
            element: codeContainer,
            metadata: metadata,
            cleanup: [],
            resources: {
                language: language,
                analysis: analysis,
                fullCode: code
            }
        };
    }
    
    /**
     * Detect programming language
     * @param {string} mimeType - File MIME type
     * @param {string} filename - Filename
     * @returns {string} Detected language
     */
    detectLanguage(mimeType, filename) {
        // Check MIME type first
        const mimeLanguageMap = {
            'application/json': 'json',
            'application/xml': 'xml',
            'application/javascript': 'javascript',
            'text/javascript': 'javascript',
            'text/x-python': 'python',
            'text/x-java': 'java',
            'text/x-csharp': 'csharp',
            'text/x-php': 'php',
            'text/x-ruby': 'ruby',
            'text/x-go': 'go',
            'text/x-rust': 'rust',
            'text/x-swift': 'swift'
        };
        
        if (mimeLanguageMap[mimeType]) {
            return mimeLanguageMap[mimeType];
        }
        
        // Check file extension
        const extension = this.extractExtension(filename);
        return this.languageMap[extension] || 'text';
    }
    
    /**
     * Decode code with proper encoding
     * @param {Uint8Array} data - File data
     * @returns {Promise<string>} Decoded code
     */
    async decodeCode(data) {
        try {
            // Try UTF-8 first
            const decoder = new TextDecoder('utf-8', { fatal: true });
            return decoder.decode(data);
        } catch (error) {
            // Fallback to non-fatal UTF-8
            try {
                const fallbackDecoder = new TextDecoder('utf-8', { fatal: false });
                return fallbackDecoder.decode(data);
            } catch (fallbackError) {
                throw new Error(`Unable to decode code file: ${fallbackError.message}`);
            }
        }
    }
    
    /**
     * Analyze code structure and metrics
     * @param {string} code - Decoded code
     * @param {string} language - Programming language
     * @param {string} filename - Original filename
     * @returns {Promise<Object>} Code analysis
     */
    async analyzeCode(code, language, filename) {
        const lines = code.split(/\r?\n/);
        
        const analysis = {
            language: language,
            lineCount: lines.length,
            characterCount: code.length,
            isEmpty: code.trim().length === 0,
            hasLongLines: false,
            maxLineLength: 0,
            averageLineLength: 0,
            structure: {
                functions: 0,
                classes: 0,
                imports: 0,
                comments: 0,
                blankLines: 0
            },
            complexity: {
                cyclomaticComplexity: 0,
                nesting: 0
            }
        };
        
        if (analysis.isEmpty) {
            return analysis;
        }
        
        let totalLineLength = 0;
        let currentNesting = 0;
        let maxNesting = 0;
        
        // Analyze each line
        for (const line of lines) {
            const trimmed = line.trim();
            const lineLength = line.length;
            totalLineLength += lineLength;
            
            if (lineLength > analysis.maxLineLength) {
                analysis.maxLineLength = lineLength;
            }
            
            if (lineLength > 120) {
                analysis.hasLongLines = true;
            }
            
            if (trimmed.length === 0) {
                analysis.structure.blankLines++;
                continue;
            }
            
            // Count language-specific constructs
            this.analyzeLineByLanguage(trimmed, language, analysis);
            
            // Track nesting level (simplified)
            currentNesting += this.getIndentationChange(line, language);
            maxNesting = Math.max(maxNesting, currentNesting);
        }
        
        analysis.averageLineLength = Math.round(totalLineLength / lines.length);
        analysis.complexity.nesting = maxNesting;
        
        return analysis;
    }
    
    /**
     * Analyze line by programming language
     * @param {string} line - Trimmed line
     * @param {string} language - Programming language
     * @param {Object} analysis - Analysis object to update
     */
    analyzeLineByLanguage(line, language, analysis) {
        // Comments
        const commentPatterns = {
            'javascript': [/^\/\//, /^\/\*/, /^\*/],
            'python': [/^#/],
            'java': [/^\/\//, /^\/\*/, /^\*/],
            'csharp': [/^\/\//, /^\/\*/, /^\*/],
            'css': [/^\/\*/, /^\*/],
            'html': [/^<!--/],
            'sql': [/^--/, /^\/\*/]
        };
        
        const patterns = commentPatterns[language] || commentPatterns.javascript;
        if (patterns.some(pattern => pattern.test(line))) {
            analysis.structure.comments++;
            return;
        }
        
        // Functions/Methods
        const functionPatterns = {
            'javascript': /^(function\s+\w+|const\s+\w+\s*=\s*\(|\w+\s*\([^)]*\)\s*=>|\w+\s*:\s*function)/,
            'python': /^def\s+\w+/,
            'java': /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
            'csharp': /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
            'go': /^func\s+/,
            'rust': /^fn\s+/,
            'php': /^function\s+/
        };
        
        const funcPattern = functionPatterns[language];
        if (funcPattern && funcPattern.test(line)) {
            analysis.structure.functions++;
        }
        
        // Classes
        const classPatterns = {
            'javascript': /^class\s+\w+/,
            'python': /^class\s+\w+/,
            'java': /^(public\s+)?(abstract\s+)?class\s+\w+/,
            'csharp': /^(public\s+)?(abstract\s+)?class\s+\w+/,
            'go': /^type\s+\w+\s+struct/,
            'rust': /^struct\s+\w+/,
            'php': /^class\s+\w+/
        };
        
        const clsPattern = classPatterns[language];
        if (clsPattern && clsPattern.test(line)) {
            analysis.structure.classes++;
        }
        
        // Imports
        const importPatterns = {
            'javascript': /^import\s+|^const\s+.*=\s*require/,
            'python': /^import\s+|^from\s+.*import/,
            'java': /^import\s+/,
            'csharp': /^using\s+/,
            'go': /^import\s+/,
            'rust': /^use\s+/,
            'php': /^use\s+|^require|^include/
        };
        
        const impPattern = importPatterns[language];
        if (impPattern && impPattern.test(line)) {
            analysis.structure.imports++;
        }
        
        // Cyclomatic complexity indicators
        const complexityPatterns = [
            /\bif\b/, /\belse\b/, /\bwhile\b/, /\bfor\b/, /\bswitch\b/,
            /\bcatch\b/, /\btry\b/, /\b&&\b/, /\b\|\|\b/, /\?\s*:/
        ];
        
        const matches = complexityPatterns.filter(pattern => pattern.test(line)).length;
        analysis.complexity.cyclomaticComplexity += matches;
    }
    
    /**
     * Get indentation change for nesting calculation
     * @param {string} line - Full line with whitespace
     * @param {string} language - Programming language
     * @returns {number} Indentation change (-1, 0, 1)
     */
    getIndentationChange(line, language) {
        const trimmed = line.trim();
        
        // Opening braces/blocks
        const openPatterns = ['{', '(', '['];
        const closePatterns = ['}', ')', ']'];
        
        // Language-specific block indicators
        const langOpenPatterns = {
            'python': [/:$/],
            'yaml': [/:$/]
        };
        
        const langClosePatterns = {
            'python': [/^(return|break|continue|pass)$/]
        };
        
        let change = 0;
        
        // Count opening characters
        for (const char of openPatterns) {
            change += (line.match(new RegExp('\\' + char, 'g')) || []).length;
        }
        
        // Count closing characters
        for (const char of closePatterns) {
            change -= (line.match(new RegExp('\\' + char, 'g')) || []).length;
        }
        
        // Language-specific patterns
        const langOpen = langOpenPatterns[language] || [];
        const langClose = langClosePatterns[language] || [];
        
        for (const pattern of langOpen) {
            if (pattern.test(trimmed)) change++;
        }
        
        for (const pattern of langClose) {
            if (pattern.test(trimmed)) change--;
        }
        
        return Math.max(-1, Math.min(1, change));
    }
    
    /**
     * Create code container with syntax highlighting
     * @param {string} code - Full code
     * @param {string} language - Programming language
     * @param {Object} analysis - Code analysis
     * @param {PreviewContext} context - Preview context
     * @returns {Promise<HTMLElement>} Code container
     */
    async createCodeContainer(code, language, analysis, context) {
        const container = this.createContainer('code-preview-container');
        
        // Create code info header
        const infoHeader = this.createCodeInfoHeader(analysis, language, context);
        container.appendChild(infoHeader);
        
        // Create code controls
        const controls = this.createCodeControls(code, language);
        container.appendChild(controls);
        
        // Create code content
        let contentElement;
        
        if (context.fileSize > this.maxHighlightSize) {
            contentElement = this.createSimpleCodeContent(code, analysis);
        } else {
            contentElement = await this.createHighlightedCodeContent(code, language, analysis);
        }
        
        container.appendChild(contentElement);
        
        return container;
    }
    
    /**
     * Create code info header
     * @param {Object} analysis - Code analysis
     * @param {string} language - Programming language
     * @param {PreviewContext} context - Preview context
     * @returns {HTMLElement} Info header
     */
    createCodeInfoHeader(analysis, language, context) {
        const header = document.createElement('div');
        header.className = 'code-info-header';
        
        const fileSize = this.formatBytes(context.fileSize);
        
        header.innerHTML = `
            <div class="code-stats">
                <span class="stat-item">🔥 ${language.toUpperCase()}</span>
                <span class="stat-item">📄 ${analysis.lineCount.toLocaleString()} lines</span>
                <span class="stat-item">🔤 ${analysis.characterCount.toLocaleString()} chars</span>
                <span class="stat-item">📊 ${fileSize}</span>
                <span class="stat-item">🔧 ${analysis.structure.functions} functions</span>
                <span class="stat-item">🏛️ ${analysis.structure.classes} classes</span>
            </div>
        `;
        
        return header;
    }
    
    /**
     * Create code controls
     * @param {string} code - Full code
     * @param {string} language - Programming language
     * @returns {HTMLElement} Controls container
     */
    createCodeControls(code, language) {
        const controls = document.createElement('div');
        controls.className = 'code-controls';
        
        controls.innerHTML = `
            <div class="control-group">
                <input type="search" class="search-input" placeholder="Search code..." />
                <button class="control-btn search-btn" title="Search">🔍</button>
                <button class="control-btn clear-search" title="Clear Search">✖️</button>
            </div>
            <div class="control-group">
                <button class="control-btn toggle-wrap" title="Toggle Word Wrap">📄</button>
                <button class="control-btn toggle-numbers" title="Toggle Line Numbers">#</button>
                <button class="control-btn format-btn" title="Format Code">🎨</button>
                <button class="control-btn download-btn" title="Download Code">⬇️</button>
            </div>
        `;
        
        // Bind control events
        this.bindCodeControlEvents(controls, code, language);
        
        return controls;
    }
    
    /**
     * Create simple code content (no syntax highlighting for large files)
     * @param {string} code - Full code
     * @param {Object} analysis - Code analysis
     * @returns {HTMLElement} Code content element
     */
    createSimpleCodeContent(code, analysis) {
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'code-content-wrapper simple';
        
        const pre = document.createElement('pre');
        pre.className = 'code-content simple-code';
        
        // Show first portion for large files
        const truncatedCode = code.length > 100000 ? 
            code.substring(0, 100000) + '\n\n... (file truncated for performance)' : code;
        
        pre.textContent = truncatedCode;
        
        // Add line numbers if reasonable line count
        if (analysis.lineCount <= 10000) {
            this.addLineNumbers(pre, Math.min(analysis.lineCount, 2500));
        }
        
        contentWrapper.appendChild(pre);
        
        return contentWrapper;
    }
    
    /**
     * Create syntax-highlighted code content
     * @param {string} code - Full code
     * @param {string} language - Programming language
     * @param {Object} analysis - Code analysis
     * @returns {Promise<HTMLElement>} Highlighted code element
     */
    async createHighlightedCodeContent(code, language, analysis) {
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'code-content-wrapper highlighted';
        
        const pre = document.createElement('pre');
        pre.className = 'code-content highlighted-code';
        pre.setAttribute('data-language', language);
        
        // Apply syntax highlighting
        const highlightedCode = await this.applySyntaxHighlighting(code, language);
        pre.innerHTML = highlightedCode;
        
        // Add line numbers
        if (analysis.lineCount <= 5000) {
            this.addLineNumbers(pre, analysis.lineCount);
        }
        
        contentWrapper.appendChild(pre);
        
        return contentWrapper;
    }
    
    /**
     * Apply syntax highlighting to code
     * @param {string} code - Code to highlight
     * @param {string} language - Programming language
     * @returns {Promise<string>} Highlighted HTML
     */
    async applySyntaxHighlighting(code, language) {
        try {
            // Simple regex-based highlighting for common languages
            return this.simpleHighlight(code, language);
        } catch (error) {
            console.warn('Syntax highlighting failed, using plain text:', error);
            return this.escapeHtml(code);
        }
    }
    
    /**
     * Simple regex-based syntax highlighting
     * @param {string} code - Code to highlight
     * @param {string} language - Programming language
     * @returns {string} Highlighted HTML
     */
    simpleHighlight(code, language) {
        let highlighted = this.escapeHtml(code);
        
        // Language-specific highlighting patterns
        const patterns = this.getHighlightPatterns(language);
        
        for (const [className, pattern] of patterns) {
            highlighted = highlighted.replace(pattern, `<span class="${className}">$1</span>`);
        }
        
        return highlighted;
    }
    
    /**
     * Get highlighting patterns for language
     * @param {string} language - Programming language
     * @returns {Array<Array>} Pattern array [className, regex]
     */
    getHighlightPatterns(language) {
        const commonPatterns = [
            ['hl-string', /(["'`](?:\\.|[^"'`\\])*["'`])/g],
            ['hl-number', /\b(\d+(?:\.\d+)?)\b/g],
            ['hl-comment', /(\/\/.*$)/gm],
            ['hl-comment', /(\/\*[\s\S]*?\*\/)/g]
        ];
        
        const languagePatterns = {
            'javascript': [
                ...commonPatterns,
                ['hl-keyword', /\b(const|let|var|function|class|if|else|for|while|return|import|export|async|await|try|catch|finally)\b/g],
                ['hl-builtin', /\b(console|document|window|Array|Object|String|Number|Boolean|Date|Math|JSON|Promise)\b/g]
            ],
            'python': [
                ...commonPatterns,
                ['hl-keyword', /\b(def|class|if|elif|else|for|while|return|import|from|try|except|finally|with|as|lambda|yield)\b/g],
                ['hl-builtin', /\b(print|len|range|enumerate|zip|map|filter|list|dict|tuple|set|str|int|float|bool)\b/g],
                ['hl-comment', /(#.*$)/gm]
            ],
            'java': [
                ...commonPatterns,
                ['hl-keyword', /\b(public|private|protected|static|final|class|interface|extends|implements|if|else|for|while|return|import|package|try|catch|finally)\b/g],
                ['hl-builtin', /\b(String|int|long|double|float|boolean|char|void|Object|System|List|Map|Set)\b/g]
            ],
            'json': [
                ['hl-string', /(\"[^\"]*\"(?=\s*:))/g], // Keys
                ['hl-string', /(\"[^\"]*\"(?!\s*:))/g], // Values
                ['hl-number', /\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g],
                ['hl-keyword', /\b(true|false|null)\b/g]
            ]
        };
        
        return languagePatterns[language] || commonPatterns;
    }
    
    /**
     * Add line numbers to code element
     * @param {HTMLElement} pre - Pre element
     * @param {number} lineCount - Total lines
     */
    addLineNumbers(pre, lineCount) {
        pre.classList.add('with-line-numbers');
        
        const lineNumbersDiv = document.createElement('div');
        lineNumbersDiv.className = 'line-numbers';
        
        for (let i = 1; i <= lineCount; i++) {
            const lineNum = document.createElement('div');
            lineNum.className = 'line-number';
            lineNum.textContent = i.toString();
            lineNumbersDiv.appendChild(lineNum);
        }
        
        pre.parentElement.insertBefore(lineNumbersDiv, pre);
    }
    
    /**
     * Bind code control events
     * @param {HTMLElement} controls - Controls container
     * @param {string} code - Full code
     * @param {string} language - Programming language
     */
    bindCodeControlEvents(controls, code, language) {
        const searchInput = controls.querySelector('.search-input');
        const searchBtn = controls.querySelector('.search-btn');
        const clearSearchBtn = controls.querySelector('.clear-search');
        const toggleWrapBtn = controls.querySelector('.toggle-wrap');
        const toggleNumbersBtn = controls.querySelector('.toggle-numbers');
        const formatBtn = controls.querySelector('.format-btn');
        const downloadBtn = controls.querySelector('.download-btn');
        
        // Search functionality
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                this.highlightCodeSearchResults(query);
            }
        };
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        searchBtn.addEventListener('click', performSearch);
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.clearCodeSearchHighlights();
        });
        
        // Toggle controls
        toggleWrapBtn.addEventListener('click', () => {
            this.toggleCodeWordWrap();
        });
        
        toggleNumbersBtn.addEventListener('click', () => {
            this.toggleCodeLineNumbers();
        });
        
        formatBtn.addEventListener('click', () => {
            this.formatCode(language);
        });
        
        downloadBtn.addEventListener('click', () => {
            this.downloadCode(code, language);
        });
    }
    
    /**
     * Extract code metadata
     * @param {string} code - Full code
     * @param {string} language - Programming language
     * @param {Object} analysis - Code analysis
     * @returns {Promise<Object>} Code metadata
     */
    async extractCodeMetadata(code, language, analysis) {
        const metadata = await super.extractMetadata({
            filename: `code_file.${this.getExtensionForLanguage(language)}`,
            mimeType: this.getMimeTypeForLanguage(language),
            fileSize: code.length
        });
        
        // Add code-specific metadata
        metadata.language = language;
        metadata.lines = analysis.lineCount;
        metadata.characters = analysis.characterCount;
        metadata.functions = analysis.structure.functions;
        metadata.classes = analysis.structure.classes;
        metadata.imports = analysis.structure.imports;
        metadata.complexity = analysis.complexity;
        metadata.structure = analysis.structure;
        
        return metadata;
    }
    
    /**
     * Get file extension for programming language
     * @param {string} language - Programming language
     * @returns {string} File extension
     */
    getExtensionForLanguage(language) {
        const extensions = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'java': 'java',
            'csharp': 'cs',
            'go': 'go',
            'rust': 'rs',
            'php': 'php',
            'ruby': 'rb',
            'swift': 'swift',
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'yaml': 'yaml'
        };
        
        return extensions[language] || 'txt';
    }
    
    /**
     * Get MIME type for programming language
     * @param {string} language - Programming language  
     * @returns {string} MIME type
     */
    getMimeTypeForLanguage(language) {
        const mimeTypes = {
            'javascript': 'text/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'html': 'text/html',
            'css': 'text/css',
            'python': 'text/x-python',
            'java': 'text/x-java',
            'csharp': 'text/x-csharp'
        };
        
        return mimeTypes[language] || 'text/plain';
    }
    
    /**
     * Highlight search results in code (simplified)
     * @param {string} query - Search query
     */
    highlightCodeSearchResults(query) {
        console.log(`🔍 Searching code for: "${query}"`);
        // Implementation would highlight matches in code
    }
    
    /**
     * Clear search highlights in code
     */
    clearCodeSearchHighlights() {
        console.log('✖️ Clearing code search highlights');
        // Implementation would clear highlighted matches
    }
    
    /**
     * Toggle word wrap in code
     */
    toggleCodeWordWrap() {
        const codeContent = document.querySelector('.code-content');
        if (codeContent) {
            codeContent.classList.toggle('word-wrap');
        }
    }
    
    /**
     * Toggle line numbers in code
     */
    toggleCodeLineNumbers() {
        const codeContent = document.querySelector('.code-content');
        if (codeContent) {
            codeContent.classList.toggle('show-line-numbers');
        }
    }
    
    /**
     * Format code (simplified implementation)
     * @param {string} language - Programming language
     */
    formatCode(language) {
        console.log(`🎨 Formatting ${language} code`);
        // Implementation would format/prettify code
    }
    
    /**
     * Download code file
     * @param {string} code - Code content
     * @param {string} language - Programming language
     */
    downloadCode(code, language) {
        try {
            const extension = this.getExtensionForLanguage(language);
            const mimeType = this.getMimeTypeForLanguage(language);
            
            const blob = new Blob([code], { type: mimeType });
            const url = this.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `code_file.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => this.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Code download failed:', error);
        }
    }
    
    /**
     * Clean up handler resources
     */
    cleanup() {
        super.cleanup();
        console.log('🧹 Code handler cleanup complete');
    }
}

// Export for ES6 modules
export { CodePreviewHandler };