/**
 * Advanced Data Processor for QR Transfer
 * Handles decompression, decryption, and Reed-Solomon error correction
 */
class DataProcessor {
    constructor() {
        this.supportedFormats = {
            compression: ['zstd', 'brotli', 'gzip', 'deflate', 'lz4'], // zstd is PRIMARY (generator default)
            encryption: ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305'],
            errorCorrection: ['rs-255-223', 'rs-255-239'] // Reed-Solomon variants
        };

        this.cryptoSubtle = null;
        this.initializeCrypto();
    }
    
    async initializeCrypto() {
        try {
            if (window.crypto && window.crypto.subtle) {
                this.cryptoSubtle = window.crypto.subtle;
                console.log('✅ Web Crypto API available');
            } else {
                console.warn('⚠️ Web Crypto API not available');
            }
        } catch (error) {
            console.error('Failed to initialize crypto:', error);
        }
    }
    
    /**
     * Process received file data with decompression, decryption, and error correction
     */
    async processFileData(data, metadata = {}) {
        try {
            let processedData = new Uint8Array(data);
            const steps = [];
            
            // Step 1: Reed-Solomon Error Correction
            if (metadata.errorCorrection) {
                console.log('🔧 Applying Reed-Solomon error correction...');
                processedData = await this.applyReedSolomonCorrection(processedData, metadata.errorCorrection);
                steps.push('Reed-Solomon correction');
            }
            
            // Step 2: Decryption
            if (metadata.encryption) {
                console.log('🔓 Decrypting data...');
                processedData = await this.decryptData(processedData, metadata.encryption);
                steps.push('Decryption');
            }
            
            // Step 3: Decompression
            if (metadata.compression) {
                console.log('📦 Decompressing data...');
                processedData = await this.decompressData(processedData, metadata.compression);
                steps.push('Decompression');
            }
            
            console.log(`✅ Data processing complete. Applied: ${steps.join(' → ')}`);
            
            return {
                data: processedData,
                originalSize: data.length,
                processedSize: processedData.length,
                steps: steps,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('Data processing failed:', error);
            throw new Error(`Data processing failed: ${error.message}`);
        }
    }
    
    /**
     * Reed-Solomon Error Correction
     */
    async applyReedSolomonCorrection(data, params) {
        const { algorithm, totalSymbols, dataSymbols } = this.parseReedSolomonParams(params);
        
        if (algorithm === 'rs-255-223') {
            // Standard Reed-Solomon (255, 223) - 32 parity symbols
            return await this.reedSolomon255_223(data);
        } else if (algorithm === 'rs-255-239') {
            // Reed-Solomon (255, 239) - 16 parity symbols
            return await this.reedSolomon255_239(data);
        } else {
            console.warn('Unknown Reed-Solomon algorithm:', algorithm);
            return data; // Return original data if algorithm not supported
        }
    }
    
    parseReedSolomonParams(params) {
        if (typeof params === 'string') {
            const parts = params.split('-');
            return {
                algorithm: params,
                totalSymbols: parseInt(parts[1]) || 255,
                dataSymbols: parseInt(parts[2]) || 223
            };
        }
        return params;
    }
    
    async reedSolomon255_223(data) {
        // Implementation of Reed-Solomon (255, 223) decoder
        // This is a simplified version - in production, use a proper RS library
        
        const blockSize = 255;
        const dataSize = 223;
        const paritySize = 32;
        
        const correctedData = [];
        
        for (let i = 0; i < data.length; i += blockSize) {
            const block = data.slice(i, i + blockSize);
            
            if (block.length === blockSize) {
                // Apply Reed-Solomon correction
                const correctedBlock = await this.correctRSBlock(block, dataSize, paritySize);
                // Only keep data symbols (first 223 bytes)
                correctedData.push(...correctedBlock.slice(0, dataSize));
            } else {
                // Last block might be smaller
                correctedData.push(...block);
            }
        }
        
        return new Uint8Array(correctedData);
    }
    
    async reedSolomon255_239(data) {
        // Implementation of Reed-Solomon (255, 239) decoder
        const blockSize = 255;
        const dataSize = 239;
        const paritySize = 16;
        
        const correctedData = [];
        
        for (let i = 0; i < data.length; i += blockSize) {
            const block = data.slice(i, i + blockSize);
            
            if (block.length === blockSize) {
                const correctedBlock = await this.correctRSBlock(block, dataSize, paritySize);
                correctedData.push(...correctedBlock.slice(0, dataSize));
            } else {
                correctedData.push(...block);
            }
        }
        
        return new Uint8Array(correctedData);
    }
    
    async correctRSBlock(block, dataSize, paritySize) {
        // Simplified Reed-Solomon error correction
        // In production, this would use proper Galois field arithmetic
        
        try {
            // Calculate syndrome
            const syndromes = this.calculateSyndromes(block, paritySize);
            
            // Check if errors exist
            const hasErrors = syndromes.some(s => s !== 0);
            
            if (!hasErrors) {
                return block; // No errors detected
            }
            
            // Locate and correct errors (simplified)
            const correctedBlock = this.correctErrors(block, syndromes, dataSize);
            
            return correctedBlock;
            
        } catch (error) {
            console.warn('Reed-Solomon correction failed for block, using original:', error);
            return block;
        }
    }
    
    calculateSyndromes(block, paritySize) {
        // Simplified syndrome calculation
        const syndromes = [];
        
        for (let i = 0; i < paritySize; i++) {
            let syndrome = 0;
            for (let j = 0; j < block.length; j++) {
                syndrome ^= this.galoisMultiply(block[j], this.galoisPower(2, i * j));
            }
            syndromes.push(syndrome);
        }
        
        return syndromes;
    }
    
    correctErrors(block, syndromes, dataSize) {
        // Simplified error correction - in practice would use Berlekamp-Massey algorithm
        const corrected = new Uint8Array(block);
        
        // Simple single-error correction attempt
        for (let pos = 0; pos < dataSize; pos++) {
            for (let val = 0; val < 256; val++) {
                if (val === block[pos]) continue;
                
                const testBlock = new Uint8Array(block);
                testBlock[pos] = val;
                
                const testSyndromes = this.calculateSyndromes(testBlock, syndromes.length);
                if (testSyndromes.every(s => s === 0)) {
                    corrected[pos] = val;
                    console.log(`🔧 Corrected error at position ${pos}: ${block[pos]} → ${val}`);
                    return corrected;
                }
            }
        }
        
        return corrected;
    }
    
    galoisMultiply(a, b) {
        // Simplified Galois field multiplication for GF(256)
        if (a === 0 || b === 0) return 0;
        
        const logTable = this.getGaloisLogTable();
        const expTable = this.getGaloisExpTable();
        
        const logA = logTable[a];
        const logB = logTable[b];
        
        return expTable[(logA + logB) % 255];
    }
    
    galoisPower(base, exp) {
        if (exp === 0) return 1;
        if (base === 0) return 0;
        
        let result = 1;
        for (let i = 0; i < exp; i++) {
            result = this.galoisMultiply(result, base);
        }
        
        return result;
    }
    
    getGaloisLogTable() {
        // Pre-computed logarithm table for GF(256)
        // In production, use proper tables
        if (!this._logTable) {
            this._logTable = new Array(256).fill(0).map((_, i) => i > 0 ? Math.log2(i) | 0 : 0);
        }
        return this._logTable;
    }
    
    getGaloisExpTable() {
        // Pre-computed exponential table for GF(256)
        if (!this._expTable) {
            this._expTable = new Array(256).fill(0).map((_, i) => Math.pow(2, i) % 255);
        }
        return this._expTable;
    }
    
    /**
     * Data Decryption
     */
    async decryptData(encryptedData, encryptionParams) {
        if (!this.cryptoSubtle) {
            throw new Error('Web Crypto API not available for decryption');
        }
        
        const { algorithm, key, iv, additionalData } = this.parseEncryptionParams(encryptionParams);
        
        switch (algorithm) {
            case 'aes-256-gcm':
                return await this.decryptAESGCM(encryptedData, key, iv, additionalData);
            case 'aes-256-cbc':
                return await this.decryptAESCBC(encryptedData, key, iv);
            case 'chacha20-poly1305':
                return await this.decryptChaCha20Poly1305(encryptedData, key, iv);
            default:
                throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
        }
    }
    
    parseEncryptionParams(params) {
        if (typeof params === 'string') {
            return { algorithm: params };
        }
        
        return {
            algorithm: params.algorithm || 'aes-256-gcm',
            key: params.key,
            iv: params.iv || params.nonce,
            additionalData: params.additionalData || params.aad
        };
    }
    
    async decryptAESGCM(encryptedData, keyData, iv, additionalData) {
        try {
            // Import key
            const key = await this.cryptoSubtle.importKey(
                'raw',
                keyData,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            
            // Decrypt
            const decrypted = await this.cryptoSubtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    additionalData: additionalData
                },
                key,
                encryptedData
            );
            
            return new Uint8Array(decrypted);
            
        } catch (error) {
            throw new Error(`AES-GCM decryption failed: ${error.message}`);
        }
    }
    
    async decryptAESCBC(encryptedData, keyData, iv) {
        try {
            const key = await this.cryptoSubtle.importKey(
                'raw',
                keyData,
                { name: 'AES-CBC' },
                false,
                ['decrypt']
            );
            
            const decrypted = await this.cryptoSubtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: iv
                },
                key,
                encryptedData
            );
            
            return new Uint8Array(decrypted);
            
        } catch (error) {
            throw new Error(`AES-CBC decryption failed: ${error.message}`);
        }
    }
    
    async decryptChaCha20Poly1305(encryptedData, keyData, nonce) {
        // ChaCha20-Poly1305 is not widely supported in Web Crypto API
        // This would require a JavaScript implementation
        throw new Error('ChaCha20-Poly1305 decryption not implemented');
    }
    
    /**
     * Data Decompression
     */
    async decompressData(compressedData, compressionParams) {
        const { algorithm, level } = this.parseCompressionParams(compressionParams);

        switch (algorithm) {
            case 'zstd':
                return await this.decompressZstd(compressedData);
            case 'brotli':
                return await this.decompressBrotli(compressedData);
            case 'gzip':
                return await this.decompressGzip(compressedData);
            case 'deflate':
                return await this.decompressDeflate(compressedData);
            case 'lz4':
                return await this.decompressLZ4(compressedData);
            default:
                throw new Error(`Unsupported compression algorithm: ${algorithm}`);
        }
    }
    
    parseCompressionParams(params) {
        if (typeof params === 'string') {
            return { algorithm: params };
        }

        return {
            algorithm: params.algorithm || 'zstd', // Default to zstd to match generator
            level: params.level || 22 // Default to zstd level 22
        };
    }

    /**
     * Zstd Decompression (PRIMARY - matches generator default)
     *
     * IMPORTANT: Requires fzstd library for air-gapped deployment
     * Bundle: qr_receiver/lib/fzstd.js (from https://www.npmjs.com/package/fzstd)
     *
     * For air-gapped deployment:
     * 1. Download fzstd library locally: npm install fzstd && cp node_modules/fzstd/lib/index.js qr_receiver/lib/fzstd.js
     * 2. Include in qr-scanner.html: <script src="lib/fzstd.js"></script>
     */
    async decompressZstd(data) {
        try {
            // Check for fzstd library (should be bundled locally for air-gap)
            if (typeof fzstd === 'undefined' && typeof window.fzstd === 'undefined') {
                throw new Error('fzstd library not available. Required for Zstd decompression in air-gapped environment.');
            }

            const fzstdLib = window.fzstd || fzstd;

            // Decompress using fzstd
            const decompressed = fzstdLib.decompress(data);

            return new Uint8Array(decompressed);

        } catch (error) {
            throw new Error(`Zstd decompression failed: ${error.message}`);
        }
    }

    async decompressGzip(data) {
        try {
            // Use native DecompressionStream if available
            if (window.DecompressionStream) {
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(data);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: streamDone } = await reader.read();
                    done = streamDone;
                    if (value) {
                        chunks.push(value);
                    }
                }
                
                // Concatenate chunks
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return result;
            } else {
                // Fallback to pako library if available
                if (window.pako) {
                    return pako.ungzip(data);
                } else {
                    throw new Error('No gzip decompression available');
                }
            }
        } catch (error) {
            throw new Error(`Gzip decompression failed: ${error.message}`);
        }
    }
    
    async decompressDeflate(data) {
        try {
            if (window.DecompressionStream) {
                const stream = new DecompressionStream('deflate');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(data);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: streamDone } = await reader.read();
                    done = streamDone;
                    if (value) chunks.push(value);
                }
                
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return result;
            } else if (window.pako) {
                return pako.inflateRaw(data);
            } else {
                throw new Error('No deflate decompression available');
            }
        } catch (error) {
            throw new Error(`Deflate decompression failed: ${error.message}`);
        }
    }
    
    async decompressBrotli(data) {
        try {
            if (window.DecompressionStream) {
                const stream = new DecompressionStream('br');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(data);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: streamDone } = await reader.read();
                    done = streamDone;
                    if (value) chunks.push(value);
                }
                
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return result;
            } else {
                throw new Error('Brotli decompression not available');
            }
        } catch (error) {
            throw new Error(`Brotli decompression failed: ${error.message}`);
        }
    }
    
    async decompressLZ4(data) {
        // LZ4 would require a JavaScript implementation
        throw new Error('LZ4 decompression not implemented');
    }
    
    /**
     * Utility Methods
     */
    detectDataFormat(data) {
        const header = data.slice(0, 16);
        const format = {
            compression: null,
            encryption: null,
            errorCorrection: null
        };
        
        // Detect compression by magic bytes
        if (header[0] === 0x1F && header[1] === 0x8B) {
            format.compression = 'gzip';
        } else if (header[0] === 0x78 && (header[1] === 0x9C || header[1] === 0xDA)) {
            format.compression = 'deflate';
        }
        
        // Detect encryption (would need specific markers)
        // This is simplified - real implementation would use proper headers
        
        return format;
    }
    
    validateIntegrity(data, expectedHash, algorithm = 'SHA-256') {
        return new Promise(async (resolve) => {
            try {
                if (!this.cryptoSubtle) {
                    resolve(false);
                    return;
                }
                
                const hashBuffer = await this.cryptoSubtle.digest(algorithm, data);
                const hashArray = new Uint8Array(hashBuffer);
                const hashHex = Array.from(hashArray)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                
                resolve(hashHex === expectedHash);
            } catch (error) {
                console.error('Integrity validation failed:', error);
                resolve(false);
            }
        });
    }
    
    getSupportedFormats() {
        return { ...this.supportedFormats };
    }
}

// Export for ES6 modules
export { DataProcessor };