const multer = require("multer");
const path = require("path");

// Use memory storage for Docker and ephemeral cloud compatibility
const storage = multer.memoryStorage();

// File type validation helper
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  
  // Verify MIME type
  const isMimeValid = allowedExtensions.test(file.mimetype);
  
  // Verify extension name
  const isExtValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  if (isMimeValid && isExtValid) {
    return cb(null, true);
  }
  
  cb(new Error("Upload rejected: Only images of format .jpg, .jpeg, .png, or .webp are allowed!"), false);
};

// Create the multer upload configurations
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
