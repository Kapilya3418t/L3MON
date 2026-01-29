const db = require('./databaseGateway');

// Add log to separate log DB
function log(type, message) {
  const logType = typeof type === 'string'
    ? type
    : (type?.name || 'unknown');

  const entry = {
    time: new Date().toISOString(),
    type: logType,
    message
  };

  db.logdb.get('logs').push(entry).write();
  console.log(`[${entry.time}] ${logType.toUpperCase()}: ${message}`);
}

// Get logs (newest first)
function getLogs() {
  return db.logdb.get('logs')
    .sortBy('time')
    .reverse()
    .value();
}

module.exports = {
  log,
  getLogs
};