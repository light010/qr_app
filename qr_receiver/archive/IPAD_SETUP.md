# 📱 iPad Setup Guide for QR Receiver

Complete guide to access QR Receiver scanner from your iPad.

## 🚀 Quick Start

### Step 1: Start Server on Computer
```bash
cd qr_receiver_project
python main.py --host 0.0.0.0 --port 8000
```

**⚠️ CRITICAL**: Must use `--host 0.0.0.0` for iPad access!

### Step 2: Find Computer's IP Address

#### Windows:
```cmd
ipconfig | findstr "IPv4"
```

#### Mac:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

#### Linux:
```bash
hostname -I
```

### Step 3: Open on iPad
1. **Open Safari** on iPad
2. **Navigate to**: `http://YOUR_IP_ADDRESS:8000`
   - Example: `http://192.168.1.100:8000`
3. **Allow camera access** when prompted
4. **Start scanning QR codes**

## 📱 iPad Safari Setup

### Camera Permissions
1. Safari will prompt: **"Allow camera access"**
2. **Tap "Allow"**
3. If missed: **Settings > Safari > Camera > Allow**

### Optimal Settings
- **Portrait mode** for most QR codes
- **Landscape mode** for larger displays
- **Good lighting** essential
- **Steady hands** for best detection

## 🌐 Network Requirements

### Same WiFi Network
- Computer and iPad must be on **same WiFi**
- Check WiFi name matches on both devices

### Firewall Settings
- **Windows**: Allow Python through firewall
- **Mac**: System Preferences > Security > Firewall > Allow
- **Router**: Some block device communication (check router settings)

## 🔧 Troubleshooting

### Connection Issues

#### Can't Reach Server?
```bash
# Try different port
python main.py --host 0.0.0.0 --port 8080

# Check server status
# Should see: "Open http://0.0.0.0:8000 in your browser"
```

#### Test Connection:
```bash
# On computer, test if server responds
curl http://localhost:8000

# Check if port is open
netstat -an | grep 8000
```

### Camera Issues

#### Safari Camera Not Working?
1. **Refresh page** (pull down in Safari)
2. **Close and reopen Safari**
3. **Restart iPad**
4. **Check Settings > Privacy > Camera > Safari**

#### Alternative Browsers:
- **Chrome**: May work if Safari fails
- **Firefox**: Good alternative option
- **Edge**: Available on iPad

### Network Debugging

#### Find All Available IPs:
```bash
# Windows - show all network adapters
ipconfig /all

# Mac/Linux - detailed network info
ifconfig -a
```

#### Common IP Ranges:
- **Home networks**: `192.168.1.x` or `192.168.0.x`
- **Corporate**: `10.x.x.x` or `172.16.x.x`
- **Hotspot**: `192.168.43.x`

## 🎯 Pro Tips

### Easy Access Methods

#### QR Code for URL:
1. Generate QR code with your server URL
2. Scan with iPad Camera app
3. Tap notification to open in Safari

#### Add to Home Screen:
1. Open receiver in Safari
2. Tap **Share button**
3. Select **"Add to Home Screen"**
4. Creates app-like icon

#### Bookmark for Later:
1. Tap **Bookmarks** in Safari
2. Add bookmark with name "QR Receiver"
3. Quick access from bookmarks menu

### Scanning Best Practices

#### Optimal Conditions:
- **Distance**: 6-12 inches from screen
- **Angle**: Straight on, not tilted
- **Lighting**: Bright, even lighting
- **Stability**: Keep iPad steady

#### QR Code Size:
- **Minimum**: 1 inch square
- **Optimal**: 2-3 inches square
- **Maximum**: Full screen works great

#### Scanning Speed:
- **Auto-detection**: Usually 1-2 seconds
- **Manual focus**: Tap screen to focus
- **Multiple codes**: Scan one at a time

## 📋 Common URLs

### Default Setup:
```
http://192.168.1.100:8000    # Most common home network
http://192.168.0.100:8000    # Alternative home network
http://10.0.0.100:8000       # Some routers use this range
```

### Custom Ports:
```
http://192.168.1.100:8080    # Alternative port
http://192.168.1.100:3000    # Development port
http://192.168.1.100:80      # Standard web port
```

### Localhost (Computer Only):
```
http://localhost:8000        # Only works on same computer
http://127.0.0.1:8000       # Same as localhost
```

## 🔒 Security Notes

### Network Security:
- **Home network**: Generally safe
- **Public WiFi**: Use with caution
- **Corporate network**: Check IT policies

### Data Privacy:
- **Air-gapped mode**: No internet required
- **Local processing**: Data stays on network
- **Zero persistence**: No files stored permanently

## 📞 Quick Support

### Server Not Starting?
```bash
# Check Python version
python --version

# Install dependencies
pip install aiohttp aiohttp-cors segno pillow

# Restart with verbose output
python main.py --host 0.0.0.0 --port 8000 --verbose --debug
```

### iPad Not Connecting?
1. **Verify IP address** is correct
2. **Check WiFi connection** on both devices
3. **Try different port** (8080, 3000, 8888)
4. **Restart router** if needed
5. **Use computer browser first** to test server

### Camera Permission Denied?
1. **Settings > Privacy & Security > Camera**
2. **Find Safari** in list
3. **Enable camera access**
4. **Restart Safari**

## 🎉 Success Indicators

### Server Running:
```
✅ QR Receiver starting at http://0.0.0.0:8000
✅ Open http://0.0.0.0:8000 in your browser
✅ Point QR codes at your camera to receive files
```

### iPad Connected:
- ✅ Camera preview visible
- ✅ "Allow camera access" granted
- ✅ Interface loads without errors
- ✅ QR detection working

### File Transfer:
- ✅ QR codes detected automatically
- ✅ Progress bars updating
- ✅ Files appearing in Downloads
- ✅ No connection errors

---

**Need help?** Run the server with `--verbose --debug` for detailed output.