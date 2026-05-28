const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

// ─────────────────────────────────────────────
// APP SETUP
// ─────────────────────────────────────────────
const app = express();

// Allow requests from the Vercel frontend (set CORS_ORIGIN in Render dashboard).
// Falls back to permissive '*' so local dev works without extra config.
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : '*';

app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] }));
app.use(express.json());

// ─────────────────────────────────────────────
// HEALTH ENDPOINT (Render free tier keep-alive)
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.get('/', (_req, res) => {
    res.status(200).send('SheCode Realtime Editor — Socket.IO server is running ✅');
});

// ─────────────────────────────────────────────
// HTTP + SOCKET.IO SERVER
// ─────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
    },
});

// ─────────────────────────────────────────────
// IN-MEMORY STATE
// ─────────────────────────────────────────────
const userSocketMap = {};  // socketId  → username
const roomCode     = {};   // roomID    → latest code string
const roomBoards   = {};   // roomID    → array of stroke objects

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getAllConnectedClients(roomID) {
    return Array.from(io.sockets.adapter.rooms.get(roomID) || []).map(
        (socketID) => ({ socketID, username: userSocketMap[socketID] })
    );
}

// ─────────────────────────────────────────────
// SOCKET CONNECTION
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[+] Socket connected: ${socket.id}`);

    // ── JOIN ROOM ─────────────────────────────
    socket.on(ACTIONS.JOIN, ({ roomID, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomID);

        const clients = getAllConnectedClients(roomID);

        // Send saved code to the new joiner
        if (roomCode[roomID]) {
            io.to(socket.id).emit(ACTIONS.CODE_CHANGE, { code: roomCode[roomID] });
        }

        // Send saved whiteboard strokes to the new joiner
        if (roomBoards[roomID]?.length) {
            io.to(socket.id).emit('load-board', roomBoards[roomID]);
        }

        // Notify all room members
        clients.forEach(({ socketID }) => {
            io.to(socketID).emit(ACTIONS.JOINED, { clients, username, socketID: socket.id });
        });

        console.log(`[room:${roomID}] ${username} joined (${clients.length} online)`);
    });

    // ── TYPING INDICATORS ─────────────────────
    socket.on(ACTIONS.TYPING, ({ roomID, username }) => {
        socket.in(roomID).emit(ACTIONS.TYPING, { username });
    });

    socket.on(ACTIONS.STOP_TYPING, ({ roomID }) => {
        socket.in(roomID).emit(ACTIONS.STOP_TYPING);
    });

    // ── REALTIME CODE SYNC ────────────────────
    socket.on(ACTIONS.CODE_CHANGE, ({ roomID, code }) => {
        roomCode[roomID] = code;
        socket.to(roomID).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // ── REALTIME WHITEBOARD ───────────────────
    socket.on(ACTIONS.DRAW, ({ roomID, x0, y0, x1, y1, color, thickness, isEraser }) => {
        if (!roomBoards[roomID]) roomBoards[roomID] = [];
        roomBoards[roomID].push({ x0, y0, x1, y1, color, thickness, isEraser });
        socket.to(roomID).emit(ACTIONS.DRAW, { x0, y0, x1, y1, color, thickness, isEraser });
    });


    socket.on(ACTIONS.CLEAR_BOARD, ({ roomID }) => {
        roomBoards[roomID] = [];
        socket.to(roomID).emit(ACTIONS.CLEAR_BOARD);
    });


    // ── DISCONNECTING ─────────────────────────
    socket.on('disconnecting', () => {
        [...socket.rooms].forEach((roomID) => {
            if (roomID !== socket.id) {
                socket.to(roomID).emit(ACTIONS.DISCONNECTED, {
                    socketID: socket.id,
                    username: userSocketMap[socket.id],
                });
            }
        });
    });

    socket.on('disconnect', () => {
        console.log(`[-] Socket disconnected: ${socket.id} (${userSocketMap[socket.id] ?? 'unknown'})`);
        delete userSocketMap[socket.id];
    });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`\n🚀 SheCode server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────
const shutdown = (signal) => {
    console.log(`\n[${signal}] Shutting down gracefully…`);
    server.close(() => {
        console.log('HTTP server closed. Bye! 👋');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));