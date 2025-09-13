/**
 * IndexedDB Storage Manager for Large File Transfers
 * Handles persistent storage for QR transfer chunks and metadata
 */
class PersistentStorageManager {
    constructor() {
        this.dbName = 'QRTransferStorage';
        this.version = 2;
        this.db = null;
        this.maxMemorySize = window.AppConfig?.get('storage.maxMemorySize') || 50 * 1024 * 1024; // 50MB threshold
    }
    
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('transfers')) {
                    const transferStore = db.createObjectStore('transfers', { keyPath: 'id' });
                    transferStore.createIndex('timestamp', 'timestamp', { unique: false });
                    transferStore.createIndex('status', 'status', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunkStore = db.createObjectStore('chunks', { keyPath: ['transferId', 'index'] });
                    chunkStore.createIndex('transferId', 'transferId', { unique: false });
                    chunkStore.createIndex('size', 'size', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                console.log('🔄 IndexedDB schema updated');
            };
        });
    }
    
    async storeTransfer(transferData) {
        const transaction = this.db.transaction(['transfers'], 'readwrite');
        const store = transaction.objectStore('transfers');
        
        const transferRecord = {
            id: transferData.id || this.generateId(),
            filename: transferData.filename,
            totalChunks: transferData.totalChunks,
            fileSize: transferData.fileSize,
            protocol: transferData.protocol,
            status: 'active',
            timestamp: Date.now(),
            fileHash: transferData.fileHash,
            metadata: transferData.metadata || {}
        };
        
        await this.promisifyRequest(store.put(transferRecord));
        return transferRecord.id;
    }
    
    async storeChunk(transferId, chunkIndex, chunkData, metadata = {}) {
        const transaction = this.db.transaction(['chunks'], 'readwrite');
        const store = transaction.objectStore('chunks');
        
        const chunkRecord = {
            transferId,
            index: chunkIndex,
            data: chunkData,
            size: chunkData.length,
            timestamp: Date.now(),
            verified: metadata.verified || false,
            hash: metadata.hash || null
        };
        
        await this.promisifyRequest(store.put(chunkRecord));
        await this.updateTransferProgress(transferId);
    }
    
    async getAllChunks(transferId) {
        const transaction = this.db.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');
        const index = store.index('transferId');
        
        const chunks = [];
        const request = index.openCursor(IDBKeyRange.only(transferId));
        
        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    chunks.push(cursor.value);
                    cursor.continue();
                } else {
                    chunks.sort((a, b) => a.index - b.index);
                    resolve(chunks);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async assembleFile(transferId) {
        const chunks = await this.getAllChunks(transferId);
        const transfer = await this.getTransfer(transferId);
        
        if (!transfer) {
            throw new Error('Transfer not found');
        }
        
        if (chunks.length !== transfer.totalChunks) {
            const missingChunks = [];
            for (let i = 0; i < transfer.totalChunks; i++) {
                if (!chunks.find(c => c.index === i)) {
                    missingChunks.push(i);
                }
            }
            throw new Error(`Missing chunks: ${missingChunks.join(', ')}`);
        }
        
        // Calculate total size and assemble
        let totalSize = 0;
        for (const chunk of chunks) {
            totalSize += chunk.data.length;
        }
        
        const assembledData = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const chunk of chunks) {
            assembledData.set(chunk.data, offset);
            offset += chunk.data.length;
        }
        
        await this.updateTransferStatus(transferId, 'completed');
        
        return {
            data: assembledData,
            filename: transfer.filename,
            size: totalSize,
            transferId
        };
    }
    
    async getTransfer(transferId) {
        const transaction = this.db.transaction(['transfers'], 'readonly');
        const store = transaction.objectStore('transfers');
        return await this.promisifyRequest(store.get(transferId));
    }
    
    async updateTransferProgress(transferId) {
        const chunks = await this.getAllChunks(transferId);
        const transfer = await this.getTransfer(transferId);
        
        if (transfer) {
            const progress = transfer.totalChunks > 0 ? chunks.length / transfer.totalChunks : 0;
            
            const transaction = this.db.transaction(['transfers'], 'readwrite');
            const store = transaction.objectStore('transfers');
            
            transfer.progress = progress;
            transfer.receivedChunks = chunks.length;
            transfer.lastUpdated = Date.now();
            
            await this.promisifyRequest(store.put(transfer));
        }
    }
    
    async updateTransferStatus(transferId, status) {
        const transaction = this.db.transaction(['transfers'], 'readwrite');
        const store = transaction.objectStore('transfers');
        
        const transfer = await this.promisifyRequest(store.get(transferId));
        if (transfer) {
            transfer.status = status;
            transfer.lastUpdated = Date.now();
            await this.promisifyRequest(store.put(transfer));
        }
    }
    
    async cleanupOldTransfers(maxAge = window.AppConfig?.get('storage.cleanupMaxAge') || 7 * 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAge;
        
        const transaction = this.db.transaction(['transfers', 'chunks'], 'readwrite');
        const transferStore = transaction.objectStore('transfers');
        const chunkStore = transaction.objectStore('chunks');
        
        const transfers = await this.promisifyRequest(transferStore.getAll());
        const oldTransfers = transfers.filter(t => t.timestamp < cutoff && t.status === 'completed');
        
        for (const transfer of oldTransfers) {
            await this.promisifyRequest(transferStore.delete(transfer.id));
            
            // Delete associated chunks
            const chunkIndex = chunkStore.index('transferId');
            const chunkRequest = chunkIndex.openCursor(IDBKeyRange.only(transfer.id));
            
            await new Promise((resolve) => {
                chunkRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
            });
        }
        
        console.log(`🧹 Cleaned up ${oldTransfers.length} old transfers`);
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Export for ES6 modules
export { PersistentStorageManager };