const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
// Load environment variables from custom path
require('dotenv').config({ path: path.join(__dirname, '..', 'custom', 'path', '.env') });
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const { setupSignaling } = require('./signaling');
const { FRONTEND_URL } = require('./config');

const userRoutes = require('./routes/userroute');
const authRoutes = require('./routes/authroute');

const port = process.env.PORT || 6700;

// Security headers
app.use(helmet());

// CORS - tighten in production using FRONTEND_ORIGIN env
const allowedOrigin = process.env.FRONTEND_ORIGIN || FRONTEND_URL;
app.use(cors({ origin: allowedOrigin, optionsSuccessStatus: 200 }));

app.use(express.json());
app.use(express.static('.'));

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/users', authLimiter, userRoutes);
app.use('/api/auth', authRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Create HTTP server and attach WebSocket
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
setupSignaling(wss, server);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`WebSocket signaling available at ws://localhost:${port}/ws`);
});