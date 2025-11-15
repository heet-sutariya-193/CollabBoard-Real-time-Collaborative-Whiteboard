require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (for testing)
const whiteboards = new Map();
const roomUsers = new Map();

// Generate room code
function generateRoomCode() {
    const adjectives = ['swift', 'quick', 'smart', 'bold', 'clear', 'sharp', 'bright'];
    const nouns = ['star', 'moon', 'sun', 'wave', 'tree', 'cloud', 'river'];
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}-${noun}-${number}`;
}

// Routes
app.get('/api', (req, res) => {
    res.json({ message: 'CollabBoard API is running!' });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'In-memory (Testing)',
        timestamp: new Date().toISOString()
    });
});

// Create whiteboard
app.post('/api/whiteboards/create', (req, res) => {
    try {
        const { roomName } = req.body;
        const roomCode = generateRoomCode();
        
        whiteboards.set(roomCode, {
            roomCode,
            roomName: roomName || 'My Whiteboard',
            users: [],
            drawings: [],
            createdAt: new Date()
        });

        console.log(`✅ Whiteboard created: ${roomCode}`);
        
        res.json({
            success: true,
            roomCode,
            message: 'Whiteboard created successfully'
        });
    } catch (error) {
        console.error('Error creating whiteboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating whiteboard'
        });
    }
});

// Join whiteboard
app.post('/api/whiteboards/:roomCode/join', (req, res) => {
    try {
        const { roomCode } = req.params;
        const { username } = req.body;

        const whiteboard = whiteboards.get(roomCode);
        
        if (!whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Add user if not already in room
        if (!whiteboard.users.includes(username)) {
            whiteboard.users.push(username);
        }

        console.log(`✅ User ${username} joined room: ${roomCode}`);
        
        res.json({
            success: true,
            whiteboard: {
                roomCode: whiteboard.roomCode,
                roomName: whiteboard.roomName,
                users: whiteboard.users
            }
        });
    } catch (error) {
        console.error('Error joining whiteboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining whiteboard'
        });
    }
});

// Get whiteboard info
app.get('/api/whiteboards/:roomCode', (req, res) => {
    try {
        const { roomCode } = req.params;
        const whiteboard = whiteboards.get(roomCode);

        if (!whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            whiteboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching whiteboard'
        });
    }
});

// Socket.io for real-time collaboration
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (roomCode, username) => {
        socket.join(roomCode);
        
        // Track users in room
        if (!roomUsers.has(roomCode)) {
            roomUsers.set(roomCode, new Set());
        }
        roomUsers.get(roomCode).add(username);
        
        console.log(`User ${username} joined room: ${roomCode}`);
        
        // Notify others in the room
        socket.to(roomCode).emit('user-joined', username);
        
        // Send current users to the new user
        socket.emit('current-users', Array.from(roomUsers.get(roomCode)));
    });

    socket.on('drawing', (data) => {
        socket.to(data.roomCode).emit('drawing', data);
    });

    socket.on('chat-message', (data) => {
        io.to(data.roomCode).emit('chat-message', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove user from all rooms (simplified)
        for (const [roomCode, users] of roomUsers.entries()) {
            users.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Simple Server running on http://localhost:${PORT}`);
    console.log(`📊 API Health check: http://localhost:${PORT}/api/health`);
    console.log(`💾 Using in-memory storage (no MongoDB required)`);
});