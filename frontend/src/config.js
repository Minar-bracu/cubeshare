// Global Configuration File
// If your backend port changes (e.g., from 6700 to 5000), 
// you only need to update the port number right here!

const BACKEND_DOMAIN_AND_PORT = "localhost:6700";

// Used for normal API requests (Login, Register, etc.)
export const API_BASE_URL = `http://${BACKEND_DOMAIN_AND_PORT}/api`;

// Used for real-time WebRTC Signaling
const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
export const WS_BASE_URL = `${wsProtocol}://${BACKEND_DOMAIN_AND_PORT}/ws`;
