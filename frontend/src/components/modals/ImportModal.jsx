import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FolderUp,
  FileCode,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  X,
  HardDrive,
  RefreshCw,
  Info,
  FolderArchive,
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  Sparkles,
  Image as ImageIcon
} from "lucide-react";
import * as workspaceService from "../../services/workspaceService";
import socket from "../../socket/socket";
import toast from "react-hot-toast";
import "./ImportModal.css";

const MAX_ROOM_STORAGE = 10 * 1024 * 1024; // 10 MB

const ROOM_TYPE_CONFIG = {
  javascript: {
    name: "JavaScript",
    extensions: [".js", ".jsx", ".json", ".mjs", ".cjs"],
    iconColor: "#f7df1e",
    accept: ".js,.jsx,.json,.mjs,.cjs"
  },
  cpp: {
    name: "C++",
    extensions: [".cpp", ".cc", ".cxx", ".c", ".h", ".hpp"],
    iconColor: "#00599c",
    accept: ".cpp,.cc,.cxx,.c,.h,.hpp"
  },
  java: {
    name: "Java",
    extensions: [".java", ".properties", ".xml"],
    iconColor: "#ea2d2e",
    accept: ".java,.properties,.xml"
  },
  python: {
    name: "Python",
    extensions: [".py", ".pyw", ".json", ".txt"],
    iconColor: "#38bdf8",
    accept: ".py,.pyw,.json,.txt"
  },
  html: {
    name: "HTML/CSS/JS (Web)",
    extensions: [".html", ".htm", ".css", ".js", ".json", ".jpg", ".jpeg", ".png"],
    iconColor: "#f97316",
    accept: ".html,.htm,.css,.js,.json,.jpg,.jpeg,.png"
  },
  web: {
    name: "HTML/CSS/JS (Web)",
    extensions: [".html", ".htm", ".css", ".js", ".json", ".jpg", ".jpeg", ".png"],
    iconColor: "#f97316",
    accept: ".html,.htm,.css,.js,.json,.jpg,.jpeg,.png"
  }
};

const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", ".svn", ".hg", "dist", "build", "coverage",
  ".cache", ".next", "__pycache__", ".venv", "venv", "env", ".idea", ".vscode"
]);

const SENSITIVE_NAMES = new Set([
  ".env", ".env.local", ".env.production", ".env.development", ".env.test",
  "credentials.json", "service-account.json", "client_secret.json", "id_rsa", "private-key.pem"
]);

const SENSITIVE_EXTENSIONS = new Set([".pem", ".key", ".pfx", ".p12", ".kdbx"]);

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function ImportModal({
  isOpen,
  onClose,
  roomId,
  roomLanguage = "javascript",
  existingItems = [],
  onImportSuccess
}) {
  const [step, setStep] = useState("SELECT"); // 'SELECT' | 'REVIEW' | 'IMPORTING' | 'SUCCESS'
  const [storage, setStorage] = useState({ currentUsage: 0, maxStorage: MAX_ROOM_STORAGE, availableStorage: MAX_ROOM_STORAGE, percentage: 0 });
  const [storageLoading, setStorageLoading] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [analyzedBatch, setAnalyzedBatch] = useState(null);
  const [duplicateResolutions, setDuplicateResolutions] = useState({});
  const [globalResolution, setGlobalResolution] = useState("skip"); // 'skip' | 'replace' | 'rename'

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState({ ready: true, duplicates: true, unsupported: false, excluded: false, blocked: false });

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const normalizedLang = String(roomLanguage || "javascript").toLowerCase();
  const roomConfig = ROOM_TYPE_CONFIG[normalizedLang] || ROOM_TYPE_CONFIG.javascript;

  // Load authoritative room storage
  const loadRoomStorage = async () => {
    try {
      setStorageLoading(true);
      const data = await workspaceService.getRoomStorage(roomId);
      if (data && data.storage) {
        setStorage(data.storage);
      }
    } catch (err) {
      console.error("Failed to load room storage:", err);
    } finally {
      setStorageLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep("SELECT");
      setSelectedFiles([]);
      setAnalyzedBatch(null);
      setDuplicateResolutions({});
      setUploadProgress(0);
      loadRoomStorage();
    }
  }, [isOpen, roomId]);

  // Client-Side Analysis & Categorization
  const analyzeFiles = (filesList) => {
    const allowedExts = new Set(roomConfig.extensions);
    const existingFilePaths = new Set();

    // Map existing items to full relative paths
    const folderIdMap = new Map();
    const getFolderPath = (folderId) => {
      if (!folderId) return "";
      if (folderIdMap.has(String(folderId))) return folderIdMap.get(String(folderId));
      const folder = existingItems.find((i) => String(i._id) === String(folderId));
      if (!folder) return "";
      const parentP = getFolderPath(folder.parentId);
      const fullP = parentP ? `${parentP}/${folder.name}` : folder.name;
      folderIdMap.set(String(folderId), fullP);
      return fullP;
    };

    for (const item of existingItems) {
      if (item.type === "file") {
        const folderP = getFolderPath(item.parentId);
        const fullP = folderP ? `${folderP}/${item.name}` : item.name;
        existingFilePaths.add(fullP.toLowerCase());
      }
    }

    const ready = [];
    const unsupported = [];
    const excluded = [];
    const blocked = [];
    const duplicates = [];
    const initialResolutions = {};

    let totalImportSize = 0;

    for (const fileObj of filesList) {
      const { file, relativePath } = fileObj;
      const cleanPath = (relativePath || file.name).replace(/\\/g, "/").replace(/^\/+/, "");
      const segments = cleanPath.split("/").map((s) => s.trim());
      const fileName = segments[segments.length - 1];
      const lowerName = fileName.toLowerCase();
      const ext = lowerName.includes(".") ? "." + lowerName.split(".").pop() : "";

      // 1. Excluded directories
      let isExcluded = false;
      for (const seg of segments.slice(0, -1)) {
        if (EXCLUDED_DIRS.has(seg.toLowerCase())) {
          excluded.push({ name: fileName, path: cleanPath, size: file.size, reason: `Excluded — ${seg}/ directory` });
          isExcluded = true;
          break;
        }
      }
      if (isExcluded) continue;

      // 2. Sensitive files
      if (SENSITIVE_NAMES.has(lowerName) || lowerName.startsWith(".env.") || SENSITIVE_EXTENSIONS.has(ext)) {
        blocked.push({ name: fileName, path: cleanPath, size: file.size, reason: "Sensitive file blocked — may contain credentials or private keys." });
        continue;
      }

      // 3. Room-type compatibility
      if (!allowedExts.has(ext)) {
        unsupported.push({
          name: fileName,
          path: cleanPath,
          size: file.size,
          extension: ext || "(none)",
          reason: `Not supported in ${roomConfig.name} rooms. Supported: ${roomConfig.extensions.join(", ")}`
        });
        continue;
      }

      // 4. Duplicate checks
      const isDuplicate = existingFilePaths.has(cleanPath.toLowerCase());
      if (isDuplicate) {
        duplicates.push({ name: fileName, path: cleanPath, size: file.size, file });
        initialResolutions[cleanPath] = "skip";
      }

      ready.push({ name: fileName, path: cleanPath, size: file.size, file, isDuplicate });
      totalImportSize += file.size;
    }

    setDuplicateResolutions(initialResolutions);
    setAnalyzedBatch({
      ready,
      unsupported,
      excluded,
      blocked,
      duplicates,
      totalImportSize
    });

    if (filesList.length > 0) {
      setStep("REVIEW");
    }
  };

  // Modern Folder picker using File System Access API (eliminates browser native directory upload prompt)
  const handlePickFolder = async () => {
    if (typeof window !== "undefined" && window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const fileObjects = [];

        const readDirRecursive = async (handle, pathPrefix = "") => {
          for await (const entry of handle.values()) {
            const currentPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
            if (entry.kind === "file") {
              const file = await entry.getFile();
              fileObjects.push({
                file,
                relativePath: currentPath
              });
            } else if (entry.kind === "directory") {
              await readDirRecursive(entry, currentPath);
            }
          }
        };

        await readDirRecursive(dirHandle, dirHandle.name);
        if (fileObjects.length > 0) {
          setSelectedFiles(fileObjects);
          analyzeFiles(fileObjects);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Directory picker fallback:", err);
          folderInputRef.current?.click();
        }
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  // File picker handler
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const fileObjects = files.map((f) => ({
      file: f,
      relativePath: f.webkitRelativePath || f.name
    }));
    setSelectedFiles(fileObjects);
    analyzeFiles(fileObjects);
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const fileObjects = [];

    if (items && items.length > 0) {
      const readEntry = async (entry, pathSoFar = "") => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file((file) => {
              fileObjects.push({
                file,
                relativePath: pathSoFar ? `${pathSoFar}/${file.name}` : file.name
              });
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          return new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
              for (const child of entries) {
                await readEntry(child, pathSoFar ? `${pathSoFar}/${entry.name}` : entry.name);
              }
              resolve();
            });
          });
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            await readEntry(entry);
          }
        } else if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            fileObjects.push({ file, relativePath: file.name });
          }
        }
      }
    } else if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        fileObjects.push({ file, relativePath: file.webkitRelativePath || file.name });
      }
    }

    if (fileObjects.length > 0) {
      setSelectedFiles(fileObjects);
      analyzeFiles(fileObjects);
    }
  };

  const setAllResolutions = (mode) => {
    setGlobalResolution(mode);
    if (!analyzedBatch?.duplicates) return;
    const updated = {};
    for (const dup of analyzedBatch.duplicates) {
      updated[dup.path] = mode;
    }
    setDuplicateResolutions(updated);
  };

  // Perform Final Import
  const handleExecuteImport = async () => {
    if (!analyzedBatch || analyzedBatch.ready.length === 0) {
      toast.error("No valid files to import.");
      return;
    }

    // Projected storage check
    const projectedUsage = storage.currentUsage + analyzedBatch.totalImportSize;
    if (projectedUsage > MAX_ROOM_STORAGE) {
      toast.error(
        `Room storage limit exceeded. This import would exceed the 10 MB workspace limit (${formatBytes(projectedUsage)} / 10 MB).`
      );
      return;
    }

    try {
      setStep("IMPORTING");
      setUploadProgress(0);

      const formData = new FormData();
      const pathsArray = [];

      analyzedBatch.ready.forEach((item) => {
        formData.append("files", item.file);
        pathsArray.push(item.path);
      });

      formData.append("paths", JSON.stringify(pathsArray));
      formData.append("duplicateResolutions", JSON.stringify(duplicateResolutions));

      const result = await workspaceService.importFiles(roomId, formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (result.success) {
        toast.success(`Imported ${result.importedCount} file(s) successfully!`);

        // Emit Socket.IO broadcast to notify collaborators
        socket.emit("files-imported", {
          roomId,
          count: result.importedCount,
          items: result.importedItems
        });

        if (typeof onImportSuccess === "function") {
          onImportSuccess(result);
        }

        setStep("SUCCESS");
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error) {
      setStep("REVIEW");
      const msg = error.response?.data?.message || "Import failed. Please check storage limits and file formats.";
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  const projectedUsage = analyzedBatch ? storage.currentUsage + analyzedBatch.totalImportSize : storage.currentUsage;
  const isStorageExceeded = projectedUsage > MAX_ROOM_STORAGE;

  return (
    <div className="ce-import-modal-overlay" onClick={onClose}>
      <div className="ce-import-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ce-import-modal-header">
          <div className="ce-import-header-left">
            <div
              className="ce-import-header-icon"
              style={{
                background: `linear-gradient(135deg, ${roomConfig.iconColor}24 0%, ${roomConfig.iconColor}08 100%)`,
                borderColor: `${roomConfig.iconColor}55`,
                boxShadow: `0 0 16px ${roomConfig.iconColor}22`
              }}
            >
              <Upload size={18} color={roomConfig.iconColor} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 className="ce-import-title">Import {roomConfig.name} Files</h3>
                <span className="ce-import-sandbox-badge">
                  <Sparkles size={10} /> Workspace
                </span>
              </div>
              <p className="ce-import-subtitle">
                Add source code files or nested directory trees to your project
              </p>
            </div>
          </div>
          <button className="ce-import-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Room Allowed Extensions Tag Bar */}
        <div className="ce-import-ext-bar">
          <span className="ce-import-ext-label">Supported formats:</span>
          <div className="ce-import-ext-tags">
            {roomConfig.extensions.map((ext) => {
              const isImg = [".jpg", ".jpeg", ".png"].includes(ext);
              return (
                <span key={ext} className={`ce-import-ext-tag ${isImg ? "is-image" : ""}`}>
                  {isImg && <ImageIcon size={10} className="ce-ext-img-icon" />}
                  {ext}
                </span>
              );
            })}
          </div>
        </div>

        {/* Live Storage Meter Bar */}
        <div className="ce-import-storage-panel">
          <div className="ce-import-storage-meta">
            <div className="ce-import-storage-label">
              <HardDrive size={13} className="ce-storage-icon" />
              <span>Workspace Storage</span>
            </div>
            <div className="ce-import-storage-values">
              <span className="ce-storage-pill">
                <strong>{formatBytes(storage.currentUsage)}</strong>
                <span className="ce-storage-slash">/</span> 10 MB
                <span className="ce-storage-pct">
                  ({((storage.currentUsage / MAX_ROOM_STORAGE) * 100).toFixed(1)}%)
                </span>
              </span>
              {analyzedBatch && step === "REVIEW" && (
                <span className={`ce-import-projected-tag ${isStorageExceeded ? "danger" : ""}`}>
                  ➔ Projected: {formatBytes(projectedUsage)}
                </span>
              )}
            </div>
          </div>
          <div className="ce-import-storage-progress-bg">
            <div
              className={`ce-import-storage-progress-fill ${isStorageExceeded ? "danger" : storage.percentage > 85 ? "warning" : ""}`}
              style={{ width: `${Math.min(100, (projectedUsage / MAX_ROOM_STORAGE) * 100)}%` }}
            />
          </div>
          {isStorageExceeded && (
            <div className="ce-import-storage-warning">
              <AlertTriangle size={13} />
              <span>
                Room storage limit exceeded. This import would exceed the 10 MB workspace ceiling by{" "}
                {formatBytes(projectedUsage - MAX_ROOM_STORAGE)}.
              </span>
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={roomConfig.accept}
          style={{ display: "none" }}
          onChange={handleFilesSelected}
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          style={{ display: "none" }}
          onChange={handleFilesSelected}
        />

        {/* STEP 1: SELECT / DROP ZONE */}
        {step === "SELECT" && (
          <div
            className={`ce-import-dropzone ${isDragOver ? "drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="ce-import-drop-icon">
              <FolderUp size={34} />
            </div>
            <h4 className="ce-import-drop-title">Drop project files or folders here</h4>
            <p className="ce-import-drop-hint">
              Drag entire multi-folder projects or choose specific files from your device
            </p>

            <div className="ce-import-actions-row">
              <button
                type="button"
                className="ce-import-btn-action primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileCode size={15} />
                <span>Choose Files</span>
              </button>
              <button
                type="button"
                className="ce-import-btn-action secondary"
                onClick={handlePickFolder}
              >
                <FolderArchive size={15} />
                <span>Choose Folder</span>
              </button>
            </div>

            <div className="ce-import-drop-tip">
              <span>💡 Tip: You can drag and drop folders directly from your desktop file explorer</span>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & CONFLICT RESOLUTION */}
        {step === "REVIEW" && analyzedBatch && (
          <div className="ce-import-review-container">
            <div className="ce-import-review-summary-cards">
              <div className="ce-import-summary-pill ready">
                <CheckCircle2 size={14} />
                <span>{analyzedBatch.ready.length} ready</span>
              </div>
              {analyzedBatch.duplicates.length > 0 && (
                <div className="ce-import-summary-pill duplicate">
                  <Layers size={14} />
                  <span>{analyzedBatch.duplicates.length} duplicate</span>
                </div>
              )}
              {analyzedBatch.unsupported.length > 0 && (
                <div className="ce-import-summary-pill unsupported">
                  <AlertTriangle size={14} />
                  <span>{analyzedBatch.unsupported.length} unsupported</span>
                </div>
              )}
              {analyzedBatch.excluded.length > 0 && (
                <div className="ce-import-summary-pill excluded">
                  <Info size={14} />
                  <span>{analyzedBatch.excluded.length} excluded</span>
                </div>
              )}
              {analyzedBatch.blocked.length > 0 && (
                <div className="ce-import-summary-pill blocked">
                  <ShieldAlert size={14} />
                  <span>{analyzedBatch.blocked.length} blocked</span>
                </div>
              )}
            </div>

            {/* Duplicates conflict resolution bar */}
            {analyzedBatch.duplicates.length > 0 && (
              <div className="ce-import-duplicate-banner">
                <div className="ce-import-dup-info">
                  <Layers size={14} />
                  <span>{analyzedBatch.duplicates.length} file(s) already exist in workspace.</span>
                </div>
                <div className="ce-import-dup-buttons">
                  <span className="ce-import-dup-label">Default action:</span>
                  <button
                    type="button"
                    className={`ce-import-pill-btn ${globalResolution === "skip" ? "active" : ""}`}
                    onClick={() => setAllResolutions("skip")}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className={`ce-import-pill-btn ${globalResolution === "replace" ? "active" : ""}`}
                    onClick={() => setAllResolutions("replace")}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className={`ce-import-pill-btn ${globalResolution === "rename" ? "active" : ""}`}
                    onClick={() => setAllResolutions("rename")}
                  >
                    Rename
                  </button>
                </div>
              </div>
            )}

            {/* Accordion File Lists */}
            <div className="ce-import-accordion-list">
              {/* Ready files */}
              {analyzedBatch.ready.length > 0 && (
                <div className="ce-import-accordion-item">
                  <div
                    className="ce-import-accordion-header"
                    onClick={() => setActiveAccordion((p) => ({ ...p, ready: !p.ready }))}
                  >
                    <div className="ce-import-acc-title">
                      {activeAccordion.ready ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>Ready to Import ({analyzedBatch.ready.length} files — {formatBytes(analyzedBatch.totalImportSize)})</span>
                    </div>
                  </div>
                  {activeAccordion.ready && (
                    <div className="ce-import-file-scroll">
                      {analyzedBatch.ready.map((item) => (
                        <div key={item.path} className="ce-import-file-row">
                          <div className="ce-import-file-left">
                            <FileText size={13} className="ce-import-file-icon" />
                            <span className="ce-import-file-path">{item.path}</span>
                          </div>
                          <div className="ce-import-file-right">
                            {item.isDuplicate && (
                              <select
                                className="ce-import-row-select"
                                value={duplicateResolutions[item.path] || "skip"}
                                onChange={(e) =>
                                  setDuplicateResolutions((prev) => ({ ...prev, [item.path]: e.target.value }))
                                }
                              >
                                <option value="skip">Skip</option>
                                <option value="replace">Replace</option>
                                <option value="rename">Rename</option>
                              </select>
                            )}
                            <span className="ce-import-file-size">{formatBytes(item.size)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Unsupported files */}
              {analyzedBatch.unsupported.length > 0 && (
                <div className="ce-import-accordion-item unsupported-block">
                  <div
                    className="ce-import-accordion-header"
                    onClick={() => setActiveAccordion((p) => ({ ...p, unsupported: !p.unsupported }))}
                  >
                    <div className="ce-import-acc-title">
                      {activeAccordion.unsupported ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <AlertTriangle size={14} color="#f59e0b" />
                      <span>Unsupported Files ({analyzedBatch.unsupported.length})</span>
                    </div>
                  </div>
                  {activeAccordion.unsupported && (
                    <div className="ce-import-file-scroll">
                      {analyzedBatch.unsupported.map((item) => (
                        <div key={item.path} className="ce-import-file-row error-row">
                          <div className="ce-import-file-left">
                            <X size={13} color="#ef4444" />
                            <div>
                              <span className="ce-import-file-path">{item.path}</span>
                              <p className="ce-import-file-reason">{item.reason}</p>
                            </div>
                          </div>
                          <span className="ce-import-file-size">{formatBytes(item.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Excluded dependency folders */}
              {analyzedBatch.excluded.length > 0 && (
                <div className="ce-import-accordion-item excluded-block">
                  <div
                    className="ce-import-accordion-header"
                    onClick={() => setActiveAccordion((p) => ({ ...p, excluded: !p.excluded }))}
                  >
                    <div className="ce-import-acc-title">
                      {activeAccordion.excluded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Info size={14} color="#818cf8" />
                      <span>Excluded Dependencies / Artifacts ({analyzedBatch.excluded.length})</span>
                    </div>
                  </div>
                  {activeAccordion.excluded && (
                    <div className="ce-import-file-scroll">
                      {analyzedBatch.excluded.map((item) => (
                        <div key={item.path} className="ce-import-file-row muted-row">
                          <div className="ce-import-file-left">
                            <span className="ce-import-file-path">{item.path}</span>
                            <p className="ce-import-file-reason">{item.reason}</p>
                          </div>
                          <span className="ce-import-file-size">{formatBytes(item.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Blocked sensitive files */}
              {analyzedBatch.blocked.length > 0 && (
                <div className="ce-import-accordion-item blocked-block">
                  <div
                    className="ce-import-accordion-header"
                    onClick={() => setActiveAccordion((p) => ({ ...p, blocked: !p.blocked }))}
                  >
                    <div className="ce-import-acc-title">
                      {activeAccordion.blocked ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <ShieldAlert size={14} color="#ef4444" />
                      <span>Blocked Sensitive Files ({analyzedBatch.blocked.length})</span>
                    </div>
                  </div>
                  {activeAccordion.blocked && (
                    <div className="ce-import-file-scroll">
                      {analyzedBatch.blocked.map((item) => (
                        <div key={item.path} className="ce-import-file-row error-row">
                          <div className="ce-import-file-left">
                            <ShieldAlert size={13} color="#ef4444" />
                            <div>
                              <span className="ce-import-file-path">{item.path}</span>
                              <p className="ce-import-file-reason">{item.reason}</p>
                            </div>
                          </div>
                          <span className="ce-import-file-size">{formatBytes(item.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: IMPORTING PROGRESS */}
        {step === "IMPORTING" && (
          <div className="ce-import-progress-view">
            <RefreshCw size={36} className="ce-import-spin-loader" />
            <h4>Importing files into workspace...</h4>
            <div className="ce-import-progress-bar-bg">
              <div className="ce-import-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="ce-import-progress-percent">{uploadProgress}% complete</p>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "SUCCESS" && (
          <div className="ce-import-success-view">
            <CheckCircle2 size={42} color="#10b981" />
            <h4>Import Completed!</h4>
            <p>Your files have been added to the CodeExpo workspace.</p>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="ce-import-modal-footer">
          {step === "REVIEW" ? (
            <>
              <button
                type="button"
                className="ce-import-footer-btn cancel"
                onClick={() => setStep("SELECT")}
              >
                Back / Reselect
              </button>
              <button
                type="button"
                className="ce-import-footer-btn submit"
                disabled={analyzedBatch.ready.length === 0 || isStorageExceeded}
                onClick={handleExecuteImport}
              >
                Import {analyzedBatch.ready.length} File(s)
              </button>
            </>
          ) : step === "SELECT" ? (
            <button type="button" className="ce-import-footer-btn cancel" onClick={onClose}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
