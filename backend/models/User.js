const mongoose=require("mongoose");

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
    resetPasswordToken:String,
    resetPasswordExpire:Date
},{timestamps:true});

const User=mongoose.model("User",userSchema);

module.exports=User;