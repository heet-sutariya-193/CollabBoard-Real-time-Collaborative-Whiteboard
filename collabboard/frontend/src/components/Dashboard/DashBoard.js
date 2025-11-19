import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, savedBoardsAPI } from '../../utils/api';
import './Dashboard.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [savedBoards, setSavedBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const userObj = JSON.parse(userData);
            setUser(userObj);
            loadSavedBoards(userObj.id);
        } else {
            navigate('/auth');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/auth');
    };

    const loadSavedBoards = async (userId) => {
        try {
            setLoading(true);
            console.log('Loading saved boards for user:', userId);
            
            const response = await savedBoardsAPI.getSavedBoards(userId);
            console.log('Saved boards API response:', response);
            
            if (response.success) {
                setSavedBoards(response.savedBoards || []);
            } else {
                // Fallback to localStorage
                console.log('Falling back to localStorage');
                const boards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
                setSavedBoards(boards);
            }
        } catch (error) {
            console.error('Error loading saved boards:', error);
            // Fallback to localStorage
            const boards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
            setSavedBoards(boards);
        } finally {
            setLoading(false);
        }
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

    const deleteSavedBoard = async (boardId) => {
        const shouldDelete = window.confirm('Are you sure you want to delete this board?');
        if (!shouldDelete) return;

        try {
            // Try to delete from database first
            const response = await savedBoardsAPI.deleteBoard(boardId);
            if (response.success) {
                setSavedBoards(prev => prev.filter(board => board._id !== boardId));
                // Also remove from localStorage if it exists there
                const localBoards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
                const updatedLocalBoards = localBoards.filter(board => board.id !== boardId);
                localStorage.setItem('savedBoards', JSON.stringify(updatedLocalBoards));
            } else {
                throw new Error('Failed to delete from database');
            }
        } catch (error) {
            console.error('Error deleting board from database:', error);
            // Fallback to localStorage
            const updatedBoards = savedBoards.filter(board => (board._id !== boardId && board.id !== boardId));
            setSavedBoards(updatedBoards);
            localStorage.setItem('savedBoards', JSON.stringify(updatedBoards));
        }
    };

    const openSavedBoard = (board) => {
        const shouldOpen = window.confirm(`Open board "${board.name}" with your saved drawing?`);
        if (shouldOpen) {
            createNewWhiteboard(board);
        }
    };

    // Refresh saved boards
    const refreshSavedBoards = () => {
        if (user) {
            loadSavedBoards(user.id);
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
                        <div className="header-actions">
                            <button 
                                onClick={refreshSavedBoards}
                                className="refresh-btn"
                                title="Refresh saved boards"
                            >
                                🔄 Refresh
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="logout-btn"
                            >
                                Logout
                            </button>
                        </div>
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
                        <div className="section-header">
                            <div className="section-title">
                                <h2>Saved Boards</h2>
                                <span className="count-badge">{savedBoards.length}</span>
                            </div>
                            <button 
                                onClick={refreshSavedBoards}
                                className="btn-refresh"
                                disabled={loading}
                            >
                                {loading ? '🔄' : '🔄'} Refresh
                            </button>
                        </div>
                        
                        {loading ? (
                            <div className="empty-state">
                                <div className="loading-spinner"></div>
                                <p>Loading your boards...</p>
                            </div>
                        ) : savedBoards.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📁</div>
                                <h3>No saved boards yet</h3>
                                <p>Create a whiteboard and save your work to see it here</p>
                            </div>
                        ) : (
                            <div className="boards-grid">
                                {savedBoards.map((board) => (
                                    <div key={board._id || board.id} className="board-card">
                                        <div className="board-header">
                                            <img 
                                                src={board.thumbnail || board.imageData} 
                                                alt={board.name}
                                                className="board-thumbnail"
                                                onError={(e) => {
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03NSA1MEgxMjVNODcuNSA1MFYzNy41TTg3LjUgNTBWNjIuNSIgc3Ryb2tlPSIjOEM4QzhDIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2Zz4K';
                                                }}
                                            />
                                            <div className="board-actions">
                                                <button 
                                                    className="btn-action btn-open"
                                                    onClick={() => openSavedBoard(board)}
                                                >
                                                    Open
                                                </button>
                                                <button 
                                                    className="btn-action btn-delete"
                                                    onClick={() => deleteSavedBoard(board._id || board.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="board-content">
                                            <h4 className="board-name">{board.name}</h4>
                                            <div className="board-info">
                                                <span className="info-item">Room: {board.roomCode}</span>
                                                <span className="info-item">
                                                    Saved: {new Date(board.createdAt || board.savedAt).toLocaleDateString()}
                                                </span>
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
