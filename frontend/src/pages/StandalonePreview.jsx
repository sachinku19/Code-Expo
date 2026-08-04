import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Globe, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import { compileWorkspaceProject } from "../services/projectCompiler";
import socket from "../socket/socket";
import "./StandalonePreview.css";

const StandalonePreview = () => {
  const { roomId } = useParams();
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  
  const liveOverridesRef = useRef({ activeCode: "", activeFileId: null, activeHTMLPath: "index.html" });
  const activeBlobUrlsRef = useRef({});
  const iframeRef = useRef(null);
  const debounceTimer = useRef(null);

  const loadAndCompile = async (isRealtimeSync = false, overrides = {}) => {
    if (isRealtimeSync) {
      setSyncing(true);
    }
    try {
      setError(null);
      if (overrides.activeCode !== undefined) liveOverridesRef.current.activeCode = overrides.activeCode;
      if (overrides.activeFileId !== undefined) liveOverridesRef.current.activeFileId = overrides.activeFileId;
      if (overrides.activeHTMLPath !== undefined) liveOverridesRef.current.activeHTMLPath = overrides.activeHTMLPath;

      const result = await compileWorkspaceProject({
        roomId,
        activeCode: liveOverridesRef.current.activeCode,
        activeFileId: liveOverridesRef.current.activeFileId,
        activeHTMLPath: liveOverridesRef.current.activeHTMLPath,
        activeBlobUrlsRef
      });
      setPreviewUrl(result.previewUrl);
      setNotFound(false);
      setLastSynced(new Date());
    } catch (err) {
      console.error("[StandalonePreview] Compilation error:", err);
      if (
        err?.response?.status === 444 || 
        err?.response?.status === 404 || 
        err?.message?.includes("Room not found") ||
        err?.message?.includes("Workspace item not found")
      ) {
        setNotFound(true);
      } else {
        setError(err.message || "Failed to render project preview.");
      }
    } finally {
      setLoading(false);
      if (isRealtimeSync) {
        setTimeout(() => setSyncing(false), 300);
      }
    }
  };

  useEffect(() => {
    if (!roomId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    loadAndCompile(false);

    // 1. Local Browser Tab BroadcastChannel for 0-millisecond Instant Live Sync
    let channel;
    try {
      channel = new BroadcastChannel(`ce_preview_sync_${roomId}`);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === "PREVIEW_CODE_UPDATE") {
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            loadAndCompile(true, {
              activeCode: event.data.activeCode,
              activeFileId: event.data.activeFileId,
              activeHTMLPath: event.data.activeHTMLPath
            });
          }, 150);
        }
      };
    } catch (e) {}

    // 2. Socket.IO Room Join for Realtime WebSockets Sync
    socket.emit("join-preview-room", { roomId });
    socket.emit("join-room", { roomId, isPreview: true });

    const handleRealtimeUpdate = (data) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (data && typeof data === "object") {
          loadAndCompile(true, {
            activeCode: data.code || data.content,
            activeFileId: data.fileId || data.activeFileId,
            activeHTMLPath: data.activeHTMLPath
          });
        } else {
          loadAndCompile(true);
        }
      }, 200);
    };

    socket.on("preview-code-update", handleRealtimeUpdate);
    socket.on("receive-code", handleRealtimeUpdate);
    socket.on("receive-file-content", handleRealtimeUpdate);
    socket.on("workspace-item-created", handleRealtimeUpdate);
    socket.on("workspace-item-renamed", handleRealtimeUpdate);
    socket.on("workspace-item-moved", handleRealtimeUpdate);
    socket.on("workspace-item-deleted", handleRealtimeUpdate);
    socket.on("file-saved", handleRealtimeUpdate);

    return () => {
      if (channel) {
        try { channel.close(); } catch (e) {}
      }
      socket.off("preview-code-update", handleRealtimeUpdate);
      socket.off("receive-code", handleRealtimeUpdate);
      socket.off("receive-file-content", handleRealtimeUpdate);
      socket.off("workspace-item-created", handleRealtimeUpdate);
      socket.off("workspace-item-renamed", handleRealtimeUpdate);
      socket.off("workspace-item-moved", handleRealtimeUpdate);
      socket.off("workspace-item-deleted", handleRealtimeUpdate);
      socket.off("file-saved", handleRealtimeUpdate);

      if (activeBlobUrlsRef.current) {
        Object.values(activeBlobUrlsRef.current).forEach((url) => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        });
      }
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="standalone-preview-loader">
        <div className="preview-spinner" />
        <p>Loading Workspace Preview...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="standalone-preview-error-page">
        <div className="error-card">
          <AlertTriangle size={48} color="#ef4444" />
          <h1>Workspace Not Found</h1>
          <p>The requested room or workspace does not exist or has been deleted.</p>
          <a href="/" className="back-btn">
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="standalone-preview-error-page">
        <div className="error-card">
          <AlertTriangle size={44} color="#f59e0b" />
          <h1>Preview Generation Failed</h1>
          <p className="error-msg">{error}</p>
          <button className="retry-btn" onClick={() => loadAndCompile(false)}>
            <RefreshCw size={14} />
            <span>Retry Loading</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="standalone-preview-viewport">
      {/* Floating Sync Badge Indicator */}
      <div className="standalone-sync-badge" title="Live synchronized with Editor workspace">
        <span className={`sync-dot ${syncing ? "syncing" : "active"}`} />
        <Globe size={13} className="globe-icon" />
        <span className="sync-text">
          {syncing ? "Syncing..." : `Live Sync (${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`}
        </span>
        <button 
          className="refresh-sync-btn"
          onClick={() => loadAndCompile(true)}
          title="Force Refresh Preview"
        >
          <RefreshCw size={11} className={syncing ? "spin" : ""} />
        </button>
      </div>

      {/* 100% Native Web Viewport Frame */}
      {previewUrl ? (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          title={`CodeExpo Standalone Preview - Room ${roomId}`}
          className="standalone-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      ) : null}
    </div>
  );
};

export default StandalonePreview;
