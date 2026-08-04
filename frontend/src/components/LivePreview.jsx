import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCw,
  Maximize2,
  Minimize2,
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Lock,
  ArrowLeftRight,
  MoreVertical,
  Globe
} from "lucide-react";
import * as workspaceService from "../services/workspaceService";
import { compileWorkspaceProject } from "../services/projectCompiler";
import socket from "../socket/socket";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";
import "./LivePreview.css";

// Helper: Normalize and resolve relative paths
const resolveRelativePath = (basePath, relativePath) => {
  if (!relativePath) return "";
  
  if (
    relativePath.startsWith("http://") || 
    relativePath.startsWith("https://") || 
    relativePath.startsWith("data:") || 
    relativePath.startsWith("blob:")
  ) {
    return relativePath;
  }
  
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }
  
  const baseParts = basePath ? basePath.split("/").filter(Boolean) : [];
  const relParts = relativePath.split("/").filter(Boolean);
  
  for (const part of relParts) {
    if (part === "." || part === "") {
      continue;
    } else if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  
  return baseParts.join("/");
};

// Helper: Inline CSS @import statements
const inlineCSS = (cssContent, cssFolder, allFiles) => {
  const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g;
  return cssContent.replace(importRegex, (match, importPath) => {
    const resolvedPath = resolveRelativePath(cssFolder, importPath);
    const importedFile = allFiles.find(f => f.path === resolvedPath);
    if (importedFile && importedFile.content) {
      const importedFolder = resolvedPath.includes("/") 
        ? resolvedPath.substring(0, resolvedPath.lastIndexOf("/")) 
        : "";
      return inlineCSS(importedFile.content, importedFolder, allFiles);
    }
    return `/* Failed to import CSS: ${importPath} (resolved: ${resolvedPath}) */`;
  });
};

const getAssetDataUrl = (fileName, base64Content) => {
  const ext = fileName.split(".").pop().toLowerCase();
  let mime = "application/octet-stream";
  if (ext === "png") mime = "image/png";
  else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
  else if (ext === "gif") mime = "image/gif";
  else if (ext === "svg") mime = "image/svg+xml";
  else if (ext === "webp") mime = "image/webp";
  
  if (base64Content.startsWith("data:")) return base64Content;
  return `data:${mime};base64,${base64Content}`;
};

export default function LivePreview({
  roomId,
  workspaceItems = [],
  tabs = [],
  activeCode = "",
  activeFileId = null
}) {
  const { resolvedTheme } = useTheme();
  const [activeHTMLPath, setActiveHTMLPath] = useState("index.html");
  const [htmlFiles, setHtmlFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Resizable Preview Dimensions (null means 100% full width/height)
  const [viewportWidth, setViewportWidth] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(null);
  const [actualDimensions, setActualDimensions] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [compileError, setCompileError] = useState(null);
  
  const activeBlobUrlsRef = useRef({});
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const compileDebounceTimer = useRef(null);

  // Measure actual pixel dimensions of resizable viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setActualDimensions({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height)
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Intercept events from iframe console / error hooks
  useEffect(() => {
    const handleIframeMessage = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      
      const { type, logType, content, message, filename, lineno, colno } = e.data;
      
      if (type === "console") {
        setConsoleLogs((prev) => [
          ...prev, 
          { 
            id: Date.now() + Math.random().toString(36).substring(2, 5),
            type: logType, 
            text: content.join(" ") 
          }
        ]);
      } else if (type === "error") {
        const errorText = filename 
          ? `Runtime Error: ${message} at ${filename.split("/").pop()}:${lineno}:${colno}` 
          : `Runtime Error: ${message}`;
        setConsoleLogs((prev) => [
          ...prev, 
          { 
            id: Date.now() + Math.random().toString(36).substring(2, 5),
            type: "error", 
            text: errorText 
          }
        ]);
      } else if (type === "navigate") {
        const currentHTMLFolder = activeHTMLPath.includes("/") 
          ? activeHTMLPath.substring(0, activeHTMLPath.lastIndexOf("/")) 
          : "";
        const resolvedPath = resolveRelativePath(currentHTMLFolder, e.data.path);
        
        setActiveHTMLPath(resolvedPath);
        toast.success(`Navigating to ${resolvedPath}`);
      }
    };
    
    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [activeHTMLPath]);

  // Retrieve absolute paths recursively
  const getFullPath = (item, allItems) => {
    if (!item) return "";
    let path = item.name;
    let current = item;
    const visited = new Set();
    while (current.parentId && !visited.has(String(current.parentId))) {
      visited.add(String(current.parentId));
      const parent = allItems.find((i) => String(i._id) === String(current.parentId));
      if (!parent) break;
      path = parent.name + "/" + path;
      current = parent;
    }
    return path;
  };

  // Main compilation logic using shared compiler engine
  const compileProject = async () => {
    try {
      setCompileError(null);
      const result = await compileWorkspaceProject({
        roomId,
        activeHTMLPath,
        tabs,
        activeCode,
        activeFileId,
        activeBlobUrlsRef
      });
      setPreviewUrl(result.previewUrl);
      setHtmlFiles(result.htmlFiles);
      setActiveHTMLPath(result.activeHTMLPath);
    } catch (err) {
      console.error("Compilation failed:", err);
      setCompileError("Compilation error: " + err.message);
    }
  };

  const handleOpenInBrowser = () => {
    const url = `${window.location.origin}/preview/${roomId}`;
    window.open(url, "_blank");
  };

  useEffect(() => {
    if (!roomId) return;

    // 1. BroadcastChannel API for 0ms instant local browser tab sync
    try {
      const channel = new BroadcastChannel(`ce_preview_sync_${roomId}`);
      channel.postMessage({
        type: "PREVIEW_CODE_UPDATE",
        roomId,
        activeFileId,
        activeCode,
        activeHTMLPath,
        timestamp: Date.now()
      });
      channel.close();
    } catch (e) {}

    // 2. WebSocket emit for remote preview tabs
    if (socket && socket.connected) {
      socket.emit("preview-code-update", {
        roomId,
        fileId: activeFileId,
        code: activeCode,
        activeHTMLPath
      });
    }

    if (compileDebounceTimer.current) {
      clearTimeout(compileDebounceTimer.current);
    }
    
    if (autoRefresh) {
      compileDebounceTimer.current = setTimeout(() => {
        compileProject();
      }, 600);
    }
    
    return () => {
      if (compileDebounceTimer.current) clearTimeout(compileDebounceTimer.current);
    };
  }, [roomId, workspaceItems, tabs, activeCode, activeFileId, autoRefresh, activeHTMLPath]);

  const handleManualRefresh = () => {
    compileProject();
    toast.success("Preview recompiled!");
  };

  // Google Chrome DevTools Style Drag-to-Resize Handler
  const startResizing = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current || !stageRef.current) return;
    
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const stageRect = stageRef.current.getBoundingClientRect();
    
    const startW = rect.width;
    const startH = rect.height;

    const handleMouseMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startX;
      const deltaY = moveEvt.clientY - startY;

      let newW = startW;
      let newH = startH;

      if (direction === "right") {
        newW = startW + deltaX * 2;
      } else if (direction === "left") {
        newW = startW - deltaX * 2;
      } else if (direction === "bottom") {
        newH = startH + deltaY;
      } else if (direction === "bottom-right") {
        newW = startW + deltaX * 2;
        newH = startH + deltaY;
      } else if (direction === "bottom-left") {
        newW = startW - deltaX * 2;
        newH = startH + deltaY;
      }

      const maxW = stageRect.width - 32;
      const maxH = stageRect.height - 32;
      newW = Math.min(maxW, Math.max(280, Math.round(newW)));
      newH = Math.min(maxH, Math.max(200, Math.round(newH)));

      setViewportWidth(newW);
      setViewportHeight(newH);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleResetSize = () => {
    setViewportWidth(null);
    setViewportHeight(null);
  };

  const errorCount = consoleLogs.filter((l) => l.type === "error").length;

  return (
    <div className={`ce-live-preview-container ${resolvedTheme === "light" ? "light" : ""} ${isFullscreen ? "fullscreen-active" : ""}`}>
      {/* Chrome DevTools Style Top Bar */}
      <div className="preview-toolbar">
        {/* Left: Run, Refresh & URL Bar */}
        <div className="preview-toolbar-left">
          <button 
            type="button" 
            className="preview-btn run-btn" 
            onClick={handleManualRefresh}
            title="Run Workspace"
          >
            <Play size={11} fill="#10b981" color="#10b981" />
            <span className="btn-label">Run</span>
          </button>
          
          <button 
            type="button" 
            className="preview-btn icon-btn" 
            onClick={handleManualRefresh}
            title="Refresh"
          >
            <RotateCw size={12} />
          </button>
          
          <div className="preview-url-pill">
            <Lock size={10} className="url-lock-icon" />
            <select
              className="url-html-select"
              value={activeHTMLPath}
              onChange={(e) => setActiveHTMLPath(e.target.value)}
              title="Active HTML File"
            >
              {htmlFiles.length > 0 ? (
                htmlFiles.map((f) => (
                  <option key={f.path} value={f.path}>
                    localhost:3000/{f.path}
                  </option>
                ))
              ) : (
                <option value={activeHTMLPath}>localhost:3000/{activeHTMLPath}</option>
              )}
            </select>
          </div>
        </div>

        {/* Center: Google Chrome DevTools Responsive Dimensions Controls */}
        <div className="preview-toolbar-center">
          <div className="devtools-dimensions-bar">
            <input
              type="number"
              className="devtools-dim-input"
              value={viewportWidth ?? actualDimensions.width}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setViewportWidth(val);
              }}
              title="Viewport Width in Pixels"
            />
            <span className="dim-separator">×</span>
            <input
              type="number"
              className="devtools-dim-input"
              value={viewportHeight ?? actualDimensions.height}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setViewportHeight(val);
              }}
              title="Viewport Height in Pixels"
            />
            <span className="dim-unit">px</span>

            <button
              type="button"
              className="devtools-btn-icon"
              onClick={() => {
                const currentW = viewportWidth ?? actualDimensions.width;
                const currentH = viewportHeight ?? actualDimensions.height;
                setViewportWidth(currentH);
                setViewportHeight(currentW);
              }}
              title="Rotate Screen Orientation (Swap Width & Height)"
            >
              <ArrowLeftRight size={12} />
            </button>

            <button
              type="button"
              className={`devtools-btn-reset ${viewportWidth === null ? "is-full" : ""}`}
              onClick={handleResetSize}
              title="Reset Viewport to 100% Full Responsive Width"
            >
              <span className="reset-btn-text">100% Fit</span>
            </button>
          </div>
        </div>

        {/* Right: 3-Dots Dropdown Options Menu */}
        <div className="preview-toolbar-right" style={{ position: "relative" }}>
          <button 
            type="button"
            className={`preview-btn icon-btn ${optionsMenuOpen ? "active" : ""}`}
            onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
            title="More Options"
          >
            <MoreVertical size={13} />
          </button>

          {optionsMenuOpen && (
            <>
              <div 
                className="preview-menu-overlay" 
                onClick={() => setOptionsMenuOpen(false)} 
              />
              <div className="preview-options-dropdown">
                <label className="preview-dropdown-item auto-toggle-item" title="Auto-refresh preview on code save/edit">
                  <input 
                    type="checkbox" 
                    checked={autoRefresh} 
                    onChange={(e) => setAutoRefresh(e.target.checked)} 
                  />
                  <span>Auto Refresh</span>
                </label>

                <button
                  type="button"
                  className="preview-dropdown-item"
                  onClick={() => {
                    handleOpenInBrowser();
                    setOptionsMenuOpen(false);
                  }}
                >
                  <Globe size={13} color="#38bdf8" />
                  <span>Open in Browser</span>
                </button>

                <button
                  type="button"
                  className="preview-dropdown-item"
                  onClick={() => {
                    setIsFullscreen(!isFullscreen);
                    setOptionsMenuOpen(false);
                  }}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}</span>
                </button>

                <button
                  type="button"
                  className="preview-dropdown-item"
                  onClick={() => {
                    setIsConsoleOpen(!isConsoleOpen);
                    setOptionsMenuOpen(false);
                  }}
                >
                  <Terminal size={13} />
                  <span>{isConsoleOpen ? "Hide Console" : "Developer Console"}</span>
                  {errorCount > 0 && <span className="console-error-badge">{errorCount}</span>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="preview-frame-wrapper" ref={stageRef}>
        {compileError ? (
          <div className="preview-error-screen">
            <AlertOctagon size={44} className="preview-error-icon" />
            <h4>Compilation Problem</h4>
            <p>{compileError}</p>
          </div>
        ) : (
          <div className="preview-frame-stage">
            <div
              ref={containerRef}
              className={`devtools-viewport-container ${viewportWidth !== null ? "is-custom-size" : "is-full-width"} ${isResizing ? "is-resizing" : ""}`}
              style={{
                width: viewportWidth ? `${viewportWidth}px` : "100%",
                height: viewportHeight ? `${viewportHeight}px` : "100%",
                maxWidth: "100%",
                maxHeight: "100%"
              }}
            >
              {/* Chrome DevTools Left Drag Handle */}
              <div
                className="devtools-handle handle-left"
                onMouseDown={(e) => startResizing(e, "left")}
                title="Drag to stretch/reduce width"
              >
                <div className="handle-pill-vertical" />
              </div>

              {/* Chrome DevTools Right Drag Handle */}
              <div
                className="devtools-handle handle-right"
                onMouseDown={(e) => startResizing(e, "right")}
                title="Drag to stretch/reduce width"
              >
                <div className="handle-pill-vertical" />
              </div>

              {/* Viewport Iframe */}
              <iframe
                ref={iframeRef}
                src={previewUrl}
                title="CodeExpo Workspace Live Preview"
                className="preview-iframe-element"
                sandbox="allow-scripts allow-modals allow-same-origin"
                style={{ pointerEvents: isResizing ? "none" : "auto" }}
              />

              {/* Chrome DevTools Bottom Drag Handle */}
              <div
                className="devtools-handle handle-bottom"
                onMouseDown={(e) => startResizing(e, "bottom")}
                title="Drag to stretch/reduce height"
              >
                <div className="handle-pill-horizontal" />
              </div>

              {/* Bottom-Right Corner Handle */}
              <div
                className="devtools-handle handle-bottom-right"
                onMouseDown={(e) => startResizing(e, "bottom-right")}
                title="Drag corner to stretch/reduce both width & height"
              >
                <div className="corner-grip-icon" />
              </div>

              {/* Bottom-Left Corner Handle */}
              <div
                className="devtools-handle handle-bottom-left"
                onMouseDown={(e) => startResizing(e, "bottom-left")}
                title="Drag corner to stretch/reduce both width & height"
              >
                <div className="corner-grip-icon" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Console Drawer */}
      <div className={`preview-console-drawer ${isConsoleOpen ? "open" : "collapsed"}`}>
        <div className="console-drawer-header" onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
          <div className="console-drawer-title">
            <Terminal size={13} />
            <span>Developer Console ({consoleLogs.length})</span>
          </div>
          <div className="console-drawer-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="console-action-btn" 
              onClick={() => setConsoleLogs([])}
              title="Clear Console"
            >
              <Trash2 size={12} />
            </button>
            <button 
              type="button" 
              className="console-action-btn" 
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            >
              {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {isConsoleOpen && (
          <div className="console-drawer-logs">
            {consoleLogs.length === 0 ? (
              <div className="console-empty-message">Console is empty.</div>
            ) : (
              consoleLogs.map((log) => (
                <div key={log.id} className={`console-log-row ${log.type}`}>
                  <span className="log-type-indicator">[{log.type.toUpperCase()}]</span>
                  <pre className="log-message-text">{log.text}</pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
