import { useAuth } from "../context/AuthContext";

export default function Dashboard({triggerspin}) {
  const { user, logout } = useAuth();

  return (
    <div className="face-content dashboard">
      <div className="face-scroll">
        <div className="dash-header">
          <div className="dash-greeting">
            <span className="dash-wave">👋</span>
            <div>
              <h2 className="dash-title">
                Welcome, <span className="accent-text">{user?.username}</span>
              </h2>
              <p className="dash-subtitle">Your cube, your files, your way</p>
            </div>
          </div>
          <button className="cs-btn cs-btn-ghost" onClick={logout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

        <div className="dash-cards">
          <div onClick={()=>triggerspin(900,1,{x:-1,y:1})} className="dash-card" data-accent="coral">
            <div className="dash-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div  className="dash-card-body">
              <span className="dash-card-label">Transfer</span>
              <span className="dash-card-hint" >Swipe to Back face →</span>
            </div>
          </div>
          <div onClick={()=>triggerspin(700,1,{x:1,y:-1})} className="dash-card" data-accent="cyan">
            <div className="dash-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
            <div className="dash-card-body">
              <span className="dash-card-label">Gallery</span>
              <span className="dash-card-hint">← Swipe to Left face</span>
            </div>
          </div>
          <div onClick={()=>triggerspin(700,1,{x:-1,y:-1})} className="dash-card" data-accent="gold">
            <div className="dash-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="dash-card-body">
              <span className="dash-card-label">Profile</span>
              <span className="dash-card-hint">Swipe to Right face →</span>
            </div>
          </div>
        </div>

        <div className="dash-hint-section">
          <div className="dash-hint-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="dash-hint-text">
            Drag or flick the cube to navigate between faces. Send files, texts,
            and links to your devices or nearby users — all peer-to-peer, no uploads.
          </p>
        </div>
      </div>
    </div>
  );
}
