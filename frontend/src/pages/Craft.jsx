import { useState, useRef, useEffect, useCallback } from "react";
import "./pages.css";
import { useAuth } from "../context/AuthContext";
import Login from "./Login";
import Dashboard from "./Dashboard";
import TransferPanel from "./TransferPanel";
import Gallery from "./Gallery";
import Profile from "./Profile";
import LockedOverlay from "../components/LockedOverlay";
import useWebRTC from "../hooks/useWebRTC";
import { Maximize, Minimize, ChevronLeft, ChevronRight, LayoutDashboard, Bell, X, Palette, Moon, Sun } from "lucide-react";
import useFileStore from "../hooks/useFileStore";
import useBroadcastChannel from "../hooks/useBroadcastChannel";
import { useTheme } from "../context/ThemeContext";

export default function Craft() {
  const { theme, toggleTheme } = useTheme();
  const [cubestate, setCubestate] = useState({ x: 0, y: 0 });
  const [messageText] = useState("   C C R R E E A A T T E E D D   B B B Y Y Y   M M M I I I N N N A A A R R R         ");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [letterFontSize, setLetterFontSize] = useState(150);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const ref = useRef(null);
  const rotationRef = useRef(0);
  const rotationXRef = useRef(0);
  const isDragging = useRef(false);
  const startTime = useRef(0);
  const distancetravelled = useRef(0);
  const firstPosition = useRef({ x: 0, y: 0 });
  const speed = useRef(0);
  const accumulatedSpeed = useRef(0);
  const rafId = useRef(null);
  const moved = useRef(false);
  const cumulativeRotation = useRef(0);
  const lastCharAt = useRef(0);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const snap = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifPreviewItem, setNotifPreviewItem] = useState(null);
  const [notifCopied, setNotifCopied] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [clearedRequestIds, setClearedRequestIds] = useState(new Set());
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auth & P2P hooks (cube physics above is untouched)
  const { isAuthenticated, token, user } = useAuth();
  const webrtc = useWebRTC(isAuthenticated ? token : null, user);
  const fileStore = useFileStore();

  const handleBroadcastReceive = useCallback((msg) => {
    if (msg.type === "file" && msg.buffer) {
      const blob = new Blob([msg.buffer], { type: msg.mimeType });
      fileStore.saveFile(blob, { fileName: msg.fileName, fileSize: msg.fileSize, mimeType: msg.mimeType, fromUser: "This device (tab)", type: "file" });
    } else if (msg.type === "text") {
      fileStore.saveFile(null, { fileName: "Text", type: "text", textContent: msg.textContent, fromUser: "This device (tab)" });
    }
  }, [fileStore]);

  const broadcast = useBroadcastChannel(handleBroadcastReceive);

  // Wire up WebRTC receive callbacks
  useEffect(() => {
    webrtc.setOnFileReceived((data) => {
      fileStore.saveFile(data.blob, { fileName: data.fileName, fileSize: data.fileSize, mimeType: data.mimeType, fromUser: data.fromUser, type: "file" });
    });
    webrtc.setOnTextReceived((data) => {
      const textItem = { id: Date.now(), type: "text", textContent: data.textContent, fromUser: data.fromUser, receivedAt: Date.now() };
      fileStore.saveFile(null, { fileName: "Text", type: "text", textContent: data.textContent, fromUser: data.fromUser });
      setNotifications(prev => [textItem, ...prev].slice(0, 20));
    });
  }, [webrtc, fileStore]);

  useEffect(() => {
    if (ref.current) {
      const cubeHeight = ref.current.offsetHeight;
      setLetterFontSize(cubeHeight * 0.75);
    }
  }, []);

  const cubeWidth = "var(--cube-w, min(450px, 90vw))";
  const cubeHeight = "var(--cube-h, min(600px, 80vh))";
  const cubeDepth = "var(--cube-d, min(225px, 45vw))";

  // Use a helper to get the half-height for Top/Bottom positioning
  const halfHeight = `calc(${cubeHeight} / 2)`;
  const halfWidth = `calc(${cubeWidth} / 2)`;

  function advanceChar(absDelta) {
    cumulativeRotation.current += Math.abs(absDelta);
    if (cumulativeRotation.current - lastCharAt.current >= 360) {
      setCurrentCharIndex((prev) => (prev + 1) % messageText.length);
      lastCharAt.current = cumulativeRotation.current;
    }
  }

  function handlePointerMove(e) {
    moved.current = true;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
      setDisplaySpeed(0);
    }

    const deltaY = e.clientX - prevMousePos.current.x;
    const deltaX = e.clientY - prevMousePos.current.y;
    prevMousePos.current = { x: e.clientX, y: e.clientY };

    let rotY = deltaY * 0.05;
    let rotX = -deltaX * 0.05;

    advanceChar(Math.abs(rotY));

    rotationRef.current = (rotationRef.current + rotY) % 360;
    rotationXRef.current = Math.max(-10, Math.min(10, rotationXRef.current + rotX));
    if (ref.current) {
      ref.current.style.transform = `rotateX(${rotationXRef.current}deg) rotateY(${rotationRef.current}deg)`;
    }
  }

  function flickAnimation(e, duration,distancetravelledvalue=null, directionpassed = null) {
    if (duration <= 0) {
      return;
    }
    const finalX = e.clientX || prevMousePos.current.x;
    const finalY = e.clientY || prevMousePos.current.y;

    if (distancetravelledvalue) {
      distancetravelled.current = distancetravelledvalue;
    } else {
      distancetravelled.current = Math.sqrt(
        Math.pow(finalX - firstPosition.current.x, 2) +
          Math.pow((finalY - firstPosition.current.y) * 0.05, 2),
      );
    }

    // Reset speed if minimal movement
    if (distancetravelled.current < 10 || duration > 300) {
      accumulatedSpeed.current = 0;
      speed.current = 0;
      return;
    }
    var newFlickSpeed = null;
    if (distancetravelledvalue) {
      newFlickSpeed = distancetravelledvalue / duration;
    } else {
      newFlickSpeed = Math.min(
        700,
        (distancetravelled.current / duration) * 1000,
      );
    }

    // Stack the new speed with accumulated speed
    accumulatedSpeed.current += newFlickSpeed;
    speed.current = accumulatedSpeed.current;
    let direction = {};
    if (directionpassed) {
      direction = directionpassed;
    } else {
      direction = {
        x: finalX - firstPosition.current.x > 0 ? 1 : -1,
        y: finalY - firstPosition.current.y > 0 ? 1 : -1,
      };
    }

    // Reset snap state at the start of every new flick
    snap.current = false;

    if (rafId.current == null && speed.current < 1) {
      return;
    }
    const deceleration = 0.01;
    const animate = () => {
      if (speed.current <= 600 && !snap.current) {
        snap.current = true;
        accumulatedSpeed.current = 0; // Reset accumulated speed when snapping starts
      }
      const step = direction.x * speed.current * 0.005;
      advanceChar(Math.abs(step));
      
      // Only update speed state occasionally to save re-renders
      if (Math.random() > 0.8) setDisplaySpeed(speed.current);

      // Update rotation Ref and DOM directly
      let nextY = rotationRef.current + step;
      if (snap.current) {
        const snappedY = Math.round(nextY / 90) * 90;
        if (Math.abs(snappedY - nextY) <= 5) {
          nextY = snappedY;
        } else {
          nextY += (snappedY - nextY) * 0.5;
        }
      }
      
      rotationRef.current = nextY;
      if (ref.current) {
        const blurAmount = Math.min(4, speed.current * 0.004); 
        const isHighSpeed = speed.current > 1500;
        
        // Use CSS variables instead of 'filter' on the container to prevent 3D flattening
        ref.current.style.setProperty('--cube-blur', `${blurAmount}px`);
        
        if (isHighSpeed) {
          const rx = (Math.random() - 0.5) * 15;
          const ry = (Math.random() - 0.5) * 15;
          ref.current.style.setProperty('--spark-x', `${rx}px`);
          ref.current.style.setProperty('--spark-y', `${ry}px`);
          ref.current.style.setProperty('--spark-opacity', '1');
          ref.current.style.setProperty('--spark-color1', theme === 'retro' ? 'var(--cs-mint)' : 'var(--cs-coral)');
          ref.current.style.setProperty('--spark-color2', 'var(--cs-rose)');
        } else {
          ref.current.style.setProperty('--spark-opacity', '0');
        }
        
        ref.current.style.transform = `rotateX(${rotationXRef.current}deg) rotateY(${nextY}deg)`;
      }
      speed.current = Math.max(0, speed.current - speed.current * deceleration);
      
      // Calculate snap target to check if we are finished using the ref
      const snappedY = Math.round(rotationRef.current / 90) * 90;
      const snapFinished = snap.current && Math.abs(snappedY - rotationRef.current) < 0.1;

      if (speed.current <= 300 && (!snap.current || snapFinished)) {
        snap.current = false;
        accumulatedSpeed.current = 0;
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
        setDisplaySpeed(0);
        if (ref.current) ref.current.style.filter = "none";
        // Final sync with React state only when animation stops
        setCubestate({ x: rotationXRef.current, y: rotationRef.current });
        return;
      }
      rafId.current = requestAnimationFrame(animate);
    };

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    rafId.current = requestAnimationFrame(animate);
  }

  function programiticallySpin(distancepassed,durationpassed,directionpassed=null){
    const e = {
      clientX:0,
      clientY:0,
    }
    

    flickAnimation(e,durationpassed,distancepassed,directionpassed)
    
  }

  function handlePointerDown(e) {
    // Don't capture pointer events if clicking on interactive elements
    if (e.target.closest("button, input, textarea, a, .dash-card, .gallery-item, .drop-zone, .notif-panel, .notif-btn, .preview-overlay, [role='button']")) {
      return;
    }

    e.preventDefault(); // Crucial: Prevents default browser touch/drag behavior (like scrolling)

    startTime.current = performance.now();
    firstPosition.current = { x: e.clientX, y: e.clientY };
    prevMousePos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = true;
    moved.current = false;

    // Capture the pointer to handle movement even outside the element
    e.currentTarget.setPointerCapture(e.pointerId);

    const cleanup = (e) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      isDragging.current = false;

      const endTime = performance.now();
      if (moved.current === false && rafId.current !== null) {
        speed.current = 0;
        accumulatedSpeed.current = 0;
        setDisplaySpeed(0);
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
        return;
      }
      moved.current = false;
      flickAnimation(e, endTime - startTime.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", cleanup, { once: true });
    window.addEventListener("pointercancel", cleanup, { once: true });
  }
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for escape key or browser-level fullscreen changes
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    
    <main
    onPointerDown={handlePointerDown}
      className="min-h-screen grid place-items-center bg-white-900 relative overflow-hidden main-container"
      style={{ perspective: `${Math.max(windowSize.width, windowSize.height) * (isFullscreen ? 10 : 1)}px`, touchAction: "none" }}
    >
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 1000, display: 'flex', gap: '0.75rem' }}>
        <button 
          onClick={toggleTheme}
          className="cs-btn cs-btn-ghost theme-toggle-btn"
          style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
          title={`Switch to ${theme === 'retro' ? 'Simplistic' : 'Retro'} theme`}
        >
          {theme === 'retro' ? <Palette size={24} color="white" /> : <Moon size={24} color="#1d1d1f" />}
        </button>
        <button 
          onClick={toggleFullscreen}
          className="cs-btn cs-btn-ghost fullscreen-btn"
          style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {isFullscreen ? <Minimize size={24} color={theme === 'retro' ? "white" : "#1d1d1f"} /> : <Maximize size={24} color={theme === 'retro' ? "white" : "#1d1d1f"} />}
        </button>
      </div>

      {/* ── Notification System ── */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 1100 }}>
        <button
          className="cs-btn cs-btn-ghost notif-btn"
          onClick={() => setIsNotifOpen(prev => !prev)}
          style={{
            position: 'relative', padding: '0.5rem',
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Bell size={24} color={theme === 'retro' ? "white" : "#1d1d1f"} />
          {((webrtc?.incomingRequests?.filter(r => !clearedRequestIds.has(r.transferId)).length > 0) || notifications.length > 0) && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '10px', height: '10px', background: '#ff4444',
              borderRadius: '50%', border: '2px solid #1a1a1a'
            }} />
          )}
        </button>

        {isNotifOpen && (
          <div className="notif-panel" style={{
            position: 'absolute', top: '3.5rem', left: 0, width: '290px',
            maxHeight: '420px', overflowY: 'auto', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)', padding: '1rem',
            backdropFilter: 'blur(20px)', background: 'rgba(20,20,20,0.88)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.55)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Notifications</h3>
              <button onClick={() => setIsNotifOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Incoming transfer requests */}
              {webrtc?.incomingRequests?.filter(r => !clearedRequestIds.has(r.transferId)).map(req => (
                <div key={req.transferId} style={{
                  background: 'rgba(255,255,255,0.05)', padding: '0.75rem',
                  borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem' }}>
                    <strong>{req.fromUsername}</strong> wants to send:
                    <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                      {req.isText ? 'Text message' : req.fileName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="cs-btn cs-btn-accept cs-btn-sm"
                      style={{ flex: 1, padding: '4px 8px' }}
                      onClick={() => webrtc.acceptTransfer(req.transferId, req.fromDeviceId)}
                    >Accept</button>
                    <button
                      className="cs-btn cs-btn-reject cs-btn-sm"
                      style={{ flex: 1, padding: '4px 8px' }}
                      onClick={() => webrtc.rejectTransfer(req.transferId, req.fromDeviceId)}
                    >Decline</button>
                  </div>
                </div>
              ))}

              {/* Recent text notifications */}
              {notifications.map(n => (
                <div key={n.id} style={{
                  background: 'rgba(255,255,255,0.05)', padding: '0.75rem',
                  borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer'
                }} onClick={() => setNotifPreviewItem(n)}>
                  <div style={{ fontSize: '0.8rem', color: 'white' }}>
                    <strong>{n.fromUser}</strong> sent a message:
                    <div style={{
                      color: 'rgba(255,255,255,0.6)', marginTop: '3px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {n.textContent}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {(webrtc?.incomingRequests?.filter(r => !clearedRequestIds.has(r.transferId)).length === 0) && notifications.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                  No new notifications
                </div>
              )}
            </div>

            {/* Clear button */}
            {((webrtc?.incomingRequests?.some(r => !clearedRequestIds.has(r.transferId))) || notifications.length > 0) && (
              <button
                onClick={() => {
                  const ids = (webrtc?.incomingRequests || []).map(r => r.transferId);
                  setClearedRequestIds(prev => new Set([...prev, ...ids]));
                  setNotifications([]);
                }}
                className="cs-btn cs-btn-ghost cs-btn-sm"
                style={{ width: '100%', marginTop: '0.85rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}
              >
                Clear all notifications
              </button>
            )}
          </div>
        )}

        {/* Text preview modal (same style as Gallery) */}
        {notifPreviewItem && (
          <div
            className="preview-overlay"
            onClick={() => { setNotifPreviewItem(null); setNotifCopied(false); }}
          >
            <div
              className="preview-modal"
              style={{
                width: 'min(400px, 90vw)', padding: '1.5rem',
                border: theme === 'retro' ? '1px solid rgba(0,255,157,0.3)' : '1px solid rgba(255,255,255,0.1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="preview-close"
                style={{ top: '0.75rem', right: '0.75rem' }}
                onClick={() => { setNotifPreviewItem(null); setNotifCopied(false); }}
              >✕</button>
              <div style={{
                background: 'rgba(255,255,255,0.05)', padding: '1rem',
                borderRadius: '12px', color: 'white', fontSize: '0.9rem',
                lineHeight: 1.6, marginTop: '0.5rem', wordBreak: 'break-word'
              }}>
                <p style={{ margin: 0 }}>{notifPreviewItem.textContent}</p>
                {notifPreviewItem.textContent?.match(/^https?:\/\//) && (
                  <a
                    href={notifPreviewItem.textContent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cs-btn cs-btn-primary"
                    style={{ marginTop: '0.75rem', display: 'inline-flex' }}
                  >Open Link</a>
                )}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>From {notifPreviewItem.fromUser}</span>
                <button
                  className="cs-btn cs-btn-ghost cs-btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(notifPreviewItem.textContent);
                    setNotifCopied(true);
                    setTimeout(() => setNotifCopied(false), 2000);
                  }}
                >{notifCopied ? 'Copied!' : 'Copy Text'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="nav-controls" style={{
        position: 'absolute',
        bottom: '2.5rem',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 2.5rem',
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        <button 
          onClick={() => programiticallySpin(700, 1, { x: 1, y: -1 })}
          className="cs-btn cs-btn-ghost nav-btn"
          style={{ 
            pointerEvents: 'auto', 
            width: '56px', 
            height: '56px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.08)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <ChevronLeft size={32} color={theme === 'retro' ? "white" : "#1d1d1f"} />
        </button>

        <button 
          onClick={() => {
            // Stop any current spinning immediately
            if (rafId.current) {
              cancelAnimationFrame(rafId.current);
              rafId.current = null;
            }
            speed.current = 0;
            accumulatedSpeed.current = 0;
            setDisplaySpeed(0);

            // Calculate the nearest multiple of 360 to return to Dashboard
            const currentY = rotationRef.current;
            const targetY = Math.round(currentY / 360) * 360;
            
            // Trigger a controlled pull to that target
            snap.current = true;
            speed.current = 400; 
            programiticallySpin(10, 1, { x: targetY > currentY ? 1 : -1, y: 1 });
          }}
          className="cs-btn cs-btn-ghost nav-btn"
          style={{ 
            pointerEvents: 'auto', 
            width: '72px', 
            height: '72px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 0 20px rgba(255,255,255,0.05)'
          }}
        >
          <LayoutDashboard size={36} color={theme === 'retro' ? "white" : "#1d1d1f"} />
        </button>

        <button 
          onClick={() => programiticallySpin(700, 1, { x: -1, y: 1 })}
          className="cs-btn cs-btn-ghost nav-btn"
          style={{ 
            pointerEvents: 'auto', 
            width: '56px', 
            height: '56px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.08)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <ChevronRight size={32} color={theme === 'retro' ? "white" : "#1d1d1f"} />
        </button>
      </div>

      <div
        ref={ref}
        
        style={{
          width: cubeWidth,
          height: cubeHeight,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${cubestate.x}deg) rotateY(${cubestate.y}deg)`,
          touchAction: "none",
        }}
        className={`dynamic-cube ${theme === 'retro' ? 'retro-gloss-theme' : ''}`}
      >
        {/* Global SVG Gradient Definition for retro-pixel icons */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff0055" />
              <stop offset="25%" stopColor="#ffaa00" />
              <stop offset="50%" stopColor="#55ff00" />
              <stop offset="75%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#ff00ff" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="cube-side-face cube-face-front"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            transform: `translateZ(${cubeDepth})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            overflow: "auto",
            padding: "2rem",
            boxSizing: "border-box",
            touchAction: "none",
          }}
        >
          
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: "scale(var(--cube-scale, 1))",
              touchAction: "none",
            }}
          >

            {isAuthenticated ? <Dashboard triggerspin={programiticallySpin}/> : <Login />}
          </div>
        </div>
        <div
          className="cube-side-face cube-face-back"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            transform: `rotateY(180deg) translateZ(${cubeDepth})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            touchAction: "none",
          }}
        >
          {isAuthenticated ? <TransferPanel webrtc={webrtc} fileStore={fileStore} broadcast={broadcast} /> : <Login />}
        </div>
        <div
          className="cube-side-face cube-face-left"
          style={{
            position: "absolute",
            width: `calc(${cubeDepth} * 2)`,
            height: "100%",
            transform: `translateX(calc(${halfWidth} * -1)) rotateY(-90deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            left: "50%",
            marginLeft: `calc(${cubeDepth} * -1)`,
            touchAction: "none",
          }}
        >
          {isAuthenticated ? <Gallery fileStore={fileStore} /> : <Login />}
        </div>
        <div
          className="cube-side-face cube-face-right"
          style={{
            position: "absolute",
            width: `calc(${cubeDepth} * 2)`,
            height: "100%",
            transform: `translateX(${halfWidth}) rotateY(90deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            left: "50%",
            marginLeft: `calc(${cubeDepth} * -1)`,
            touchAction: "none",
          }}
        >
          {isAuthenticated ? <Profile webrtc={webrtc} /> : <Login />}
        </div>
        <div
          className="cube-side-face"
          style={{
            position: "absolute",
            width: "100%",
            height: `calc(${cubeDepth} * 2)`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            transform: `translateY(calc(${halfHeight} * -1)) rotateX(90deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            top: "50%",
            marginTop: `calc(${cubeDepth} * -1)`,
            touchAction: "none",
          }}
        />
        <div
          className="cube-side-face"
          style={{
            position: "absolute",
            width: "100%",
            height: `calc(${cubeDepth} * 2)`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 100%)",
            transform: `translateY(${halfHeight}) rotateX(-90deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            top: "50%",
            marginTop: `calc(${cubeDepth} * -1)`,
            touchAction: "none",
          }}
        />
      </div>
      {displaySpeed > 3000 && (
        <div
          key={currentCharIndex}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            fontSize: `${letterFontSize}px`,
            fontWeight: "900",
            color: "#00ff9d",
            textShadow:
              "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(100, 200, 255, 0.6)",
            letterSpacing: "4px",
            fontFamily: "'Press Start 2P', cursive",
            userSelect: "none",
            pointerEvents: "none",
            opacity: 0.7,
            animation:
              displaySpeed > 4000
                ? "none"
                : `blink ${Math.max(0.08, Math.min(0.8, 1200 / displaySpeed))}s linear 1 forwards`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {messageText[currentCharIndex]}
        </div>
      )}
    </main>
  );
}
