const express=require("express");
const auth_protect = require("../middleware/authMiddleware");
const { getMessage, deleteMessage } = require("../controllers/messageControllers");

const router=express.Router();

router.get("/:roomId",auth_protect,getMessage);
router.delete("/:messageId",auth_protect,deleteMessage);

module.exports=router;