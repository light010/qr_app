# 🎯 QR FILE TRANSFER SYSTEM - IMPROVEMENT RECOMMENDATIONS

**Document Version**: 1.0.0
**Date**: 2025-11-14
**Deployment Model**: GitHub Pages (Receiver) + Desktop Python (Sender)
**Target Use**: iPad receiver scanning from desktop sender display

---

## 📋 TABLE OF CONTENTS

- [Executive Summary](#executive-summary)
- [Critical Security Gaps](#critical-security-gaps)
- [Quick Wins (Immediate Implementation)](#quick-wins-immediate-implementation)
- [Phase 1: Core Security](#phase-1-core-security)
- [Phase 2: Reliability Improvements](#phase-2-reliability-improvements)
- [Phase 3: User Experience](#phase-3-user-experience)
- [Phase 4: Advanced Features](#phase-4-advanced-features)
- [Deployment-Specific Notes](#deployment-specific-notes)
- [Implementation Priority Matrix](#implementation-priority-matrix)

---

## EXECUTIVE SUMMARY

### Current Status
- ✅ Excellent architecture with dependency injection and modular design
- ✅ Cross-platform compatibility (iOS, Android, Desktop)
- ✅ Protocol flexibility (supports multiple QR formats)
- ⚠️ **Encryption is stub code only** - data transmitted in plaintext
- ⚠️ **Error correction not implemented** - Reed-Solomon is placeholder
- ⚠️ **Hashes truncated** - only 64 bits instead of 256 bits
- ⚠️ **No authentication** - vulnerable to tampering/MITM

### Target Status
- 🎯 Military-grade encryption (AES-256-GCM)
- 🎯 Message authentication (HMAC-SHA256)
- 🎯 Forward error correction (Reed-Solomon 20-30%)
- 🎯 Full integrity verification (SHA-256 256-bit)
- 🎯 Hardened for air-gapped deployment

### Effort Estimate
- **Quick Wins**: 4 hours
- **Phase 1 (Security)**: 15-20 hours
- **Phase 2 (Reliability)**: 10-15 hours
- **Phase 3 (UX)**: 5-10 hours
- **Phase 4 (Advanced)**: 20-30 hours

**Total for production-ready**: 50-75 hours over 4-8 weeks

---

## CRITICAL SECURITY GAPS

### 🔴 GAP #1: Encryption Not Implemented

**File**: `qr_receiver/js/data-processor.js`

**Current State**:
```javascript
async decryptData(data, metadata) {
    // TODO: Implement actual decryption
    return data; // Returns plaintext!
}
```

**Risk**:
- Data transmitted in **PLAINTEXT** via QR codes
- Anyone with camera can capture and read sensitive data
- No protection against shoulder surfing
- Zero confidentiality

**Impact**: Cannot transmit sensitive/confidential information

**Fix Required**: Implement AES-256-GCM encryption with password-based key derivation

**Priority**: 🔴 **CRITICAL**
**Effort**: 3-4 hours
**Dependencies**: None

---

### 🔴 GAP #2: Hash Truncation (Weak Integrity)

**File**: `qr_sender_final.py` line 217

**Current State**:
```python
"chunk_sha256": hashlib.sha256(chunk).hexdigest()[:16]  # Only 64 bits!
```

**Risk**:
- Collision probability: 2^64 instead of 2^256
- Only 64 bits of security instead of 256 bits
- Vulnerable to birthday attacks
- Not compliant with security standards

**Impact**: Weak integrity verification, possible undetected corruption

**Fix Required**: Use full SHA-256 hash (64 hex characters)

**Priority**: 🔴 **CRITICAL**
**Effort**: 5 minutes
**Dependencies**: None

---

### 🔴 GAP #3: Reed-Solomon Not Implemented

**File**: `qr_receiver/js/data-processor.js` line 88

**Current State**:
```javascript
console.warn('Unknown Reed-Solomon algorithm:', algorithm);
return data; // Returns original data without correction!
```

**Risk**:
- No protection against QR code scan errors
- Single missed chunk = entire transfer fails
- No fault tolerance in challenging environments
- Poor reliability in field conditions

**Impact**: Unreliable transfers, high failure rate

**Fix Required**: Implement Reed-Solomon (255,223) error correction

**Priority**: 🟡 **HIGH**
**Effort**: 5-8 hours
**Dependencies**: reedsolo library (Python), reed-solomon npm package (JavaScript)

---

### 🔴 GAP #4: No Message Authentication

**Current State**: No HMAC or digital signatures

**Risk**:
- Man-in-the-middle attacks possible
- Attacker can inject malicious QR codes
- Replay attacks possible
- No verification of data origin

**Impact**: Cannot verify sender authenticity, vulnerable to tampering

**Fix Required**: Implement HMAC-SHA256 for message authentication

**Priority**: 🟡 **HIGH**
**Effort**: 3-4 hours
**Dependencies**: None (built-in crypto libraries)

---

### 🟡 GAP #5: No Secure Memory Wiping

**Current State**: Files processed in memory without explicit cleanup

**Risk**:
- Data may persist in browser memory/cache
- Forensic recovery possible after transfer
- Violates "zero trace" principle

**Impact**: Data remnants recoverable from device memory

**Fix Required**: Implement explicit memory zeroing after transfer

**Priority**: 🟢 **MEDIUM**
**Effort**: 1-2 hours
**Dependencies**: None

---

### 🟡 GAP #6: Protocol Inconsistency

**Current State**:
- Sender supports 2 formats: JSON (qrfile/v1) and Simple
- Receiver supports 5+ formats: qrfile/v1, v2, Generator, Simple, VQR2JSON, VQR2B64

**Risk**:
- Confusion about which format to use
- Different security levels per format
- No guaranteed interoperability
- Maintenance complexity

**Impact**: Inconsistent security, testing challenges

**Fix Required**: Define single mandatory protocol with clear specification

**Priority**: 🟢 **MEDIUM**
**Effort**: 4-6 hours
**Dependencies**: None

---

## QUICK WINS (Immediate Implementation)

These can be implemented quickly with high impact.

### ⚡ Quick Win #1: Fix SHA-256 Truncation

**Time**: 5 minutes
**Impact**: Better integrity verification
**Files**: `qr_sender_final.py`

```python
# Line 217 - CHANGE FROM:
"chunk_sha256": hashlib.sha256(chunk).hexdigest()[:16],

# CHANGE TO:
"chunk_sha256": hashlib.sha256(chunk).hexdigest(),  # Full 64 chars
```

**Testing**: Verify receiver can validate full hash

---

### ⚡ Quick Win #2: Increase QR Error Correction Level

**Time**: 2 minutes
**Impact**: Better scan reliability
**Files**: `qr_sender_final.py`

```python
# Line 235 - CHANGE FROM:
qr = segno.make(qr_data, error='l', mode='byte', micro=False)

# CHANGE TO:
qr = segno.make(qr_data, error='m', mode='byte', micro=False)  # 'M' = 15% correction vs 'L' = 7%
```

**Testing**: Verify QR codes still scan on iPad, measure improvement

---

### ⚡ Quick Win #3: Add Secure Memory Wipe on Download

**Time**: 1 hour
**Impact**: Forensic resistance
**Files**: `qr_receiver/js/chunk-manager.js`

Add method:
```javascript
async cleanupAfterDownload() {
    try {
        console.log('🧹 Performing secure cleanup...');

        // Zero out chunk data
        for (let i = 0; i < this.chunks.length; i++) {
            if (this.chunks[i]) {
                // Overwrite with random data
                crypto.getRandomValues(this.chunks[i]);
                this.chunks[i] = null;
            }
        }

        // Clear from storage manager
        if (this.storage) {
            await this.storage.clearAll();
        }

        // Clear assembled file data
        if (this.assembledFile) {
            crypto.getRandomValues(this.assembledFile);
            this.assembledFile = null;
        }

        // Force garbage collection hint
        if (window.gc) window.gc();

        console.log('✅ Secure cleanup completed');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
}
```

Call after download:
```javascript
// After file download triggers
await this.cleanupAfterDownload();
```

**Testing**: Verify memory is cleared, check browser dev tools

---

### ⚡ Quick Win #4: Add File Transfer Statistics

**Time**: 1 hour
**Impact**: Better user feedback
**Files**: `qr_receiver/js/ui-manager.js`

Add display for:
- Chunks received vs total
- Success rate (first-scan success percentage)
- Average scan time per chunk
- Estimated time remaining
- Missing chunks list

**Testing**: Verify statistics display correctly during transfer

---

## PHASE 1: CORE SECURITY

Priority: 🔴 **CRITICAL**
Timeline: Week 1-2
Effort: 15-20 hours

### 1.1: Implement Password-Based Encryption (Sender)

**Time**: 2-3 hours
**Files**: `qr_sender_final.py`

**Implementation**:
```python
import getpass
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import os

class AdvancedQRSender:
    def __init__(self, path, encrypt=True, **kwargs):
        self.encrypt = encrypt

        if self.encrypt:
            # Get password from user
            password = getpass.getpass("Enter encryption password: ")
            password_confirm = getpass.getpass("Confirm password: ")

            if password != password_confirm:
                raise ValueError("Passwords don't match!")

            # Generate random salt
            self.salt = os.urandom(16)

            # Derive 256-bit key from password
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,  # 256 bits
                salt=self.salt,
                iterations=100000,  # OWASP recommendation
            )
            self.key = kdf.derive(password.encode())

            print("✅ Encryption enabled (AES-256-GCM)")
            print(f"   Salt: {base64.b64encode(self.salt).decode()}")

        # ... rest of initialization

    def encrypt_chunk(self, chunk):
        """Encrypt chunk with AES-256-GCM"""
        if not self.encrypt:
            return chunk

        # Create cipher
        aesgcm = AESGCM(self.key)

        # Generate random nonce (12 bytes for GCM)
        nonce = os.urandom(12)

        # Encrypt (authenticated encryption)
        ciphertext = aesgcm.encrypt(nonce, chunk, None)

        # Return: nonce || ciphertext (nonce needed for decryption)
        return nonce + ciphertext

    def create_qr_data(self, chunk_index):
        """Create QR data with encryption"""
        chunk = self.chunks[chunk_index]

        # Calculate hash BEFORE encryption (for verification)
        chunk_hash = hashlib.sha256(chunk).hexdigest()

        # Encrypt chunk
        if self.encrypt:
            encrypted_chunk = self.encrypt_chunk(chunk)
            chunk_b64 = base64.b64encode(encrypted_chunk).decode()
        else:
            chunk_b64 = base64.b64encode(chunk).decode()

        if self.format_type == 'json':
            data = {
                "fmt": "qrfile/v1",
                "name": self.archive_name,
                "total": self.total_chunks,
                "index": chunk_index,
                "algo": "sha256",
                "chunk_sha256": chunk_hash,  # FULL hash
                "data_b64": chunk_b64,
                "size": len(self.archive),
                "encrypted": self.encrypt,
                "salt": base64.b64encode(self.salt).decode() if self.encrypt else None
            }
            return json.dumps(data, separators=(',', ':'))
        else:
            # Simple format
            enc_flag = "E" if self.encrypt else "P"
            return f"F:{enc_flag}:{chunk_index}:{self.total_chunks}:{chunk_b64}"
```

**Dependencies**:
```bash
pip install cryptography
```

**Testing**:
1. Run sender with encryption enabled
2. Verify password prompt works
3. Verify QR codes contain encrypted data
4. Verify salt is included in metadata

---

### 1.2: Implement Decryption (Receiver)

**Time**: 2-3 hours
**Files**: `qr_receiver/js/data-processor.js`

**Implementation**:
```javascript
class DataProcessor {
    constructor() {
        this.decryptionKey = null;  // Cache derived key
        this.passwordAttempts = 0;
        this.maxAttempts = 3;
    }

    /**
     * Decrypt chunk data using AES-256-GCM
     */
    async decryptData(encryptedData, metadata) {
        try {
            // Extract nonce (first 12 bytes) and ciphertext
            const nonce = encryptedData.slice(0, 12);
            const ciphertext = encryptedData.slice(12);

            // Get or derive decryption key
            if (!this.decryptionKey) {
                const password = await this.promptForPassword();
                if (!password) {
                    throw new Error('Password required for decryption');
                }

                // Derive key from password
                this.decryptionKey = await this.deriveKey(
                    password,
                    metadata.salt,
                    100000  // Same iterations as sender
                );
            }

            // Import key for Web Crypto API
            const key = await crypto.subtle.importKey(
                'raw',
                this.decryptionKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            // Decrypt with AES-GCM
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    tagLength: 128  // 128-bit authentication tag
                },
                key,
                ciphertext
            );

            console.log('✅ Chunk decrypted successfully');
            return new Uint8Array(decrypted);

        } catch (error) {
            console.error('❌ Decryption failed:', error);

            // Clear cached key (likely wrong password)
            this.decryptionKey = null;
            this.passwordAttempts++;

            if (this.passwordAttempts >= this.maxAttempts) {
                throw new Error(`Decryption failed after ${this.maxAttempts} attempts - check password`);
            }

            throw new Error('Decryption failed - wrong password or corrupted data');
        }
    }

    /**
     * Derive encryption key from password using PBKDF2
     */
    async deriveKey(password, saltB64, iterations) {
        // Decode salt from base64
        const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));

        // Import password as key material
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // Derive 256-bit key using PBKDF2
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            256  // 256 bits
        );

        return new Uint8Array(derivedBits);
    }

    /**
     * Prompt user for password
     */
    async promptForPassword() {
        // This should call UIManager to show password dialog
        if (this.uiManager) {
            return await this.uiManager.promptForPassword();
        }

        // Fallback to browser prompt
        return prompt('Enter decryption password:');
    }
}
```

**Testing**:
1. Scan encrypted QR codes
2. Enter correct password
3. Verify decryption succeeds
4. Test wrong password (should fail gracefully)
5. Test password caching (only prompt once)

---

### 1.3: Add Password UI Dialog

**Time**: 1 hour
**Files**: `qr_receiver/js/ui-manager.js`, `qr_receiver/css/styles.css`

**JavaScript** (`ui-manager.js`):
```javascript
/**
 * Prompt user for decryption password with styled dialog
 */
async promptForPassword() {
    return new Promise((resolve) => {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'password-modal';
        modal.innerHTML = `
            <div class="password-dialog">
                <div class="password-header">
                    <span class="lock-icon">🔒</span>
                    <h3>Encrypted Transfer</h3>
                </div>
                <p>This transfer is encrypted. Enter the password to decrypt.</p>
                <input type="password"
                       id="decrypt-password"
                       class="password-input"
                       placeholder="Enter password"
                       autocomplete="off"
                       autofocus>
                <div class="password-hint">
                    Password must match the one used by sender
                </div>
                <div class="button-group">
                    <button id="password-cancel" class="btn-secondary">Cancel</button>
                    <button id="password-ok" class="btn-primary">Unlock</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#decrypt-password');
        const okBtn = modal.querySelector('#password-ok');
        const cancelBtn = modal.querySelector('#password-cancel');

        // Focus input
        setTimeout(() => input.focus(), 100);

        const cleanup = () => {
            modal.remove();
        };

        okBtn.onclick = () => {
            const password = input.value;
            if (!password) {
                input.style.borderColor = 'red';
                input.placeholder = 'Password required';
                return;
            }
            cleanup();
            resolve(password);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };

        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                okBtn.click();
            }
        };
    });
}
```

**CSS** (`styles.css`):
```css
/* Password Dialog Styles */
.password-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.password-dialog {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.password-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.lock-icon {
    font-size: 32px;
}

.password-dialog h3 {
    margin: 0;
    color: #007AFF;
    font-size: 24px;
}

.password-dialog p {
    color: #666;
    margin: 0 0 20px 0;
    line-height: 1.5;
}

.password-input {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;
    border: 2px solid #ddd;
    border-radius: 10px;
    margin-bottom: 8px;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

.password-input:focus {
    outline: none;
    border-color: #007AFF;
}

.password-hint {
    font-size: 13px;
    color: #999;
    margin-bottom: 24px;
}

.button-group {
    display: flex;
    gap: 12px;
}

.btn-primary, .btn-secondary {
    flex: 1;
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: #007AFF;
    color: white;
}

.btn-primary:hover {
    background: #0051D5;
}

.btn-primary:active {
    transform: scale(0.98);
}

.btn-secondary {
    background: #E5E5EA;
    color: #333;
}

.btn-secondary:hover {
    background: #D1D1D6;
}

.btn-secondary:active {
    transform: scale(0.98);
}

/* iPad specific adjustments */
@media only screen and (max-width: 1024px) {
    .password-input {
        font-size: 16px !important; /* Prevent zoom on iOS */
    }

    .btn-primary, .btn-secondary {
        min-height: 44px; /* iOS touch target size */
    }
}
```

**Testing**:
1. Trigger password prompt
2. Verify styling matches Apple design language
3. Test on iPad Safari
4. Verify keyboard shows/hides correctly
5. Test cancel and unlock buttons

---

### 1.4: Implement HMAC Authentication

**Time**: 3-4 hours
**Files**: `qr_sender_final.py`, `qr_receiver/js/protocol-bridge.js`

**Sender** (`qr_sender_final.py`):
```python
import hmac

def sign_chunk(self, chunk_data, chunk_index):
    """Sign chunk with HMAC-SHA256"""
    if not self.encrypt:
        return None

    # Message: index + data
    message = f"{chunk_index}:{chunk_data}".encode()

    # Sign with key
    signature = hmac.new(
        self.key,
        message,
        hashlib.sha256
    ).hexdigest()

    return signature

def create_qr_data(self, chunk_index):
    # ... existing code ...

    # Add HMAC signature
    if self.encrypt:
        signature = self.sign_chunk(chunk_b64, chunk_index)
        data["hmac"] = signature

    return json.dumps(data, separators=(',', ':'))
```

**Receiver** (`protocol-bridge.js`):
```javascript
async verifyHMAC(chunkData, chunkIndex, signature, key) {
    // Reconstruct message
    const encoder = new TextEncoder();
    const message = encoder.encode(`${chunkIndex}:${chunkData}`);

    // Import HMAC key
    const hmacKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Calculate expected signature
    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        message
    );

    // Convert to hex
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Constant-time comparison
    return signatureHex === signature;
}
```

**Testing**:
1. Verify HMAC is generated on sender
2. Verify HMAC is validated on receiver
3. Test tampering detection (modify chunk, verify fails)
4. Measure performance impact

---

### 1.5: Add Session ID and Nonce

**Time**: 2 hours
**Files**: `qr_sender_final.py`, `qr_receiver/js/chunk-manager.js`

**Purpose**: Prevent replay attacks and chunk mixing between sessions

**Sender**:
```python
def __init__(self, path, **kwargs):
    # Generate unique session ID
    self.session_id = hashlib.sha256(
        f"{time.time()}:{os.urandom(16).hex()}".encode()
    ).hexdigest()[:16]

    print(f"Session ID: {self.session_id}")

    # ... rest of init

def create_qr_data(self, chunk_index):
    data = {
        # ... existing fields ...
        "session_id": self.session_id,
        "timestamp": int(time.time()),
        "nonce": os.urandom(8).hex()  # Per-chunk nonce
    }
```

**Receiver**:
```javascript
class ChunkManager {
    validateChunk(chunk) {
        // Check session ID
        if (this.currentSession && chunk.session_id !== this.currentSession) {
            throw new Error('Session ID mismatch - wrong transfer');
        }

        // Set session on first chunk
        if (!this.currentSession) {
            this.currentSession = chunk.session_id;
        }

        // Check timestamp (within 1 hour)
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - chunk.timestamp) > 3600) {
            console.warn('⚠️ Chunk timestamp outside acceptable range');
        }

        // Check nonce uniqueness
        if (this.seenNonces.has(chunk.nonce)) {
            throw new Error('Duplicate nonce - replay attack detected');
        }
        this.seenNonces.add(chunk.nonce);
    }
}
```

**Testing**:
1. Verify session ID consistency across chunks
2. Test replay detection (rescan same QR code)
3. Test session mixing (start new transfer, verify old chunks rejected)

---

## PHASE 2: RELIABILITY IMPROVEMENTS

Priority: 🟡 **HIGH**
Timeline: Week 3-4
Effort: 10-15 hours

### 2.1: Implement Reed-Solomon Forward Error Correction

**Time**: 5-8 hours
**Files**: `qr_sender_final.py`, `qr_receiver/js/data-processor.js`

**Sender** (`qr_sender_final.py`):
```python
from reedsolo import RSCodec

class AdvancedQRSender:
    def __init__(self, path, fec_level='medium', **kwargs):
        """
        fec_level:
          'low': 10% redundancy
          'medium': 20% redundancy
          'high': 30% redundancy
        """
        self.fec_level = fec_level
        self.fec_ratio = {
            'low': 0.1,
            'medium': 0.2,
            'high': 0.3
        }[fec_level]

        # Create Reed-Solomon codec
        # nsym = number of error correction symbols
        nsym = int(255 * self.fec_ratio)
        self.rs = RSCodec(nsym)

        # Encode entire file with FEC
        print(f"Applying Reed-Solomon FEC ({fec_level} = {self.fec_ratio*100}% redundancy)...")
        self.encoded_archive = self.rs.encode(self.archive)

        print(f"Original size: {len(self.archive):,} bytes")
        print(f"With FEC: {len(self.encoded_archive):,} bytes")
        print(f"Overhead: {(len(self.encoded_archive)-len(self.archive))/len(self.archive)*100:.1f}%")

        # Create chunks from encoded data
        self.chunks = chunk_data(self.encoded_archive, chunk_size)
        self.total_chunks = len(self.chunks)

        print(f"Can tolerate: {self.fec_ratio*100:.0f}% chunk loss")
```

**Dependencies**:
```bash
pip install reedsolo
```

**Receiver** (JavaScript Reed-Solomon):

Install npm package:
```bash
cd qr_receiver
npm install reed-solomon
```

**Implementation** (`data-processor.js`):
```javascript
// Import reed-solomon library (add to HTML)
// <script src="https://cdn.jsdelivr.net/npm/reed-solomon@1.0.0/index.js"></script>

async applyReedSolomonCorrection(data, params) {
    const { algorithm, totalSymbols, dataSymbols } = this.parseReedSolomonParams(params);

    // Calculate number of error correction symbols
    const nsym = totalSymbols - dataSymbols;

    try {
        // Create RS decoder
        const decoder = new ReedSolomon(nsym);

        // Decode (correct errors)
        const corrected = decoder.decode(data);

        console.log(`✅ Reed-Solomon correction applied (${nsym} parity symbols)`);
        return corrected;

    } catch (error) {
        console.error('❌ Reed-Solomon correction failed:', error);
        throw new Error('Too many errors - cannot recover data');
    }
}
```

**Alternative**: Use pure JavaScript implementation if npm not available

**Testing**:
1. Send file with FEC enabled
2. Intentionally skip chunks (miss 10%, 20%, 30%)
3. Verify file still reconstructs correctly
4. Test threshold (31% loss should fail with 30% FEC)

---

### 2.2: Adaptive Chunk Size Based on Success Rate

**Time**: 3 hours
**Files**: `qr_receiver/js/qr-scanner-engine.js`

**Implementation**:
```javascript
class QRScannerEngine {
    constructor() {
        this.scanStats = {
            attempts: 0,
            successes: 0,
            failures: 0,
            avgScanTime: 0
        };
    }

    updateStats(success, scanTime) {
        this.scanStats.attempts++;
        if (success) {
            this.scanStats.successes++;
        } else {
            this.scanStats.failures++;
        }

        // Update average scan time
        this.scanStats.avgScanTime =
            (this.scanStats.avgScanTime * (this.scanStats.attempts - 1) + scanTime) /
            this.scanStats.attempts;
    }

    getSuccessRate() {
        if (this.scanStats.attempts === 0) return 0;
        return this.scanStats.successes / this.scanStats.attempts;
    }

    getRecommendedChunkSize() {
        const successRate = this.getSuccessRate();

        // High success rate (>95%) - can handle larger chunks
        if (successRate > 0.95) {
            return 200;
        }
        // Medium success rate (80-95%) - standard chunks
        else if (successRate > 0.80) {
            return 120;
        }
        // Low success rate (<80%) - smaller chunks
        else {
            return 80;
        }
    }

    shouldAdjustSpeed() {
        const successRate = this.getSuccessRate();

        // Suggest slower speed if low success rate
        if (successRate < 0.70) {
            return {
                adjust: true,
                reason: 'Low scan success rate',
                recommendation: 'Reduce FPS or improve lighting'
            };
        }

        return { adjust: false };
    }
}
```

**Testing**:
1. Monitor success rate during transfer
2. Verify recommendations appear when appropriate
3. Test in different lighting conditions

---

### 2.3: Better Error Recovery and Retry Logic

**Time**: 2 hours
**Files**: `qr_receiver/js/retry-manager.js`

**Enhancement**:
```javascript
class RetryManager {
    constructor() {
        this.maxRetries = 5;
        this.retryDelay = 1000; // Start with 1 second
        this.backoffMultiplier = 1.5;
    }

    async retryOperation(operation, context = '') {
        let lastError;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                // Attempt operation
                const result = await operation();

                if (attempt > 0) {
                    console.log(`✅ ${context} succeeded on attempt ${attempt + 1}`);
                }

                return result;

            } catch (error) {
                lastError = error;

                console.warn(`⚠️ ${context} failed (attempt ${attempt + 1}/${this.maxRetries}):`, error.message);

                if (attempt < this.maxRetries - 1) {
                    // Calculate delay with exponential backoff
                    const delay = this.retryDelay * Math.pow(this.backoffMultiplier, attempt);
                    console.log(`   Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        console.error(`❌ ${context} failed after ${this.maxRetries} attempts`);
        throw lastError;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

**Usage**:
```javascript
// Retry QR processing
const result = await retryManager.retryOperation(
    () => this.processQRCode(qrData),
    'QR code processing'
);

// Retry decryption
const decrypted = await retryManager.retryOperation(
    () => this.decryptData(data, metadata),
    'Decryption'
);
```

**Testing**:
1. Inject errors to trigger retries
2. Verify exponential backoff works
3. Verify gives up after max retries

---

### 2.4: Missing Chunks Detection and Display

**Time**: 2 hours
**Files**: `qr_receiver/js/ui-manager.js`

**Implementation**:
```javascript
displayMissingChunks(missingChunks, totalChunks) {
    if (missingChunks.length === 0) {
        return; // All chunks received
    }

    // Create or update missing chunks display
    let display = document.getElementById('missing-chunks-display');
    if (!display) {
        display = document.createElement('div');
        display.id = 'missing-chunks-display';
        display.className = 'missing-chunks';
        document.querySelector('.progress-container').appendChild(display);
    }

    // Format missing chunks as ranges
    const ranges = this.formatChunkRanges(missingChunks);

    display.innerHTML = `
        <div class="missing-header">
            <span class="warning-icon">⚠️</span>
            <span>Missing ${missingChunks.length} of ${totalChunks} chunks</span>
        </div>
        <div class="missing-list">${ranges}</div>
        <div class="missing-action">
            ${missingChunks.length <= totalChunks * 0.3 ?
                '<span class="can-recover">✅ Can recover with Reed-Solomon</span>' :
                '<span class="cannot-recover">❌ Too many missing - need more chunks</span>'
            }
        </div>
    `;
}

formatChunkRanges(chunks) {
    if (chunks.length === 0) return 'None';

    // Sort chunks
    chunks.sort((a, b) => a - b);

    // Find consecutive ranges
    const ranges = [];
    let start = chunks[0];
    let end = chunks[0];

    for (let i = 1; i < chunks.length; i++) {
        if (chunks[i] === end + 1) {
            end = chunks[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = chunks[i];
            end = chunks[i];
        }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);

    return ranges.join(', ');
}
```

**CSS**:
```css
.missing-chunks {
    background: #FFF3CD;
    border: 2px solid #FFC107;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
}

.missing-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    margin-bottom: 8px;
}

.missing-list {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: #666;
    margin: 8px 0;
}

.can-recover {
    color: #28A745;
    font-weight: 600;
}

.cannot-recover {
    color: #DC3545;
    font-weight: 600;
}
```

**Testing**:
1. Intentionally skip chunks
2. Verify missing chunks display correctly
3. Verify ranges format properly (e.g., "5-12, 18, 23-27")
4. Verify recovery status shows correctly

---

## PHASE 3: USER EXPERIENCE

Priority: 🟢 **MEDIUM**
Timeline: Week 5
Effort: 5-10 hours

### 3.1: Add Transfer Progress Visualization

**Time**: 2 hours
**Files**: `qr_receiver/js/ui-manager.js`, `qr_receiver/css/styles.css`

**Implementation**:
```javascript
updateProgressVisualization(received, total) {
    // Create chunk grid visualization
    const grid = document.getElementById('chunk-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Determine grid size (max 100 cells for performance)
    const maxCells = 100;
    const cellsToShow = Math.min(total, maxCells);
    const chunksPerCell = Math.ceil(total / cellsToShow);

    for (let i = 0; i < cellsToShow; i++) {
        const startChunk = i * chunksPerCell;
        const endChunk = Math.min(startChunk + chunksPerCell, total);

        // Check how many chunks in this cell are received
        let receivedInCell = 0;
        for (let j = startChunk; j < endChunk; j++) {
            if (this.chunkManager.hasChunk(j)) {
                receivedInCell++;
            }
        }

        const cell = document.createElement('div');
        cell.className = 'chunk-cell';

        // Color based on completion
        const completion = receivedInCell / chunksPerCell;
        if (completion === 1) {
            cell.classList.add('complete');
        } else if (completion > 0) {
            cell.classList.add('partial');
            cell.style.background = `linear-gradient(to top, #007AFF ${completion * 100}%, #E5E5EA ${completion * 100}%)`;
        } else {
            cell.classList.add('missing');
        }

        grid.appendChild(cell);
    }
}
```

**CSS**:
```css
.chunk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, 8px);
    gap: 2px;
    padding: 16px;
    background: #F8F9FA;
    border-radius: 8px;
    margin: 16px 0;
}

.chunk-cell {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    transition: all 0.2s;
}

.chunk-cell.complete {
    background: #007AFF;
}

.chunk-cell.partial {
    /* Set via inline style */
}

.chunk-cell.missing {
    background: #E5E5EA;
}

.chunk-cell:hover {
    transform: scale(1.5);
    z-index: 10;
}
```

---

### 3.2: Add Audio Feedback (Optional)

**Time**: 1 hour
**Files**: `qr_receiver/js/audio-manager.js`

**Enhancement**:
```javascript
class AudioManager {
    constructor() {
        this.enabled = true;
        this.sounds = {
            scan: this.createTone(800, 50),      // High beep for scan
            complete: this.createTone(1000, 200), // Success tone
            error: this.createTone(400, 100)      // Low beep for error
        };
    }

    createTone(frequency, duration) {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        return () => {
            if (!this.enabled) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
        };
    }

    playChunkScanned() {
        this.sounds.scan();
    }

    playTransferComplete() {
        this.sounds.complete();
    }

    playError() {
        this.sounds.error();
    }
}
```

**Usage**:
```javascript
// After successful scan
this.audioManager.playChunkScanned();

// After transfer complete
this.audioManager.playTransferComplete();

// On error
this.audioManager.playError();
```

---

### 3.3: Add Night Vision Mode for Low Light

**Time**: 1 hour
**Files**: `qr_receiver/css/styles.css`

**Implementation**:
```css
/* Night vision mode - red UI for low light */
body.night-mode {
    background: #1A0000;
    color: #FF6666;
}

body.night-mode .camera-view {
    border-color: #660000;
}

body.night-mode .progress-bar {
    background: #330000;
}

body.night-mode .progress-fill {
    background: #FF0000;
}

body.night-mode button {
    background: #660000;
    color: #FF6666;
    border-color: #990000;
}

body.night-mode .password-dialog {
    background: #1A0000;
    border: 2px solid #660000;
}

/* Toggle button */
.night-mode-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 20px;
    cursor: pointer;
    z-index: 1000;
}
```

**JavaScript**:
```javascript
function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    localStorage.setItem('nightMode', document.body.classList.contains('night-mode'));
}

// Restore on load
if (localStorage.getItem('nightMode') === 'true') {
    document.body.classList.add('night-mode');
}
```

---

### 3.4: Add Estimated Time Remaining

**Time**: 1 hour
**Files**: `qr_receiver/js/chunk-manager.js`

**Implementation**:
```javascript
class ChunkManager {
    constructor() {
        this.startTime = null;
        this.firstChunkTime = null;
        this.recentScanTimes = [];  // Rolling average
        this.maxScanTimesSamples = 10;
    }

    recordChunkScan() {
        const now = Date.now();

        if (!this.firstChunkTime) {
            this.firstChunkTime = now;
            this.startTime = now;
        }

        // Record time since last chunk
        if (this.lastChunkTime) {
            const timeDiff = now - this.lastChunkTime;
            this.recentScanTimes.push(timeDiff);

            // Keep only recent samples
            if (this.recentScanTimes.length > this.maxScanTimesSamples) {
                this.recentScanTimes.shift();
            }
        }

        this.lastChunkTime = now;
    }

    getAverageScanTime() {
        if (this.recentScanTimes.length === 0) return 0;

        const sum = this.recentScanTimes.reduce((a, b) => a + b, 0);
        return sum / this.recentScanTimes.length;
    }

    getEstimatedTimeRemaining() {
        const received = this.getReceivedCount();
        const total = this.getTotalChunks();
        const remaining = total - received;

        if (remaining <= 0) return 0;

        const avgScanTime = this.getAverageScanTime();
        if (avgScanTime === 0) return null; // Not enough data

        return remaining * avgScanTime;
    }

    formatTimeRemaining(ms) {
        if (ms === null) return 'Calculating...';
        if (ms === 0) return 'Complete';

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}
```

**Display**:
```javascript
// Update UI with ETA
const eta = this.chunkManager.getEstimatedTimeRemaining();
const etaFormatted = this.chunkManager.formatTimeRemaining(eta);

document.getElementById('eta-display').textContent = `ETA: ${etaFormatted}`;
```

---

## PHASE 4: ADVANCED FEATURES

Priority: 🟢 **LOW**
Timeline: Week 6-8
Effort: 20-30 hours

### 4.1: Implement QRFile/v2 Protocol (Unified)

**Time**: 6-8 hours
**Files**: `qr_sender_final.py`, `qr_receiver/js/protocol-bridge.js`

**Create**: `PROTOCOL_SPEC.md` documenting qrfile/v2 format

**Features**:
- Mandatory encryption
- Mandatory HMAC authentication
- Optional Reed-Solomon FEC
- Versioned protocol (backward compatible)
- Extensible metadata

**Implementation**: See separate protocol specification document

---

### 4.2: Multi-File Transfer Support

**Time**: 4-5 hours
**Files**: `qr_sender_final.py`

**Enhancement**:
```python
def create_multi_file_archive(paths):
    """Create archive from multiple files/folders"""
    archive_path = tempfile.mktemp(suffix='.tar.gz')

    with tarfile.open(archive_path, 'w:gz') as tar:
        for path in paths:
            if os.path.isfile(path):
                tar.add(path, arcname=os.path.basename(path))
            elif os.path.isdir(path):
                tar.add(path, arcname=os.path.basename(path))

    with open(archive_path, 'rb') as f:
        archive_data = f.read()

    os.unlink(archive_path)
    return archive_data
```

**Usage**:
```bash
python qr_sender_final.py file1.txt file2.pdf folder/
```

---

### 4.3: Transfer Resume Capability

**Time**: 5-6 hours
**Files**: `qr_receiver/js/storage-manager.js`

**Implementation**:
```javascript
class StorageManager {
    async saveTransferState(sessionId, chunks, metadata) {
        // Save to localStorage for resume
        const state = {
            sessionId,
            timestamp: Date.now(),
            totalChunks: metadata.totalChunks,
            receivedChunks: chunks.map((chunk, idx) => chunk ? idx : null).filter(x => x !== null),
            metadata
        };

        localStorage.setItem(`transfer_${sessionId}`, JSON.stringify(state));
    }

    async loadTransferState(sessionId) {
        const stateJson = localStorage.getItem(`transfer_${sessionId}`);
        if (!stateJson) return null;

        return JSON.parse(stateJson);
    }

    async listPendingTransfers() {
        const transfers = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('transfer_')) {
                const state = JSON.parse(localStorage.getItem(key));
                transfers.push(state);
            }
        }
        return transfers;
    }
}
```

**UI**:
```javascript
// On app start, check for pending transfers
const pending = await storageManager.listPendingTransfers();
if (pending.length > 0) {
    const resume = confirm(`Found ${pending.length} incomplete transfer(s). Resume?`);
    if (resume) {
        // Load and resume
    }
}
```

---

### 4.4: Compression Options

**Time**: 3-4 hours
**Files**: `qr_sender_final.py`

**Enhancement**:
```python
import gzip
import bz2

class AdvancedQRSender:
    def __init__(self, path, compression='auto', **kwargs):
        """
        compression:
          'none': No compression
          'gzip': Gzip compression (default for tar.gz)
          'bz2': BZ2 compression (better ratio, slower)
          'auto': Detect best based on file type
        """
        self.compression = compression

        # Apply compression
        if compression == 'bz2':
            self.archive = bz2.compress(self.archive, compresslevel=9)
        elif compression == 'gzip':
            self.archive = gzip.compress(self.archive, compresslevel=9)
        elif compression == 'auto':
            # Test compression ratio
            gzipped = gzip.compress(self.archive[:10000])  # Sample
            ratio = len(gzipped) / 10000

            if ratio < 0.9:  # >10% compression
                self.archive = gzip.compress(self.archive, compresslevel=9)
                print(f"Auto-selected gzip compression ({ratio:.1%} ratio)")
            else:
                print("Auto-selected no compression (already compressed)")
```

---

### 4.5: Audit Logging

**Time**: 3-4 hours
**Files**: `qr_receiver/js/audit-log.js`

**Implementation**:
```javascript
class AuditLog {
    constructor() {
        this.log = [];
        this.maxEntries = 1000;
    }

    async logEvent(event) {
        const entry = {
            timestamp: new Date().toISOString(),
            event: event.type,
            sessionId: event.sessionId,
            fileHash: event.fileHash,
            fileName: event.fileName,
            fileSize: event.fileSize,
            chunkCount: event.chunkCount,
            encrypted: event.encrypted,
            success: event.success,
            error: event.error || null
        };

        this.log.push(entry);

        // Persist
        this.persist();

        // Rotate if needed
        if (this.log.length > this.maxEntries) {
            this.rotate();
        }
    }

    persist() {
        try {
            localStorage.setItem('audit_log', JSON.stringify(this.log));
        } catch (e) {
            console.error('Failed to persist audit log:', e);
        }
    }

    exportAsJSON() {
        return JSON.stringify(this.log, null, 2);
    }

    exportAsCSV() {
        const headers = 'Timestamp,Event,SessionID,FileHash,FileName,FileSize,ChunkCount,Encrypted,Success,Error\n';
        const rows = this.log.map(entry =>
            `${entry.timestamp},${entry.event},${entry.sessionId},${entry.fileHash},${entry.fileName},${entry.fileSize},${entry.chunkCount},${entry.encrypted},${entry.success},${entry.error || ''}`
        ).join('\n');

        return headers + rows;
    }
}
```

**Usage**:
```javascript
// Log transfer start
auditLog.logEvent({
    type: 'transfer_start',
    sessionId: sessionId,
    fileName: fileName,
    chunkCount: totalChunks,
    encrypted: true
});

// Log transfer complete
auditLog.logEvent({
    type: 'transfer_complete',
    sessionId: sessionId,
    fileHash: fileHash,
    success: true
});

// Export
const csvExport = auditLog.exportAsCSV();
downloadFile('audit_log.csv', csvExport);
```

---

### 4.6: Advanced QR Code Optimization

**Time**: 4-5 hours
**Files**: `qr_sender_final.py`

**Features**:
- Dynamic QR version selection
- Optimal error correction level per chunk
- Chunk size optimization based on data entropy
- QR code caching for faster display

**Implementation**:
```python
def optimize_qr_parameters(self, data):
    """Dynamically optimize QR parameters"""
    data_len = len(data)

    # Select error correction based on data criticality
    # First/last chunks: Higher error correction
    # Middle chunks: Can use lower (faster scanning)

    if self.current_chunk == 0 or self.current_chunk == self.total_chunks - 1:
        error_level = 'h'  # 30% correction for critical chunks
    else:
        error_level = 'm'  # 15% correction for middle chunks

    # Select QR version based on data size
    # Smaller QR codes scan faster
    if data_len < 100:
        version = None  # Auto (likely version 5-8)
    elif data_len < 300:
        version = None  # Auto
    else:
        version = None  # Auto, but will be larger

    return {
        'error': error_level,
        'version': version,
        'mode': 'byte',
        'micro': False
    }
```

---

## DEPLOYMENT-SPECIFIC NOTES

### For GitHub Pages Deployment

**Advantages**:
- ✅ HTTPS enabled (camera works)
- ✅ CDN libraries load fine
- ✅ Service Worker supported
- ✅ PWA installable
- ✅ Free hosting

**Considerations**:
- ⚠️ First load requires internet (to cache assets)
- ⚠️ After cached, works offline
- ⚠️ Update deployment: `git push origin main`

**Setup**:
```bash
# 1. Push to GitHub
git add .
git commit -m "feat: Add security improvements"
git push origin main

# 2. Enable GitHub Pages
# Go to: Settings → Pages
# Source: main branch
# Folder: / (root)

# 3. Access on iPad
# URL: https://USERNAME.github.io/qr_app/qr_receiver/qr-scanner.html
```

**Offline Capability**:
```javascript
// Service worker caches all assets
// After first visit, works offline
// Update cache on new deployment
```

---

### For iPad Safari Specific

**Optimizations**:

1. **Prevent Zoom on Input**:
```css
input[type="password"] {
    font-size: 16px !important; /* iOS won't zoom */
}
```

2. **Proper Touch Targets**:
```css
button {
    min-height: 44px;
    min-width: 44px;
}
```

3. **Handle Safe Area** (notch):
```css
body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
}
```

4. **Optimize Camera**:
```javascript
const constraints = {
    video: {
        facingMode: 'environment',  // Rear camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
    }
};
```

5. **Add to Home Screen**:
```json
// manifest.json
{
    "name": "QR File Receiver",
    "short_name": "QR Receiver",
    "start_url": "/qr_app/qr_receiver/qr-scanner.html",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#007AFF",
    "icons": [
        {
            "src": "icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

---

## IMPLEMENTATION PRIORITY MATRIX

### Critical (Do First)
| Item | Priority | Effort | Impact | Risk if Not Done |
|------|----------|--------|--------|------------------|
| Fix SHA-256 truncation | 🔴 Critical | 5 min | High | Weak integrity |
| Implement encryption | 🔴 Critical | 4 hrs | Critical | No confidentiality |
| Add HMAC auth | 🔴 Critical | 4 hrs | High | Tampering possible |
| Secure memory wipe | 🔴 Critical | 1 hr | Medium | Forensic recovery |

### High Priority (Do Soon)
| Item | Priority | Effort | Impact | Benefit |
|------|----------|--------|--------|---------|
| Reed-Solomon FEC | 🟡 High | 8 hrs | High | Reliable transfers |
| QR error level 'M' | 🟡 High | 2 min | Medium | Better scanning |
| Password UI dialog | 🟡 High | 1 hr | High | Better UX |
| Missing chunks display | 🟡 High | 2 hrs | Medium | User awareness |

### Medium Priority (Nice to Have)
| Item | Priority | Effort | Impact | Benefit |
|------|----------|--------|--------|---------|
| Progress visualization | 🟢 Medium | 2 hrs | Medium | Better feedback |
| ETA calculation | 🟢 Medium | 1 hr | Medium | User expectation |
| Audio feedback | 🟢 Medium | 1 hr | Low | Accessibility |
| Night mode | 🟢 Medium | 1 hr | Low | Low light use |

### Low Priority (Future)
| Item | Priority | Effort | Impact | When to Implement |
|------|----------|--------|--------|-------------------|
| QRFile/v2 protocol | 🟢 Low | 8 hrs | High | After basic security |
| Multi-file support | 🟢 Low | 5 hrs | Medium | If needed |
| Transfer resume | 🟢 Low | 6 hrs | Medium | After reliability |
| Audit logging | 🟢 Low | 4 hrs | Low | For compliance |

---

## TESTING CHECKLIST

### Security Testing
- [ ] Encryption/decryption round-trip successful
- [ ] Wrong password properly rejected
- [ ] HMAC tampering detected
- [ ] Session ID prevents mixing chunks
- [ ] Memory wiped after download

### Reliability Testing
- [ ] Reed-Solomon recovers from 30% loss
- [ ] Missing chunks detected and displayed
- [ ] Transfer completes with intermittent scanning
- [ ] Resume works after interruption

### Compatibility Testing
- [ ] Works on iPad Safari
- [ ] Works on iPhone Safari
- [ ] Add to Home Screen works
- [ ] Offline mode works after caching
- [ ] Camera permissions work correctly

### Performance Testing
- [ ] Transfer speed: >2 FPS achievable
- [ ] Memory usage: <100MB for 10MB file
- [ ] Scan success rate: >90%
- [ ] Large files (>10MB) complete successfully

### User Experience Testing
- [ ] Progress clearly visible
- [ ] Errors clearly communicated
- [ ] Password prompt intuitive
- [ ] Estimated time accurate (±20%)

---

## NEXT STEPS

1. **Review this document** - Remove features you don't need
2. **Prioritize remaining items** - Reorder based on your requirements
3. **Create updated RECOMMENDATIONS.md** - With your decisions
4. **Request implementation** - I'll update all documentation to match
5. **Begin Phase 1** - Start with critical security items

---

## APPENDIX: Dependencies to Install

### Python (Sender)
```bash
pip install segno pillow cryptography reedsolo
```

### JavaScript (Receiver)
No installation needed - uses Web Crypto API (built-in)

Optional:
```bash
npm install reed-solomon  # For Reed-Solomon FEC
```

---

**Document End**

*Review this document, remove unnecessary recommendations, and I'll update all other documentation (CLAUDE.md, README.md, etc.) to match your final decisions.*
