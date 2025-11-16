import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DrawingTool } from '../../classes/DrawingTool';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import ChatPanel from './ChatPanel';
import UserList from './UserList';
import './WhiteboardRoom.css';

const WhiteboardRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [user] = useState(JSON.parse(localStorage.getItem('user')));
    const [drawingTool] = useState(new DrawingTool());
    const [roomUsers, setRoomUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [remoteDrawing, setRemoteDrawing] = useState({});
    const [drawingHistory, setDrawingHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const canvasRef = useRef(null);

    useEffect(() => {
        // Connect to Socket.io
        const newSocket = io('https://collabboard-real-time-collaborative.onrender.com');
        setSocket(newSocket);

        // Join room
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
            // Handle incoming drawing data from other users
            if (canvasRef.current && data.sender !== user.username) {
                const ctx = canvasRef.current.getContext('2d');
                drawRemote(ctx, data);
            }
        });

        newSocket.on('chat-message', (data) => {
            // Add all messages, including your own (they come back from server)
            addMessage(data.sender, data.text);
        });

        // Set up drawing tool callback for real-time sync
        drawingTool.setOnDraw((drawingData) => {
            if (newSocket && roomId) {
                newSocket.emit('drawing', {
                    ...drawingData,
                    roomCode: roomId
                });
            }
        });

        // Save canvas state when drawing ends
        drawingTool.setOnDrawEnd(() => {
            saveCanvasState();
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user, roomId, drawingTool]);

    // Save current canvas state to history
    const saveCanvasState = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const imageData = canvas.toDataURL();
            setDrawingHistory(prev => [...prev, imageData]);
            setRedoHistory([]); // Clear redo history when new action is performed
        }
    };

    // Save board to localStorage
    const saveBoard = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const imageData = canvas.toDataURL('image/png');
            
            // Create board data
            const boardData = {
                id: Date.now().toString(),
                roomCode: roomId,
                imageData: imageData,
                name: `Board-${roomId}-${new Date().toLocaleDateString()}`,
                savedAt: new Date().toISOString(),
                thumbnail: imageData // Using same image as thumbnail for simplicity
            };

            // Get existing saved boards
            const savedBoards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
            
            // Add new board
            savedBoards.push(boardData);
            
            // Save back to localStorage
            localStorage.setItem('savedBoards', JSON.stringify(savedBoards));
            
            // Show success message
            addMessage('system', 'Board saved successfully!');
            
            return true;
        }
        return false;
    };

    const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
    };


    // Undo functionality
    const undo = () => {
        if (drawingHistory.length > 1) {
            const newHistory = [...drawingHistory];
            const currentState = newHistory.pop();
            setRedoHistory(prev => [currentState, ...prev]);
            setDrawingHistory(newHistory);
            
            // Restore previous state
            const previousState = newHistory[newHistory.length - 1];
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = previousState;
        } else if (drawingHistory.length === 1) {
            // Clear canvas completely (undo the first action)
            setRedoHistory(prev => [drawingHistory[0], ...prev]);
            setDrawingHistory([]);
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    // Redo functionality
    const redo = () => {
        if (redoHistory.length > 0) {
            const newRedoHistory = [...redoHistory];
            const nextState = newRedoHistory.shift();
            setDrawingHistory(prev => [...prev, nextState]);
            setRedoHistory(newRedoHistory);
            
            // Restore next state
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = nextState;
        }
    };

    const drawRemote = (ctx, drawingData) => {
        const { tool, color, brushSize, points } = drawingData;

        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;

        if (points && points.length >= 2) {
            ctx.beginPath();

            // Draw smooth continuous lines
            if (points.length === 2) {
                // Single line segment
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
            } else {
                // Multiple points for smooth curve
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1; i < points.length - 2; i++) {
                    const xc = (points[i][0] + points[i + 1][0]) / 2;
                    const yc = (points[i][1] + points[i + 1][1]) / 2;
                    ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
                }
                // Curve through the last two points
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

            // Add message immediately for instant feedback
            addMessage(user.username, messageText);

            // Then emit to socket for other users
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
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            // Save cleared state to history
            saveCanvasState();
        }
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="whiteboard-room">
        <header className="whiteboard-header">
            <div className="header-left">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-secondary"
                >
                    ← Dashboard
                </button>
                <h2>Room: {roomId}</h2>
            </div>
            <div className="header-right">
                <button 
                    onClick={handleLogout}
                    className="btn btn-secondary logout-btn"
                    style={{marginRight: '10px'}}
                >
                    🚪 Logout
                </button>
                <UserList users={roomUsers} />
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

