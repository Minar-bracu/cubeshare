// Global Configuration File

// Use an environment variable for production (e.g., VITE_BACKEND_HOST="your-app.onrender.com")
let host = import.meta.env.VITE_BACKEND_HOST || "localhost:10000";
// Clean the host: remove http/https and trailing slashes
const BACKEND_DOMAIN_AND_PORT = host.replace(/^https?:\/\//, "").replace(/\/$/, "");

const isHttps = window.location.protocol === "https:";
const apiProtocol = isHttps ? "https" : "http";
const wsProtocol = isHttps ? "wss" : "ws";

// Used for normal API requests (Login, Register, etc.)
export const API_BASE_URL = `${apiProtocol}://${BACKEND_DOMAIN_AND_PORT}/api`;

// Used for real-time WebRTC Signaling
export const WS_BASE_URL = `${wsProtocol}://${BACKEND_DOMAIN_AND_PORT}/ws`;
