import { useState, useMemo } from "react";

export default function Gallery({ fileStore }) {
  const [previewItem, setPreviewItem] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [tab, setTab] = useState("received"); // "received" | "sent"
  const { files, deleteFile } = fileStore;

  const sortedFiles = useMemo(() => {
    const filtered = files.filter(f => tab === "sent" ? f.direction === "sent" : f.direction !== "sent");
    const copy = [...filtered];
    if (sortBy === "date") copy.sort((a, b) => b.receivedAt - a.receivedAt);
    else if (sortBy === "size") copy.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
    else if (sortBy === "sender") copy.sort((a, b) => (a.fromUser || "").localeCompare(b.fromUser || ""));
    return copy;
  }, [files, sortBy, tab]);

  function formatSize(bytes) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0, size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const isImage = (m) => m?.startsWith("image/");
  const isVideo = (m) => m?.startsWith("video/");
  const isAudio = (m) => m?.startsWith("audio/");
  const isTextType = (t) => t === "text" || t === "link";

  function handleDownload(item) {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement("a");
    a.href = url; a.download = item.fileName || "download"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="face-content gallery">
      <div className="face-scroll">
        <h2 className="face-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          Gallery
        </h2>

        <div className="mode-toggle" style={{ marginBottom: "0.75rem" }}>
          <button className={`mode-btn ${tab === "received" ? "active" : ""}`} onClick={() => setTab("received")}>Received</button>
          <button className={`mode-btn ${tab === "sent" ? "active" : ""}`} onClick={() => setTab("sent")}>Sent</button>
        </div>

        <div className="gallery-toolbar">
          <span className="cs-muted">{sortedFiles.length} item{sortedFiles.length !== 1 ? "s" : ""}</span>
          <div className="sort-btns">
            {["date", "size", "sender"].map((s) => (
              <button key={s} className={`cs-btn cs-btn-ghost cs-btn-sm ${sortBy === s ? "active" : ""}`} onClick={() => setSortBy(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {sortedFiles.length === 0 ? (
          <div className="gallery-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <p>No files {tab === "sent" ? "sent" : "received"} yet</p>
            <p className="cs-muted">{tab === "sent" ? "Files you send will appear here" : "Files sent to you will appear here"}</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {sortedFiles.map((item) => (
              <div key={item.id} className={`gallery-item ${isTextType(item.type) ? "text-item" : ""}`} onClick={() => setPreviewItem(item)}>
                {isTextType(item.type) ? (
                  <div className="gallery-text-thumb">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span className="text-preview-snippet">{item.textContent?.slice(0, 60)}</span>
                  </div>
                ) : isImage(item.mimeType) ? (
                  <img className="gallery-thumb" src={URL.createObjectURL(item.blob)} alt={item.fileName} loading="lazy" />
                ) : (
                  <div className="gallery-file-thumb">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                )}
                <div className="gallery-item-info">
                  <span className="gallery-item-name">{item.fileName || "Text"}</span>
                  <span className="gallery-item-meta">{item.fromUser} · {formatDate(item.receivedAt)}{item.fileSize ? ` · ${formatSize(item.fileSize)}` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {previewItem && (
          <div className="preview-overlay" onClick={() => setPreviewItem(null)}>
            <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
              <button className="preview-close" onClick={() => setPreviewItem(null)}>✕</button>
              <div className="preview-body">
                {isTextType(previewItem.type) ? (
                  <div className="preview-text-content">
                    <p>{previewItem.textContent}</p>
                    {previewItem.textContent?.match(/^https?:\/\//) && (
                      <a href={previewItem.textContent} target="_blank" rel="noopener noreferrer" className="cs-btn cs-btn-primary">Open Link</a>
                    )}
                  </div>
                ) : isImage(previewItem.mimeType) && previewItem.blob ? (
                  <img src={URL.createObjectURL(previewItem.blob)} alt={previewItem.fileName} className="preview-image" />
                ) : isVideo(previewItem.mimeType) && previewItem.blob ? (
                  <video src={URL.createObjectURL(previewItem.blob)} controls className="preview-video" />
                ) : isAudio(previewItem.mimeType) && previewItem.blob ? (
                  <audio src={URL.createObjectURL(previewItem.blob)} controls />
                ) : (
                  <p className="cs-muted">Preview not available for this file type</p>
                )}
              </div>
              <div className="preview-footer">
                <span className="preview-name">{previewItem.fileName || "Text"}</span>
                <div className="preview-actions">
                  {previewItem.blob && <button className="cs-btn cs-btn-primary cs-btn-sm" onClick={() => handleDownload(previewItem)}>Download</button>}
                  <button className="cs-btn cs-btn-danger cs-btn-sm" onClick={() => { deleteFile(previewItem.id); setPreviewItem(null); }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
