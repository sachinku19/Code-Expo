const fs = require("fs");
const path = require("path");
const WorkspaceItem = require("../models/WorkspaceItem");
const Room = require("../models/Room");
const { logActivity } = require("../controllers/activityControllers");
const {
  MAX_ROOM_STORAGE,
  MAX_FILES_PER_IMPORT,
  MAX_SINGLE_FILE_SIZE,
  normalizeRoomLanguage,
  isExcludedPath,
  isSensitiveFile,
  sanitizeRelativePath,
  isExtensionSupported,
  isImageExtension,
  getImageMimeType,
  validateImageMagicBytes
} = require("../utils/importRules");

/**
 * Helper to determine file language mode from extension
 */
function getLanguageFromExtension(fileName, roomLanguage) {
  const ext = path.extname(fileName).toLowerCase();
  const extMap = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".json": "json",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".py": "python",
    ".pyw": "python",
    ".txt": "text",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".c": "c",
    ".h": "cpp",
    ".hpp": "cpp",
    ".java": "java",
    ".properties": "properties",
    ".xml": "xml",
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image"
  };
  return extMap[ext] || roomLanguage || "javascript";
}

/**
 * 1. Calculate Authoritative Room Storage Usage
 * Computes exact UTF-8 byte length for code files and byte size for binary assets.
 */
async function calculateRoomStorage(roomId) {
  const files = await WorkspaceItem.find({ roomId, type: "file" }).select("content size fileType");
  let currentUsage = 0;

  for (const f of files) {
    if (f.fileType === "asset" && f.size) {
      currentUsage += f.size;
    } else if (f.content) {
      currentUsage += Buffer.byteLength(f.content, "utf8");
    } else if (f.size) {
      currentUsage += f.size;
    }
  }

  const availableStorage = Math.max(0, MAX_ROOM_STORAGE - currentUsage);
  const percentage = Math.min(100, (currentUsage / MAX_ROOM_STORAGE) * 100);

  return {
    currentUsage, // in bytes
    maxStorage: MAX_ROOM_STORAGE, // 10 MB (10,485,760 bytes)
    availableStorage,
    percentage: Number(percentage.toFixed(1)),
    fileCount: files.length
  };
}

/**
 * 2. Validate Import Batch (Pre-flight check for UI and client preview)
 */
async function validateImportBatch(roomId, roomLanguage, files, user, room) {
  const normalizedLanguage = normalizeRoomLanguage(roomLanguage || room.language);
  const storageInfo = await calculateRoomStorage(roomId);

  if (files.length > MAX_FILES_PER_IMPORT) {
    return {
      isValid: false,
      error: `Cannot import more than ${MAX_FILES_PER_IMPORT} files in a single import operation.`
    };
  }

  // Fetch all existing workspace items for duplicate matching
  const existingItems = await WorkspaceItem.find({ roomId });
  
  // Build a lookup map of existing paths: "folderPath/fileName" => item
  const existingMap = new Map();
  const folderIdToPath = new Map();

  // Helper to resolve folder path recursively
  const getFolderPath = (folderId) => {
    if (!folderId) return "";
    if (folderIdToPath.has(String(folderId))) return folderIdToPath.get(String(folderId));
    const folder = existingItems.find((i) => String(i._id) === String(folderId));
    if (!folder) return "";
    const parentP = getFolderPath(folder.parentId);
    const fullP = parentP ? `${parentP}/${folder.name}` : folder.name;
    folderIdToPath.set(String(folderId), fullP);
    return fullP;
  };

  for (const item of existingItems) {
    if (item.type === "file") {
      const folderP = getFolderPath(item.parentId);
      const fullP = folderP ? `${folderP}/${item.name}` : item.name;
      existingMap.set(fullP.toLowerCase(), item);
    }
  }

  const readyFiles = [];
  const unsupportedFiles = [];
  const excludedFiles = [];
  const blockedFiles = [];
  const duplicateFiles = [];

  let batchImportSize = 0;

  for (const file of files) {
    const rawPath = file.relativePath || file.name || "";
    const rawContent = file.content || "";
    const fileSize = typeof file.size === "number" ? file.size : Buffer.byteLength(rawContent, "utf8");

    // Check single file safety ceiling
    if (fileSize > MAX_SINGLE_FILE_SIZE) {
      blockedFiles.push({
        name: file.name,
        path: rawPath,
        size: fileSize,
        reason: "File exceeds single-file safety limit of 10 MB."
      });
      continue;
    }

    // A. Check Excluded paths (node_modules, .git, etc.)
    const excludedCheck = isExcludedPath(rawPath);
    if (excludedCheck.isExcluded) {
      excludedFiles.push({
        name: file.name,
        path: rawPath,
        size: fileSize,
        reason: excludedCheck.reason
      });
      continue;
    }

    // B. Sanitize path & Traversal Check
    const pathCheck = sanitizeRelativePath(rawPath);
    if (!pathCheck.isValid) {
      blockedFiles.push({
        name: file.name,
        path: rawPath,
        size: fileSize,
        reason: pathCheck.error
      });
      continue;
    }

    // C. Check Sensitive Files & Secrets
    const sensitiveCheck = isSensitiveFile(pathCheck.fileName, pathCheck.cleanPath, rawContent);
    if (sensitiveCheck.isSensitive) {
      blockedFiles.push({
        name: pathCheck.fileName,
        path: pathCheck.cleanPath,
        size: fileSize,
        reason: sensitiveCheck.reason
      });
      continue;
    }

    // D. Check Room-Type Extension Support
    const extCheck = isExtensionSupported(pathCheck.fileName, normalizedLanguage);
    if (!extCheck.isSupported) {
      unsupportedFiles.push({
        name: pathCheck.fileName,
        path: pathCheck.cleanPath,
        size: fileSize,
        extension: extCheck.extension,
        reason: extCheck.reason
      });
      continue;
    }

    // D2. Magic Bytes Validation for Binary Image Files
    const isImage = isImageExtension(pathCheck.fileName);
    if (isImage && file.buffer) {
      const magicCheck = validateImageMagicBytes(file.buffer, extCheck.extension);
      if (!magicCheck.valid) {
        blockedFiles.push({
          name: pathCheck.fileName,
          path: pathCheck.cleanPath,
          size: fileSize,
          reason: magicCheck.reason
        });
        continue;
      }
    }

    // E. Check for Existing Duplicates
    const cleanLower = pathCheck.cleanPath.toLowerCase();
    const existingFile = existingMap.get(cleanLower);

    if (existingFile) {
      duplicateFiles.push({
        name: pathCheck.fileName,
        path: pathCheck.cleanPath,
        size: fileSize,
        existingId: existingFile._id,
        existingCreatedBy: existingFile.createdBy
      });
    }

    readyFiles.push({
      name: pathCheck.fileName,
      path: pathCheck.cleanPath,
      folderPath: pathCheck.folderPath,
      folderSegments: pathCheck.folderSegments,
      size: fileSize,
      content: rawContent,
      buffer: file.buffer,
      isImage,
      isDuplicate: !!existingFile
    });

    batchImportSize += fileSize;
  }

  const projectedUsage = storageInfo.currentUsage + batchImportSize;
  const isStorageExceeded = projectedUsage > MAX_ROOM_STORAGE;

  return {
    isValid: !isStorageExceeded,
    roomLanguage: normalizedLanguage,
    currentUsage: storageInfo.currentUsage,
    batchImportSize,
    projectedUsage,
    maxStorage: MAX_ROOM_STORAGE,
    availableStorage: storageInfo.availableStorage,
    isStorageExceeded,
    readyCount: readyFiles.length,
    unsupportedCount: unsupportedFiles.length,
    excludedCount: excludedFiles.length,
    blockedCount: blockedFiles.length,
    duplicateCount: duplicateFiles.length,
    readyFiles,
    unsupportedFiles,
    excludedFiles,
    blockedFiles,
    duplicateFiles
  };
}

/**
 * 3. Helper: Recursively get or create a folder path within a room
 */
async function resolveOrCreateFolderPath(roomId, folderSegments, userId) {
  if (!folderSegments || folderSegments.length === 0) {
    return null; // Root level
  }

  let currentParentId = null;

  for (const segmentName of folderSegments) {
    let folder = await WorkspaceItem.findOne({
      roomId,
      parentId: currentParentId,
      name: segmentName,
      type: "folder"
    });

    if (!folder) {
      folder = await WorkspaceItem.create({
        roomId,
        name: segmentName,
        type: "folder",
        parentId: currentParentId,
        createdBy: userId
      });
    }

    currentParentId = folder._id;
  }

  return currentParentId;
}

/**
 * Helper to generate a unique filename in a directory if renaming
 */
async function generateUniqueFilename(roomId, parentId, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  let counter = 1;
  let candidateName = `${base}_${counter}${ext}`;

  while (await WorkspaceItem.findOne({ roomId, parentId, name: candidateName })) {
    counter++;
    candidateName = `${base}_${counter}${ext}`;
  }

  return candidateName;
}

/**
 * 4. Execute Import Batch
 * Performs atomic room storage check, permission validation, duplicate resolution,
 * disk asset persistence, and database insertion.
 */
async function executeImportBatch(roomId, roomLanguage, files, duplicateResolutions = {}, user, room) {
  const normalizedLanguage = normalizeRoomLanguage(roomLanguage || room.language);

  // Permission check: Viewers cannot import
  const participant = room.participants.find(
    (p) => p.user && p.user.toString() === user._id.toString()
  );
  const isOwner = room.createdBy.toString() === user._id.toString();
  const userRole = isOwner ? "OWNER" : participant?.role || "MEMBER";

  if (userRole === "VIEWER") {
    const error = new Error("Viewers do not have permission to import files into this room.");
    error.statusCode = 403;
    throw error;
  }

  // Pre-validate batch
  const validation = await validateImportBatch(roomId, normalizedLanguage, files, user, room);

  if (validation.readyFiles.length === 0) {
    const error = new Error("No valid, supported files found to import.");
    error.statusCode = 400;
    throw error;
  }

  // Re-calculate live room storage right before writing
  const storageInfo = await calculateRoomStorage(roomId);
  let liveUsage = storageInfo.currentUsage;

  const importedItems = [];
  const skippedItems = [];
  const replacedItems = [];
  const renamedItems = [];

  // Prepare asset directory for room binary assets
  const assetDir = path.join(__dirname, "../uploads/workspace_assets", roomId);
  if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
  }

  for (const file of validation.readyFiles) {
    const resolution = duplicateResolutions[file.path] || "skip"; // Default: skip
    const isImage = isImageExtension(file.name);
    const mimeType = isImage ? getImageMimeType(path.extname(file.name)) : null;

    // Extract binary buffer for images
    let buffer = file.buffer;
    if (isImage && !buffer && file.content) {
      try {
        const base64Data = file.content.replace(/^data:image\/[a-z]+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      } catch (e) {
        buffer = Buffer.alloc(0);
      }
    }
    const fileSize = isImage && buffer ? buffer.length : (file.size || Buffer.byteLength(file.content || "", "utf8"));

    // Resolve parent folder structure
    const parentId = await resolveOrCreateFolderPath(roomId, file.folderSegments, user._id);

    // Check if an item already exists with this name in the target folder
    const existing = await WorkspaceItem.findOne({
      roomId,
      parentId,
      name: file.name,
      type: "file"
    });

    if (existing) {
      if (resolution === "skip") {
        skippedItems.push({ name: file.name, path: file.path });
        continue;
      }

      if (resolution === "replace") {
        // Verify replace permission
        const canReplace =
          userRole === "OWNER" ||
          userRole === "MODERATOR" ||
          (userRole === "MEMBER" && existing.createdBy.toString() === user._id.toString());

        if (!canReplace) {
          const error = new Error(`Permission denied: You cannot overwrite "${file.name}" created by another member.`);
          error.statusCode = 403;
          throw error;
        }

        // Compute size delta
        const oldSize = existing.fileType === "asset" && existing.size
          ? existing.size
          : Buffer.byteLength(existing.content || "", "utf8");
        const sizeDelta = fileSize - oldSize;

        if (liveUsage + sizeDelta > MAX_ROOM_STORAGE) {
          const error = new Error(
            `Room storage limit exceeded. Overwriting "${file.name}" would exceed the 10 MB workspace limit.`
          );
          error.statusCode = 400;
          throw error;
        }

        // Save physical asset if image
        let storageKey = existing.storageKey;
        if (isImage && buffer) {
          if (storageKey) {
            const oldPath = path.join(__dirname, "../uploads/workspace_assets", storageKey);
            if (fs.existsSync(oldPath)) {
              try { fs.unlinkSync(oldPath); } catch (e) {}
            }
          }
          const storageFilename = `${Date.now()}_${path.basename(file.name)}`;
          storageKey = `${roomId}/${storageFilename}`;
          const targetDiskPath = path.join(assetDir, storageFilename);
          fs.writeFileSync(targetDiskPath, buffer);
        }

        existing.content = isImage && buffer ? `data:${mimeType};base64,${buffer.toString("base64")}` : (file.content || "");
        existing.language = isImage ? "image" : getLanguageFromExtension(file.name, normalizedLanguage);
        existing.fileType = isImage ? "asset" : "code";
        existing.mimeType = mimeType;
        existing.size = fileSize;
        existing.storageKey = storageKey;
        existing.assetUrl = isImage ? `/api/workspace/${roomId}/assets/${existing._id}` : null;
        await existing.save();

        liveUsage += sizeDelta;
        replacedItems.push(existing);
        importedItems.push(existing);
        continue;
      }

      if (resolution === "rename") {
        const uniqueName = await generateUniqueFilename(roomId, parentId, file.name);

        if (liveUsage + fileSize > MAX_ROOM_STORAGE) {
          const error = new Error(
            `Room storage limit exceeded. Importing "${uniqueName}" would exceed the 10 MB workspace limit.`
          );
          error.statusCode = 400;
          throw error;
        }

        let storageKey = null;
        if (isImage && buffer) {
          const storageFilename = `${Date.now()}_${path.basename(uniqueName)}`;
          storageKey = `${roomId}/${storageFilename}`;
          const targetDiskPath = path.join(assetDir, storageFilename);
          fs.writeFileSync(targetDiskPath, buffer);
        }

        const newItem = new WorkspaceItem({
          roomId,
          name: uniqueName,
          type: "file",
          fileType: isImage ? "asset" : "code",
          parentId,
          content: isImage && buffer ? `data:${mimeType};base64,${buffer.toString("base64")}` : (file.content || ""),
          mimeType,
          size: fileSize,
          storageKey,
          language: isImage ? "image" : getLanguageFromExtension(uniqueName, normalizedLanguage),
          createdBy: user._id
        });
        newItem.assetUrl = isImage ? `/api/workspace/${roomId}/assets/${newItem._id}` : null;
        await newItem.save();

        liveUsage += fileSize;
        renamedItems.push(newItem);
        importedItems.push(newItem);
        continue;
      }
    }

    // Fresh new file import
    if (liveUsage + fileSize > MAX_ROOM_STORAGE) {
      const error = new Error(
        `Room storage limit exceeded. Importing "${file.name}" would exceed the 10 MB workspace limit. Available: ${((MAX_ROOM_STORAGE - liveUsage) / (1024 * 1024)).toFixed(2)} MB`
      );
      error.statusCode = 400;
      throw error;
    }

    let storageKey = null;
    if (isImage && buffer) {
      const storageFilename = `${Date.now()}_${path.basename(file.name)}`;
      storageKey = `${roomId}/${storageFilename}`;
      const targetDiskPath = path.join(assetDir, storageFilename);
      fs.writeFileSync(targetDiskPath, buffer);
    }

    const newItem = new WorkspaceItem({
      roomId,
      name: file.name,
      type: "file",
      fileType: isImage ? "asset" : "code",
      parentId,
      content: isImage && buffer ? `data:${mimeType};base64,${buffer.toString("base64")}` : (file.content || ""),
      mimeType,
      size: fileSize,
      storageKey,
      language: isImage ? "image" : getLanguageFromExtension(file.name, normalizedLanguage),
      createdBy: user._id
    });
    newItem.assetUrl = isImage ? `/api/workspace/${roomId}/assets/${newItem._id}` : null;
    await newItem.save();

    liveUsage += fileSize;
    importedItems.push(newItem);
  }

  // Update room last activity & log audit
  room.lastActivity = Date.now();
  await room.save();

  if (importedItems.length > 0) {
    await logActivity(
      user._id,
      user.username,
      room._id,
      room.title,
      `imported ${importedItems.length} files into workspace`
    );
  }

  const finalStorage = await calculateRoomStorage(roomId);

  return {
    success: true,
    message: `Successfully imported ${importedItems.length} file(s).`,
    importedCount: importedItems.length,
    skippedCount: skippedItems.length,
    replacedCount: replacedItems.length,
    renamedCount: renamedItems.length,
    importedItems,
    storage: finalStorage
  };
}

module.exports = {
  calculateRoomStorage,
  validateImportBatch,
  executeImportBatch,
  getLanguageFromExtension
};
