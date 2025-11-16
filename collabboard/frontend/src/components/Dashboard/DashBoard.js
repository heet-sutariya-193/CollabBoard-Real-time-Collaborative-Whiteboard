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
        loadSavedBoards();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/auth');
    };

    const loadSavedBoards = () => {
        const boards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
        setSavedBoards(boards);
    };

    const createNewWhiteboard = async (savedBoardData = null) => {
        setIsCreating(true);
        try {
            const response = await api.post('/whiteboards/create', {
                roomName: savedBoardData ? savedBoardData.name : 'My Whiteboard'
            });
            
            if (response.success) {
                const roomCode = response.roomCode;
                await api.post(`/whiteboards/${roomCode}/join`, {
                    username: user?.username || 'Anonymous'
                });
                
                if (savedBoardData) {
                    navigate(`/whiteboard/${roomCode}`, { 
                        state: { 
                            savedBoard: savedBoardData 
                        } 
                    });
                } else {
                    navigate(`/whiteboard/${roomCode}`);
                }
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
                alert('Room not found. Please check the room code.');
            }
        }
    };

    const deleteSavedBoard = (boardId) => {
        const updatedBoards = savedBoards.filter(board => board.id !== boardId);
        setSavedBoards(updatedBoards);
        localStorage.setItem('savedBoards', JSON.stringify(updatedBoards));
    };

    const openSavedBoard = (board) => {
        const shouldOpen = window.confirm(`Open board "${board.name}" with your saved drawing?`);
        if (shouldOpen) {
            createNewWhiteboard(board);
        }
    };

    if (!user) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-container">
                    <div className="header-main">
                        <div className="welcome-section">
                            <h1>Welcome, {user.username}!</h1>
                            <p>Start a new whiteboard or continue where you left off</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="logout-btn"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="container">
                    <div className="actions-row">
                        <div className="action-card create-card">
                            <div className="card-icon">🎨</div>
                            <h2>Create New Whiteboard</h2>
                            <p>Start a fresh collaborative session</p>
                            <button 
                                onClick={() => createNewWhiteboard()}
                                className="btn btn-primary"
                                disabled={isCreating}
                            >
                                {isCreating ? 'Creating...' : 'Create Whiteboard'}
                            </button>
                        </div>

                        <div className="action-card join-card">
                            <div className="card-icon">👥</div>
                            <h2>Join Whiteboard</h2>
                            <p>Enter a room code to join a session</p>
                            <form onSubmit={joinWhiteboard} className="join-form">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter room code..."
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn btn-secondary">
                                    Join Room
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="saved-section">
                        <div className="section-title">
                            <h2>Saved Boards</h2>
                            <span className="count-badge">{savedBoards.length}</span>
                        </div>
                        
                        {savedBoards.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📁</div>
                                <h3>No saved boards yet</h3>
                                <p>Create a whiteboard and save your work to see it here</p>
                            </div>
                        ) : (
                            <div className="boards-grid">
                                {savedBoards.map((board) => (
                                    <div key={board.id} className="board-card">
                                        <div className="board-preview">
                                            <img 
                                                src={board.thumbnail} 
                                                alt={board.name}
                                            />
                                        </div>
                                        <div className="board-info">
                                            <h4 className="board-name">{board.name}</h4>
                                            <div className="board-details">
                                                <span className="room-code">Room: {board.roomCode}</span>
                                                <span className="saved-date">Saved: {new Date(board.savedAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="board-actions">
                                                <button 
                                                    className="btn-open"
                                                    onClick={() => openSavedBoard(board)}
                                                >
                                                    Open
                                                </button>
                                                <button 
                                                    className="btn-delete"
                                                    onClick={() => deleteSavedBoard(board.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
