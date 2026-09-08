const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mini-social-app';

  try {
    // Attempt connecting to the configured URI with a 3-second timeout
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected to MongoDB at: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (primaryErr) {
    console.warn(`[Database] Could not connect to primary MongoDB (${mongoUri}): ${primaryErr.message}`);
    
    // Fallback: Check if mongodb-memory-server is available for zero-config local run
    try {
      console.log('[Database] Attempting to start in-memory MongoDB fallback...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to In-Memory MongoDB at: ${memoryUri}`);
      return conn;
    } catch (fallbackErr) {
      console.error('[Database] Failed to connect to any MongoDB instance:', fallbackErr.message);
      throw primaryErr;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error('[Database] Error during disconnect:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
