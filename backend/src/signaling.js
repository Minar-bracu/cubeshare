const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// In-memory registries
const connections = new Map(); // ws -> { userId, username, deviceId, publicIP }
const userDevices = new Map(); // userId -> Set<deviceId>
const roomCodes = new Map();   // code -> { userId, username, deviceId, expiresAt }

function getPublicIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
}

function broadcastDeviceList(userId) {
  const devices = [];
  for (const [ws, info] of connections) {
    if (info.userId === userId && ws.readyState === 1) {
      devices.push({ deviceId: info.deviceId, username: info.username });
    }
  }
  for (const [ws, info] of connections) {
    if (info.userId === userId && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "device-list", devices }));
    }
  }
}

function broadcastNearbyUsers(publicIP) {
  // Group by IP, notify each user about others on the same network
  const byIP = new Map();
  for (const [ws, info] of connections) {
    if (!byIP.has(info.publicIP)) byIP.set(info.publicIP, []);
    byIP.get(info.publicIP).push({ ws, ...info });
  }

  const group = byIP.get(publicIP) || [];
  const usersSeen = new Set();
  const nearbyList = [];
  for (const entry of group) {
    if (!usersSeen.has(entry.userId)) {
      usersSeen.add(entry.userId);
      nearbyList.push({
        userId: entry.userId,
        username: entry.username,
        deviceId: entry.deviceId,
      });
    }
  }

  for (const entry of group) {
    if (entry.ws.readyState === 1) {
      // Send nearby users excluding self
      const filtered = nearbyList.filter((u) => u.userId !== entry.userId);
      entry.ws.send(JSON.stringify({ type: "nearby-users", users: filtered }));
    }
  }
}

function findWsByDeviceId(deviceId) {
  for (const [ws, info] of connections) {
    if (info.deviceId === deviceId && ws.readyState === 1) return ws;
  }
  return null;
}

function setupSignaling(wss, server) {
  // Clean up expired room codes every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of roomCodes) {
      if (room.expiresAt < now) roomCodes.delete(code);
    }
  }, 60000);

  // Heartbeat every 30s
  const heartbeatInterval = setInterval(() => {
    for (const [ws] of connections) {
      if (ws.readyState === 1) ws.ping();
    }
  }, 30000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  wss.on("connection", (ws, req) => {
    const publicIP = getPublicIP(req);
    let authenticated = false;

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // First message must be auth
      if (!authenticated) {
        if (msg.type !== "auth" || !msg.token) {
          ws.send(JSON.stringify({ type: "error", error: "Authenticate first" }));
          return;
        }
        try {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          const info = {
            userId: decoded.id,
            username: decoded.username,
            deviceId: msg.deviceId || crypto.randomBytes(4).toString("hex"),
            publicIP,
          };
          connections.set(ws, info);
          authenticated = true;

          if (!userDevices.has(info.userId)) userDevices.set(info.userId, new Set());
          userDevices.get(info.userId).add(info.deviceId);

          ws.send(JSON.stringify({ type: "authenticated", deviceId: info.deviceId }));
          broadcastDeviceList(info.userId);
          broadcastNearbyUsers(publicIP);
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", error: "Invalid token" }));
          ws.close();
        }
        return;
      }

      const myInfo = connections.get(ws);
      if (!myInfo) return;

      switch (msg.type) {
        case "offer":
        case "answer":
        case "ice-candidate": {
          const target = findWsByDeviceId(msg.to);
          if (target) {
            target.send(JSON.stringify({ ...msg, from: myInfo.deviceId, fromUsername: myInfo.username }));
          }
          break;
        }

        case "transfer-request": {
          const target = findWsByDeviceId(msg.to);
          if (target) {
            target.send(JSON.stringify({
              type: "transfer-request",
              from: myInfo.deviceId,
              fromUsername: myInfo.username,
              transferId: msg.transferId,
              fileName: msg.fileName,
              fileSize: msg.fileSize,
              isText: msg.isText || false,
              textContent: msg.textContent || null,
            }));
          }
          break;
        }

        case "transfer-response": {
          const target = findWsByDeviceId(msg.to);
          if (target) {
            target.send(JSON.stringify({
              type: "transfer-response",
              from: myInfo.deviceId,
              transferId: msg.transferId,
              accepted: msg.accepted,
            }));
          }
          break;
        }

        case "create-room": {
          const code = String(Math.floor(100000 + Math.random() * 900000));
          roomCodes.set(code, {
            userId: myInfo.userId,
            username: myInfo.username,
            deviceId: myInfo.deviceId,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
          });
          ws.send(JSON.stringify({ type: "room-created", code }));
          break;
        }

        case "join-room": {
          const room = roomCodes.get(msg.code);
          if (!room || room.expiresAt < Date.now()) {
            ws.send(JSON.stringify({ type: "error", error: "Invalid or expired code" }));
            break;
          }
          // Notify both sides
          const hostWs = findWsByDeviceId(room.deviceId);
          if (hostWs) {
            hostWs.send(JSON.stringify({
              type: "peer-joined",
              peerId: myInfo.deviceId,
              username: myInfo.username,
            }));
            ws.send(JSON.stringify({
              type: "peer-joined",
              peerId: room.deviceId,
              username: room.username,
            }));
          }
          roomCodes.delete(msg.code);
          break;
        }
      }
    });

    ws.on("close", () => {
      const info = connections.get(ws);
      if (info) {
        connections.delete(ws);
        const devSet = userDevices.get(info.userId);
        if (devSet) {
          devSet.delete(info.deviceId);
          if (devSet.size === 0) userDevices.delete(info.userId);
        }
        broadcastDeviceList(info.userId);
        broadcastNearbyUsers(info.publicIP);

        // Notify connected peers
        for (const [otherWs] of connections) {
          if (otherWs.readyState === 1) {
            otherWs.send(JSON.stringify({ type: "peer-left", peerId: info.deviceId }));
          }
        }
      }
    });
  });
}

module.exports = { setupSignaling };
