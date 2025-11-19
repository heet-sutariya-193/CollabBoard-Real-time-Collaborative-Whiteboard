import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DrawingTool } from '../../classes/DrawingTool';
import { savedBoardsAPI } from '../../utils/api';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import ChatPanel from './ChatPanel';
import UserList from './UserList';
import './WhiteboardRoom.css';

const WhiteboardRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState(JSON.parse(localStorage.getItem('user')));
    const [drawingTool] = useState(new DrawingTool());
    const [roomUsers, setRoomUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [drawingHistory, setDrawingHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [hasLoadedSavedBoard, setHasLoadedSavedBoard] = useState(false);
    const canvasRef = useRef(null);

    // Load saved board if provided
    useEffect(() => {
        const savedBoard = location.state?.savedBoard;
        if (savedBoard && !hasLoadedSavedBoard && canvasRef.current) {
            const { imageData } = savedBoard;
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
                saveCanvasState();
                setHasLoadedSavedBoard(true);
                addMessage('system', 'Saved board loaded successfully!');
            };
            img.src = imageData;
        }
    }, [location.state, hasLoadedSavedBoard]);

    useEffect(() => {
        const newSocket = io('https://collabboard-real-time-collaborative.onrender.com');
        setSocket(newSocket);

        if (user && roomId) {
            newSocket.emit('join-room', roomId, user.username);
        }

        // Socket event listeners
        newSocket.on('current-users', (users) => {
            setRoomUsers(users);
        });

        newSocket.on('user-joined', (username) => {
            setRoomUsers(prev => [...prev, username]);
            addMessage('system', `${username} joined the room`);
        });

        newSocket.on('user-left', (username) => {
            setRoomUsers(prev => prev.filter(user => user !== username));
            addMessage('system', `${username} left the room`);
        });

        newSocket.on('drawing', (data) => {
            if (canvasRef.current && data.sender !== user.username) {
                const ctx = canvasRef.current.getContext('2d');
                drawRemote(ctx, data);
            }
        });

        newSocket.on('canvas-cleared', (data) => {
            if (canvasRef.current && data.sender !== user.username) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                saveCanvasState();
                addMessage('system', `${data.sender} cleared the canvas`);
            }
        });

        newSocket.on('undo-performed', (data) => {
            if (data.sender !== user.username) {
                undo();
                addMessage('system', `${data.sender} undid an action`);
            }
        });

        newSocket.on('redo-performed', (data) => {
            if (data.sender !== user.username) {
                redo();
                addMessage('system', `${data.sender} redid an action`);
            }
        });

        newSocket.on('tool-changed', (data) => {
            if (data.sender !== user.username) {
                drawingTool.setTool(data.tool);
                drawingTool.setColor(data.color);
                drawingTool.setBrushSize(data.brushSize);
            }
        });

        newSocket.on('chat-message', (data) => {
            addMessage(data.sender, data.text);
        });

        // Set up drawing tool callback for real-time sync
        drawingTool.setOnDraw((drawingData) => {
            if (newSocket && roomId) {
                newSocket.emit('drawing', {
                    ...drawingData,
                    roomCode: roomId,
                    sender: user.username
                });
            }
        });

        drawingTool.setOnDrawEnd(() => {
            saveCanvasState();
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user, roomId, drawingTool]);

    const saveCanvasState = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const imageData = canvas.toDataURL();
            setDrawingHistory(prev => [...prev, imageData]);
            setRedoHistory([]);
        }
    };

    // Save board to database
    const saveBoard = async () => {
        if (canvasRef.current && user) {
            const canvas = canvasRef.current;
            const imageData = canvas.toDataURL('image/png');
            
            const boardData = {
                userId: user.id,
                roomCode: roomId,
                imageData: imageData,
                name: `Board-${roomId}-${new Date().toLocaleDateString()}`,
                thumbnail: imageData,
                drawingData: drawingHistory
            };

            try {
                const response = await savedBoardsAPI.saveBoard(boardData);
                if (response.success) {
                    addMessage('system', 'Board saved to cloud successfully!');
                    return true;
                }
            } catch (error) {
                console.error('Error saving board to database:', error);
                // Fallback to localStorage
                const savedBoards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
                savedBoards.push({
                    ...boardData,
                    id: Date.now().toString(),
                    savedAt: new Date().toISOString()
                });
                localStorage.setItem('savedBoards', JSON.stringify(savedBoards));
                addMessage('system', 'Board saved locally!');
            }
        }
        return false;
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/auth');
    };

    const undo = () => {
        if (drawingHistory.length > 1) {
            const newHistory = [...drawingHistory];
            const currentState = newHistory.pop();
            setRedoHistory(prev => [currentState, ...prev]);
            setDrawingHistory(newHistory);
            
            const previousState = newHistory[newHistory.length - 1];
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = previousState;

            // Emit undo event to other users
            if (socket) {
                socket.emit('undo-action', {
                    roomCode: roomId,
                    sender: user.username
                });
            }
        } else if (drawingHistory.length === 1) {
            setRedoHistory(prev => [drawingHistory[0], ...prev]);
            setDrawingHistory([]);
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Emit undo event to other users
            if (socket) {
                socket.emit('undo-action', {
                    roomCode: roomId,
                    sender: user.username
                });
            }
        }
    };

    const redo = () => {
        if (redoHistory.length > 0) {
            const newRedoHistory = [...redoHistory];
            const nextState = newRedoHistory.shift();
            setDrawingHistory(prev => [...prev, nextState]);
            setRedoHistory(newRedoHistory);
            
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = nextState;

            // Emit redo event to other users
            if (socket) {
                socket.emit('redo-action', {
                    roomCode: roomId,
                    sender: user.username
                });
            }
        }
    };

    const drawRemote = (ctx, drawingData) => {
        const { tool, color, brushSize, points } = drawingData;

        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (points && points.length >= 2) {
            ctx.beginPath();

            if (points.length === 2) {
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
            } else {
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1; i < points.length - 2; i++) {
                    const xc = (points[i][0] + points[i + 1][0]) / 2;
                    const yc = (points[i][1] + points[i + 1][1]) / 2;
                    ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
                }
                ctx.quadraticCurveTo(
                    points[points.length - 2][0],
                    points[points.length - 2][1],
                    points[points.length - 1][0],
                    points[points.length - 1][1]
                );
            }

            ctx.stroke();
        }
    };

    const addMessage = (sender, text) => {
        const newMessage = {
            id: Date.now(),
            sender,
            text,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSendMessage = (text) => {
        if (socket && roomId && text.trim()) {
            const messageText = text.trim();
            addMessage(user.username, messageText);
            socket.emit('chat-message', {
                roomCode: roomId,
                sender: user.username,
                text: messageText
            });
        }
    };

    const handleExport = (format) => {
        if (canvasRef.current) {
            let dataUrl;
            switch (format) {
                case 'png':
                    dataUrl = canvasRef.current.toDataURL('image/png');
                    downloadImage(dataUrl, `whiteboard-${roomId}.png`);
                    break;
                case 'jpg':
                    dataUrl = canvasRef.current.toDataURL('image/jpeg');
                    downloadImage(dataUrl, `whiteboard-${roomId}.jpg`);
                    break;
                default:
                    break;
            }
        }
    };

    const downloadImage = (dataUrl, filename) => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    };

    const handleClearCanvas = () => {
        if (canvasRef.current && socket) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            saveCanvasState();
            
            // Emit clear event to other users
            socket.emit('clear-canvas', {
                roomCode: roomId,
                sender: user.username
            });

            addMessage('system', 'Canvas cleared');
        }
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="whiteboard-room">
            <header className="whiteboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="back-btn"
                        >
                            <span className="back-arrow">←</span>
                            Dashboard
                        </button>
                        <div className="room-info">
                            <span className="room-label">Room:</span>
                            <span className="room-code">{roomId}</span>
                        </div>
                    </div>
                    
                    <div className="header-center">
                        <div className="active-users">
                            <span className="users-count">{roomUsers.length}</span>
                            <span className="users-label">Users Online</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <UserList users={roomUsers} />
                        <button 
                            onClick={handleLogout}
                            className="logout-btn"
                        >
                            <span className="logout-icon">🚪</span>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="whiteboard-content">
                <div className="tools-section">
                    <Toolbar
                        drawingTool={drawingTool}
                        onClear={handleClearCanvas}
                        onExport={handleExport}
                        onUndo={undo}
                        onRedo={redo}
                        onSave={saveBoard}
                        canUndo={drawingHistory.length > 0}
                        canRedo={redoHistory.length > 0}
                        socket={socket}
                        roomId={roomId}
                        user={user}
                    />
                </div>

                <div className="canvas-section">
                    <Canvas
                        ref={canvasRef}
                        drawingTool={drawingTool}
                    />
                </div>

                <div className="chat-section">
                    <ChatPanel
                        messages={messages}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>
        </div>
    );
};

export default WhiteboardRoom;
