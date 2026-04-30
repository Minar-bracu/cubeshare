import { useEffect, useRef, useCallback, useState } from "react";

const CHANNEL_NAME = "cubeshare-local";

export default function useBroadcastChannel(onReceive) {
  const channelRef = useRef(null);
  const [tabPeers, setTabPeers] = useState(0);

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;

    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "ping") {
        ch.postMessage({ type: "pong" });
        return;
      }
      if (msg.type === "pong") {
        setTabPeers((p) => p + 1);
        return;
      }
      if (msg.type === "file" || msg.type === "text") {
        if (onReceive) onReceive(msg);
      }
    };

    // Discover other tabs
    ch.postMessage({ type: "ping" });

    return () => ch.close();
  }, [onReceive]);

  const sendFile = useCallback((file) => {
    if (!channelRef.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      channelRef.current.postMessage({
        type: "file",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        buffer: reader.result,
        sentAt: Date.now(),
      });
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const sendText = useCallback((text) => {
    if (!channelRef.current) return;
    channelRef.current.postMessage({
      type: "text",
      textContent: text,
      sentAt: Date.now(),
    });
  }, []);

  return { sendFile, sendText, tabPeers };
}
