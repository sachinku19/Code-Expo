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
  editDirectMessage,
  createGroupChat,
  blockUser,
  unblockUser,
  deleteGroupChat,
  addGroupMember,
  removeGroupMember
} = require("../controllers/directMessageControllers");

const router = express.Router();

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedExtensions.test(file.mimetype);
  const isExtValid = allowedExtensions.test(ext);
  
  if (isMimeValid && isExtValid) {
    return cb(null, true);
  }
  cb(new Error("Upload rejected: Only image files (jpg, jpeg, png, webp) are allowed!"), false);
};

const uploadImage = multer({
  storage: storage,
  fileFilter: imageFileFilter,
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
    uploadImage.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  sendDirectMessageAttachment
);

router.post(
  "/group/create",
  auth_protect,
  (req, res, next) => {
    uploadImage.single("avatar")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  createGroupChat
);

router.delete("/delete/:messageId", auth_protect, deleteDirectMessage);
router.put("/edit/:messageId", auth_protect, editDirectMessage);

router.delete("/group/:groupId", auth_protect, deleteGroupChat);
router.post("/group/:groupId/members/add", auth_protect, addGroupMember);
router.post("/group/:groupId/members/remove", auth_protect, removeGroupMember);
router.post("/block/:userId", auth_protect, blockUser);
router.post("/unblock/:userId", auth_protect, unblockUser);

module.exports = router;
