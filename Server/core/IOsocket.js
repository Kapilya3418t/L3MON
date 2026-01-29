// core/IOsocket.js
const IO = require('socket.io');
const geoip = require('geoip-lite');
const qs = require('querystring');

module.exports = function initSocketServer(httpServer, clientManager, config) {
    const io = IO(httpServer, {
        transports: ['websocket', 'polling'],
        pingInterval: 30000,
        pingTimeout: 60000
    });

    if (io.origins) {
        io.origins('*:*');
    }

    io.on('connection', (socket) => {
        socket.emit('welcome');

        const rawParams = socket.handshake.query || {};
        const params = typeof rawParams === 'string' ? qs.parse(rawParams) : rawParams;
        const rawIP = socket.request.connection.remoteAddress || '0.0.0.0';
        const clientIP = rawIP.substring(rawIP.lastIndexOf(':') + 1);
        const clientGeo = geoip.lookup(clientIP) || {};

        clientManager.clientConnect(socket, params.id || 'unknown', {
            clientIP,
            clientGeo,
            device: {
                model: params.model || 'Unknown',
                manufacture: params.manf || 'Unknown',
                version: params.release || 'Unknown'
            }
        });

        if (config.debug) {
            const originalOnevent = socket.onevent;
            socket.onevent = function (packet) {
                const args = packet.data || [];
                originalOnevent.call(this, packet);
                packet.data = ['*', ...args];
                originalOnevent.call(this, packet);
            };

            socket.on('*', (event, data) => {
                console.log(`[DEBUG SOCKET] Event: ${event}`);
                console.log(data);
            });
        }
    });

    return io;
};
