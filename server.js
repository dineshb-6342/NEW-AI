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

// Google Custom Search API Configuration
const GOOGLE_IMAGE_API_KEY = 'AIzaSyB7ZP7Vt6L1ADF1i2Bw8tB0QWbxaeQqAqY';
const GOOGLE_IMAGE_SEARCH_ENGINE = '9437e7704532840b4';

const GOOGLE_VIDEO_API_KEY = 'AIzaSyCILFIVb4YyhwszFZ1U7X3DZbvjMVDehks';
const GOOGLE_VIDEO_SEARCH_ENGINE = '9437e7704532840b4';

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

// API endpoint to search images using Google Custom Search API
app.get('/api/search-images', async (req, res) => {
  let query = req.query.q || req.query.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  console.log(`🔍 Searching Google Images for: ${query}`);

  try {
    // Use Google Custom Search API for images
    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_IMAGE_API_KEY}&cx=${GOOGLE_IMAGE_SEARCH_ENGINE}&q=${encodeURIComponent(query)}&searchType=image`;
    const googleData = await httpsGet(googleUrl);
    
    console.log('📊 Google Image Search Response:', googleData);
    
    if (googleData && googleData.items && googleData.items.length > 0) {
      // Return the first few image results
      const images = googleData.items.slice(0, 5).map(item => ({
        url: item.link,
        title: item.title,
        thumbnail: item.image?.thumbnailLink || item.link,
        description: item.snippet
      }));
      
      console.log(`✅ Found ${images.length} Google images for "${query}"`);
      res.json({ 
        success: true, 
        images: images,
        source: 'Google Images'
      });
    } else {
      console.log(`❌ No Google images found for: ${query}`);
      res.json({ 
        success: false, 
        images: [], 
        message: `No images found for "${query}". Try a different term.`
      });
    }
  } catch (error) {
    console.error('🔴 Google Image API Error:', error.message);
    res.status(500).json({ error: 'Failed to search images', details: error.message });
  }
});

// API endpoint to search videos using Google Custom Search API
app.get('/api/search-videos', async (req, res) => {
  const query = req.query.q || req.query.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  console.log(`🎬 Searching Google Videos for: ${query}`);

  try {
    // Use Google Custom Search API for videos
    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_VIDEO_API_KEY}&cx=${GOOGLE_VIDEO_SEARCH_ENGINE}&q=${encodeURIComponent(query)}&searchType=video`;
    const googleData = await httpsGet(googleUrl);
    
    console.log('📊 Google Video Search Response:', googleData);
    
    if (googleData && googleData.items && googleData.items.length > 0) {
      // Process video results and convert YouTube links to embed URLs
      const videos = googleData.items.slice(0, 5).map(item => {
        let videoUrl = item.link;
        
        // Convert YouTube watch URLs to embed URLs
        if (videoUrl.includes('youtube.com/watch')) {
          const videoId = new URL(videoUrl).searchParams.get('v');
          if (videoId) {
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
          }
        }
        // Convert youtu.be short URLs to embed URLs
        else if (videoUrl.includes('youtu.be/')) {
          const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
          if (videoId) {
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
          }
        }
        
        return {
          url: videoUrl,
          title: item.title,
          thumbnail: item.image?.thumbnailLink || '',
          description: item.snippet,
          isYouTube: videoUrl.includes('youtube.com/embed')
        };
      });
      
      console.log(`✅ Found ${videos.length} Google videos for "${query}"`);
      res.json({ 
        success: true, 
        videos: videos,
        source: 'Google Videos'
      });
    } else {
      console.log(`❌ No Google videos found for: ${query}`);
      res.json({ 
        success: false, 
        videos: [], 
        message: `No videos found for "${query}". Try a different term.`
      });
    }
  } catch (error) {
    console.error('🔴 Google Video API Error:', error.message);
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

// Test endpoint to verify video API
app.get('/api/test-video', async (req, res) => {
  const query = req.query.q || 'apple';
  const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_VIDEO_API_KEY}&cx=${GOOGLE_VIDEO_SEARCH_ENGINE}&q=${encodeURIComponent(query)}&searchType=video`;
  
  try {
    const googleData = await httpsGet(googleUrl);
    res.json({ 
      query,
      url: googleUrl,
      data: googleData 
    });
  } catch (error) {
    res.json({ error: error.message });
  }
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

