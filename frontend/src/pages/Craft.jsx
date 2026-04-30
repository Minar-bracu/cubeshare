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
import { Maximize, Minimize, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import useFileStore from "../hooks/useFileStore";
import useBroadcastChannel from "../hooks/useBroadcastChannel";

export default function Craft() {
  const [cubestate, setCubestate] = useState({ x: 0, y: 0 });
  const [messageText] = useState("   C C R R E E A A T T E E D D   B B B Y Y Y   M M M I I I N N N A A A R R R         ");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [letterFontSize, setLetterFontSize] = useState(150);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const ref = useRef(null);
  const rotationRef = useRef(0);
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
      fileStore.saveFile(null, { fileName: "Text", type: "text", textContent: data.textContent, fromUser: data.fromUser });
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
    prevMousePos.current = { x: e.clientX, y: e.clientY };

    let rotY = deltaY * 0.05;

    advanceChar(Math.abs(rotY));

    rotationRef.current = (rotationRef.current + rotY) % 360;
    if (ref.current) {
      ref.current.style.transform = `rotateX(${0}deg) rotateY(${rotationRef.current}deg)`;
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
        ref.current.style.transform = `rotateX(${0}deg) rotateY(${nextY}deg)`;
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
        // Final sync with React state only when animation stops
        setCubestate({ x: 0, y: rotationRef.current });
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
    if (e.target.closest("button, input, textarea, a, .dash-card, [role='button']")) {
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
      style={{ perspective: `${Math.max(windowSize.width, windowSize.height) * 5}px`, touchAction: "none" }}
    >
      <button 
        onClick={toggleFullscreen}
        className="cs-btn cs-btn-ghost fullscreen-btn"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 1000, padding: '0.5rem' }}
      >
        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
      </button>

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
          <ChevronLeft size={32} />
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
          <LayoutDashboard size={36} />
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
          <ChevronRight size={32} />
        </button>
      </div>

      <div
        ref={ref}
        
        style={{
          width: cubeWidth,
          height: cubeHeight,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${0}deg) rotateY(${cubestate.y}deg)`,
          touchAction: "none",
        }}
        className="dynamic-cube retro-gloss-theme"
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
            transform: `translateZ(calc(${cubeDepth} * 2))`,
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
            transform: `rotateY(180deg) translateZ(calc(${cubeDepth} * 2))`,
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
            transform: `translateX(calc(${halfWidth} * -2)) rotateY(-90deg)`,
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
            transform: `translateX(calc(${halfWidth} * 2)) rotateY(90deg)`,
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
          style={{
            position: "absolute",
            width: "100%",
            height: `calc(${cubeDepth} * 2)`,
            background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            transform: `translateY(calc(${halfHeight} * -2)) rotateX(90deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            top: "50%",
            marginTop: `calc(${cubeDepth} * -1)`,
            touchAction: "none",
          }}
        >
          <span
            style={{ fontSize: "2rem", color: "white", fontWeight: "bold" }}
          >
            Top
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: `calc(${cubeDepth} * 2)`,
            background: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
            transform: `translateY(calc(${halfHeight} * 2)) rotateX(-90deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            top: "50%",
            marginTop: `calc(${cubeDepth} * -1)`,
            touchAction: "none",
          }}
        >
          <span
            style={{ fontSize: "2rem", color: "white", fontWeight: "bold" }}
          >
            Bottom
          </span>
        </div>
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
            color: "#ffffff",
            textShadow:
              "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(100, 200, 255, 0.6)",
            letterSpacing: "4px",
            fontFamily: "Arial, sans-serif",
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
