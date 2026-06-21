const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({

    username:{
        type:String,
        required:[true,"Username is required"],
        trim:true,
        minlength:3,
        maxlength:30
    },
    email:{
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        index:true //for faster searching
    },
    password:{
        type:String,
        required: function() {
            return !this.googleId;
        },
        minlength:6
    },
    googleId:{
        type:String,
        default:""
    },

    avatar:{
        type:String,
        default:""
    },
    role:{
        type:String,
        enum:["user","admin"],
        default:"user"
    },
    isOnline:{
        type:String,
        default:false
    },
    lastSeene:{
        type:Date,
        default:Date.now
    },
    bio:{
        type:String,
        default:""
    },
    followersCount:{
        type:Number,
        default:0
    },
    followingCount:{
        type:Number,
        default:0
    },
    codingHours:{
        type:Number,
        default:0
    },
    programmingLanguages:{
        type:[String],
        default:[]
    },
    executionsCount:{
        type:Number,
        default:0
    },
    title:{
        type:String,
        default:"Developer"
    },
    isSuspended:{
        type:Boolean,
        default:false
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    verificationToken:String,
    verificationTokenExpire:Date,
    resetPasswordToken:String,
    resetPasswordExpire:Date
},{timestamps:true});

const User=mongoose.model("User",userSchema);

module.exports=User;