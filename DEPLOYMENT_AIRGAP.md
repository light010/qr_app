# AIR-GAP DEPLOYMENT GUIDE

> Military-grade deployment procedures for secure, air-gapped environments

## 🎯 Purpose

This guide provides step-by-step procedures for deploying the QR File Transfer system in classified, air-gapped environments where network connectivity is prohibited.

**Target Environments:**
- SCIF (Sensitive Compartmented Information Facility)
- Air-gapped military networks
- Intelligence agency secure facilities
- Critical infrastructure control systems
- Government classified data centers

---

## 🔒 SECURITY CLASSIFICATION

**Document Classification**: UNCLASSIFIED
**Operational Classification**: May handle CLASSIFIED data
**Clearance Required**: Secret or above (depending on data classification)
**Handling Instructions**: Secure storage required

---

## ⚠️ PREREQUISITES

### Personnel Requirements

- [ ] Security clearance appropriate for environment
- [ ] Training on air-gap security procedures
- [ ] Authorized by facility security officer
- [ ] Familiar with physical security protocols
- [ ] Trained on incident response procedures

### Equipment Requirements

#### For Generator Deployment
- [ ] USB flash drive (commercial grade, write-protectable)
- [ ] USB write-blocker (hardware-based recommended)
- [ ] Hash verification tools (sha256sum or equivalent)
- [ ] Code signing certificate (if required by policy)
- [ ] Label maker for physical media labeling
- [ ] Tamper-evident seals
- [ ] Deployment checklist (printed)

#### For Scanner Deployment
- [ ] CD-R or DVD-R discs (write-once recommended)
- [ ] CD/DVD burner with verification capability
- [ ] Browser-capable computer in air-gapped environment
- [ ] Camera-enabled device for scanning
- [ ] Hash verification tools
- [ ] Physical media storage case
- [ ] Deployment checklist (printed)

### Documentation Requirements

- [ ] This deployment guide (printed)
- [ ] Air-gap compliance checklist (printed)
- [ ] Incident response procedures (printed)
- [ ] User manuals (printed PDF)
- [ ] Audit trail forms
- [ ] Change management approval forms

---

## 📦 GENERATOR DEPLOYMENT

### Phase 1: Build Preparation (Development Environment)

```bash
# Environment: Connected development system
# Clearance: Developer clearance level
# Time: 30 minutes

# Step 1: Clean build environment
cd generator/
rm -rf dist/ build/ __pycache__/
git status  # Verify clean state

# Step 2: Install dependencies (if not already done)
pip install -r requirements.txt
pip install pyinstaller

# Step 3: Build single-file executable
pyinstaller \
    --onefile \
    --windowed \
    --name "QRGenerator" \
    --add-data "config:config" \
    --hidden-import=segno \
    --hidden-import=brotli \
    --hidden-import=zstandard \
    --hidden-import=cryptography \
    src/main.py

# Output: dist/QRGenerator.exe (Windows)
#         dist/QRGenerator (Linux/macOS)
```

### Phase 2: Security Verification

```bash
# Step 4: Verify no network code
echo "Checking for network symbols..."
nm dist/QRGenerator | grep -E "socket|connect|bind|listen|urllib|http" || echo "✅ No network symbols found"

# Step 5: Verify no suspicious strings
echo "Checking for URLs..."
strings dist/QRGenerator | grep -iE "http://|https://" || echo "✅ No URLs found"

# Step 6: Calculate hash
sha256sum dist/QRGenerator > deployment_manifest.txt
cat deployment_manifest.txt
# Expected output: <hash>  dist/QRGenerator
```

### Phase 3: Code Signing (Optional but Recommended)

```bash
# Windows (with signtool)
signtool sign \
    /f code_signing_cert.pfx \
    /p <password> \
    /t http://timestamp.digicert.com \
    /fd SHA256 \
    dist/QRGenerator.exe

# Verify signature
signtool verify /pa /v dist/QRGenerator.exe

# Linux (with gpg)
gpg --detach-sign --armor dist/QRGenerator
# Creates: dist/QRGenerator.asc

# Verify signature
gpg --verify dist/QRGenerator.asc dist/QRGenerator
```

### Phase 4: Create Deployment Package

```bash
# Step 7: Create deployment directory
mkdir -p deployment_package/
cd deployment_package/

# Step 8: Copy files
cp ../dist/QRGenerator .
cp ../config/default.yaml config.yaml.template
cp ../README.md README.txt
cp ../deployment_manifest.txt .

# Step 9: Create deployment instructions
cat > INSTALL.txt << 'EOF'
QR GENERATOR - AIR-GAP INSTALLATION

1. Verify hash matches deployment_manifest.txt
   $ sha256sum QRGenerator
   Compare output with deployment_manifest.txt

2. Copy to installation directory
   $ sudo cp QRGenerator /opt/qr_generator/
   $ sudo chmod +x /opt/qr_generator/QRGenerator

3. Copy configuration template
   $ cp config.yaml.template /opt/qr_generator/config.yaml

4. Test installation
   $ /opt/qr_generator/QRGenerator --version

5. Destroy this media per security procedures

CLASSIFICATION: UNCLASSIFIED
HANDLING: Secure physical storage required
EOF

# Step 10: Calculate package hash
find . -type f -exec sha256sum {} \; > PACKAGE_MANIFEST.txt

# Step 11: Create README for security review
cat > SECURITY_REVIEW.txt << 'EOF'
SECURITY VERIFICATION CHECKLIST

[ ] Hash verified for QRGenerator executable
[ ] No network code detected
[ ] No external dependencies
[ ] Code signature valid (if signed)
[ ] Configuration file reviewed
[ ] Installation instructions reviewed
[ ] Package manifest complete
[ ] Deployment approved by security officer

Reviewed by: _______________  Date: __________
Approved by: _______________  Date: __________
EOF
```

### Phase 5: Transfer to Physical Media

```bash
# Step 12: Prepare USB drive
# Insert USB drive (e.g., /dev/sdb)

# IMPORTANT: Use write-blocker hardware if available

# Format USB (optional, use FAT32 for compatibility)
sudo mkfs.vfat -n "QRGEN_V3" /dev/sdb1

# Mount USB
sudo mount /dev/sdb1 /mnt/usb

# Copy deployment package
sudo cp -r deployment_package/* /mnt/usb/

# Verify copy
cd /mnt/usb
sha256sum -c PACKAGE_MANIFEST.txt
# All files should show OK

# Unmount
cd ~
sudo umount /mnt/usb

# Enable write-protection (physical switch on USB)
# Verify write-protection
sudo mount /dev/sdb1 /mnt/usb
touch /mnt/usb/test.txt 2>&1 | grep "Read-only" && echo "✅ Write-protected"
sudo umount /mnt/usb
```

### Phase 6: Physical Security

```bash
# Step 13: Label USB drive
# Use label maker to create:
#
# QR GENERATOR v3.0.0
# Date: YYYY-MM-DD
# Classification: UNCLASSIFIED
# Hash: <first 8 chars of hash>
# Approved by: <initials>

# Step 14: Apply tamper-evident seal
# Affix tamper-evident seal across USB cap and body
# Record seal number in audit log

# Step 15: Complete chain of custody form
# Document:
# - Media ID
# - Seal number
# - Package hash
# - Build date/time
# - Built by
# - Approved by
# - Destination facility
# - Courier name
# - Departure date/time
```

### Phase 7: Transport to Air-Gapped Environment

```
┌──────────────────────────────────────────────┐
│         SECURE TRANSPORT PROCEDURE            │
├──────────────────────────────────────────────┤
│                                              │
│ 1. Place USB in anti-static bag             │
│ 2. Seal bag with tamper-evident seal        │
│ 3. Place in locked container                │
│ 4. Record container seal number             │
│ 5. Complete chain of custody form           │
│ 6. Hand to authorized courier                │
│ 7. Courier signs chain of custody           │
│ 8. Courier transports to destination        │
│ 9. Recipient verifies seals intact          │
│ 10. Recipient signs chain of custody         │
│                                              │
└──────────────────────────────────────────────┘
```

### Phase 8: Installation in Air-Gapped Environment

```bash
# Environment: Air-gapped secure facility
# Personnel: Authorized system administrator
# Time: 20 minutes

# Step 16: Receive and verify media
# Check:
# - Tamper-evident seals intact
# - Label information correct
# - Chain of custody complete

# Step 17: Insert USB (with write-blocker if available)
# Mount USB
sudo mount -o ro /dev/sdb1 /mnt/usb

# Step 18: Verify package integrity
cd /mnt/usb
sha256sum -c PACKAGE_MANIFEST.txt
# All files must show OK

# Step 19: Verify executable hash
sha256sum QRGenerator
# Compare with deployment_manifest.txt
# Must match exactly

# Step 20: Verify signature (if signed)
# Windows:
signtool verify /pa /v QRGenerator.exe

# Linux:
gpg --verify QRGenerator.asc QRGenerator

# Step 21: Copy to installation directory
sudo mkdir -p /opt/qr_generator
sudo cp QRGenerator /opt/qr_generator/
sudo cp config.yaml.template /opt/qr_generator/config.yaml
sudo chmod +x /opt/qr_generator/QRGenerator

# Step 22: Configure application
sudo nano /opt/qr_generator/config.yaml
# Edit settings as needed

# Step 23: Test installation
/opt/qr_generator/QRGenerator --version
/opt/qr_generator/QRGenerator --help

# Step 24: Create test file
echo "Air-gap test" > test.txt
/opt/qr_generator/QRGenerator generate test.txt

# Verify:
# - QR codes display
# - No network errors
# - Can scan with scanner

# Step 25: Monitor for network activity
sudo iftop -i eth0 &
# Run generator, verify NO network traffic
kill %1

# Step 26: Complete installation log
cat >> /var/log/qr_generator_install.log << EOF
Installation Date: $(date)
Version: 3.0.0
Installed By: $USER
Hash Verified: YES
Signature Verified: YES (if applicable)
Network Test: PASSED (no activity)
Functional Test: PASSED
EOF
```

### Phase 9: Media Destruction

```bash
# Step 27: Secure USB drive
# Option A: Wipe and store
sudo dd if=/dev/zero of=/dev/sdb bs=1M
# Store in secure media library

# Option B: Physical destruction
# - Degauss USB
# - Physically shred USB
# - Document destruction in audit log

# Step 28: Update chain of custody
# Mark media as:
# - Installed
# - Date/time
# - Destroyed (if applicable)
# - Retained by (if stored)
```

---

## 🖥️ SCANNER DEPLOYMENT

### Phase 1: Build Preparation (Development Environment)

```bash
# Environment: Connected development system
# Time: 20 minutes

# Step 1: Install dependencies
cd scanner/
npm install

# Step 2: Build air-gap compliant version
npm run build:airgap
# This creates a single HTML file with ALL dependencies inlined

# Output: dist/scanner_airgap.html

# Verify size (should be ~500KB)
ls -lh dist/scanner_airgap.html
```

### Phase 2: Security Verification

```bash
# Step 3: Verify no external dependencies
echo "Checking for CDN references..."
grep -iE "cdn\.|jsdelivr|unpkg|cdnjs" dist/scanner_airgap.html && {
    echo "❌ CDN references found!"
    exit 1
} || echo "✅ No CDN references"

# Step 4: Verify no network URLs
echo "Checking for HTTP(S) URLs..."
grep -iE "http://|https://" dist/scanner_airgap.html && {
    echo "⚠️  URLs found (review required)"
    grep -iE "http://|https://" dist/scanner_airgap.html
} || echo "✅ No HTTP(S) URLs found"

# Step 5: Calculate hash
sha256sum dist/scanner_airgap.html > scanner_manifest.txt
cat scanner_manifest.txt
```

### Phase 3: Create Deployment Package

```bash
# Step 6: Create deployment directory
mkdir -p scanner_deployment/
cd scanner_deployment/

# Step 7: Copy scanner file
cp ../dist/scanner_airgap.html ./scanner.html

# Step 8: Create user guide
cat > USER_GUIDE.txt << 'EOF'
QR SCANNER - USER GUIDE

INSTALLATION:
1. Copy scanner.html to local computer
2. Verify hash matches scanner_manifest.txt
3. Open scanner.html in web browser

USAGE:
1. Open scanner.html in browser (Chrome, Firefox, or Safari)
2. Click "Allow" when prompted for camera access
3. Click "Start Scanning"
4. Point camera at QR codes from generator
5. Watch progress as chunks are received
6. File downloads automatically when complete

SUPPORTED BROWSERS:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

TROUBLESHOOTING:
- Camera not working: Check browser permissions
- Scanning slow: Ensure good lighting
- Missing chunks: Rescan missed QR codes

CLASSIFICATION: UNCLASSIFIED
HANDLING: Suitable for air-gapped environments
EOF

# Step 9: Convert user guide to PDF (if tools available)
# enscript -B -p - USER_GUIDE.txt | ps2pdf - USER_GUIDE.pdf

# Step 10: Create deployment manifest
find . -type f -exec sha256sum {} \; > DEPLOYMENT_MANIFEST.txt
```

### Phase 4: Burn to CD/DVD (Recommended)

```bash
# Step 11: Prepare files for burning
mkisofs \
    -V "QR_SCANNER_V3" \
    -J -R -l \
    -o scanner_deployment.iso \
    scanner_deployment/

# Step 12: Verify ISO
sha256sum scanner_deployment.iso >> DEPLOYMENT_MANIFEST.txt

# Step 13: Burn to disc
# Insert blank CD-R/DVD-R

# Linux:
cdrecord -v -dao dev=/dev/sr0 scanner_deployment.iso

# Or use GUI tool like Brasero, K3b

# Step 14: Verify burn
dd if=/dev/sr0 bs=2048 count=<size> | sha256sum
# Compare with scanner_deployment.iso hash

# Step 15: Label disc
# Use permanent marker to write on disc:
# QR Scanner v3.0
# Date: YYYY-MM-DD
# Hash: <first 8 chars>
# Classification: UNCLASSIFIED

# Step 16: Apply tamper-evident seal
# Place disc in case
# Apply seal across case opening
# Record seal number
```

### Phase 5: Transport to Air-Gapped Environment

```
Same secure transport procedure as generator
(see Phase 7 in Generator Deployment)
```

### Phase 6: Installation in Air-Gapped Environment

```bash
# Environment: Air-gapped secure facility
# Time: 10 minutes

# Step 17: Verify media integrity
# Check seal intact
# Insert CD/DVD

# Step 18: Mount disc
mount /dev/sr0 /mnt/cdrom

# Step 19: Verify contents
cd /mnt/cdrom
sha256sum -c DEPLOYMENT_MANIFEST.txt
# All must show OK

# Step 20: Verify scanner.html
sha256sum scanner.html
# Compare with scanner_manifest.txt

# Step 21: Copy to local file system
sudo mkdir -p /opt/qr_scanner
sudo cp scanner.html /opt/qr_scanner/
sudo cp USER_GUIDE.txt /opt/qr_scanner/

# Step 22: Set permissions
sudo chmod 644 /opt/qr_scanner/scanner.html

# Step 23: Test in browser
# Open file:///opt/qr_scanner/scanner.html
# Verify:
# - Page loads
# - No network errors in console
# - Camera permission prompt appears
# - Can scan test QR code

# Step 24: Monitor for network activity
sudo tcpdump -i any &
# Open scanner in browser
# Verify NO network traffic
kill %1

# Step 25: Deploy to users
# Option A: Copy to shared network drive (air-gapped network)
sudo cp scanner.html /mnt/shared/qr_scanner/

# Option B: Distribute on USB sticks
# Copy scanner.html to multiple USBs for distribution
```

### Phase 7: User Distribution

```bash
# For each user:

# 1. Copy scanner.html to their computer
# 2. Create desktop shortcut (optional)
cat > ~/Desktop/QR\ Scanner.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=QR Scanner
Exec=xdg-open file:///opt/qr_scanner/scanner.html
Icon=applications-graphics
Terminal=false
EOF

chmod +x ~/Desktop/QR\ Scanner.desktop

# 3. Provide user guide
# 4. Log distribution in audit trail
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Generator Verification Checklist

```markdown
## Installation Verification

- [ ] Executable copied to /opt/qr_generator/
- [ ] Hash verification PASSED
- [ ] Signature verification PASSED (if signed)
- [ ] Configuration file present and reviewed
- [ ] Executable has execute permission

## Functional Verification

- [ ] Application starts without errors
- [ ] Version number displays correctly
- [ ] Help menu accessible
- [ ] Can generate QR codes from test file
- [ ] QR codes display correctly
- [ ] Configuration changes take effect

## Security Verification

- [ ] No network activity detected during operation
- [ ] No unauthorized file access attempts
- [ ] Logs writing to local file only
- [ ] No external connections attempted
- [ ] Encryption functioning if enabled

## Documentation

- [ ] Installation logged in audit trail
- [ ] Chain of custody form complete
- [ ] User training completed
- [ ] Incident response procedures available
```

### Scanner Verification Checklist

```markdown
## Installation Verification

- [ ] scanner.html copied to correct location
- [ ] Hash verification PASSED
- [ ] File permissions set correctly (644)
- [ ] User guide available

## Functional Verification

- [ ] Opens in browser without errors
- [ ] No console errors displayed
- [ ] Camera permission prompt appears
- [ ] Camera feed displays correctly
- [ ] Can scan test QR codes
- [ ] Progress indicator works
- [ ] File download functions

## Security Verification

- [ ] No network requests in browser console
- [ ] No external resources loaded
- [ ] No analytics/tracking code active
- [ ] IndexedDB usage only (local storage)
- [ ] No cookies set

## Documentation

- [ ] Deployment logged in audit trail
- [ ] Users notified of availability
- [ ] Support procedures established
```

---

## 🚨 INCIDENT RESPONSE

### Security Incidents

#### Unauthorized Network Activity Detected

```
1. IMMEDIATELY disconnect system from power
2. Preserve evidence (do not alter logs)
3. Notify facility security officer
4. Notify IT security team
5. Initiate incident response procedure
6. Document all actions taken
7. Await security team investigation
8. Do NOT restart application until cleared
```

#### Tampered Media Discovered

```
1. Do NOT install/use media
2. Preserve media as evidence
3. Notify security officer immediately
4. Document:
   - Media ID
   - Seal numbers
   - Evidence of tampering
   - Discovery date/time
   - Discovered by
5. Request new deployment media
6. Update chain of custody with incident
```

#### Hash Verification Failure

```
1. Do NOT proceed with installation
2. Verify deployment manifest is correct version
3. Recalculate hash manually
4. If still mismatch:
   - Document discrepancy
   - Notify security officer
   - Quarantine media
   - Request new deployment
5. Update incident log
```

---

## 📋 AUDIT & COMPLIANCE

### Required Logs

#### Installation Audit Trail
```
Date/Time: [timestamp]
Action: QR Generator Installed
Version: 3.0.0
Media ID: [USB ID]
Seal Number: [seal #]
Hash Verified: YES/NO
Signature Verified: YES/NO/N/A
Installed By: [name]
Approved By: [name]
System: [hostname]
Location: [facility/room]
```

#### Usage Audit Trail
```
Date/Time: [timestamp]
User: [username]
Action: [generate/scan]
File: [filename]
Size: [bytes]
Encryption: [enabled/disabled]
Success: [yes/no]
Errors: [if any]
```

### Compliance Checks

#### Monthly
- [ ] Review audit logs
- [ ] Verify no unauthorized modifications
- [ ] Check for security updates
- [ ] Test backup/recovery procedures

#### Quarterly
- [ ] Security assessment
- [ ] Vulnerability scan (offline tools)
- [ ] User access review
- [ ] Documentation review

#### Annually
- [ ] Full security audit
- [ ] Compliance certification renewal
- [ ] Disaster recovery drill
- [ ] Policy review and update

---

## 📞 SUPPORT

### Escalation Path

```
Level 1: Local IT Support
- Basic troubleshooting
- User assistance
- Log review

Level 2: IT Security Team
- Security incidents
- Access control
- Policy violations

Level 3: Facility Security Officer
- Classification issues
- Security breaches
- Compliance violations

Level 4: Information Assurance Officer
- Major incidents
- Certification issues
- Policy changes
```

### Contact Information

**UNCLASSIFIED contact only**
- IT Help Desk: [phone number]
- Security Desk: [phone number]
- Emergency: [emergency number]

**For classified systems**: Use approved secure communication channels

---

## 📚 REFERENCES

- DoD 5220.22-M: Media Sanitization
- NIST SP 800-88: Guidelines for Media Sanitization
- CNSSI 1253: Security Categorization
- ICD 503: Intelligence Community Classification
- Local facility security procedures

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-13
**Next Review**: 2026-01-13
**Classification**: UNCLASSIFIED
**Distribution**: Authorized Personnel Only
