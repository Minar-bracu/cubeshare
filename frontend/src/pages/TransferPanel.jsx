import { useState, useRef, useCallback, memo } from "react";

const TransferPanel = memo(function TransferPanel({ webrtc, fileStore, broadcast }) {
  const [mode, setMode] = useState("file"); // "file" | "text"
  const [textInput, setTextInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState([]); // Array of target objects
  const fileInputRef = useRef(null);

  const allTargets = [
    ...(webrtc?.myDevices || []).map((d) => ({
      ...d,
      label: `${d.username} (your device)`,
      group: "Your Devices",
    })),
    ...(webrtc?.nearbyUsers || []).map((u) => ({
      ...u,
      label: `${u.username} (nearby)`,
      group: "Nearby Users",
    })),
    ...(webrtc?.connectedPeers || []).map((p) => ({
      ...p,
      deviceId: p.peerId,
      label: `${p.username} (room)`,
      group: "Connected Peers",
    })),
  ];

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && selectedTargets.length > 0) {
        files.forEach((f) => {
          selectedTargets.forEach(target => {
            webrtc?.sendFile(target.deviceId, f);
          });
          fileStore?.saveFile(f, { fileName: f.name, fileSize: f.size, mimeType: f.type, fromUser: "You", direction: "sent", type: "file" });
        });
      }
    },
    [selectedTargets, webrtc, fileStore],
  );

  const handleFileSelect = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0 && selectedTargets.length > 0) {
        files.forEach((f) => {
          selectedTargets.forEach(target => {
            webrtc?.sendFile(target.deviceId, f);
          });
          fileStore?.saveFile(f, { fileName: f.name, fileSize: f.size, mimeType: f.type, fromUser: "You", direction: "sent", type: "file" });
        });
      }
      e.target.value = "";
    },
    [selectedTargets, webrtc, fileStore],
  );

  const handleSendText = useCallback(() => {
    if (!textInput.trim() || selectedTargets.length === 0) return;
    selectedTargets.forEach(target => {
      webrtc?.sendText(target.deviceId, textInput.trim());
    });
    fileStore?.saveFile(null, { fileName: "Text", type: "text", textContent: textInput.trim(), fromUser: "You", direction: "sent" });
    setTextInput("");
  }, [textInput, selectedTargets, webrtc, fileStore]);

  const handleBroadcastFile = useCallback(
    (e) => {
      const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
      files.forEach((f) => {
        broadcast?.sendFile(f);
        fileStore?.saveFile(f, { fileName: f.name, fileSize: f.size, mimeType: f.type, fromUser: "You", direction: "sent", type: "file" });
      });
    },
    [broadcast, fileStore],
  );

  function formatSize(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  return (
    <div className="face-content transfer-panel">
      <div className="face-scroll">
        <h2 className="face-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
          Transfer
        </h2>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "file" ? "active" : ""}`}
            onClick={() => setMode("file")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            File
          </button>
          <button
            className={`mode-btn ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Text / Link
          </button>
        </div>

        {/* Target Selector */}
        <div className="target-selector">
          <label className="cs-label">Send to:</label>
          {allTargets.length === 0 ? (
            <p className="cs-muted">No devices or users online. Go to Profile to connect.</p>
          ) : (
            <div className="target-list">
              {allTargets.map((t) => {
                const isSelected = selectedTargets.some(target => target.deviceId === t.deviceId);
                return (
                  <button
                    key={t.deviceId}
                    className={`target-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedTargets(prev => 
                        isSelected 
                          ? prev.filter(target => target.deviceId !== t.deviceId)
                          : [...prev, t]
                      );
                    }}
                  >
                    <span className="target-dot" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* File Mode */}
        {mode === "file" && (
          <div
            className={`drop-zone ${dragOver ? "drag-active" : ""} ${selectedTargets.length === 0 ? "disabled" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => selectedTargets.length > 0 && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <div className="drop-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p className="drop-text">
              {selectedTargets.length === 0
                ? "Select targets first"
                : dragOver
                  ? "Drop here!"
                  : `Drag & drop files to ${selectedTargets.length} device${selectedTargets.length > 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {/* Text Mode */}
        {mode === "text" && (
          <div className="text-input-area">
            <textarea
              className="cs-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message or paste a link..."
              rows={3}
            />
            <button
              className="cs-btn cs-btn-primary"
              disabled={!textInput.trim() || selectedTargets.length === 0}
              onClick={handleSendText}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Send
            </button>
          </div>
        )}

        {/* Active Transfers */}
        {webrtc?.transfers?.length > 0 && (
          <div className="transfers-section">
            <div className="section-header">
              <h3 className="section-title">Transfers</h3>
              <button className="cs-btn cs-btn-ghost cs-btn-sm" onClick={webrtc.clearCompleted}>
                Clear done
              </button>
            </div>
            {webrtc.transfers.map((t) => (
              <div key={t.id} className={`transfer-card status-${t.status}`}>
                <div className="transfer-info">
                  <span className="transfer-name">{t.fileName || "Text"}</span>
                  <span className="transfer-meta">
                    {t.fileSize ? formatSize(t.fileSize) : ""} · {t.peerId} · {t.status}
                    </span>
                  <div style={{ padding: "5px", alignSelf: "flex-end" }}>
                    {/* <button className="cs-btn cs-btn-sm" onClick={() => webrtc.cancelTransfer(t.id, t.peerId)}>
                      Cancel
                    </button> */}
                  </div>


                </div>
                <div className="transfer-progress-bar">
                  <div
                    className="transfer-progress-fill"
                    style={{ width: `${t.progress || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Incoming Requests */}
        {webrtc?.incomingRequests?.length > 0 && (
          <div className="transfers-section">
            <div className="section-header">
              <h3 className="section-title">Incoming Requests</h3>
              <div className="button-group">
                <button
                  className="cs-btn cs-btn-accept cs-btn-sm"
                  onClick={() => webrtc.acceptAllTransfers()}
                >Accept All</button>
                <span style={{ padding: "5px" }}></span>
                <button
                  className="cs-btn cs-btn-reject cs-btn-sm"
                  onClick={() => webrtc.rejectAllTransfers()}
                >Reject All</button>
              </div>
            </div>
            {webrtc.incomingRequests.map((req) => (
              <div key={req.transferId} className="transfer-card incoming">
                <div className="transfer-info">
                  <span className="transfer-name">
                    {req.isText ? "Text message" : req.fileName}
                  </span>
                  <span className="transfer-meta">
                    From {req.fromUsername} · {req.fileSize ? formatSize(req.fileSize) : ""}
                  </span>
                </div>
                <div className="transfer-actions">
                  <button
                    className="cs-btn cs-btn-accept"
                    onClick={() => webrtc.acceptTransfer(req.transferId, req.fromDeviceId)}
                  >Accept</button>
                  <button
                    className="cs-btn cs-btn-reject"
                    onClick={() => webrtc.rejectTransfer(req.transferId, req.fromDeviceId)}
                  >Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default TransferPanel;
