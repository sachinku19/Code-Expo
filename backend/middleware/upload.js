const multer = require("multer");
const path = require("path");

// Use memory storage for Docker and ephemeral cloud compatibility
const storage = multer.memoryStorage();

// File type validation helper (supports both images and videos)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|mp4|webm|mov|avi|mkv/;
  
  // Verify MIME type
  const isMimeValid = /image\/jpeg|image\/png|image\/webp|video\/mp4|video\/webm|video\/quicktime|video\/x-msvideo|video\/x-matroska/.test(file.mimetype);
  
  // Verify extension name
  const isExtValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  if (isMimeValid && isExtValid) {
    return cb(null, true);
  }
  
  cb(new Error("Upload rejected: Unsupported file format! Only JPG, JPEG, PNG, WEBP images and MP4, WEBM, MOV, AVI, MKV videos are allowed."), false);
};

// Create the multer upload configurations (100MB limit for video posts)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

module.exports = upload;
