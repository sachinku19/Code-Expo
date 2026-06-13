const mongoose=require("mongoose");
const Message=require("../models/Message");
const Room=require("../models/Room");


const getMessage=async(req,res)=>{

    try{

        const {roomId}=req.params;

        const message=await Message.find({roomId})
          .populate("sender", "username email avatar")
          .sort({createdAt:1});

        res.status(200).json({
            success:true,
            message
        });
    }catch(error){
        res.status(500).json({
            success:false,
            message:error.message
        });
    }
}

const deleteMessage=async(req,res)=>{
    try{
        const {messageId}=req.params;
        const message=await Message.findById(messageId);
        if(!message){
            return res.status(404).json({
                success:false,
                message:"Message not found"
            });
        }

        const room=await Room.findOne({roomId: message.roomId});
        if(!room){
            return res.status(404).json({
                success:false,
                message:"Room not found"
            });
        }

        const isMessageSender = message.sender.toString() === req.user._id.toString();
        const isRoomOwner = room.createdBy.toString() === req.user._id.toString();

        if(!isMessageSender && !isRoomOwner){
            return res.status(403).json({
                success:false,
                message:"Unauthorized to delete this message"
            });
        }

        await Message.findByIdAndDelete(messageId);

        res.status(200).json({
            success:true,
            message:"Message deleted successfully"
        });
    }catch(error){
        res.status(500).json({
            success:false,
            message:error.message
        });
    }
}

module.exports={
    getMessage,
    deleteMessage
}