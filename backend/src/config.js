// Global Configuration for the Backend
// If your frontend port changes (e.g., from 5173 to 5174), 
// you only need to update the URL right here!

// Ensure this matches the URL in your browser address bar exactly
const FRONTEND_URL = process.env.FRONTEND_ORIGIN || "https://cubeshare.pages.dev";

module.exports = {
  FRONTEND_URL
};
