const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const net = require('net');

let mongoServerInstance = null;

// Helper to check if port 27017 is already listening
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port);
  });
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectsphere';

  // If using standard local MongoDB on 27017, ensure the local engine is active
  if (uri.includes('27017') || uri.includes('localhost') || uri.includes('127.0.0.1')) {
    const portActive = await isPortInUse(27017);

    if (!portActive) {
      console.log('🚀 Starting local MongoDB engine on port 27017...');
      const dbPath = path.join(__dirname, '../../data/db');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }

      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServerInstance = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbPath,
            storageEngine: 'wiredTiger',
          },
        });
        console.log('✅ Local MongoDB engine started on port 27017');
      } catch (startErr) {
        console.warn('Note on starting local engine:', startErr.message);
      }
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port || 27017}/${conn.connection.name}`);
    console.log(`📊 You can connect via MongoDB Compass at: mongodb://localhost:27017`);
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    throw err;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServerInstance) {
      await mongoServerInstance.stop();
    }
  } catch (err) {
    console.error('Error disconnecting DB:', err);
  }
};

module.exports = { connectDB, disconnectDB };
