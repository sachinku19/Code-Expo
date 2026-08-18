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

    description:{
        type:String,
        trim:true,
        maxlength:1000,
        default:""
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
    ],
    kickedUsers: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            username: String,
            kickedAt: { type: Date, default: Date.now }
        }
    ]
},{timestamps:true});

// Performance indexes for fast room list queries
roomSchema.index({ isPrivate: 1, createdAt: -1 });
roomSchema.index({ createdBy: 1, updatedAt: -1 });
roomSchema.index({ "participants.user": 1, updatedAt: -1 });
roomSchema.index({ lastActivity: -1 });
roomSchema.index({ likes: 1 });
roomSchema.index({ "pendingRequests.user": 1 });
roomSchema.index({ "rejectedRequests.user": 1 });

const Room=mongoose.model("Room",roomSchema);

module.exports=Room;