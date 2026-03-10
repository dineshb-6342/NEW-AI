const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for API endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Google Custom Search API Configuration (not working - needs API enabled)
// Using Wikipedia API as free alternative for educational images
const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';

// Helper function to make HTTPS requests with proper headers
const httpsGet = (url, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'AI-Smartboard/1.0 (Educational Tool; contact@example.com)',
        ...headers
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
};

// API endpoint to search images from Wikipedia
app.get('/api/search-images', async (req, res) => {
  let query = req.query.q || req.query.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  console.log(`🔍 Searching Wikipedia for: ${query}`);

  try {
    // First, get the Wikipedia page summary
    const wikiUrl = `${WIKIPEDIA_API_URL}/${encodeURIComponent(query)}`;
    const wikiData = await httpsGet(wikiUrl);
    
    console.log('📊 Wikipedia Response:', wikiData);
    
    if (wikiData && wikiData.type !== 'disambiguation' && wikiData.thumbnail) {
      // Return the thumbnail image from Wikipedia
      const imageUrl = wikiData.thumbnail.source;
      console.log(`✅ Found Wikipedia image for "${query}":`, imageUrl);
      res.json({ 
        success: true, 
        images: [{
          url: imageUrl,
          title: wikiData.title,
          thumbnail: imageUrl,
          description: wikiData.extract
        }],
        source: 'Wikipedia'
      });
    } else if (wikiData && wikiData.type === 'disambiguation') {
      // Try to get the first real page from related topics
      if (wikiData.descriptions && wikiData.descriptions.summary) {
        // Try searching for images using a different approach
        res.json({ 
          success: false, 
          images: [], 
          message: `Multiple results found for "${query}". Try being more specific.`,
          suggestions: wikiData.descriptions
        });
      } else {
        res.json({ 
          success: false, 
          images: [], 
          message: `No specific page found for "${query}". Try a more specific term.`
        });
      }
    } else {
      console.log(`❌ No Wikipedia article found for: ${query}`);
      res.json({ 
        success: false, 
        images: [], 
        message: `No Wikipedia article found for "${query}". Try a different term.`
      });
    }
  } catch (error) {
    console.error('🔴 Wikipedia API Error:', error.message);
    res.status(500).json({ error: 'Failed to search images', details: error.message });
  }
});

// API endpoint to search educational videos (YouTube)
app.get('/api/search-videos', async (req, res) => {
  const query = req.query.q || req.query.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  console.log(`🎬 Searching for educational videos: ${query}`);

  try {
    // Use Wikipedia to find related video links
    const wikiUrl = `${WIKIPEDIA_API_URL}/${encodeURIComponent(query)}`;
    const wikiData = await httpsGet(wikiUrl);
    
    if (wikiData && wikiData.content_urls) {
      // Return Wikipedia mobile URL as a reference
      res.json({ 
        success: true, 
        videos: [{
          url: wikiData.content_urls.mobile.page,
          title: wikiData.title,
          thumbnail: wikiData.thumbnail?.source || '',
          source: 'Wikipedia'
        }],
        source: 'Wikipedia'
      });
    } else {
      res.json({ 
        success: false, 
        videos: [], 
        message: `No results found for "${query}"`
      });
    }
  } catch (error) {
    console.error('🔴 Video Search Error:', error.message);
    res.status(500).json({ error: 'Failed to search videos', details: error.message });
  }
});

// Store doubts for each room
const roomDoubts = {};

// Helper function to get local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIPAddress();
const PORT = process.env.PORT || 3001;

// API endpoint to get server URL for clients
app.get('/api/server-info', (req, res) => {
  res.json({
    ip: LOCAL_IP,
    port: PORT,
    teacherUrl: `http://${LOCAL_IP}:${PORT}/teacher`,
    joinUrl: (roomId) => `http://${LOCAL_IP}:${PORT}/join/${roomId}`
  });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for teacher board
app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// Dynamic route for students to join a room
app.get('/join/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// Root route - redirect to teacher
app.get('/', (req, res) => {
  res.redirect('/teacher');
});

// Socket.io handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle joining a room
  socket.on('join_room', (data) => {
    const { roomId, role } = data;
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId} as ${role}`);
    
    // Send existing doubts to teacher if joining as teacher
    if (role === 'teacher' && roomDoubts[roomId]) {
      socket.emit('load_doubts', roomDoubts[roomId]);
    }
  });

  // Handle receiving a doubt from student
  socket.on('send_doubt', (data) => {
    const { roomId, doubt, studentName } = data;
    console.log(`Received doubt in room ${roomId}: ${doubt} from ${studentName}`);
    
    // Store the doubt
    if (!roomDoubts[roomId]) {
      roomDoubts[roomId] = [];
    }
    
    const newDoubt = {
      id: Date.now(),
      studentName,
      doubt,
      timestamp: new Date().toLocaleTimeString()
    };
    
    roomDoubts[roomId].push(newDoubt);
    
    // Broadcast to all in the room
    io.to(roomId).emit('receive_doubt', newDoubt);
  });

  // Handle clearing all doubts (teacher only)
  socket.on('clear_doubts', (data) => {
    const { roomId } = data;
    roomDoubts[roomId] = [];
    io.to(roomId).emit('doubts_cleared');
    console.log(`All doubts cleared in room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server is running!`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Local access:   http://localhost:${PORT}`);
  console.log(`Network access: http://${LOCAL_IP}:${PORT}`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Teacher board: http://${LOCAL_IP}:${PORT}/teacher`);
  console.log(`Student join:  http://${LOCAL_IP}:${PORT}/join/class123`);
  console.log(`\n📱 For mobile testing, use the Network URL!`);
});

