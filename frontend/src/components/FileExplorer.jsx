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
import toast from "react-hot-toast";

export default function FileExplorer({
  roomId,
  currentUser,
  activeFileId,
  onFileSelect,
  openTabs,
  onFileDelete,
  onPathChange
}) {
  const [items, setItems] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // States for new items creation
  const [creatingType, setCreatingType] = useState(null); // 'file' | 'folder' | null
  const [creatingParentId, setCreatingParentId] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);

  // States for renaming
  const [renamingItemId, setRenamingItemId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete Confirmation Dialog State
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { itemId, itemName, itemType }

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, itemId, item }
  const contextMenuRef = useRef(null);

  const isSubmittingRef = useRef(false);

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

  // Sync selected item with active tab
  useEffect(() => {
    if (activeFileId) {
      setSelectedItemId(activeFileId);
    }
  }, [activeFileId]);

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

  // Global click listeners to close context menus
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const getPathForItem = (itemId) => {
    if (!itemId) return [];
    const path = [];
    let currentId = itemId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const item = items.find((i) => i._id === currentId);
      if (!item) break;
      path.unshift(item);
      currentId = item.parentId;
    }
    return path;
  };

  useEffect(() => {
    if (typeof onPathChange === "function") {
      const targetId = selectedItemId || activeFileId;
      const path = getPathForItem(targetId);
      onPathChange(path);
    }
  }, [selectedItemId, activeFileId, items]);

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
    if (ext === "js" || ext === "jsx") return "javascript";
    if (ext === "py") return "python";
    if (ext === "cpp" || ext === "h" || ext === "hpp" || ext === "c") return "cpp";
    if (ext === "java") return "java";
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext === "json") return "json";
    return "plaintext";
  };

  // Premium file icons based on extension
  const getFileIconInfo = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    let color = "#8e9aa9"; // default gray
    if (ext === "js" || ext === "jsx") color = "#f1e05a"; // JavaScript yellow
    else if (ext === "py") color = "#3572A5"; // Python blue
    else if (ext === "cpp" || ext === "h" || ext === "hpp" || ext === "c") color = "#f34b7d"; // C++ red
    else if (ext === "java") color = "#b07219"; // Java brown
    else if (ext === "html") color = "#e34c26"; // HTML orange
    else if (ext === "css") color = "#563d7c"; // CSS purple
    else if (ext === "json") color = "#db5858"; // JSON reddish
    return { color };
  };

  // Submit creation
  const submitCreation = async (nameVal) => {
    if (isSubmittingRef.current) return;
    const name = nameVal.trim();
    if (!name) {
      setCreatingType(null);
      return;
    }
    isSubmittingRef.current = true;
    try {
      const language = getLanguageByExtension(name);
      const data = await workspaceService.createWorkspaceItem(
        roomId,
        name,
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

      // Auto-select the newly created item
      setSelectedItemId(createdItem._id);
      if (creatingType === "file") {
        onFileSelect(createdItem._id, createdItem);
      }

      // Clear state
      setNewItemName("");
      setCreatingType(null);
      setCreatingParentId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create item.");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const triggerCreateNewItem = (type) => {
    let parentId = null;
    if (selectedItemId) {
      const selectedItem = items.find(i => i._id === selectedItemId);
      if (selectedItem) {
        if (selectedItem.type === "folder") {
          parentId = selectedItem._id;
          // Auto expand the folder
          const next = new Set(expandedFolders);
          next.add(parentId);
          setExpandedFolders(next);
        } else {
          parentId = selectedItem.parentId;
        }
      }
    }
    setCreatingParentId(parentId);
    setCreatingType(type);
    setNewItemName("");
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
      toast.error(error.response?.data?.message || "Failed to rename item.");
    }
  };

  // Delete Item Handler (Beautiful Modal Confirmation)
  const handleDeleteItem = (itemId) => {
    const item = items.find((i) => i._id === itemId);
    if (!item) return;
    setDeleteConfirm({
      itemId: item._id,
      itemName: item.name,
      itemType: item.type
    });
  };

  // Set Entry Point Handler
  const handleSetEntryPoint = async (fileId) => {
    try {
      const response = await workspaceService.setFileEntryPoint(fileId);
      const newIsEntryPoint = response.isEntryPoint;

      setItems((prev) =>
        prev.map((item) =>
          item.type === "file"
            ? { ...item, isEntryPoint: item._id === fileId ? newIsEntryPoint : false }
            : item
        )
      );

      socket.emit("entry-point-changed", { roomId, fileId: newIsEntryPoint ? fileId : null });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to set entry point.");
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

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;

    // If targetItem is a folder, move inside it. If it's a file, move inside targetItem's parent folder.
    let parentId = null;
    if (targetItem) {
      parentId = targetItem.type === "folder" ? targetItem._id : (targetItem.parentId || null);
    }

    if (itemId === parentId || itemId === (targetItem ? targetItem._id : null)) return;

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
      toast.error(error.response?.data?.message || "Failed to move workspace item.");
    }
  };

  // Right-Click Context Menu trigger
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItemId(item._id);
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
          const isSelected = selectedItemId === item._id;

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
                  className={`tree-node folder-node ${isSelected ? "active selected-node" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(item._id);
                    setSelectedItemId(item._id);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <span className={`collapse-chevron ${isExpanded ? "expanded" : ""}`}>
                    <ChevronRight size={14} />
                  </span>
                  {isExpanded ? (
                    <FolderOpen size={15} className="node-icon folder-icon-open" />
                  ) : (
                    <Folder size={15} className="node-icon folder-icon-closed" />
                  )}

                  {renamingItemId === item._id ? (
                    <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()} style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setRenamingItemId(null);
                        }}
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
                    title="More Options..."
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="tree-folder-children">
                    {/* Render Input for new sub-item inline */}
                    {creatingParentId === item._id && creatingType && (
                      <div className="tree-node creation-node" onClick={(e) => e.stopPropagation()}>
                        {creatingType === "folder" ? <Folder size={15} className="node-icon folder-icon-closed" /> : <File size={15} className="node-icon" />}
                        <form onSubmit={(e) => { e.preventDefault(); submitCreation(newItemName); }} style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onBlur={() => submitCreation(newItemName)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setNewItemName("");
                                setCreatingType(null);
                              }
                            }}
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
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
              >
                <div
                  className={`tree-node file-node ${isActiveFile || isSelected ? "active selected-node" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect(item._id, item);
                    setSelectedItemId(item._id);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <FileCode size={14} className="node-icon file-icon" style={{ color: getFileIconInfo(item.name).color }} />

                  {renamingItemId === item._id ? (
                    <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()} style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setRenamingItemId(null);
                        }}
                        className="node-inline-input"
                        autoFocus
                      />
                    </form>
                  ) : (
                    <span className="node-name">
                      {item.name}
                      {item.isEntryPoint && <span className="entry-point-indicator-tag">Main</span>}
                    </span>
                  )}

                  <button
                    className="node-options-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, item);
                    }}
                    title="More Options..."
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
    <div
      className="workspace-file-explorer"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, null)}
    >
      {/* Explorer Controls Toolbar */}
      <div className="explorer-sec-header">
        <span>Workspace Files</span>
        <div className="explorer-header-actions">
          <button
            type="button"
            className="action-btn-mini"
            onClick={() => triggerCreateNewItem("file")}
            title="Create New File"
          >
            <FilePlus size={13} />
          </button>
          <button
            type="button"
            className="action-btn-mini"
            onClick={() => triggerCreateNewItem("folder")}
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
          onClick={() => setSelectedItemId(null)}
        >
          {/* Create at root inline input */}
          {creatingParentId === null && creatingType && (
            <div className="tree-node creation-node root-creation" onClick={(e) => e.stopPropagation()}>
              {creatingType === "folder" ? <Folder size={15} className="node-icon folder-icon-closed" /> : <File size={15} className="node-icon" />}
              <form onSubmit={(e) => { e.preventDefault(); submitCreation(newItemName); }} style={{ flex: 1 }}>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={() => submitCreation(newItemName)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setNewItemName("");
                      setCreatingType(null);
                    }
                  }}
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
                    // Auto-expand folder on creating sub-item
                    const next = new Set(expandedFolders);
                    next.add(contextMenu.itemId);
                    setExpandedFolders(next);
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
                    // Auto-expand folder on creating sub-item
                    const next = new Set(expandedFolders);
                    next.add(contextMenu.itemId);
                    setExpandedFolders(next);
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
                <span>{contextMenu.item.isEntryPoint ? "Unset Main File" : "Set as Main File"}</span>
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

      {/* Beautiful Confirm Delete Popup Modal */}
      {deleteConfirm && (
        <div className="ce-confirm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="ce-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ce-confirm-modal-header">
              <Trash2 size={20} className="ce-confirm-modal-icon" />
              <h3>Delete {deleteConfirm.itemType === "folder" ? "Folder" : "File"}</h3>
            </div>
            <div className="ce-confirm-modal-body">
              <p>
                Are you sure you want to delete the {deleteConfirm.itemType} <strong>"{deleteConfirm.itemName}"</strong>?
              </p>
              {deleteConfirm.itemType === "folder" && (
                <span className="ce-confirm-modal-warning">
                  ⚠️ This will recursively delete all containing files and subfolders.
                </span>
              )}
            </div>
            <div className="ce-confirm-modal-actions">
              <button
                type="button"
                className="ce-confirm-btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ce-confirm-btn-delete"
                onClick={async () => {
                  const { itemId, itemName, itemType } = deleteConfirm;
                  setDeleteConfirm(null);
                  try {
                    await workspaceService.deleteWorkspaceItem(itemId);
                    setItems((prev) => prev.filter((i) => i._id !== itemId));
                    onFileDelete(itemId);
                    socket.emit(itemType === "file" ? "file-deleted" : "folder-deleted", {
                      roomId,
                      itemId
                    });
                    toast.success(`Successfully deleted "${itemName}"`);
                  } catch (error) {
                    toast.error(error.response?.data?.message || "Failed to delete item.");
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
