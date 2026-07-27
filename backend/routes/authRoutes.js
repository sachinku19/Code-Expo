const express=require("express");
const { registerUser, loginUser, my_profile, totalUser,logoutUser, changePassword, getPublicStats, getPublicDevelopers, getPublicUserProfile, googleLogin, getGoogleConfig, forgotPassword, resetPassword } = require("../controllers/authControllers");
const auth_protect = require("../middleware/authMiddleware");

//make router
const router=express.Router();

//router operation
router.post("/register",registerUser);
router.post("/login",loginUser);
router.post("/google",googleLogin);
router.get("/google-config",getGoogleConfig);
router.get("/profile",auth_protect,my_profile);
router.get("/userCount", totalUser);
router.get("/public-stats", getPublicStats);
router.get("/public-developers", getPublicDevelopers);
router.get("/user-profile/:username", getPublicUserProfile);
router.put("/logout", auth_protect, logoutUser);
router.put("/change-password", auth_protect, changePassword);

// Email Verification & Password Reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports=router;