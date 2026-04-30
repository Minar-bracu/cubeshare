// Global Configuration for the Backend
// If your frontend port changes (e.g., from 5173 to 5174), 
// you only need to update the URL right here!

// Ensure this matches the URL in your browser address bar exactly
const origin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const FRONTEND_URL = origin.replace(/\/$/, "");

module.exports = {
  FRONTEND_URL
};
