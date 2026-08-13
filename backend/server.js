const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const { router: behaviorRoutes, setupWebSocket } = require('./routes/behavior');
const sessionsRoutes = require('./routes/sessions');
const profileRoutes = require('./routes/profile');

const app = express();
const server = http.createServer(app);
setupWebSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/auth', require('./routes/stepUpAuth'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'BehaviorShield backend is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.log('MongoDB connection error:', err.message);
  });

module.exports = { app, server };