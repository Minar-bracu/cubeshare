import { useAuth } from "../context/AuthContext";

export default function LockedOverlay({ label }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className={`locked-overlay ${isAuthenticated ? "unlocked" : ""}`}>
      <div className="locked-content">
        <div className="lock-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <circle cx="12" cy="16" r="1"/>
          </svg>
        </div>
        <span className="lock-label">{label || "Login to unlock"}</span>
        <div className="lock-shimmer" />
      </div>
    </div>
  );
}
