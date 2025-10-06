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
    origin: ["http://localhost:3000", process.env.FRONTEND_ORIGIN].filter(
      Boolean
    ),
    credentials: true,
  })
);

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

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

// Error handler middleware (must be last)
app.use(require("./middleware/error"));

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
