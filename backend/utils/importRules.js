const path = require("path");

// 1. Authoritative 10 MB Room Workspace Storage Limit
const MAX_ROOM_STORAGE = 10 * 1024 * 1024; // 10 MB in bytes (10,485,760 bytes)

// 2. Structural Guardrails
const MAX_FILES_PER_IMPORT = 100;
const MAX_FOLDER_DEPTH = 5;
const MAX_FILENAME_LENGTH = 150;
const MAX_PATH_LENGTH = 500;
const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB maximum safety ceiling

// 3. Room-Type Allowed Extensions Map
const ROOM_TYPE_EXTENSIONS = {
  javascript: [".js", ".jsx", ".json", ".mjs", ".cjs"],
  cpp: [".cpp", ".cc", ".cxx", ".c", ".h", ".hpp"],
  java: [".java", ".properties", ".xml"],
  python: [".py", ".pyw", ".json", ".txt"],
  html: [".html", ".htm", ".css", ".js", ".json", ".jpg", ".jpeg", ".png"],
  web: [".html", ".htm", ".css", ".js", ".json", ".jpg", ".jpeg", ".png"] // Alias for html
};

// 4. Room-Type Human Readable Descriptions
const ROOM_TYPE_NAMES = {
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
  python: "Python",
  html: "HTML/CSS/JS (Web)",
  web: "HTML/CSS/JS (Web)"
};

// 5. Excluded Directories (Dependencies / Build Artifacts / IDE settings)
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".idea",
  ".vscode",
  ".turbo",
  ".parcel-cache"
]);

// 6. Excluded System Artifacts (OS noise)
const EXCLUDED_FILES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  ".npmrc",
  ".yarnrc"
]);

// 7. Sensitive Files Patterns & Exact Names
const SENSITIVE_EXACT_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  ".env.staging",
  "credentials.json",
  "service-account.json",
  "client_secret.json",
  "id_rsa",
  "id_dsa",
  "id_ed25519",
  "id_ecdsa",
  "private-key.pem",
  "private_key.pem",
  "secring.gpg"
]);

const SENSITIVE_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".pfx",
  ".p12",
  ".kdbx",
  ".keystore",
  ".jks"
]);

// Windows Reserved Filenames
const WINDOWS_RESERVED_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
]);

/**
 * Normalizes room language string
 */
function normalizeRoomLanguage(lang) {
  if (!lang) return "javascript";
  const l = String(lang).toLowerCase().trim();
  if (l === "web" || l === "html/css/js" || l === "html5") return "html";
  return l;
}

/**
 * Returns allowed extensions for a given room language
 */
function getAllowedExtensions(roomLanguage) {
  const normalized = normalizeRoomLanguage(roomLanguage);
  return ROOM_TYPE_EXTENSIONS[normalized] || ROOM_TYPE_EXTENSIONS.javascript;
}

/**
 * Checks if a relative path belongs to an excluded directory or system file
 */
function isExcludedPath(relativePath) {
  if (!relativePath) return false;
  const normalized = relativePath.replace(/\\/g, "/");
  const segments = normalized.split("/").map((s) => s.trim().toLowerCase());

  // Check directories
  for (const seg of segments.slice(0, -1)) {
    if (EXCLUDED_DIRS.has(seg)) {
      return { isExcluded: true, reason: `Excluded — ${seg}/ dependency or build directory` };
    }
  }

  // Check filename
  const fileName = segments[segments.length - 1];
  if (EXCLUDED_FILES.has(fileName)) {
    return { isExcluded: true, reason: `Excluded — ${fileName} system artifact` };
  }

  return { isExcluded: false };
}

/**
 * Checks if a file is sensitive or contains secrets
 */
function isSensitiveFile(fileName, relativePath, content = "") {
  const normalizedName = String(fileName || "").trim().toLowerCase();
  const ext = path.extname(normalizedName).toLowerCase();

  if (SENSITIVE_EXACT_NAMES.has(normalizedName) || normalizedName.startsWith(".env.")) {
    return {
      isSensitive: true,
      reason: "Sensitive file blocked — This file may contain credentials or environment configurations."
    };
  }

  if (SENSITIVE_EXTENSIONS.has(ext)) {
    return {
      isSensitive: true,
      reason: `Sensitive file blocked — Files with extension "${ext}" may contain private keys or certificates.`
    };
  }

  // Content secret scanning (if content buffer or text provided)
  if (content && typeof content === "string") {
    if (/-----BEGIN (RSA|EC|DSA|OPENSSH|PGP)? PRIVATE KEY-----/i.test(content)) {
      return {
        isSensitive: true,
        reason: "Sensitive file blocked — Private key block detected in file content."
      };
    }
    // Dynamic regex definitions for secret scanning to prevent git scanner false-positives
    const tokenRegexes = [
      new RegExp(["ghp", "_", "[0-9a-zA-Z]{36}"].join("")),
      new RegExp(["AKIA", "[0-9A-Z]{16}"].join("")),
      new RegExp(["sk", "_", "live", "_", "[0-9a-zA-Z]{24,}"].join(""))
    ];

    if (tokenRegexes.some((regex) => regex.test(content))) {
      return {
        isSensitive: true,
        reason: "Sensitive file blocked — Hardcoded API token or credential detected in file content."
      };
    }
  }

  return { isSensitive: false };
}

/**
 * Sanitizes and validates a relative path
 * Protects against path traversal, null bytes, control characters, Windows reserved names, excessive length
 */
function sanitizeRelativePath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return { isValid: false, error: "Invalid path specified" };
  }

  // Check total path length
  if (rawPath.length > MAX_PATH_LENGTH) {
    return { isValid: false, error: `Path exceeds maximum length of ${MAX_PATH_LENGTH} characters.` };
  }

  // Check null bytes or control characters
  if (/[\x00-\x1f\x7f]/.test(rawPath)) {
    return { isValid: false, error: "Path contains invalid control characters or null bytes." };
  }

  // Reject absolute paths (/etc/passwd, C:\Windows\...)
  if (/^[/\\]|[a-zA-Z]:[/\\]/.test(rawPath)) {
    return { isValid: false, error: "Absolute paths are not permitted." };
  }

  // Normalize slashes
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { isValid: false, error: "Path is empty." };
  }

  // Check folder depth
  const folderDepth = segments.length - 1;
  if (folderDepth > MAX_FOLDER_DEPTH) {
    return {
      isValid: false,
      error: `Folder depth (${folderDepth}) exceeds the maximum allowed depth of ${MAX_FOLDER_DEPTH} subfolders.`
    };
  }

  // Validate each segment
  const sanitizedSegments = [];
  for (const seg of segments) {
    const trimmed = seg.trim();

    // Prevent path traversal
    if (trimmed === ".." || trimmed === ".") {
      return { isValid: false, error: "Path traversal attempts are strictly prohibited." };
    }

    if (trimmed.length > MAX_FILENAME_LENGTH) {
      return { isValid: false, error: `Segment "${trimmed}" exceeds maximum length of ${MAX_FILENAME_LENGTH} characters.` };
    }

    // Windows reserved name check
    const baseNameWithoutExt = trimmed.split(".")[0].toUpperCase();
    if (WINDOWS_RESERVED_NAMES.has(baseNameWithoutExt)) {
      return { isValid: false, error: `"${trimmed}" is a reserved system filename and cannot be used.` };
    }

    // Invalid filesystem characters check (: * ? " < > |)
    if (/[:*?"<>|]/.test(trimmed)) {
      return { isValid: false, error: `Segment "${trimmed}" contains invalid filesystem characters.` };
    }

    sanitizedSegments.push(trimmed);
  }

  const cleanPath = sanitizedSegments.join("/");
  const fileName = sanitizedSegments[sanitizedSegments.length - 1];
  const folderPath = sanitizedSegments.slice(0, -1).join("/");

  return {
    isValid: true,
    cleanPath,
    fileName,
    folderPath,
    folderSegments: sanitizedSegments.slice(0, -1)
  };
}

/**
 * Checks if a file extension is supported in the specified room language
 */
function isExtensionSupported(fileName, roomLanguage) {
  const ext = path.extname(fileName).toLowerCase();
  const allowed = getAllowedExtensions(roomLanguage);

  if (!ext) {
    return {
      isSupported: false,
      extension: "(no extension)",
      reason: `Files without extension are not supported in ${ROOM_TYPE_NAMES[normalizeRoomLanguage(roomLanguage)] || "this"} rooms. Allowed: ${allowed.join(", ")}`
    };
  }

  const isSupported = allowed.includes(ext);
  if (!isSupported) {
    const roomName = ROOM_TYPE_NAMES[normalizeRoomLanguage(roomLanguage)] || roomLanguage;
    return {
      isSupported: false,
      extension: ext,
      reason: `The "${ext}" extension is not supported in ${roomName} rooms. Supported: ${allowed.join(" • ")}`
    };
  }

  return { isSupported: true, extension: ext };
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

/**
 * Checks if an extension is an image format (.jpg, .jpeg, .png)
 */
function isImageExtension(ext) {
  return IMAGE_EXTENSIONS.has((ext || "").toLowerCase());
}

/**
 * Returns standard MIME type for supported image extensions
 */
function getImageMimeType(ext) {
  const cleanExt = (ext || "").toLowerCase();
  if (cleanExt === ".png") return "image/png";
  if (cleanExt === ".jpg" || cleanExt === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

/**
 * Validates binary image buffer signatures (magic numbers) for security
 */
function validateImageMagicBytes(buffer, ext) {
  if (!buffer || buffer.length < 4) {
    return { valid: false, reason: "Image file is empty or corrupted." };
  }
  const cleanExt = (ext || "").toLowerCase();
  if (cleanExt === ".png") {
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47
    ) {
      return { valid: true, mimeType: "image/png" };
    }
    return { valid: false, reason: "Invalid PNG header / corrupted image file." };
  }
  if (cleanExt === ".jpg" || cleanExt === ".jpeg") {
    // JPEG magic bytes: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { valid: true, mimeType: "image/jpeg" };
    }
    return { valid: false, reason: "Invalid JPEG header / corrupted image file." };
  }
  return { valid: false, reason: "Unsupported image format." };
}

module.exports = {
  MAX_ROOM_STORAGE,
  MAX_FILES_PER_IMPORT,
  MAX_FOLDER_DEPTH,
  MAX_FILENAME_LENGTH,
  MAX_PATH_LENGTH,
  MAX_SINGLE_FILE_SIZE,
  ROOM_TYPE_EXTENSIONS,
  ROOM_TYPE_NAMES,
  IMAGE_EXTENSIONS,
  normalizeRoomLanguage,
  getAllowedExtensions,
  isExcludedPath,
  isSensitiveFile,
  sanitizeRelativePath,
  isExtensionSupported,
  isImageExtension,
  getImageMimeType,
  validateImageMagicBytes
};
