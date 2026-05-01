import { useState, useEffect, useRef, useCallback } from "react";
import { WS_BASE_URL } from "../config";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function useWebRTC(token, user) {
  const [isConnected, setIsConnected] = useState(false);
  const [myDevices, setMyDevices] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [roomCode, setRoomCode] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState([]);

  const wsRef = useRef(null);
  const peersRef = useRef({});    // deviceId -> RTCPeerConnection
  const channelsRef = useRef({}); // deviceId -> RTCDataChannel
  const transfersRef = useRef({}); // transferId -> transfer state
  const myDeviceId = useRef(generateId());
  const pendingFiles = useRef({}); // transferId -> File
  const receiveBuffers = useRef({}); // transferId -> { chunks, metadata }

  // onFileReceived callback ref
  const onFileReceivedRef = useRef(null);
  const onTextReceivedRef = useRef(null);

  const setOnFileReceived = useCallback((fn) => { onFileReceivedRef.current = fn; }, []);
  const setOnTextReceived = useCallback((fn) => { onTextReceivedRef.current = fn; }, []);

  // -- WebSocket connection --
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(WS_BASE_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token, deviceId: myDeviceId.current }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      handleSignalingMessage(msg);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(() => {
        if (wsRef.current === ws) {
          // Reconnect
        }
      }, 3000);
    };

    ws.onerror = () => { };

    return () => {
      ws.close();
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      channelsRef.current = {};
    };
  }, [token]);

  function handleSignalingMessage(msg) {
    switch (msg.type) {
      case "authenticated":
        setIsConnected(true);
        break;
      case "device-list":
        setMyDevices(msg.devices.filter((d) => d.deviceId !== myDeviceId.current));
        break;
      case "nearby-users":
        setNearbyUsers(msg.users);
        break;
      case "offer":
        handleOffer(msg);
        break;
      case "answer":
        handleAnswer(msg);
        break;
      case "ice-candidate":
        handleIceCandidate(msg);
        break;
      case "transfer-request":
        setIncomingRequests((prev) => [...prev, {
          transferId: msg.transferId,
          fromUsername: msg.fromUsername,
          fromDeviceId: msg.from,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          isText: msg.isText || false,
          textContent: msg.textContent || null,
        }]);
        break;
      case "transfer-response":
        handleTransferResponse(msg);
        break;
      case "room-created":
        setRoomCode(msg.code);
        break;
      case "peer-joined":
        setConnectedPeers((prev) => {
          if (prev.find((p) => p.peerId === msg.peerId)) return prev;
          return [...prev, { peerId: msg.peerId, username: msg.username }];
        });
        // Auto-connect if we are the joiner (joining a host)
        if (msg.isHost) {
          connectToPeer(msg.peerId);
        }
        setRoomCode(null);
        break;
      case "peer-left":
        setConnectedPeers((prev) => prev.filter((p) => p.peerId !== msg.peerId));
        cleanupPeer(msg.peerId);
        break;
      default:
        break;
    }
  }

  // -- WebRTC Peer Connection --
  function createPeerConnection(remoteDeviceId) {
    if (peersRef.current[remoteDeviceId]) {
      return peersRef.current[remoteDeviceId];
    }
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[remoteDeviceId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          to: remoteDeviceId,
          candidate: e.candidate,
        }));
      }
    };

    pc.ondatachannel = (e) => {
      setupDataChannel(e.channel, remoteDeviceId);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanupPeer(remoteDeviceId);
      }
    };

    return pc;
  }

  function setupDataChannel(channel, remoteDeviceId) {
    channelsRef.current[remoteDeviceId] = channel;
    channel.binaryType = "arraybuffer";

    channel.onmessage = (e) => {
      if (typeof e.data === "string") {
        const meta = JSON.parse(e.data);
        if (meta.type === "file-meta") {
          receiveBuffers.current[meta.transferId] = {
            chunks: [],
            metadata: meta,
            received: 0,
          };
        } else if (meta.type === "file-complete") {
          finalizeReceive(meta.transferId);
        } else if (meta.type === "text-message") {
          if (onTextReceivedRef.current) {
            onTextReceivedRef.current({
              textContent: meta.textContent,
              fromUser: meta.fromUser || "Unknown",
            });
          }
        }
      } else {
        // Binary chunk - find the active receive
        const activeId = Object.keys(receiveBuffers.current).find(
          (id) => receiveBuffers.current[id] && !receiveBuffers.current[id].done
        );
        if (activeId) {
          const buf = receiveBuffers.current[activeId];
          buf.chunks.push(e.data);
          buf.received += e.data.byteLength;
          updateTransferProgress(activeId, buf.received, buf.metadata.fileSize, "receiving");
        }
      }
    };
  }

  function finalizeReceive(transferId) {
    const buf = receiveBuffers.current[transferId];
    if (!buf) return;
    buf.done = true;
    const blob = new Blob(buf.chunks, { type: buf.metadata.mimeType });
    if (onFileReceivedRef.current) {
      onFileReceivedRef.current({
        blob,
        fileName: buf.metadata.fileName,
        fileSize: buf.metadata.fileSize,
        mimeType: buf.metadata.mimeType,
        fromUser: buf.metadata.fromUser,
      });
    }
    updateTransferProgress(transferId, buf.metadata.fileSize, buf.metadata.fileSize, "complete");
    delete receiveBuffers.current[transferId];
  }

  function updateTransferProgress(transferId, loaded, total, status) {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.id === transferId);
      const updated = {
        ...(idx >= 0 ? prev[idx] : {}),
        id: transferId,
        progress: Math.round((loaded / total) * 100),
        loaded,
        total,
        status,
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
  }

  // -- Signaling handlers --
  async function handleOffer(msg) {
    const pc = createPeerConnection(msg.from);
    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    wsRef.current.send(JSON.stringify({
      type: "answer",
      to: msg.from,
      sdp: answer,
    }));
  }

  async function handleAnswer(msg) {
    const pc = peersRef.current[msg.from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
  }

  async function handleIceCandidate(msg) {
    const pc = peersRef.current[msg.from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  }

  function handleTransferResponse(msg) {
    if (msg.accepted) {
      const file = pendingFiles.current[msg.transferId];
      if (file) {
        startSending(msg.from, file, msg.transferId);
        delete pendingFiles.current[msg.transferId];
      }
    } else {
      updateTransferProgress(msg.transferId, 0, 0, "rejected");
      delete pendingFiles.current[msg.transferId];
    }
  }

  function cleanupPeer(deviceId) {
    if (peersRef.current[deviceId]) {
      peersRef.current[deviceId].close();
      delete peersRef.current[deviceId];
    }
    delete channelsRef.current[deviceId];
  }

  // -- Connect to a peer (create offer) --
  async function connectToPeer(remoteDeviceId) {
    const pc = createPeerConnection(remoteDeviceId);
    const channel = pc.createDataChannel("cubeshare", { ordered: true });
    setupDataChannel(channel, remoteDeviceId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    wsRef.current.send(JSON.stringify({
      type: "offer",
      to: remoteDeviceId,
      sdp: offer,
    }));
  }

  // -- Send file --
  const sendFile = useCallback(async (targetDeviceId, file) => {
    const transferId = generateId();

    // Ensure peer connection exists
    if (!channelsRef.current[targetDeviceId]) {
      await connectToPeer(targetDeviceId);
      // Wait for channel to open
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (channelsRef.current[targetDeviceId]?.readyState === "open") {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
      });
    }

    // Request transfer via signaling
    pendingFiles.current[transferId] = file;
    wsRef.current.send(JSON.stringify({
      type: "transfer-request",
      to: targetDeviceId,
      transferId,
      fileName: file.name,
      fileSize: file.size,
    }));

    setTransfers((prev) => [...prev, {
      id: transferId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      loaded: 0,
      total: file.size,
      status: "pending",
      direction: "sending",
      peerId: targetDeviceId,
    }]);

    return transferId;
  }, []);

  // -- Actually send file data over DataChannel --
  async function startSending(targetDeviceId, file, transferId) {
    const channel = channelsRef.current[targetDeviceId];
    if (!channel || channel.readyState !== "open") {
      updateTransferProgress(transferId, 0, file.size, "error");
      return;
    }

    // Send metadata
    channel.send(JSON.stringify({
      type: "file-meta",
      transferId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fromUser: user?.username || "Unknown",
    }));

    // Send file in chunks
    let offset = 0;
    const reader = file.stream().getReader();
    const send = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunkOffset = 0;
        while (chunkOffset < value.byteLength) {
          const end = Math.min(chunkOffset + CHUNK_SIZE, value.byteLength);
          const chunk = value.slice(chunkOffset, end);

          // Backpressure: wait if buffered amount is too high
          while (channel.bufferedAmount > 1024 * 1024) {
            await new Promise((r) => setTimeout(r, 50));
          }

          channel.send(chunk);
          offset += chunk.byteLength;
          chunkOffset = end;
          updateTransferProgress(transferId, offset, file.size, "sending");
        }
      }
      channel.send(JSON.stringify({ type: "file-complete", transferId }));
      updateTransferProgress(transferId, file.size, file.size, "complete");
    };

    await send();
  }

  // -- Send text message --
  const sendText = useCallback(async (targetDeviceId, text) => {
    if (!channelsRef.current[targetDeviceId]) {
      await connectToPeer(targetDeviceId);
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (channelsRef.current[targetDeviceId]?.readyState === "open") {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
      });
    }

    const channel = channelsRef.current[targetDeviceId];
    if (channel?.readyState === "open") {
      channel.send(JSON.stringify({
        type: "text-message",
        textContent: text,
        fromUser: user?.username || "Unknown",
      }));
    }
  }, [user]);

  // -- Accept / Reject transfer --
  const acceptTransfer = useCallback((transferId, fromDeviceId) => {
    wsRef.current?.send(JSON.stringify({
      type: "transfer-response",
      to: fromDeviceId,
      transferId,
      accepted: true,
    }));
    setIncomingRequests((prev) => prev.filter((r) => r.transferId !== transferId));
    setTransfers((prev) => [...prev, {
      id: transferId,
      status: "receiving",
      progress: 0,
      direction: "receiving",
    }]);
  }, []);

  const rejectTransfer = useCallback((transferId, fromDeviceId) => {
    wsRef.current?.send(JSON.stringify({
      type: "transfer-response",
      to: fromDeviceId,
      transferId,
      accepted: false,
    }));
    setIncomingRequests((prev) => prev.filter((r) => r.transferId !== transferId));
  }, []);

  const acceptAllTransfers = useCallback(() => {
    incomingRequests.forEach((incomingRequest) => {
      acceptTransfer(incomingRequest.transferId, incomingRequest.fromDeviceId);
    });
  }, [incomingRequests, acceptTransfer]);


  const rejectAllTransfers = useCallback(() => {
    incomingRequests.forEach((incomingRequest) => {
      rejectTransfer(incomingRequest.transferId, incomingRequest.fromDeviceId);
    });
  }, [incomingRequests, rejectTransfer]);






  // -- Room codes --
  const createRoom = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "create-room" }));
  }, []);

  const joinRoom = useCallback((code) => {
    wsRef.current?.send(JSON.stringify({ type: "join-room", code }));
  }, []);

  // -- Cancel transfer --
  const cancelTransfer = useCallback((transferId) => {
    setTransfers((prev) => prev.map((t) =>
      t.id === transferId ? { ...t, status: "cancelled" } : t
    ));
    setIncomingRequests((prev) => prev.filter((r) => r.transferId !== transferId));
    delete pendingFiles.current[transferId];
    if (targetDeviceId && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "transfer-response",
        to: targetDeviceId,
        transferId,
        accepted: false,
      }));
    }

  }, []);

  // -- Clear completed --
  const clearCompleted = useCallback(() => {
    setTransfers((prev) => prev.filter((t) => t.status !== "complete" && t.status !== "cancelled" && t.status !== "rejected" && t.status !== "error"));
  }, []);

  return {
    isConnected,
    myDeviceId: myDeviceId.current,
    myDevices,
    nearbyUsers,
    connectedPeers,
    transfers,
    incomingRequests,
    roomCode,
    sendFile,
    sendText,
    acceptTransfer,
    rejectTransfer,
    acceptAllTransfers,
    rejectAllTransfers,
    cancelTransfer,
    clearCompleted,
    createRoom,
    joinRoom,
    connectToPeer,
    setOnFileReceived,
    setOnTextReceived,
  };
}
