import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import './Dashboard.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [savedBoards, setSavedBoards] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        } else {
            navigate('/auth');
        }

        // Load saved boards
        loadSavedBoards();
    }, [navigate]);

    const loadSavedBoards = () => {
        const boards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
        setSavedBoards(boards);
    };

    const createNewWhiteboard = async () => {
        setIsCreating(true);
        try {
            const response = await api.post('/whiteboards/create', {
                roomName: 'My Whiteboard'
            });
            
            if (response.success) {
                const roomCode = response.roomCode;
                // Join the room after creating it
                await api.post(`/whiteboards/${roomCode}/join`, {
                    username: user?.username || 'Anonymous'
                });
                
                navigate(`/whiteboard/${roomCode}`);
            }
        } catch (error) {
            console.error('Error creating whiteboard:', error);
            alert('Failed to create whiteboard. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const joinWhiteboard = async (e) => {
        e.preventDefault();
        if (roomCode.trim()) {
            try {
                const response = await api.post(`/whiteboards/${roomCode}/join`, {
                    username: user?.username || 'Anonymous'
                });
                
                if (response.success) {
                    navigate(`/whiteboard/${roomCode}`);
                } else {
                    alert('Room not found. Please check the room code.');
                }
            } catch (error) {
                console.error('Error joining whiteboard:', error);
                alert('Room not found. Please check the room code and ensure backend is running.');
            }
        }
    };

    const deleteSavedBoard = (boardId) => {
        const updatedBoards = savedBoards.filter(board => board.id !== boardId);
        setSavedBoards(updatedBoards);
        localStorage.setItem('savedBoards', JSON.stringify(updatedBoards));
    };

    const openSavedBoard = (board) => {
        // For saved boards, we'll navigate to a new room or show the image
        // For now, we'll just show an alert with options
        const shouldOpen = window.confirm(`Open board "${board.name}" in a new room?`);
        if (shouldOpen) {
            createNewWhiteboard();
        }
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="container">
                    <h1>Welcome back, {user.username}!</h1>
                    <p>Start a new whiteboard or continue where you left off</p>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="container">
                    <div className="action-cards">
                        <div className="action-card">
                            <h2>Create New Whiteboard</h2>
                            <p>Start a fresh collaborative session</p>
                            <button 
                                onClick={createNewWhiteboard}
                                className="btn btn-primary"
                                disabled={isCreating}
                            >
                                {isCreating ? 'Creating...' : '+ New Whiteboard'}
                            </button>
                        </div>

                        <div className="action-card">
                            <h2>Join Existing Whiteboard</h2>
                            <p>Enter a room code to join a session</p>
                            <form onSubmit={joinWhiteboard} className="join-form">
                                <div className="form-group">
                                    <label htmlFor="roomCode" className="form-label">
                                        Room Code
                                    </label>
                                    <input
                                        type="text"
                                        id="roomCode"
                                        className="form-input"
                                        placeholder="Enter room code..."
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-secondary">
                                    Join Board
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="saved-boards">
                        <h3>Saved Boards ({savedBoards.length})</h3>
                        {savedBoards.length === 0 ? (
                            <div className="empty-state">
                                <p>No saved boards yet. Create a whiteboard and save your work!</p>
                            </div>
                        ) : (
                            <div className="boards-grid">
                                {savedBoards.map((board) => (
                                    <div key={board.id} className="board-card">
                                        <div className="board-thumbnail">
                                            <img 
                                                src={board.thumbnail} 
                                                alt={board.name}
                                                onClick={() => openSavedBoard(board)}
                                            />
                                        </div>
                                        <div className="board-info">
                                            <h4>{board.name}</h4>
                                            <p>Room: {board.roomCode}</p>
                                            <p>Saved: {new Date(board.savedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="board-actions">
                                            <button 
                                                className="btn btn-primary btn-sm"
                                                onClick={() => openSavedBoard(board)}
                                            >
                                                Open
                                            </button>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => deleteSavedBoard(board.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;