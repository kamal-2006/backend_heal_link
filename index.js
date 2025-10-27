const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "config", "config.env") });

const connectDB = require("./config/db");
connectDB();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// CORS: allow explicit origins only ("*" with credentials breaks browsers)
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || "http://localhost:3001",
  process.env.FRONTEND_ORIGIN_ALT1,
  process.env.FRONTEND_ORIGIN_ALT2,
  process.env.FRONTEND_ORIGIN_ALT3,
].filter(Boolean);

console.log("FRONTEND_ORIGIN from env:", process.env.FRONTEND_ORIGIN);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);
// Handle preflight for all routes
// Note: cors middleware above handles OPTIONS automatically; no explicit wildcard route
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));
console.log(`Serving static files from: ${uploadsPath}`);

app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/doctor", require("./routes/doctor"));
app.use("/api/v1/appointments", require("./routes/appointments"));
app.use("/api/v1/patients", require("./routes/patients"));
app.use("/api/v1/doctors", require("./routes/doctors"));
app.use("/api/v1/prescriptions", require("./routes/prescriptions"));
app.use("/api/v1/feedback", require("./routes/feedback"));
app.use("/api/v1/records", require("./routes/medicalRecords"));
app.use("/api/v1/nurse/admin", require("./routes/adminNurse"));
app.use("/api/v1/medications", require("./routes/medications"));
app.use("/api/v1/nurse", require("./routes/nurse"));
app.use("/api/v1/notifications", require("./routes/notifications"));

app.use(require("./middleware/error"));

// Only start a server locally; on Vercel we export the app
let server;
let io;
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    if (server) server.close(() => process.exit(1));
  });
  process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Shutting down the server due to uncaught exception");
    process.exit(1);
  });

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    );
    const apiUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    console.log(`Backend API available at: ${apiUrl}/api/v1`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    }
  });

  // Setup Socket.IO
  const socketIO = require("socket.io");
  io = socketIO(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Store user socket connections
  global.userSockets = {};
  global.io = io;

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Register user socket
    socket.on("register", (userId) => {
      global.userSockets[userId] = socket.id;
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Unregister user socket on disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      for (const userId in global.userSockets) {
        if (global.userSockets[userId] === socket.id) {
          delete global.userSockets[userId];
          break;
        }
      }
    });
  });
}

module.exports = app;
