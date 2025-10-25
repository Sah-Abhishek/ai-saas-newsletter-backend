
const mongoose = require('mongoose');

/**
 * @function connectDB
 * @description Establishes a connection to the MongoDB database using the URI 
 * specified in the MONGO_URI environment variable.
 */
const connectDB = async () => {
  try {
    // 1. Attempt to connect to MongoDB using the URI from the environment variables.
    // The MONGO_URI must be defined in your .env file (e.g., mongodb://localhost:27017/ainewsletter).
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern Mongoose handles options like useNewUrlParser and useUnifiedTopology internally,
      // so we typically omit them unless troubleshooting or needing specific behaviors.
    });

    // 2. Log successful connection details.
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // 3. Handle connection failure.
    console.error(`MongoDB connection Error: ${error.message}`);
    // Exit process with failure code (1)
    process.exit(1);
  }
};

module.exports = connectDB;
