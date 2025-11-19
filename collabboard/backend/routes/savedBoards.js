const express = require('express');
const SavedBoard = require('../models/SavedBoard');
const router = express.Router();

// Get all saved boards for a user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const savedBoards = await SavedBoard.find({ userId }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            savedBoards
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching saved boards'
        });
    }
});

// Save a new board
router.post('/', async (req, res) => {
    try {
        const { userId, roomCode, name, imageData, thumbnail, drawingData } = req.body;
        
        const savedBoard = new SavedBoard({
            userId,
            roomCode,
            name,
            imageData,
            thumbnail,
            drawingData
        });
        
        await savedBoard.save();
        
        res.json({
            success: true,
            message: 'Board saved successfully',
            savedBoard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving board'
        });
    }
});

// Delete a saved board
router.delete('/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        await SavedBoard.findByIdAndDelete(boardId);
        
        res.json({
            success: true,
            message: 'Board deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting board'
        });
    }
});

module.exports = router;
