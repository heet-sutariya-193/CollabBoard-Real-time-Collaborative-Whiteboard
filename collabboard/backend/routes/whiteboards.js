const express = require('express');
const router = express.Router();
const Whiteboard = require('../models/Whiteboard');
const Message = require('../models/Message');

// Generate room code
function generateRoomCode() {
    const adjectives = ['swift', 'quick', 'smart', 'bold', 'clear', 'sharp', 'bright'];
    const nouns = ['star', 'moon', 'sun', 'wave', 'tree', 'cloud', 'river'];
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}-${noun}-${number}`;
}

// Create new whiteboard
router.post('/create', async (req, res) => {
    try {
        const { roomName } = req.body;
        
        const roomCode = generateRoomCode();
        const whiteboard = new Whiteboard({
            roomCode,
            roomName: roomName || 'My Whiteboard',
            owner: null, // For demo, we're not using real auth
            users: []
        });

        await whiteboard.save();
        
        res.json({
            success: true,
            roomCode,
            message: 'Whiteboard created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating whiteboard'
        });
    }
});

// Join whiteboard
router.post('/:roomCode/join', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { username } = req.body;

        const whiteboard = await Whiteboard.findOne({ roomCode });
        
        if (!whiteboard) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if user already in room
        const existingUser = whiteboard.users.find(user => user.username === username);
        if (!existingUser) {
            whiteboard.users.push({
                username,
                joinedAt: new Date()
            });
            await whiteboard.save();
        }

        res.json({
            success: true,
            whiteboard: {
                roomCode: whiteboard.roomCode,
                roomName: whiteboard.roomName,
                users: whiteboard.users
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error joining whiteboard'
        });
    }
});

// Get whiteboard info
router.get('/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const whiteboard = await Whiteboard.findOne({ roomCode });

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

// Get messages for a room
router.get('/:roomCode/messages', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const messages = await Message.find({ roomCode })
            .sort({ timestamp: 1 })
            .limit(100);

        res.json({
            success: true,
            messages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
});

// Add message to room
router.post('/:roomCode/messages', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { sender, text } = req.body;

        const message = new Message({
            roomCode,
            sender,
            text
        });

        await message.save();

        res.json({
            success: true,
            message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error sending message'
        });
    }
});

module.exports = router;