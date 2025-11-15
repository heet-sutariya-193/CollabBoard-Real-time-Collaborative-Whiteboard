const mongoose = require('mongoose');

const whiteboardSchema = new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true },
    roomName: { type: String, default: 'My Whiteboard' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    users: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        joinedAt: { type: Date, default: Date.now }
    }],
    settings: {
        isPublic: { type: Boolean, default: true },
        maxUsers: { type: Number, default: 10 },
        allowDrawing: { type: Boolean, default: true },
        allowChat: { type: Boolean, default: true }
    },
    drawings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        tool: String,
        color: String,
        brushSize: Number,
        points: [[Number]],
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Whiteboard', whiteboardSchema);