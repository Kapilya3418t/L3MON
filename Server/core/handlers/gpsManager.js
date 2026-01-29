// GPS Manager Module
class GpsManager {
    constructor(config, logManager) {
        this.config = config;
        this.logManager = logManager;
        this.gpsPollers = {};
    }

    gpsPoll(clientManager, clientID) {
        if (this.gpsPollers[clientID]) clearInterval(this.gpsPollers[clientID]);

        let clientDB = clientManager.getClientDatabase(clientID);
        let gpsSettings = clientDB.get('GPSSettings').value();

        if (gpsSettings.updateFrequency > 0) {
            this.gpsPollers[clientID] = setInterval(() => {
                this.logManager.log(this.config.logTypes.info, clientID + " POLL COMMAND - GPS");
                clientManager.sendCommand(clientID, '0xLO');
            }, gpsSettings.updateFrequency * 1000);
        }
    }

    setGpsPollSpeed(clientManager, clientID, pollevery, cb) {
        if (pollevery >= 30) {
            let clientDB = clientManager.getClientDatabase(clientID);
            clientDB.get('GPSSettings').assign({ updateFrequency: pollevery }).write();
            cb(false);
            this.gpsPoll(clientManager, clientID);
        } else return cb('Polling Too Short!');
    }

    clearGpsPoller(clientID) {
        if (this.gpsPollers[clientID]) {
            clearInterval(this.gpsPollers[clientID]);
            delete this.gpsPollers[clientID];
        }
    }
}

module.exports = GpsManager;

