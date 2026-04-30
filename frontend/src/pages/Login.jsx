import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import "./pages.css";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Login failed");
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
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Registration failed");
        return;
      }

      setMessage("Registration successful. You can now login.");
    } catch (error) {
      setMessage("Network error. Is backend running?");
      console.error(error);
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
      <h1 className="face-title" style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
        Welcome
      </h1>

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
        >
          Login
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
      >
        Register
      </button>
    </div>
  );
}
