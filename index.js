const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Load env vars
const path = require("path");
dotenv.config({ path: path.join(__dirname, "config", "config.env") });

const connectDB = require("./config/db");

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS for frontend origin
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", process.env.FRONTEND_ORIGIN].filter(
      Boolean
    ),
    credentials: true,
  })
);

// Serve static files from uploads directory with absolute path
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log(`Serving static files from: ${uploadsPath}`);

// Mount routers
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/doctor", require("./routes/doctor"));
app.use("/api/v1/appointments", require("./routes/appointments"));
app.use("/api/v1/patients", require("./routes/patients"));
app.use("/api/v1/doctors", require("./routes/doctors"));
app.use("/api/v1/prescriptions", require("./routes/prescriptions"));
app.use("/api/v1/feedback", require("./routes/feedback"));
app.use("/api/v1/records", require("./routes/medicalRecords"));
app.use("/api/v1/medications", require("./routes/medications"));
app.use("/api/v1/nurse", require("./routes/nurse"));

// Error handler middleware (must be last)
app.use(require("./middleware/error"));

const PORT = process.env.PORT || 5000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to uncaught exception');
  process.exit(1);
});

const server = app.listen(
  PORT,
  () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  }
);
