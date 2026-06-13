const express=require("express");
const { registerUser, loginUser, my_profile, totalUser,logoutUser, changePassword, getPublicStats, googleLogin, getGoogleConfig } = require("../controllers/authControllers");
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
router.put("/logout", auth_protect, logoutUser);
router.put("/change-password", auth_protect, changePassword);



module.exports=router;