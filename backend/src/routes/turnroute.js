const express = require('express');
const router = express.Router();

/**
 * GET /api/turn/credentials
 * 
 * Fetches temporary TURN server credentials from Xirsys.
 * This is required for WebRTC connections across different networks
 * (Symmetric NAT traversal via relay candidates).
 * 
 * Environment variables required:
 *   XIRSYS_IDENT   - Your Xirsys username
 *   XIRSYS_SECRET  - Your Xirsys API secret
 *   XIRSYS_CHANNEL - Your Xirsys channel name
 * 
 * Free tier: 500MB/month relay traffic
 */
router.get('/credentials', async (req, res, next) => {
  try {
    const ident = process.env.XIRSYS_IDENT;
    const secret = process.env.XIRSYS_SECRET;
    const channel = process.env.XIRSYS_CHANNEL;

    if (!ident || !secret || !channel) {
      console.warn('[TURN] XIRSYS credentials not set. Returning fallback STUN-only config.');
      return res.json({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        warning: "TURN server not configured. Cross-network transfers will fail."
      });
    }

    // Xirsys API: PUT https://global.xirsys.net/_turn/<channel>
    const authHeader = "Basic " + Buffer.from(`${ident}:${secret}`).toString("base64");

    const response = await fetch(`https://global.xirsys.net/_turn/${channel}`, {
      method: "PUT",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ format: "urls" }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Xirsys API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    console.log("[TURN] Xirsys raw response:", JSON.stringify(data, null, 2));

    if (data.s !== "ok") {
      throw new Error(`Xirsys API error: ${JSON.stringify(data)}`);
    }

    // Xirsys returns iceServers in data.v.iceServers
    // It can be a single object OR an array depending on API version
    let xirsysServers = data.v?.iceServers;

    // Normalize to array
    if (!xirsysServers) {
      throw new Error("No iceServers in Xirsys response");
    }
    if (!Array.isArray(xirsysServers)) {
      // Single object format: { urls: [...], username: "...", credential: "..." }
      xirsysServers = [xirsysServers];
    }

    // Normalize each server entry: Xirsys sometimes uses "url" (singular) instead of "urls"
    const normalizedServers = xirsysServers.map(server => {
      const entry = { ...server };
      if (entry.url && !entry.urls) {
        entry.urls = Array.isArray(entry.url) ? entry.url : [entry.url];
        delete entry.url;
      }
      if (entry.urls && !Array.isArray(entry.urls)) {
        entry.urls = [entry.urls];
      }
      return entry;
    });

    // Prepend Google STUN servers for fast local-network discovery
    const fullConfig = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      ...normalizedServers,
    ];

    console.log(`[TURN] Serving ${fullConfig.length} ICE servers (${normalizedServers.length} from Xirsys)`);
    res.json({ iceServers: fullConfig });
  } catch (err) {
    console.error('[TURN] Failed to fetch credentials:', err.message);
    next(err);
  }
});

module.exports = router;
