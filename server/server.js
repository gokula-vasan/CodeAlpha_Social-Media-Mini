const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const { connectDB } = require('./config/db');

// Route files
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const userRoutes = require('./routes/user.routes');
const storyRoutes = require('./routes/story.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// Body parser
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Enable CORS
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    appName: 'ConnectSphere',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);

// SPA fallback: any non-API request goes to index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API route not found',
    });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Dev helper: clear database if requested
if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/clean-db', async (req, res) => {
    try {
      const User = require('./models/User');
      const Post = require('./models/Post');
      const Story = require('./models/Story');
      const Notification = require('./models/Notification');
      await Promise.all([
        User.deleteMany({}),
        Post.deleteMany({}),
        Story.deleteMany({}),
        Notification.deleteMany({}),
      ]);
      res.json({ success: true, message: 'Database wiped clean successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}

let serverInstance = null;

const startServer = async () => {
  try {
    await connectDB();

    serverInstance = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🌐  CONNECTSPHERE SOCIAL MEDIA PLATFORM  🌐       ║
║                                                       ║
║   Server is actively running on port ${PORT}!           ║
║   Local URL: http://localhost:${PORT}                    ║
║   API Health: http://localhost:${PORT}/api/health        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n⚠️  Port ${PORT} is already in use by another running instance.`);
        console.error(`💡  If another process is using port ${PORT}, please stop it or change PORT in .env.\n`);
      } else {
        console.error('Server network error:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Fatal error starting ConnectSphere server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down ConnectSphere gracefully...`);
  try {
    if (serverInstance) {
      serverInstance.close();
    }
    const { disconnectDB } = require('./config/db');
    await disconnectDB();
    console.log('✅ Server and database closed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

startServer();
