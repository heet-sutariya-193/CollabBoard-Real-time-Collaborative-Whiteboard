require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://collabboard-real-time-collaborative-thjg.onrender.com"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "https://collabboard-real-time-collaborative-thjg.onrender.com"],
  credentials: true
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.log('  MONGODB_URI not found, using in-memory storage');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log(' Connected to MongoDB successfully!');
    })
    .catch((error) => {
      console.error(' MongoDB connection error:', error);
      console.log(' Using in-memory storage instead');
    });
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Saved Board Schema
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
  drawingData: {
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

const SavedBoard = mongoose.model('SavedBoard', savedBoardSchema);

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
};

// Auth middleware (optional for future use)
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// In-memory storage (fallback)
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
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ 
    status: 'OK', 
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Whiteboard Routes
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

    console.log(` Whiteboard created: ${roomCode}`);
    
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

    console.log(` User ${username} joined room: ${roomCode}`);
    
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

// Saved Boards Routes
app.get('/api/saved-boards/:userId', async (req, res) => {
  try {
      const { userId } = req.params;
      
      // Validate userId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({
              success: false,
              message: 'Invalid user ID format'
          });
      }

      const savedBoards = await SavedBoard.find({ userId }).sort({ createdAt: -1 });
      
      res.json({
          success: true,
          savedBoards
      });
  } catch (error) {
      console.error('Error fetching saved boards:', error);
      res.status(500).json({
          success: false,
          message: 'Error fetching saved boards'
      });
  }
});

app.post('/api/saved-boards', async (req, res) => {
  try {
      const { userId, roomCode, name, imageData, thumbnail, drawingData } = req.body;
      
      // Validate required fields
      if (!userId || !roomCode || !name || !imageData || !thumbnail) {
          return res.status(400).json({
              success: false,
              message: 'Missing required fields'
          });
      }

      // Validate userId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({
              success: false,
              message: 'Invalid user ID format'
          });
      }

      const savedBoard = new SavedBoard({
          userId,
          roomCode,
          name,
          imageData,
          thumbnail,
          drawingData: drawingData || []
      });
      
      await savedBoard.save();
      
      res.json({
          success: true,
          message: 'Board saved successfully',
          savedBoard
      });
  } catch (error) {
      console.error('Error saving board:', error);
      res.status(500).json({
          success: false,
          message: 'Error saving board'
      });
  }
});

app.delete('/api/saved-boards/:boardId', async (req, res) => {
  try {
      const { boardId } = req.params;
      
      // Validate boardId format
      if (!mongoose.Types.ObjectId.isValid(boardId)) {
          return res.status(400).json({
              success: false,
              message: 'Invalid board ID format'
          });
      }

      const result = await SavedBoard.findByIdAndDelete(boardId);
      
      if (!result) {
          return res.status(404).json({
              success: false,
              message: 'Board not found'
          });
      }
      
      res.json({
          success: true,
          message: 'Board deleted successfully'
      });
  } catch (error) {
      console.error('Error deleting board:', error);
      res.status(500).json({
          success: false,
          message: 'Error deleting board'
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

  socket.on('clear-canvas', (data) => {
    io.to(data.roomCode).emit('canvas-cleared', data);
  });

  socket.on('undo-action', (data) => {
    socket.to(data.roomCode).emit('undo-performed', data);
  });

  socket.on('redo-action', (data) => {
    socket.to(data.roomCode).emit('redo-performed', data);
  });

  socket.on('tool-change', (data) => {
    socket.to(data.roomCode).emit('tool-changed', data);
  });

  socket.on('chat-message', (data) => {
    io.to(data.roomCode).emit('chat-message', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove user from all rooms
    for (const [roomCode, users] of roomUsers.entries()) {
      users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` API Health check: http://localhost:${PORT}/api/health`);
  console.log(` Authentication: Enabled`);
  console.log(` Storage: ${MONGODB_URI ? 'MongoDB' : 'In-memory'}`);
  console.log(` Saved Boards: Enabled`);
});
