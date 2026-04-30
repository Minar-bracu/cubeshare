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
const { initDb } = require('./models/user');

const userRoutes = require('./routes/userroute');
const authRoutes = require('./routes/authroute');

const port = process.env.PORT || 6700;

// Security headers
app.use(helmet());

// CORS - tighten in production using FRONTEND_ORIGIN env
app.use(cors({ origin: FRONTEND_URL, optionsSuccessStatus: 200 }));

app.use(express.json());
// Only serve specific public files if necessary
// app.use(express.static('public'));

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

server.listen(port, '0.0.0.0', () => { // Listen on all network interfaces
  // Explicitly initialize database after environment is ready
  initDb();

  const externalBaseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  const externalWsUrl = process.env.RENDER_EXTERNAL_URL ? `wss://${new URL(process.env.RENDER_EXTERNAL_URL).host}/ws` : `ws://localhost:${port}/ws`;

  console.log(`Server is running on ${externalBaseUrl}`);
  console.log(`WebSocket signaling available at ${externalWsUrl}`);
});