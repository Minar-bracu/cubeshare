import { useState, memo } from "react";
import { useAuth } from "../context/AuthContext";

const Profile = memo(function Profile({ webrtc }) {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCreateRoom() {
    webrtc?.createRoom();
  }

  function handleJoinRoom() {
    if (joinCode.trim().length === 6) {
      webrtc?.joinRoom(joinCode.trim());
      setJoinCode("");
    }
  }

  function copyCode() {
    if (webrtc?.roomCode) {
      navigator.clipboard.writeText(webrtc.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="face-content profile">
      <div className="face-scroll">
        <h2 className="face-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </h2>

        {/* User Info */}
        <div className="profile-card">
          <div className="profile-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
          <div className="profile-info">
            <span className="profile-username">{user?.username}</span>
            <span className="profile-status">
              <span className={`status-dot ${webrtc?.isConnected ? "online" : "offline"}`} />
              {webrtc?.isConnected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>

        {/* Device ID */}
        <div className="section-block">
          <h3 className="section-title">This Device</h3>
          <div className="device-id-display">
            <code>{webrtc?.myDeviceId || "—"}</code>
          </div>
        </div>

        {/* Your Devices (Tier 2) */}
        <div className="section-block">
          <h3 className="section-title">
            Your Devices
            <span className="badge">{webrtc?.myDevices?.length || 0}</span>
          </h3>
          {webrtc?.myDevices?.length === 0 ? (
            <p className="cs-muted">Open this site on another device with the same account to see it here.</p>
          ) : (
            <div className="device-list">
              {webrtc.myDevices.map((d) => (
                <div key={d.deviceId} className="device-item">
                  <span className="status-dot online" />
                  <span className="device-name">{d.username}</span>
                  <code className="device-code">{d.deviceId}</code>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nearby Users (Tier 3) */}
        <div className="section-block">
          <h3 className="section-title">
            Nearby Users
            <span className="badge">{webrtc?.nearbyUsers?.length || 0}</span>
          </h3>
          {webrtc?.nearbyUsers?.length === 0 ? (
            <p className="cs-muted">Other users on the same network will appear here.</p>
          ) : (
            <div className="device-list">
              {webrtc.nearbyUsers.map((u) => (
                <div key={u.deviceId} className="device-item">
                  <span className="status-dot online" />
                  <span className="device-name">{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room Code (Tier 4) */}
        <div className="section-block">
          <h3 className="section-title">Connect via Code</h3>
          <p className="cs-muted" style={{ marginBottom: "0.75rem" }}>Share a 6-digit code to connect with anyone, anywhere.</p>

          {webrtc?.roomCode ? (
            <div className="room-code-display">
              <span className="room-code">{webrtc.roomCode}</span>
              <button className="cs-btn cs-btn-ghost cs-btn-sm" onClick={copyCode}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <span className="cs-muted" style={{ fontSize: "0.7rem" }}>Expires in 5 min</span>
            </div>
          ) : (
            <button className="cs-btn cs-btn-primary" onClick={handleCreateRoom} disabled={!webrtc?.isConnected}>
              Generate Code
            </button>
          )}

          <div className="join-room-row">
            <input
              className="cs-input"
              type="text"
              maxLength={6}
              placeholder="Enter code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
            />
            <button className="cs-btn cs-btn-primary" onClick={handleJoinRoom} disabled={joinCode.length !== 6}>
              Join
            </button>
          </div>
        </div>

        {/* Connected Peers */}
        {webrtc?.connectedPeers?.length > 0 && (
          <div className="section-block">
            <h3 className="section-title">Connected Peers <span className="badge">{webrtc.connectedPeers.length}</span></h3>
            <div className="device-list">
              {webrtc.connectedPeers.map((p) => (
                <div key={p.peerId} className="device-item">
                  <span className="status-dot online" />
                  <span className="device-name">{p.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default Profile;
