import React, { useState, useEffect, useRef } from "react";
import {
  Copy,
  Share2,
  Download,
  LogOut,
  Trash2,
  Check,
  ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import JSZip from "jszip";
import { getWorkspaceTree, getFileContent, getWorkspaceContents } from "../services/workspaceService";
import "./WorkspaceActionsDropdown.css";

export default function WorkspaceActionsDropdown({
  roomId,
  isOwner = false,
  currentUserRole = null,
  onCopyId,
  onExitRoom,
  onDeleteRoom,
  tabs = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const dropdownRef = useRef(null);
  const triggerBtnRef = useRef(null);

  const isUserOwner = isOwner || currentUserRole === "OWNER";

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerBtnRef.current?.focus();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // 1. Copy Workspace ID
  const handleCopyId = (e) => {
    e.stopPropagation();
    if (onCopyId) {
      onCopyId();
    } else if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success("Workspace ID copied to clipboard!");
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    setIsOpen(false);
  };

  // 2. Share Workspace (Copy Link)
  const handleShareWorkspace = (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/editor/${roomId || ""}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Workspace link copied to clipboard!");
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
    setIsOpen(false);
  };

  const buildRelativePath = (item, itemMap) => {
    const segments = [item.name];
    let currentParentId = item.parentId;

    while (currentParentId && itemMap.has(String(currentParentId))) {
      const parent = itemMap.get(String(currentParentId));
      if (parent && parent.name) {
        segments.unshift(parent.name);
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }

    return segments.join("/");
  };

  // 3. Export Project as ZIP Archive (Preserving all files and folders)
  const handleExportProject = async (e) => {
    e.stopPropagation();
    setIsOpen(false);
    const toastId = toast.loading("Packaging workspace files into ZIP...");

    try {
      const zip = new JSZip();
      let hasAddedFiles = false;

      // 1. Try to fetch complete workspace tree & contents from API
      if (roomId) {
        try {
          const treeRes = await getWorkspaceTree(roomId);
          const contentsRes = await getWorkspaceContents(roomId);

          const items = treeRes?.items || [];
          const filesWithContent = contentsRes?.files || [];

          if (items.length > 0) {
            const itemMap = new Map();
            items.forEach((it) => itemMap.set(String(it._id), it));

            const contentMap = new Map();
            filesWithContent.forEach((f) => contentMap.set(String(f._id), f.content || ""));

            for (const item of items) {
              const relPath = buildRelativePath(item, itemMap);
              if (item.type === "folder") {
                zip.folder(relPath);
              } else if (item.type === "file") {
                let fileContent = contentMap.get(String(item._id));
                if (fileContent === undefined) {
                  try {
                    const singleRes = await getFileContent(item._id);
                    fileContent = singleRes?.content || singleRes?.file?.content || "";
                  } catch (e) {
                    fileContent = "";
                  }
                }
                zip.file(relPath, fileContent);
                hasAddedFiles = true;
              }
            }
          }
        } catch (treeErr) {
          console.warn("Could not fetch full tree from backend, falling back to open tabs:", treeErr);
        }
      }

      // 2. Fallback to open tabs if no database workspace items were added
      if (!hasAddedFiles && tabs && tabs.length > 0) {
        tabs.forEach((tab, index) => {
          const fileName = tab.name || `file_${index + 1}.txt`;
          zip.file(fileName, tab.content || "");
          hasAddedFiles = true;
        });
      }

      if (!hasAddedFiles) {
        toast.error("No workspace files found to export.", { id: toastId });
        return;
      }

      // 3. Generate ZIP blob & trigger single file download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFilename = `Workspace_${roomId || "Project"}_export.zip`;

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success(`Exported ${zipFilename} successfully!`, { id: toastId });
    } catch (err) {
      console.error("ZIP export error:", err);
      toast.error("Failed to package ZIP file: " + (err.message || "Unknown error"), { id: toastId });
    }
  };

  // 4. Exit Workspace
  const handleExit = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onExitRoom) {
      onExitRoom();
    }
  };

  // 5. Delete Workspace
  const handleDelete = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onDeleteRoom) {
      onDeleteRoom();
    }
  };

  return (
    <div className="ce-workspace-actions-wrapper" ref={dropdownRef}>
      {/* Neutral Secondary Actions Button */}
      <button
        ref={triggerBtnRef}
        type="button"
        className={`ce-nav-action-btn ce-workspace-actions-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Workspace Actions & Options"
        aria-label="Workspace Actions & Options"
      >
        <span className="actions-btn-text">Action</span>
        <ChevronDown size={12} className={`actions-arrow ${isOpen ? "open" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="ce-workspace-actions-dropdown" role="menu" tabIndex={-1}>
          {/* Header Title */}
          <div className="ce-actions-dropdown-header">
            <span className="dropdown-title-text">Workspace Actions</span>
            <span className={`role-badge ${isUserOwner ? "owner" : "member"}`}>
              {isUserOwner ? "OWNER" : "MEMBER"}
            </span>
          </div>

          <div className="ce-actions-group">
            {/* 1. Copy Workspace ID */}
            <button
              type="button"
              className="ce-actions-item"
              onClick={handleCopyId}
              role="menuitem"
              aria-label="Copy Workspace ID"
            >
              {copiedId ? <Check size={14} className="item-icon success" /> : <Copy size={14} className="item-icon" />}
              <span className="item-label">Copy Workspace ID</span>
            </button>

            {/* 2. Share Workspace */}
            <button
              type="button"
              className="ce-actions-item"
              onClick={handleShareWorkspace}
              role="menuitem"
              aria-label="Share Workspace"
            >
              {copiedShare ? <Check size={14} className="item-icon success" /> : <Share2 size={14} className="item-icon" />}
              <span className="item-label">Share Workspace</span>
            </button>

            {/* 3. Export Project */}
            <button
              type="button"
              className="ce-actions-item"
              onClick={handleExportProject}
              role="menuitem"
              aria-label="Export Project"
            >
              <Download size={14} className="item-icon" />
              <span className="item-label">Export Project</span>
            </button>
          </div>

          <div className="ce-actions-divider" />

          {/* 4. Exit Workspace */}
          <div className="ce-actions-group">
            <button
              type="button"
              className="ce-actions-item exit-item"
              onClick={handleExit}
              role="menuitem"
              aria-label="Exit Workspace"
            >
              <LogOut size={14} className="item-icon exit-icon" />
              <span className="item-label">Exit Workspace</span>
            </button>
          </div>

          {/* 5. Delete Workspace (OWNER ONLY) */}
          {isUserOwner && (
            <>
              <div className="ce-actions-divider" />
              <div className="ce-actions-group">
                <button
                  type="button"
                  className="ce-actions-item delete-item"
                  onClick={handleDelete}
                  role="menuitem"
                  aria-label="Delete Workspace"
                >
                  <Trash2 size={14} className="item-icon delete-icon" />
                  <span className="item-label">Delete Workspace</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
