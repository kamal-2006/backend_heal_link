const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGO_URI ? 'URI found' : 'URI not found');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000,
      family: 4
    };

    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    
    console.log('✅ MongoDB connection successful!');
    console.log(`Connected to: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Number of collections: ${collections.length}`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('This is likely a network connectivity or authentication issue');
      console.error('Please check:');
      console.error('1. Your internet connection');
      console.error('2. MongoDB Atlas credentials');
      console.error('3. IP whitelist settings in MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

testConnection();