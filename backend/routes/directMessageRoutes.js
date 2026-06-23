const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const {
  getConversations,
  getChatHistory,
  sendDirectMessage,
  sendDirectMessageAttachment,
  deleteDirectMessage,
  editDirectMessage
} = require("../controllers/directMessageControllers");

const router = express.Router();

const storage = multer.memoryStorage();

const attachmentFileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedExtensions.test(file.mimetype) || file.mimetype === "application/pdf";
  const isExtValid = allowedExtensions.test(ext);
  
  if (isMimeValid && isExtValid) {
    return cb(null, true);
  }
  cb(new Error("Upload rejected: Only images (jpg, jpeg, png, webp) and PDFs (.pdf) are allowed!"), false);
};

const uploadAttachment = multer({
  storage: storage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.get("/conversations", auth_protect, getConversations);
router.get("/chat/:userId", auth_protect, getChatHistory);
router.post("/send", auth_protect, sendDirectMessage);

router.post(
  "/send-attachment",
  auth_protect,
  (req, res, next) => {
    uploadAttachment.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  sendDirectMessageAttachment
);

router.delete("/delete/:messageId", auth_protect, deleteDirectMessage);
router.put("/edit/:messageId", auth_protect, editDirectMessage);

module.exports = router;
