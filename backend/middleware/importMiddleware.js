const multer = require("multer");
const { MAX_ROOM_STORAGE, MAX_FILES_PER_IMPORT } = require("../utils/importRules");

// Memory storage keeps files securely in memory buffer during validation
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_ROOM_STORAGE, // 10 MB per-file safety limit
    files: MAX_FILES_PER_IMPORT, // 100 files max per request
    fields: 10,
    fieldSize: 1 * 1024 * 1024 // 1 MB max for metadata fields
  }
});

// Middleware for parsing multipart file uploads with graceful error handling
const handleImportUpload = (req, res, next) => {
  const uploadHandler = upload.array("files", MAX_FILES_PER_IMPORT);

  uploadHandler(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "One or more files exceed the 10 MB individual safety limit."
        });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: `Cannot upload more than ${MAX_FILES_PER_IMPORT} files in a single import operation.`
        });
      }
      return res.status(400).json({
        success: false,
        message: "Invalid file upload format."
      });
    }

    return res.status(400).json({
      success: false,
      message: "An error occurred during file upload."
    });
  });
};

// Simple in-memory rate limiter for import endpoints (15 imports per minute per user/IP)
const importRateLimitMap = new Map();

const importRateLimiter = (req, res, next) => {
  const identifier = req.user ? String(req.user._id) : req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  const record = importRateLimitMap.get(identifier) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count++;
  importRateLimitMap.set(identifier, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many import requests. Please wait a moment before importing again."
    });
  }

  next();
};

module.exports = {
  handleImportUpload,
  importRateLimiter
};
