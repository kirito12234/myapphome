const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = (process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is missing. Copy env.example to .env and set your MongoDB connection string."
    );
  }

  if (mongoUri.includes("<") || mongoUri.includes(">")) {
    throw new Error(
      "MONGODB_URI contains placeholder text. Replace with your real MongoDB connection string."
    );
  }

  const conn = await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB || "hometutor",
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;




