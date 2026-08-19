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
  FolderPlus,
  Upload,
  HardDrive
} from "lucide-react";
import * as workspaceService from "../services/workspaceService";
import socket from "../socket/socket";
import toast from "react-hot-toast";
import ImportModal from "./modals/ImportModal";

const FileIcon = ({ name, size = 14, className = "node-icon file-icon" }) => {
  const ext = name.split(".").pop().toLowerCase();
  
  switch (ext) {
    case "html":
    case "htm":
      return (
        <svg viewBox="0 0 24 24" width={size + 2} height={size + 2} className={className} style={{ marginRight: '6px', minWidth: size + 2 }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 2L6.8 20L12 22L17.2 20L19 2H5Z" fill="#E34F26" />
          <path d="M12 20.2L16.2 18.6L17.6 4H12V20.2Z" fill="#F06529" />
          <path d="M12 9.6H9.2L9 7.6H12V5.6H6.8L7.4 11.6H12V9.6ZM12 15.6L9.6 14.8L9.4 13H7.4L7.8 17L12 18.2V15.6Z" fill="#EBEBEB" />
          <path d="M12 9.6H14.8L14.6 11.6H12V13.6H14.4L14.2 15.4L12 16.2V18.2L16.2 17L16.8 11.6H12V9.6ZM12 5.6H17.2L17 7.6H12V5.6Z" fill="#FFFFFF" />
        </svg>
      );
    case "css":
      return (
        <svg viewBox="0 0 24 24" width={size + 2} height={size + 2} className={className} style={{ marginRight: '6px', minWidth: size + 2 }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 2L6.8 20L12 22L17.2 20L19 2H5Z" fill="#1572B6" />
          <path d="M12 20.2L16.2 18.6L17.6 4H12V20.2Z" fill="#33A9DC" />
          <path d="M12 9.6H9.2L9 7.6H12V5.6H6.8L7.4 11.6H12V9.6ZM12 15.6L9.6 14.8L9.4 13H7.4L7.8 17L12 18.2V15.6Z" fill="#EBEBEB" />
          <path d="M12 9.6H14.8L14.6 11.6H12V13.6H14.4L14.2 15.4L12 16.2V18.2L16.2 17L16.8 11.6H12V9.6ZM12 5.6H17.2L17 7.6H12V5.6Z" fill="#FFFFFF" />
        </svg>
      );
    case "js":
    case "jsx":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size, borderRadius: '2px' }} xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" fill="#F7DF1E" />
          <path d="M18.15 15.6c-.3-.47-.75-.72-1.35-.72-.7 0-1.15.35-1.15.93 0 .52.36.8 1.15 1.1l.6.23c1.3.48 2 1.15 2 2.37 0 1.55-1.15 2.5-3 2.5-1.54 0-2.5-.72-3-1.83l1.35-.8c.28.45.68.75 1.45.75.76 0 1.2-.3 1.2-.95 0-.58-.33-.82-1.07-1.12l-.65-.25c-1.3-.5-1.95-1.15-1.95-2.28 0-1.4 1.1-2.3 2.72-2.3 1.4 0 2.25.56 2.7 1.5l-1.37.85zM9.4 16.9v2.23c0 .87-.33 1.25-1.1 1.25-.43 0-.7-.2-.84-.52l-1.45.85c.34.7 1.05 1.2 2.25 1.2 1.83 0 3.12-1 3.12-2.8v-7.14H9.4v5.03z" fill="#000000" />
        </svg>
      );
    case "py":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.74 2 8.35 2.14 7.6 2.89C6.72 3.77 6.72 5.06 6.72 6.72V7.84H12V8.4H5.28C3.62 8.4 2 10.02 2 11.68V14.48C2 16.14 3.32 17.28 4.98 17.28H6.16V16.16C6.16 14.5 7.48 13.18 9.14 13.18H14.48C16.14 13.18 17.28 12.14 17.28 10.48V5.28C17.28 3.62 16.14 2 14.48 2H12ZM9.7 4C10.25 4 10.7 4.45 10.7 5C10.7 5.55 10.25 6 9.7 6C9.15 6 8.7 5.55 8.7 5C8.7 4.45 9.15 4 9.7 4ZM9.52 6.72C7.86 6.72 6.72 7.86 6.72 9.52V14.72C6.72 16.38 7.86 18 9.52 18H12V17.44H5.28C4.73 17.44 4.28 16.99 4.28 16.44V12.52C4.28 11.97 4.73 11.52 5.28 11.52H12V10.4H13.68C15.34 10.4 16.48 9.08 16.48 7.42V6.24H15.3C13.64 6.24 12.32 7.56 12.32 9.22V10.34H6.98V9.22C6.98 7.56 8.3 6.24 9.96 6.24H12V6.72H9.52ZM12 12V13.6H17.28C18.94 13.6 20.56 11.98 20.56 10.32V7.52C20.56 5.86 19.24 4.72 17.58 4.72H16.4V5.84C16.4 7.5 15.08 8.82 13.42 8.82H8.08C6.42 8.82 5.28 9.86 5.28 11.52V16.72C5.28 18.38 6.42 20 8.08 20H10.5C12.16 20 13.48 18.68 13.48 17.02V15.9H12.32C10.66 15.9 9.34 14.58 9.34 12.92V12H12ZM14.3 18C14.85 18 15.3 18.45 15.3 19C15.3 19.55 14.85 20 14.3 20C13.75 20 13.3 19.55 13.3 19C13.3 18.45 13.75 18 14.3 18Z" fill="#3776AB" />
        </svg>
      );
    case "json":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#2D2D2D" />
          <text x="3" y="15" fill="#CB833E" fontSize="9" fontWeight="bold" fontFamily="monospace">{"{ }"}</text>
        </svg>
      );
    case "cpp":
    case "c":
    case "h":
    case "hpp":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#00599C" />
          <text x="4" y="16" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif">C++</text>
        </svg>
      );
    case "java":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#E42D2D" />
          <text x="4" y="16" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Java</text>
        </svg>
      );
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size }} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={{ marginRight: '6px', minWidth: size }} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      );
  }
};

// Helper: Fast recursive descendant collector
const getDescendantIds = (rootId, allItems = []) => {
  if (!rootId) return [];
  const strRootId = String(rootId);
  const deletedSet = new Set([strRootId]);
  let currentParents = new Set([strRootId]);

  while (currentParents.size > 0) {
    const nextParents = new Set();
    for (const item of allItems) {
      if (item && item.parentId && currentParents.has(String(item.parentId))) {
        const idStr = String(item._id);
        if (!deletedSet.has(idStr)) {
          deletedSet.add(idStr);
          if (item.type === "folder") {
            nextParents.add(idStr);
          }
        }
      }
    }
    currentParents = nextParents;
  }
  return Array.from(deletedSet);
};

export default function FileExplorer({
  roomId,
  room,
  roomLanguage = "javascript",
  currentUser,
  currentUserRole = "MEMBER",
  activeFileId,
  onFileSelect,
  openTabs,
  onFileDelete,
  onPathChange,
  onItemsUpdate,
  isImportOpen,
  onOpenImport,
  onCloseImport
}) {
  const [items, setItems] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [localImportModalOpen, setLocalImportModalOpen] = useState(false);
  const isImportModalOpen = isImportOpen !== undefined ? isImportOpen : localImportModalOpen;
  const openImportModal = onOpenImport || (() => setLocalImportModalOpen(true));
  const closeImportModal = onCloseImport || (() => setLocalImportModalOpen(false));
  const [storageInfo, setStorageInfo] = useState({ currentUsage: 0, maxStorage: 10485760, availableStorage: 10485760, percentage: 0 });

  useEffect(() => {
    if (typeof onItemsUpdate === "function") {
      onItemsUpdate(items);
    }
  }, [items, onItemsUpdate]);

  const canModifyItem = (item) => {
    if (currentUserRole === "OWNER" || currentUserRole === "MODERATOR") return true;
    if (currentUserRole === "VIEWER") return false;
    // MEMBER role: only their own items
    const creatorId = item?.createdBy?._id || item?.createdBy;
    const currentUserId = currentUser?.id || currentUser?._id;
    return !!creatorId && String(creatorId) === String(currentUserId);
  };

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

  // Fetch Authoritative Storage
  const fetchStorage = async () => {
    try {
      const data = await workspaceService.getRoomStorage(roomId);
      if (data && data.storage) {
        setStorageInfo(data.storage);
      }
    } catch (err) {
      console.error("Failed to load room storage:", err);
    }
  };

  useEffect(() => {
    fetchWorkspace();
    fetchStorage();
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
    const handleItemDeleted = (data) => {
      const deletedIds = data?.deletedIds || (Array.isArray(data) ? data : [data?.itemId || data]);
      const idSet = new Set(deletedIds.map(String));
      setItems((prev) => prev.filter((item) => !idSet.has(String(item._id))));
      onFileDelete(deletedIds);
      fetchStorage();
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

    const handleFilesImported = () => {
      fetchWorkspace();
      fetchStorage();
    };

    socket.on("files-imported", handleFilesImported);
    socket.on("file-created", handleFileCreated);
    socket.on("folder-created", handleFolderCreated);
    socket.on("file-deleted", handleItemDeleted);
    socket.on("folder-deleted", handleItemDeleted);
    socket.on("file-renamed", handleItemRenamed);
    socket.on("folder-renamed", handleItemRenamed);
    socket.on("file-moved", handleItemMoved);
    socket.on("entry-point-changed", handleEntryPointChanged);

    return () => {
      socket.off("files-imported", handleFilesImported);
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

    // 1. Create optimistic item
    const tempId = "temp-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const optimisticItem = {
      _id: tempId,
      name,
      type: creatingType,
      parentId: creatingParentId,
      language: getLanguageByExtension(name),
      isOptimistic: true,
      createdBy: currentUser
    };

    // Add it to tree immediately
    setItems((prev) => [...prev, optimisticItem].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));

    // Auto expand parent folder
    if (creatingParentId) {
      const next = new Set(expandedFolders);
      next.add(creatingParentId);
      setExpandedFolders(next);
    }

    // Reset input fields instantly
    const currentCreatingType = creatingType;
    setNewItemName("");
    setCreatingType(null);
    setCreatingParentId(null);
    isSubmittingRef.current = false; // allow next inputs immediately!

    try {
      const language = getLanguageByExtension(name);
      const data = await workspaceService.createWorkspaceItem(
        roomId,
        name,
        optimisticItem.type,
        optimisticItem.parentId,
        language
      );

      const createdItem = data.item;

      // Replace optimistic item with actual item
      setItems((prev) =>
        prev.map((i) => (i._id === tempId ? createdItem : i)).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
      );

      // Emit socket event
      socket.emit(createdItem.type === "file" ? "file-created" : "folder-created", {
        roomId,
        item: createdItem
      });

      // Auto-select the newly created item
      setSelectedItemId(createdItem._id);
      if (createdItem.type === "file") {
        onFileSelect(createdItem._id, createdItem);
      }
    } catch (error) {
      // Remove optimistic item on error
      setItems((prev) => prev.filter((i) => i._id !== tempId));
      toast.error(error.response?.data?.message || "Failed to create item.");
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
    e.stopPropagation();
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

    const itemToMove = items.find(i => i._id === itemId);
    if (!itemToMove || !canModifyItem(itemToMove)) {
      toast.error("You are not authorized to move this item");
      return;
    }

    // If targetItem is a folder, move inside it. If it's a file, move inside targetItem's parent folder.
    let parentId = null;
    let parentFolder = null;
    if (targetItem) {
      if (targetItem.type === "folder") {
        parentId = targetItem._id;
        parentFolder = targetItem;
      } else {
        parentId = targetItem.parentId || null;
        parentFolder = items.find(i => i._id === parentId);
      }
    }

    // Check parent folder write permission (standard members cannot move items into folders owned by others)
    if (parentFolder && !canModifyItem(parentFolder)) {
      toast.error("You do not have permission to move items into this folder");
      return;
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

    // Viewers have no context menu options at all
    if (currentUserRole === "VIEWER") return;

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
                draggable={canModifyItem(item)}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
              >
                <div
                  className={`tree-node folder-node ${isSelected ? "active selected-node" : ""}`}
                  style={{ opacity: item.isOptimistic ? 0.6 : 1, pointerEvents: item.isOptimistic ? "none" : "auto" }}
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

                  {currentUserRole !== "VIEWER" && (
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
                  )}
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
                draggable={canModifyItem(item)}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
              >
                <div
                  className={`tree-node file-node ${isActiveFile || isSelected ? "active selected-node" : ""}`}
                  style={{ opacity: item.isOptimistic ? 0.6 : 1, pointerEvents: item.isOptimistic ? "none" : "auto" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect(item._id, item);
                    setSelectedItemId(item._id);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <FileIcon name={item.name} size={14} />

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

                  {currentUserRole !== "VIEWER" && (
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
                  )}
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
        {currentUserRole !== "VIEWER" && (
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
            <button
              type="button"
              className="action-btn-mini"
              onClick={openImportModal}
              title={`Import Files / Folder (${roomLanguage})`}
            >
              <Upload size={13} />
            </button>
          </div>
        )}
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
              canModifyItem(contextMenu.item) ? (
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
                <li style={{ opacity: 0.5, cursor: "not-allowed", padding: "8px 12px", fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>
                  Permission Denied
                </li>
              )
            ) : (
              canModifyItem(contextMenu.item) && (
                <li
                  onClick={() => {
                    handleSetEntryPoint(contextMenu.itemId);
                    setContextMenu(null);
                  }}
                >
                  <Play size={13} />
                  <span>{contextMenu.item.isEntryPoint ? "Unset Main File" : "Set as Main File"}</span>
                </li>
              )
            )}
            {canModifyItem(contextMenu.item) && (
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
            )}
            {canModifyItem(contextMenu.item) && (
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
            )}
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

                  // 1. Calculate all affected items (self + recursive sub-items)
                  const affectedIds = getDescendantIds(itemId, items);
                  const affectedSet = new Set(affectedIds.map(String));
                  const prevItems = [...items];

                  // 2. 0ms Optimistic UI updates across sidebar, open tabs, and socket
                  setItems((prev) => prev.filter((i) => !affectedSet.has(String(i._id))));
                  onFileDelete(affectedIds);
                  socket.emit(itemType === "file" ? "file-deleted" : "folder-deleted", {
                    roomId,
                    itemId,
                    deletedIds: affectedIds
                  });

                  try {
                    await workspaceService.deleteWorkspaceItem(itemId);
                    fetchStorage();
                    toast.success(`Successfully deleted "${itemName}"`);
                  } catch (error) {
                    // Revert on network failure
                    setItems(prevItems);
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

      {/* Compact Room Storage Indicator Footer */}
      <div className="explorer-storage-footer">
        <div className="explorer-storage-info">
          <div className="storage-info-left">
            <HardDrive size={11} />
            <span>Storage</span>
          </div>
          <span className="storage-info-text">
            {((storageInfo.currentUsage || 0) / (1024 * 1024)).toFixed(1)} / 10 MB
          </span>
        </div>
        <div className="explorer-storage-track">
          <div
            className={`explorer-storage-fill ${storageInfo.percentage > 90 ? "danger" : storageInfo.percentage > 75 ? "warning" : ""}`}
            style={{ width: `${Math.min(100, storageInfo.percentage || 0)}%` }}
          />
        </div>
      </div>

      {/* Room-Aware File/Folder Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        roomId={roomId}
        roomLanguage={roomLanguage || room?.language || "javascript"}
        existingItems={items}
        onImportSuccess={() => {
          fetchWorkspace();
          fetchStorage();
        }}
      />
    </div>
  );
}
