const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory user store (replace with database in production)
const users = new Map();
const activeSessions = new Map();

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (users.has(username)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    users.set(username, {
      id: userId,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      userId 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const sessionId = uuidv4();
    activeSessions.set(sessionId, {
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString()
    });

    res.json({
      message: 'Login successful',
      token,
      sessionId,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Start Roblox Studio session endpoint
app.post('/api/start-session', authenticateToken, async (req, res) => {
  try {
    const sessionId = uuidv4();
    const containerUrl = process.env.DESKTOP_CONTAINER_URL || 'http://localhost:6080';
    
    // Store session information
    activeSessions.set(sessionId, {
      ...activeSessions.get(req.user.username),
      desktopSessionId: sessionId,
      startedAt: new Date().toISOString(),
      status: 'active'
    });

    // In a real implementation, you would:
    // 1. Spin up a new Docker container or allocate resources
    // 2. Configure the streaming server
    // 3. Generate unique access tokens for the stream
    
    res.json({
      sessionId,
      status: 'starting',
      streamingUrl: `${containerUrl}/vnc.html?autoconnect=true&resize=scale`,
      wsUrl: `ws://localhost:6080/websockify`,
      message: 'Roblox Studio session is starting...',
      estimatedWaitTime: 15000 // 15 seconds estimate
    });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Stop session endpoint
app.post('/api/stop-session/:sessionId', authenticateToken, (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // In a real implementation, you would:
    // 1. Terminate the streaming connection
    // 2. Clean up container resources
    // 3. Save any project data
    
    activeSessions.delete(sessionId);
    
    res.json({
      message: 'Session stopped successfully',
      sessionId
    });
  } catch (error) {
    console.error('Session stop error:', error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

// Get session status endpoint
app.get('/api/session/:sessionId', authenticateToken, (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionData = activeSessions.get(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId,
      status: sessionData.status || 'active',
      startedAt: sessionData.startedAt,
      user: sessionData.username
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    version: '1.0.0'
  });
});

// Logout endpoint
app.post('/api/logout', authenticateToken, (req, res) => {
  try {
    // Invalidate all sessions for this user
    for (const [key, value] of activeSessions.entries()) {
      if (value.userId === req.user.userId) {
        activeSessions.delete(key);
      }
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// WebSocket server for real-time communication
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'input_event':
          // Forward input events to the desktop container
          // In production, this would connect to the VNC/WebRTC server
          break;
        case 'heartbeat':
          ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cloud Roblox Studio Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server running on port 3001`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
});

module.exports = app;
