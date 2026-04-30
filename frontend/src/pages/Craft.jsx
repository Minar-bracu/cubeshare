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
import useFileStore from "../hooks/useFileStore";
import useBroadcastChannel from "../hooks/useBroadcastChannel";

export default function Craft() {
  const [cubestate, setCubestate] = useState({ x: 0, y: 0 });
  const [messageText] = useState("   C C R R E E A A T T E E D D   B B B Y Y Y   M M M I I I N N N A A A R R R   ");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [letterFontSize, setLetterFontSize] = useState(150);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const ref = useRef(null);
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

    const deltaX = e.clientY - prevMousePos.current.y;
    const deltaY = e.clientX - prevMousePos.current.x;
    prevMousePos.current = { x: e.clientX, y: e.clientY };

    let rotX = deltaX * 0.05;
    let rotY = deltaY * 0.05;

    // Adjust horizontal rotation (Y-axis) based on the current pitch (X-axis)
    // We normalize the X rotation to 0-360 range
    let normalizedX = ((cubestate.x % 360) + 360) % 360;
    if (normalizedX > 90 && normalizedX < 270) {
      rotY = -rotY;
    }

    advanceChar(Math.abs(rotY));

    setCubestate((prev) => ({
      x: (prev.x + rotX) % 360,
      y: (prev.y + rotY) % 360,
    }));
  }

  function flickAnimation(e, duration,distancetravelledvalue=null, directionpassed = null) {
    if (duration <= 0) {
      return;
    }
    if(distancetravelledvalue){
      distancetravelled.current = distancetravelledvalue;
    }else{
    distancetravelled.current = Math.sqrt(
      Math.pow(e.clientX - firstPosition.current.x, 2) +
        Math.pow((e.clientY - firstPosition.current.y) * 0.05, 2),
    );}

    // Reset speed if minimal movement
    console.log(
      "Distance travelled:",
      distancetravelled.current,
      "Duration:",
      duration,
    );
    if (distancetravelled.current < 100 || duration > 150) {
      accumulatedSpeed.current = 0;
      speed.current = 0;
      return;
    }
    var newFlickSpeed=null;
    if (distancetravelledvalue){
      newFlickSpeed=distancetravelledvalue/duration;
    }else{

    newFlickSpeed = Math.min(
      600,
      (distancetravelled.current / duration) * 1000,
    );
    }

    // Stack the new speed with accumulated speed
    accumulatedSpeed.current += newFlickSpeed;
    speed.current = accumulatedSpeed.current;
    let direction={};
    if (directionpassed){
      direction=directionpassed;
    }else{
    direction = {
      x: e.clientX - firstPosition.current.x > 0 ? 1 : -1,
      y: e.clientY - firstPosition.current.y > 0 ? 1 : -1,
    };}

    // Reset snap state at the start of every new flick
    snap.current = false;

    if (rafId.current == null && speed.current < 1) {
      return;
    }
    const deceleration = 0.01;
    const animate = () => {
      if (speed.current <= 500 && !snap.current) {
        snap.current = true;
        accumulatedSpeed.current = 0; // Reset accumulated speed when snapping starts
      }
      const step = direction.x * speed.current * 0.005;
      advanceChar(Math.abs(step));
      setDisplaySpeed(speed.current);
      setCubestate((prev) => {
        const next = {
          x: prev.x,
          y: prev.y + step,
        };
        if (ref.current) {
          if (snap.current) {
            const snappedY = Math.round(next.y / 90) * 90;
            // Smoothly pull the cube toward the snapped angle (0.1 is the snap strength)
            next.y += (snappedY - next.y) * 0.5;
          }

          ref.current.style.transform = `rotateX(${0}deg) rotateY(${next.y}deg)`;
        }

        return next;
      });
      speed.current = Math.max(0, speed.current - speed.current * deceleration);
      if (speed.current <= 100) {
        snap.current = false;
        accumulatedSpeed.current = 0;
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
        setDisplaySpeed(0);
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
    

    console.log("started",distancetravelled.current,durationpassed)
    flickAnimation(e,durationpassed,distancepassed,directionpassed)
    
  }

  function handlePointerDown(e) {
    // Don't capture pointer events if clicking on an input element
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "BUTTON"
    ) {
      return;
    }

    if (e.pointerType === "mouse") {
      e.preventDefault();
    }
    startTime.current = performance.now();
    firstPosition.current = { x: e.clientX, y: e.clientY };
    prevMousePos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = true;
    moved.current = false;

    // Capture the pointer to handle movement even outside the element
    e.target.setPointerCapture(e.pointerId);

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener(
      "pointerup",
      (e) => {
        window.removeEventListener("pointermove", handlePointerMove);
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
      },
      { once: true },
    );
  }
  

  return (
    
    <main
      className="min-h-screen grid place-items-center bg-white-900 relative overflow-hidden"
      style={{ perspective: "2900px" }}
    >

      <div
        ref={ref}
        onPointerDown={handlePointerDown}
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
          }}
        >
          
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: "scale(var(--cube-scale, 1))",
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
