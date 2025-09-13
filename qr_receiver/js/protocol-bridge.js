/**
 * @fileoverview Protocol Bridge - Multi-Format QR Data Parser
 * 
 * ROOT CAUSE SOLUTION: Eliminates protocol incompatibility by supporting
 * multiple QR code formats from different generators. Enables seamless
 * interoperability between transfer generator and receiver systems.
 * 
 * Supports:
 * - Generator format (compact field names, hex data, session-based)
 * - Standard qrfile/v1 format (base64 data, full field names)
 * - Legacy simple format (colon-separated values)
 */

/**
 * @interface QRProtocolData
 * @description Normalized QR protocol data structure
 * @typedef {Object} QRProtocolData
 * @property {'header'|'chunk'|'metadata'} type - Data type
 * @property {number} index - Chunk index (0-based)
 * @property {number} totalChunks - Total number of chunks
 * @property {Uint8Array} data - Raw chunk data
 * @property {string} filename - Original filename
 * @property {number} fileSize - Total file size
 * @property {string} sessionId - Session identifier
 * @property {string} checksum - Data integrity checksum
 * @property {string} protocol - Detected protocol version
 * @property {Object} metadata - Additional metadata
 */

/**
 * Protocol Bridge for Multi-Format QR Data Parsing
 * Handles compatibility between different QR transfer protocols
 * 
 * @class ProtocolBridge
 */
class ProtocolBridge {
    constructor() {
        /** @type {Map<string, Function>} Protocol parsers registry */
        this.parsers = new Map();
        
        /** @type {Map<string, Object>} Active sessions tracking */
        this.sessions = new Map();
        
        // Register built-in protocol parsers
        this.registerDefaultParsers();
        
        console.log('🌉 Protocol Bridge initialized - supporting multiple QR formats');
    }
    
    /**
     * Register default protocol parsers
     */
    registerDefaultParsers() {
        // Generator format parser (compact, hex data, session-based)
        this.registerParser('generator', this.parseGeneratorFormat.bind(this));
        
        // Standard qrfile format parser (base64 data, full field names)
        this.registerParser('qrfile', this.parseQRFileFormat.bind(this));
        
        // Legacy simple format parser (colon-separated)
        this.registerParser('simple', this.parseSimpleFormat.bind(this));
    }
    
    /**
     * Register a custom protocol parser
     * 
     * @param {string} name - Parser name
     * @param {Function} parser - Parser function
     */
    registerParser(name, parser) {
        this.parsers.set(name, parser);
        console.log(`🔧 Registered protocol parser: ${name}`);
    }
    
    /**
     * Parse QR code data with automatic format detection
     * ROOT CAUSE FIX: Supports advanced VQR2JSON/VQR2B64 verification formats
     * 
     * @param {string} qrString - Raw QR code string
     * @returns {QRProtocolData} Normalized protocol data
     */
    parseQRData(qrString) {
        try {
            // ROOT CAUSE FIX: Handle advanced verification formats first
            if (qrString.startsWith('VQR2JSON:')) {
                return this.parseAdvancedVerificationJSON(qrString);
            } else if (qrString.startsWith('VQR2B64:')) {
                return this.parseAdvancedVerificationB64(qrString);
            } else if (qrString.startsWith('QRVFILE_')) {
                return this.parseCompletionSignal(qrString);
            } else if (qrString.startsWith('FILE:')) {
                return this.parseFileChunk(qrString);
            }
            
            // Attempt JSON parsing for structured data
            let data;
            try {
                data = JSON.parse(qrString);
            } catch (e) {
                // Not JSON - try simple format
                return this.parseSimpleFormat(qrString);
            }
            
            // Detect format based on field signatures
            const format = this.detectFormat(data);
            const parser = this.parsers.get(format);
            
            if (!parser) {
                throw new Error(`Unsupported QR format: ${format}`);
            }
            
            const parsed = parser(data, qrString);
            
            // Update session tracking
            if (parsed.sessionId) {
                this.updateSession(parsed.sessionId, parsed);
            }
            
            console.log(`📱 Parsed QR data: ${format} format, chunk ${parsed.index}/${parsed.totalChunks}`);
            
            return parsed;
            
        } catch (error) {
            console.error('❌ QR parsing failed:', error);
            throw new Error(`Invalid QR data: ${error.message}`);
        }
    }
    
    /**
     * Detect QR data format based on field signatures
     * 
     * @param {Object} data - Parsed JSON data
     * @returns {string} Detected format name
     */
    detectFormat(data) {
        // Generator format detection (compact field names)
        if ('i' in data && 'd' in data && 's' in data) {
            return 'generator';
        }
        
        // Standard qrfile format detection
        if ('fmt' in data && data.fmt.startsWith('qrfile/')) {
            return 'qrfile';
        }
        
        // Legacy format with standard field names
        if ('index' in data && 'data_b64' in data) {
            return 'qrfile';
        }
        
        // Default to qrfile format
        return 'qrfile';
    }
    
    /**
     * Parse generator format (compact field names, hex data, session-based)
     * 
     * @param {Object} data - JSON data object
     * @param {string} original - Original QR string
     * @returns {QRProtocolData} Normalized data
     */
    parseGeneratorFormat(data, original) {
        const isMetadataChunk = data.i === 0 && data.m;
        
        // Convert hex data to bytes
        const hexData = data.d || '';
        const chunkData = this.hexToUint8Array(hexData);
        
        // Extract metadata from chunk 0 or session
        let metadata = {};
        if (isMetadataChunk && data.m) {
            metadata = data.m;
        } else {
            // Try to get metadata from active session
            const session = this.sessions.get(data.s);
            metadata = session?.metadata || {};
        }
        
        return {
            type: isMetadataChunk ? 'header' : 'chunk',
            index: data.i || 0,
            totalChunks: data.t || 1,
            data: chunkData,
            filename: metadata.file_info?.name || metadata.filename || 'unknown.bin',
            fileSize: metadata.file_info?.original_size || metadata.file_size || chunkData.length,
            sessionId: data.s || null,
            checksum: data.c || null,
            protocol: 'generator/v1',
            metadata: {
                ...metadata,
                compressionInfo: metadata.compression_info,
                encryptionInfo: metadata.encryption_info,
                subChunkIndex: data.sci
            }
        };
    }
    
    /**
     * Parse standard qrfile format (base64 data, full field names)
     * 
     * @param {Object} data - JSON data object
     * @param {string} original - Original QR string
     * @returns {QRProtocolData} Normalized data
     */
    parseQRFileFormat(data, original) {
        // Decode base64 data
        const base64Data = data.data_b64 || data.data || '';
        const chunkData = this.base64ToUint8Array(base64Data);
        
        return {
            type: data.index === 0 ? 'header' : 'chunk',
            index: data.index || 0,
            totalChunks: data.total || 1,
            data: chunkData,
            filename: data.name || data.filename || 'unknown.bin',
            fileSize: data.size || data.file_size || chunkData.length,
            sessionId: data.session_id || null,
            checksum: data.chunk_hash || data.chunk_sha256 || data.checksum || null,
            protocol: data.fmt || 'qrfile/v1',
            metadata: {
                fileHash: data.overall_sha256 || data.file_sha256,
                algorithm: data.algo || 'sha256',
                compression: data.compression_algorithm,
                compressionRatio: data.compression_ratio,
                encryption: data.encryption_enabled,
                reedSolomon: data.rs_enabled
            }
        };
    }
    
    /**
     * Parse legacy simple format (colon-separated)
     * Format: F:filename:I:index:T:total:D:base64_data
     * 
     * @param {string} qrString - Raw QR string
     * @returns {QRProtocolData} Normalized data
     */
    parseSimpleFormat(qrString) {
        const parts = qrString.split(':');
        
        if (parts.length < 8 || parts[0] !== 'F') {
            throw new Error('Invalid simple format');
        }
        
        const filename = parts[1];
        const index = parseInt(parts[3]) || 0;
        const total = parseInt(parts[5]) || 1;
        const base64Data = parts[7] || '';
        
        const chunkData = this.base64ToUint8Array(base64Data);
        
        return {
            type: index === 0 ? 'header' : 'chunk',
            index: index,
            totalChunks: total,
            data: chunkData,
            filename: filename || 'unknown.bin',
            fileSize: chunkData.length * total, // Rough estimate
            sessionId: null,
            checksum: null,
            protocol: 'simple/v1',
            metadata: {}
        };
    }
    
    /**
     * Parse advanced VQR2JSON verification format
     * ROOT CAUSE FIX: Handles sophisticated verification QRs from qr_transfer
     * 
     * @param {string} qrString - VQR2JSON: prefixed string
     * @returns {QRProtocolData} Normalized verification data
     */
    parseAdvancedVerificationJSON(qrString) {
        try {
            // Remove VQR2JSON: prefix and parse JSON
            const jsonData = qrString.substring(9);
            const payload = JSON.parse(jsonData);
            
            console.log('🔐 Parsed VQR2JSON verification:', payload);
            
            return {
                type: 'verification',
                index: -1, // Verification QRs don't have chunk indices
                totalChunks: payload.c || payload.total_chunks || 0,
                data: new Uint8Array(0), // No chunk data in verification
                filename: payload.n || payload.filename || 'verified_file',
                fileSize: payload.s || payload.file_size || 0,
                sessionId: payload.sid || payload.session_id || null,
                checksum: payload.h || payload.file_hash || null,
                protocol: 'VQR2JSON/v1',
                metadata: {
                    fileHashSHA256: payload.h || payload.file_hash,
                    chunkSize: payload.cs || payload.chunk_size,
                    chunkHashes: payload.ch || payload.chunk_hashes || [],
                    transferTimestamp: payload.ts || payload.transfer_timestamp,
                    compressionUsed: payload.comp || payload.compression_used,
                    compressionRatio: payload.cr || payload.compression_ratio,
                    verificationType: payload.vt || payload.verification_type,
                    verificationTimestamp: payload.vts || payload.verification_timestamp,
                    errorCorrectionLevel: payload.ec || payload.error_correction,
                    dataClassification: payload.dc || payload.data_classification,
                    optimizationFeatures: payload.opt || payload.optimization_features,
                    transferStatistics: payload.stats || payload.transfer_statistics
                }
            };
        } catch (error) {
            console.error('❌ Failed to parse VQR2JSON verification:', error);
            throw new Error(`Invalid VQR2JSON format: ${error.message}`);
        }
    }
    
    /**
     * Parse advanced VQR2B64 verification format  
     * ROOT CAUSE FIX: Handles base64-encoded verification QRs from qr_transfer
     * 
     * @param {string} qrString - VQR2B64: prefixed string
     * @returns {QRProtocolData} Normalized verification data
     */
    parseAdvancedVerificationB64(qrString) {
        try {
            // Remove VQR2B64: prefix and decode base64
            const b64Data = qrString.substring(8);
            const jsonData = atob(b64Data); // Decode base64
            const payload = JSON.parse(jsonData);
            
            console.log('🔐 Parsed VQR2B64 verification:', payload);
            
            return {
                type: 'verification',
                index: -1,
                totalChunks: payload.c || payload.total_chunks || 0,
                data: new Uint8Array(0),
                filename: payload.n || payload.filename || 'verified_file',
                fileSize: payload.s || payload.file_size || 0,
                sessionId: payload.sid || payload.session_id || null,
                checksum: payload.h || payload.file_hash || null,
                protocol: 'VQR2B64/v1',
                metadata: {
                    fileHashSHA256: payload.h || payload.file_hash,
                    chunkSize: payload.cs || payload.chunk_size,
                    chunkHashes: payload.ch || payload.chunk_hashes || [],
                    transferTimestamp: payload.ts || payload.transfer_timestamp,
                    compressionUsed: payload.comp || payload.compression_used,
                    compressionRatio: payload.cr || payload.compression_ratio,
                    verificationType: payload.vt || payload.verification_type,
                    verificationTimestamp: payload.vts || payload.verification_timestamp,
                    errorCorrectionLevel: payload.ec || payload.error_correction,
                    dataClassification: payload.dc || payload.data_classification,
                    optimizationFeatures: payload.opt || payload.optimization_features,
                    transferStatistics: payload.stats || payload.transfer_statistics
                }
            };
        } catch (error) {
            console.error('❌ Failed to parse VQR2B64 verification:', error);
            throw new Error(`Invalid VQR2B64 format: ${error.message}`);
        }
    }
    
    /**
     * Parse completion signal QRs
     * ROOT CAUSE FIX: Handles completion detection from qr_transfer
     * 
     * @param {string} qrString - QRVFILE_ prefixed completion signal
     * @returns {QRProtocolData} Normalized completion data
     */
    parseCompletionSignal(qrString) {
        console.log('✅ Received completion signal:', qrString);
        
        return {
            type: 'completion',
            index: -2, // Special index for completion signals
            totalChunks: 0,
            data: new Uint8Array(0),
            filename: '',
            fileSize: 0,
            sessionId: null,
            checksum: null,
            protocol: 'QRVFILE/completion',
            metadata: {
                completionSignal: qrString,
                isTransferComplete: qrString.includes('COMPLETE') || qrString.includes('END')
            }
        };
    }
    
    /**
     * Parse FILE: format chunk data
     * ROOT CAUSE FIX: Handles the simplified file chunk format
     * 
     * @param {string} qrString - FILE: prefixed chunk data
     * @returns {QRProtocolData} Normalized chunk data
     */
    parseFileChunk(qrString) {
        try {
            // Format: FILE:index:total:session_id:base64_data
            const parts = qrString.split(':');
            
            if (parts.length < 5 || parts[0] !== 'FILE') {
                throw new Error('Invalid FILE: format');
            }
            
            const index = parseInt(parts[1]) - 1; // Convert to 0-based indexing
            const total = parseInt(parts[2]);
            const sessionId = parts[3];
            const base64Data = parts[4];
            
            const chunkData = this.base64ToUint8Array(base64Data);
            
            console.log(`📦 Parsed FILE chunk ${index + 1}/${total} (${chunkData.length} bytes)`);
            
            return {
                type: index === 0 ? 'header' : 'chunk',
                index: index,
                totalChunks: total,
                data: chunkData,
                filename: `transfer_${sessionId}`,
                fileSize: 0, // Unknown until verification
                sessionId: sessionId,
                checksum: null,
                protocol: 'FILE/v1',
                metadata: {
                    chunkSize: chunkData.length
                }
            };
        } catch (error) {
            console.error('❌ Failed to parse FILE chunk:', error);
            throw new Error(`Invalid FILE format: ${error.message}`);
        }
    }
    
    /**
     * Convert hex string to Uint8Array
     * 
     * @param {string} hex - Hex string
     * @returns {Uint8Array} Byte array
     */
    hexToUint8Array(hex) {
        if (!hex || hex.length % 2 !== 0) {
            return new Uint8Array(0);
        }
        
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        
        return bytes;
    }
    
    /**
     * Convert base64 string to Uint8Array
     * 
     * @param {string} base64 - Base64 string
     * @returns {Uint8Array} Byte array
     */
    base64ToUint8Array(base64) {
        if (!base64) {
            return new Uint8Array(0);
        }
        
        try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            return bytes;
        } catch (error) {
            console.warn('Base64 decode failed:', error);
            return new Uint8Array(0);
        }
    }
    
    /**
     * Update session tracking
     * 
     * @param {string} sessionId - Session ID
     * @param {QRProtocolData} data - Parsed data
     */
    updateSession(sessionId, data) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                id: sessionId,
                created: Date.now(),
                totalChunks: data.totalChunks,
                filename: data.filename,
                fileSize: data.fileSize,
                protocol: data.protocol,
                metadata: data.metadata,
                receivedChunks: new Set()
            });
        }
        
        const session = this.sessions.get(sessionId);
        session.receivedChunks.add(data.index);
        session.lastUpdate = Date.now();
        
        // Update metadata if this chunk has more complete info
        if (data.type === 'header' || Object.keys(data.metadata).length > 0) {
            session.metadata = { ...session.metadata, ...data.metadata };
            session.filename = data.filename || session.filename;
            session.fileSize = data.fileSize || session.fileSize;
        }
    }
    
    /**
     * Get session information
     * 
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Session data
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    
    /**
     * Get all active sessions
     * 
     * @returns {Object[]} Array of session objects
     */
    getActiveSessions() {
        return Array.from(this.sessions.values());
    }
    
    /**
     * Clear old sessions (cleanup)
     * 
     * @param {number} maxAge - Maximum age in milliseconds
     */
    clearOldSessions(maxAge = 30 * 60 * 1000) { // 30 minutes default
        const now = Date.now();
        const toDelete = [];
        
        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastUpdate > maxAge) {
                toDelete.push(sessionId);
            }
        }
        
        for (const sessionId of toDelete) {
            this.sessions.delete(sessionId);
        }
        
        if (toDelete.length > 0) {
            console.log(`🧹 Cleared ${toDelete.length} old sessions`);
        }
    }
}

// Export for ES6 modules
export { ProtocolBridge };