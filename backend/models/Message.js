const mongoose=require("mongoose");

const messageSchema=new mongoose.Schema({

    roomId:{
        type:String,
        required:true
    },

    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    username:{
        type:String,
        required:true
    },
    message:{
        type:String,
        required:true,
        trim:true
    }
},{timestamps:true});

const Message=mongoose.model("Message",messageSchema);

module.exports=Message;