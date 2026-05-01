import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { API_BASE_URL } from "../config";
import { Loader2 } from "lucide-react";
import "./pages.css";

import retroLogo from "../logo/retrostylelogo.png";

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processType, setProcessType] = useState(""); // "login" or "register"

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setIsProcessing(true);
    setProcessType("login");

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Login failed");
        setIsProcessing(false);
        return;
      }

      localStorage.setItem("token", data.token);
      // Decode JWT payload for user info
      try {
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        login(data.token, { id: payload.id, username: payload.username });
      } catch {
        login(data.token, { username });
      }
      setMessage("Login successful!");
    } catch (error) {
      setMessage("Network error. Is backend running?");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");
    setIsProcessing(true);
    setProcessType("register");

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Registration failed");
        setIsProcessing(false);
        return;
      }

      setMessage("Registration successful. You can now login.");
    } catch (error) {
      setMessage("Network error. Is backend running?");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "1.5rem",
        boxSizing: "border-box",
        color: "var(--cs-text)",
      }}
    >
      <img 
        src={retroLogo} 
        alt="CubeShare Retro Logo" 
        style={{ width: "100%", maxWidth: "320px", marginBottom: "2rem", filter: "drop-shadow(0 0 15px rgba(0,255,157,0.3))" }} 
      />

      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="cs-input"
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cs-input"
          placeholder="Password"
        />
        <button
          type="submit"
          className="cs-btn cs-btn-primary"
          style={{ justifyContent: "center", padding: "0.75rem", fontSize: "1rem" }}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Login'}
        </button>
      </form>

      {message && (
        <p
          style={{
            marginTop: "1rem",
            textAlign: "center",
            fontSize: "0.875rem",
            fontWeight: "500",
            color: message.includes("successful") ? "var(--cs-mint)" : "var(--cs-rose)",
          }}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleRegister}
        className="cs-btn cs-btn-ghost"
        style={{ marginTop: "1rem" }}
        disabled={isProcessing}
      >
        Register
      </button>

      {/* ── Processing Overlay ── */}
      {isProcessing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: theme === 'retro' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: theme === 'retro' ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.9)',
            padding: '2rem', borderRadius: '24px',
            border: theme === 'retro' ? '1px solid rgba(0,255,157,0.3)' : '1px solid rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}>
            <Loader2 className="animate-spin" size={48} color={theme === 'retro' ? '#00ff9d' : '#0071e3'} />
            <span style={{
              fontFamily: theme === 'retro' ? '"Silkscreen", cursive' : 'inherit',
              color: theme === 'retro' ? '#00ff9d' : '#1d1d1f',
              fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em'
            }}>
              {processType === 'login' ? 'LOGGING IN...' : 'CREATING ACCOUNT...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
