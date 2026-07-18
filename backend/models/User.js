const mongoose=require("mongoose");
const MediaSchema = require("./Media");

const userSchema=new mongoose.Schema({

    username:{
        type:String,
        required:[true,"Username is required"],
        unique:true,
        trim:true,
        minlength:3,
        maxlength:30,
        index:true
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
    avatarMetadata:{
        type: MediaSchema,
        default: null
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
    reputationScore: {
        type: Number,
        default: 0
    },
    contributionScore: {
        type: Number,
        default: 0
    },
    developerLevel: {
        type: Number,
        default: 1
    },
    codingStreak: {
        type: Number,
        default: 0
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    projectsShared: {
        type: Number,
        default: 0
    },
    profileViews: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Available", "Busy", "Coding", "In Meeting"],
        default: "Available"
    },
    location: {
        type: String,
        default: ""
    },
    company: {
        type: String,
        default: ""
    },
    college: {
        type: String,
        default: ""
    },
    githubUrl: {
        type: String,
        default: ""
    },
    linkedinUrl: {
        type: String,
        default: ""
    },
    portfolioUrl: {
        type: String,
        default: ""
    },
    coverBanner: {
        type: String,
        default: ""
    },
    coverBannerMetadata: {
        type: MediaSchema,
        default: null
    },
    experience: {
        type: String,
        default: ""
    },
    interests: {
        type: [String],
        default: []
    },
    careerGoals: {
        type: String,
        default: ""
    },
    isSuspended:{
        type:Boolean,
        default:false
    },
    isVerified:{
        type:Boolean,
        default:true
    },
    blockedUsers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    accountStatus: {
        type: String,
        enum: ["Active", "Restricted", "Suspended", "Under Review", "Permanently Banned"],
        default: "Active"
    },
    accountHealth: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    guidelineStatus: {
        type: String,
        default: "Good Standing"
    },
    totalWarnings: {
        type: Number,
        default: 0
    },
    totalViolations: {
        type: Number,
        default: 0
    },
    appealStatus: {
        type: String,
        enum: ["None", "Pending", "Resolved"],
        default: "None"
    },
    lastReviewedDate: {
        type: Date,
        default: null
    },
    loginHistory: {
        type: [{
            loginTime: { type: Date, default: Date.now },
            logoutTime: { type: Date, default: null },
            ipAddress: { type: String, default: "" },
            userAgent: { type: String, default: "" }
        }],
        default: []
    },
    resetPasswordToken:String,
    resetPasswordExpire:Date,
    subscription: {
        plan: {
            type: String,
            enum: ["Free", "Developer Pro", "Elite Sponsor"],
            default: "Free"
        },
        status: {
            type: String,
            enum: ["active", "inactive", "expired", "pending"],
            default: "inactive"
        },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        paymentMethod: { type: String, default: "" },
        amountPaid: { type: Number, default: 0 },
        transactionId: { type: String, default: "" }
    },
    competitiveProgramming: {
        platforms: {
            leetcode: { 
                username: { type: String, default: "" }, 
                stats: { type: mongoose.Schema.Types.Mixed, default: null }, 
                lastSynced: { type: Date, default: null },
                syncStatus: { type: String, default: "Not Connected" },
                lastError: { type: String, default: "" }
            },
            codeforces: { 
                username: { type: String, default: "" }, 
                stats: { type: mongoose.Schema.Types.Mixed, default: null }, 
                lastSynced: { type: Date, default: null },
                syncStatus: { type: String, default: "Not Connected" },
                lastError: { type: String, default: "" }
            },
            codechef: { 
                username: { type: String, default: "" }, 
                stats: { type: mongoose.Schema.Types.Mixed, default: null }, 
                lastSynced: { type: Date, default: null },
                syncStatus: { type: String, default: "Not Connected" },
                lastError: { type: String, default: "" }
            },
            atcoder: { 
                username: { type: String, default: "" }, 
                stats: { type: mongoose.Schema.Types.Mixed, default: null }, 
                lastSynced: { type: Date, default: null },
                syncStatus: { type: String, default: "Not Connected" },
                lastError: { type: String, default: "" }
            },
            hackerrank: { 
                username: { type: String, default: "" }, 
                stats: { type: mongoose.Schema.Types.Mixed, default: null }, 
                lastSynced: { type: Date, default: null },
                syncStatus: { type: String, default: "Not Connected" },
                lastError: { type: String, default: "" }
            }
        },
        unifiedStats: { type: mongoose.Schema.Types.Mixed, default: null },
        lastUpdated: { type: Date, default: null }
    }
},{timestamps:true});

const User=mongoose.model("User",userSchema);

module.exports=User;