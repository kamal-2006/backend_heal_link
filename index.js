const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env vars
dotenv.config({ path: './config/config.env' });

const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS for frontend origin
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_ORIGIN
  ].filter(Boolean),
  credentials: true,
}));

// Mount routers
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/appointments', require('./routes/appointments'));
app.use('/api/v1/patients', require('./routes/patients'));
app.use('/api/v1/prescriptions', require('./routes/prescriptions'));
app.use('/api/v1/feedback', require('./routes/feedback'));

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
