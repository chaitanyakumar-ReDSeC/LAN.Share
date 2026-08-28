const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Store active streams: { socketId: deviceName }
const activeStreams = {};

io.on('connection', (socket) => {
    // Send existing active streams to new client
    socket.emit('active-streams', activeStreams);

    // Register screen share stream
    socket.on('start-share', (deviceName) => {
        activeStreams[socket.id] = deviceName || `Device-${socket.id.substring(0, 4)}`;
        io.emit('stream-added', { id: socket.id, name: activeStreams[socket.id] });
    });

    // Handle stream stop
    socket.on('stop-share', () => {
        if (activeStreams[socket.id]) {
            delete activeStreams[socket.id];
            io.emit('stream-removed', socket.id);
        }
    });

    // WebRTC Signaling Forwarding
    socket.on('offer', ({ target, offer }) => {
        io.to(target).emit('offer', { sender: socket.id, offer });
    });

    socket.on('answer', ({ target, answer }) => {
        io.to(target).emit('answer', { sender: socket.id, answer });
    });

    socket.on('ice-candidate', ({ target, candidate }) => {
        io.to(target).emit('ice-candidate', { sender: socket.id, candidate });
    });

    socket.on('disconnect', () => {
        if (activeStreams[socket.id]) {
            delete activeStreams[socket.id];
            io.emit('stream-removed', socket.id);
        }
    });
});

// Utility to get local IPv4 address
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        // Skip virtual interfaces (Hyper-V, VirtualBox, WSL, vEthernet)
        const lowerName = name.toLowerCase();
        if (lowerName.includes('virtual') || lowerName.includes('wsl') || lowerName.includes('vethernet') || lowerName.includes('vmnet')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`\n========================================`);
    console.log(`  🚀 LANshare Server Running!`);
    console.log(`  Local Access: http://localhost:${PORT}`);
    console.log(`  LAN Access:   http://${ip}:${PORT}`);
    console.log(`========================================\n`);
});