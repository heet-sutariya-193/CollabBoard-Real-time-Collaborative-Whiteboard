const mongoose = require('mongoose');

const savedBoardSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    roomCode: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    imageData: { 
        type: String, 
        required: true 
    },
    thumbnail: { 
        type: String, 
        required: true 
    },
    drawingData: { // Store actual drawing data for better sync
        type: Array,
        default: []
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('SavedBoard', savedBoardSchema);
