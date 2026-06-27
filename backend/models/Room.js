const mongoose=require("mongoose");


const roomSchema=new mongoose.Schema({

    roomId: {
            type: String,
            required: true,
            unique: true
        },
    
    title: {
            type: String,
            required: true,
            trim: true
        },
    
    language: {
            type: String,
            default:"javascript"
        },
    
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    
    participants:[
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            role: {
                type: String,
                enum: ["OWNER", "MODERATOR", "MEMBER", "VIEWER"],
                default: "MEMBER"
            },
            isMuted: {
                type: Boolean,
                default: false
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],

    code:{
        type:String,
        default:""
    },

    isPrivate:{
        type:Boolean,
        default:false
    },

    whiteboardData:{
        type:String,
        default:"[]"
    },

    lastActivity:{
        type:Date,
        default:Date.now
    },
    pendingRequests: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            username: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    rejectedRequests: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            username: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
},{timestamps:true});

const Room=mongoose.model("Room",roomSchema);

module.exports=Room;