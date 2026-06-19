import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Play,
  X,
  FilePlus,
  FolderPlus
} from "lucide-react";
import * as workspaceService from "../services/workspaceService";
import socket from "../socket/socket";

export default function FileExplorer({
  roomId,
  currentUser,
  activeFileId,
  onFileSelect,
  openTabs,
  onFileDelete
}) {
  const [items, setItems] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // States for new items creation
  const [creatingType, setCreatingType] = useState(null); // 'file' | 'folder' | null
  const [creatingParentId, setCreatingParentId] = useState(null);
  const [newItemName, setNewItemName] = useState("");

  // States for renaming
  const [renamingItemId, setRenamingItemId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, itemId, item }
  const contextMenuRef = useRef(null);

  // Fetch Tree
  const fetchWorkspace = async () => {
    try {
      const data = await workspaceService.getWorkspaceTree(roomId);
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching workspace tree:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [roomId]);

  // Socket sync listeners for workspace structural changes
  useEffect(() => {
    const handleFileCreated = (item) => {
      setItems((prev) => {
        if (prev.some((i) => i._id === item._id)) return prev;
        return [...prev, item].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
      });
    };
    const handleFolderCreated = (item) => {
      setItems((prev) => {
        if (prev.some((i) => i._id === item._id)) return prev;
        return [...prev, item].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
      });
    };
    const handleItemDeleted = (itemId) => {
      setItems((prev) => prev.filter((item) => item._id !== itemId));
      onFileDelete(itemId);
    };
    const handleItemRenamed = ({ itemId, name }) => {
      setItems((prev) =>
        prev.map((item) => (item._id === itemId ? { ...item, name } : item))
      );
    };
    const handleItemMoved = ({ itemId, parentId }) => {
      setItems((prev) =>
        prev.map((item) => (item._id === itemId ? { ...item, parentId } : item))
      );
    };
    const handleEntryPointChanged = ({ fileId }) => {
      setItems((prev) =>
        prev.map((item) =>
          item.type === "file"
            ? { ...item, isEntryPoint: item._id === fileId }
            : item
        )
      );
    };

    socket.on("file-created", handleFileCreated);
    socket.on("folder-created", handleFolderCreated);
    socket.on("file-deleted", handleItemDeleted);
    socket.on("folder-deleted", handleItemDeleted);
    socket.on("file-renamed", handleItemRenamed);
    socket.on("folder-renamed", handleItemRenamed);
    socket.on("file-moved", handleItemMoved);
    socket.on("entry-point-changed", handleEntryPointChanged);

    return () => {
      socket.off("file-created", handleFileCreated);
      socket.off("folder-created", handleFolderCreated);
      socket.off("file-deleted", handleItemDeleted);
      socket.off("folder-deleted", handleItemDeleted);
      socket.off("file-renamed", handleItemRenamed);
      socket.off("folder-renamed", handleItemRenamed);
      socket.off("file-moved", handleItemMoved);
      socket.off("entry-point-changed", handleEntryPointChanged);
    };
  }, []);

  // Global click listeners to close context menus and inputs
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Toggle Folder Collapse/Expand
  const toggleFolder = (folderId) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  // Helper: Detect language by extension
  const getLanguageByExtension = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "js") return "javascript";
    if (ext === "py") return "python";
    if (ext === "cpp" || ext === "h" || ext === "hpp") return "cpp";
    if (ext === "java") return "java";
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext === "json") return "json";
    return "plaintext";
  };

  // Create Item Handler
  const handleCreateItemSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) {
      setCreatingType(null);
      return;
    }

    try {
      const language = getLanguageByExtension(newItemName);
      const data = await workspaceService.createWorkspaceItem(
        roomId,
        newItemName.trim(),
        creatingType,
        creatingParentId,
        language
      );
      
      const createdItem = data.item;
      setItems((prev) => [...prev, createdItem].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));
      
      // Auto expand parent folder
      if (creatingParentId) {
        const next = new Set(expandedFolders);
        next.add(creatingParentId);
        setExpandedFolders(next);
      }

      // Emit socket event
      socket.emit(creatingType === "file" ? "file-created" : "folder-created", {
        roomId,
        item: createdItem
      });

      // Clear state
      setNewItemName("");
      setCreatingType(null);
      setCreatingParentId(null);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create item.");
    }
  };

  // Rename Item Handler
  const handleRenameSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!renameValue.trim() || renameValue === items.find(i => i._id === renamingItemId)?.name) {
      setRenamingItemId(null);
      return;
    }

    try {
      const data = await workspaceService.renameWorkspaceItem(renamingItemId, renameValue.trim());
      const updatedItem = data.item;

      setItems((prev) =>
        prev.map((item) => (item._id === renamingItemId ? updatedItem : item))
      );

      socket.emit(updatedItem.type === "file" ? "file-renamed" : "folder-renamed", {
        roomId,
        itemId: renamingItemId,
        name: renameValue.trim()
      });

      setRenamingItemId(null);
      setRenameValue("");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to rename item.");
    }
  };

  // Delete Item Handler
  const handleDeleteItem = async (itemId) => {
    const item = items.find((i) => i._id === itemId);
    if (!item) return;

    const confirmMsg = `Are you sure you want to delete the ${item.type} "${item.name}"?${
      item.type === "folder" ? " This will recursively delete all containing files." : ""
    }`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await workspaceService.deleteWorkspaceItem(itemId);

      setItems((prev) => prev.filter((i) => i._id !== itemId));
      onFileDelete(itemId);

      socket.emit(item.type === "file" ? "file-deleted" : "folder-deleted", {
        roomId,
        itemId
      });
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete item.");
    }
  };

  // Set Entry Point Handler
  const handleSetEntryPoint = async (fileId) => {
    try {
      await workspaceService.setFileEntryPoint(fileId);
      setItems((prev) =>
        prev.map((item) =>
          item.type === "file"
            ? { ...item, isEntryPoint: item._id === fileId }
            : item
        )
      );

      socket.emit("entry-point-changed", { roomId, fileId });
    } catch (error) {
      alert(error.response?.data?.message || "Failed to set entry point.");
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData("text/plain", item._id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    const parentId = targetFolder ? targetFolder._id : null;

    if (itemId === parentId) return;

    try {
      const data = await workspaceService.moveWorkspaceItem(itemId, parentId);
      const updatedItem = data.item;

      setItems((prev) =>
        prev.map((item) => (item._id === itemId ? updatedItem : item))
      );

      socket.emit("file-moved", { roomId, itemId, parentId });

      if (parentId) {
        const next = new Set(expandedFolders);
        next.add(parentId);
        setExpandedFolders(next);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to move workspace item.");
    }
  };

  // Right-Click Context Menu trigger
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId: item._id,
      item
    });
  };

  // Tree Renderer Helper
  const renderTree = (parentId = null) => {
    const filtered = items.filter((item) => item.parentId === parentId);

    return (
      <div className="tree-level-container">
        {filtered.map((item) => {
          const isFolder = item.type === "folder";
          const isExpanded = expandedFolders.has(item._id);
          const isActiveFile = activeFileId === item._id;

          if (isFolder) {
            return (
              <div
                key={item._id}
                className="tree-node-wrapper"
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
              >
                <div
                  className="tree-node folder-node"
                  onClick={() => toggleFolder(item._id)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <span className="collapse-chevron">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  {isExpanded ? (
                    <FolderOpen size={15} className="node-icon folder-icon-open" />
                  ) : (
                    <Folder size={15} className="node-icon folder-icon-closed" />
                  )}

                  {renamingItemId === item._id ? (
                    <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        className="node-inline-input"
                        autoFocus
                      />
                    </form>
                  ) : (
                    <span className="node-name">{item.name}</span>
                  )}

                  <button
                    className="node-options-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, item);
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="tree-folder-children">
                    {/* Render Input for new sub-item inline */}
                    {creatingParentId === item._id && creatingType && (
                      <div className="tree-node creation-node">
                        {creatingType === "folder" ? <Folder size={15} /> : <File size={15} />}
                        <form onSubmit={handleCreateItemSubmit}>
                          <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onBlur={() => setCreatingType(null)}
                            placeholder={`New ${creatingType}...`}
                            className="node-inline-input"
                            autoFocus
                          />
                        </form>
                      </div>
                    )}
                    {renderTree(item._id)}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={item._id}
                className={`tree-node-wrapper`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
              >
                <div
                  className={`tree-node file-node ${isActiveFile ? "active" : ""}`}
                  onClick={() => onFileSelect(item._id)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <FileCode size={14} className="node-icon file-icon" />

                  {renamingItemId === item._id ? (
                    <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        className="node-inline-input"
                        autoFocus
                      />
                    </form>
                  ) : (
                    <span className="node-name">
                      {item.name}
                    </span>
                  )}

                  <button
                    className="node-options-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, item);
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="workspace-file-explorer">
      {/* Explorer Controls Toolbar */}
      <div className="explorer-sec-header">
        <span>Workspace Files</span>
        <div className="explorer-header-actions">
          <button
            type="button"
            className="action-btn-mini"
            onClick={() => {
              setCreatingParentId(null);
              setCreatingType("file");
            }}
            title="Create New File"
          >
            <FilePlus size={13} />
          </button>
          <button
            type="button"
            className="action-btn-mini"
            onClick={() => {
              setCreatingParentId(null);
              setCreatingType("folder");
            }}
            title="Create New Folder"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="explorer-loading">Loading files...</div>
      ) : (
        <div
          className="explorer-tree-view"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          {/* Create at root inline input */}
          {creatingParentId === null && creatingType && (
            <div className="tree-node creation-node root-creation">
              {creatingType === "folder" ? <Folder size={15} /> : <File size={15} />}
              <form onSubmit={handleCreateItemSubmit}>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={() => setCreatingType(null)}
                  placeholder={`New ${creatingType}...`}
                  className="node-inline-input"
                  autoFocus
                />
              </form>
            </div>
          )}

          {items.length === 0 && !creatingType ? (
            <div className="empty-tree-message">
              No files in workspace.<br />Click actions above to add files.
            </div>
          ) : (
            renderTree(null)
          )}
        </div>
      )}

      {/* Floating Context Menu */}
      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={() => setContextMenu(null)} />
          <ul
            ref={contextMenuRef}
            className="explorer-context-menu"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            {contextMenu.item.type === "folder" ? (
              <>
                <li
                  onClick={() => {
                    setCreatingParentId(contextMenu.itemId);
                    setCreatingType("file");
                    setContextMenu(null);
                  }}
                >
                  <FilePlus size={13} />
                  <span>New File</span>
                </li>
                <li
                  onClick={() => {
                    setCreatingParentId(contextMenu.itemId);
                    setCreatingType("folder");
                    setContextMenu(null);
                  }}
                >
                  <FolderPlus size={13} />
                  <span>New Folder</span>
                </li>
              </>
            ) : (
              <li
                onClick={() => {
                  handleSetEntryPoint(contextMenu.itemId);
                  setContextMenu(null);
                }}
              >
                <Play size={13} />
                <span>Set as Entry Point</span>
              </li>
            )}
            <li
              onClick={() => {
                setRenamingItemId(contextMenu.itemId);
                setRenameValue(contextMenu.item.name);
                setContextMenu(null);
              }}
            >
              <Edit2 size={13} />
              <span>Rename</span>
            </li>
            <li
              className="delete-item"
              onClick={() => {
                handleDeleteItem(contextMenu.itemId);
                setContextMenu(null);
              }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
