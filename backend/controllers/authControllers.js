const User=require("../models/User");
const Follow=require("../models/Follow");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcryptjs");
const validator=require("validator");
const mongoose=require("mongoose");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");


//function of token creation
const generateToken=(id)=>{
    return jwt.sign(
        {id},
        process.env.JWT_SECRET,
        {expiresIn:"7d"}
    );
};


//register user
const registerUser=async(req,res)=>{
    try{

    const {username,email,password}=req.body;
    
    //validation
    if(!username || !password || !email){
        return res.status(400).json({
            success:false,
            message:"All fields are required"
        });
    }
    //email validation
    if(!validator.isEmail(email)){
        return res.status(400).json({
            success:false,
            message:"Invalid Email"
        });
    }
   
    //password validation
    if(password.length<6){
        return res.status(400).json({
            success:false,
            message:"Password must be atleast 6 characters"
        });
    }

    //check existing user
    const existUser=await User.findOne({email});
    if(existUser){
        return res.status(409).json({
            success:false,
            message:"User allready exist"
        });
    }
  
    //password hashed
    const salt=await bcrypt.genSalt(10);
    const hashedPassword=await bcrypt.hash(password,salt);

    const user=await User.create({
        username,
        email,
        password:hashedPassword,
        isVerified:true
    });

    res.status(200).json({
        success:true,
        message:"User Registered successfully"
    });
}
catch(error)
{
    res.status(500).json({
        success:false,
        message:error.message
    });
}
}


//Login user
const loginUser=async(req,res)=>{
    try{
        
        const {email,password}=req.body;

        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            });
        }

        const user=await User.findOne({email});
        if(!user){
            return res.status(401).json({
                success:false,
                message:"Email not exist"
            });
        }

        if (user.isSuspended) {
            return res.status(403).json({
                success:false,
                message:"Your account has been suspended by an administrator."
            });
        }

        //compare password
        const isMatched=await bcrypt.compare(password,user.password);
        if(!isMatched){
            return res.status(401).json({
                success:false,
                message:"Password does not match"
            });
        }

        // Close any dangling open sessions for this user
        if (user.loginHistory && Array.isArray(user.loginHistory)) {
            user.loginHistory.forEach(log => {
                if (log.logoutTime === null) {
                    log.logoutTime = new Date();
                }
            });
        } else {
            user.loginHistory = [];
        }

        // Create new LoginLog entry inside user object
        let clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || "";
        if (clientIp.startsWith("::ffff:")) {
            clientIp = clientIp.replace("::ffff:", "");
        }
        if (clientIp === "::1") {
            clientIp = "127.0.0.1";
        }
        user.loginHistory.unshift({
            loginTime: new Date(),
            logoutTime: null,
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'] || ""
        });

        // Cap to 10 logs per user: delete older logs beyond the top 10
        if (user.loginHistory.length > 10) {
            user.loginHistory = user.loginHistory.slice(0, 10);
        }

        user.isOnline = true;
        user.lastSeene = Date.now();

        await user.save();

        // send responses
        res.status(201).json({
            success:true,
            message:"Login Successfull",
            token:generateToken(user._id),
            user:{
                id:user._id,
                username:user.username,
                email:user.email,
                role:user.role,
                avatar:user.avatar,
                title:user.title
            }
        });
        
    }
    catch(error){
        res.status(500).json({
            success:false,
            message:"Login failed"
        });
    }
}

const my_profile=async(req,res)=>{

    try{
        if (req.user && req.user.isSuspended) {
            return res.status(403).json({
                success:false,
                message:"Your account has been suspended by an administrator."
            });
        }

        if (req.user) {
            const followersCount = req.user.followers ? req.user.followers.length : 0;
            const followingCount = req.user.following ? req.user.following.length : 0;
            if (req.user.followersCount !== followersCount || req.user.followingCount !== followingCount) {
                await User.updateOne(
                    { _id: req.user._id },
                    { followersCount, followingCount }
                );
                req.user.followersCount = followersCount;
                req.user.followingCount = followingCount;
            }
        }

        res.status(200).json({
            success:true,
            user:req.user
        });

    }catch(error){
         res.status(500).json({
            success:false,
            message:Error.message
         });
    }
}

const totalUser=async(req,res)=>{
try{
    const userCount=await User.countDocuments({isOnline:true});

    res.status(200).json({
        success:true,
        userCount
    })

}catch(error){
    res.status(500).json({
        success:false,
        message:error.message
    })
}
}

const logoutUser=async(req,res)=>{

    try{
   
         const user = await User.findById(req.user._id);
         if (user) {
             user.isOnline = false;
             user.lastSeene = Date.now();
             if (user.loginHistory && Array.isArray(user.loginHistory)) {
                 const activeLog = user.loginHistory.find(log => log.logoutTime === null);
                 if (activeLog) {
                     activeLog.logoutTime = new Date();
                 }
             }
             await user.save();
         }

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });


    }catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Compare with current password
    const isMatched = await bcrypt.compare(currentPassword, user.password);
    if (!isMatched) {
      return res.status(401).json({
        success: false,
        message: "Current password does not match"
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to change password"
    });
  }
};

const getPublicStats = async (req, res) => {
  try {
    const Room = require("../models/Room");
    const Message = require("../models/Message");
    const Activity = require("../models/Activity");

    // Sync historical executions count to User record if not yet initialized
    const allUsers = await User.find();
    for (const u of allUsers) {
      const histCount = await Activity.countDocuments({ user: u._id, action: "executed" });
      const currentCount = u.executionsCount || 0;
      if (currentCount < histCount) {
        u.executionsCount = histCount;
        await u.save();
      }
    }

    const developers = await User.countDocuments();
    const rooms = await Room.countDocuments();
    const messages = await Message.countDocuments();

    // Aggregate executions count across all users
    const usersWithExecutions = await User.aggregate([
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: "$executionsCount" }
        }
      }
    ]);
    const executions = usersWithExecutions.length > 0 ? usersWithExecutions[0].totalExecutions : 0;

    res.status(200).json({
      success: true,
      stats: {
        developers,
        rooms,
        messages,
        executions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required"
      });
    }

    // Fetch user info from Google API using the access token
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token"
      });
    }

    const userData = await response.json();
    const { sub: googleId, email, name, picture } = userData;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user (Google signup)
      let username = (name || "user").replace(/\s+/g, "_").toLowerCase();
      // Check if username already exists, if so append a random number
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
      }

      user = await User.create({
        username,
        email,
        googleId,
        avatar: picture || "",
        isVerified: true
      });
    } else {
      // User exists, link Google account if not linked
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        updated = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended by an administrator."
      });
    }

    // Close any dangling open sessions for this user
    if (user.loginHistory && Array.isArray(user.loginHistory)) {
        user.loginHistory.forEach(log => {
            if (log.logoutTime === null) {
                log.logoutTime = new Date();
            }
        });
    } else {
        user.loginHistory = [];
    }

    // Create new LoginLog entry inside user object
    let clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || "";
    if (clientIp.startsWith("::ffff:")) {
        clientIp = clientIp.replace("::ffff:", "");
    }
    if (clientIp === "::1") {
        clientIp = "127.0.0.1";
    }
    user.loginHistory.unshift({
        loginTime: new Date(),
        logoutTime: null,
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || ""
    });

    // Cap to 10 logs per user: delete older logs beyond the top 10
    if (user.loginHistory.length > 10) {
        user.loginHistory = user.loginHistory.slice(0, 10);
    }

    user.isOnline = true;
    user.lastSeene = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Google Login Successful",
      token: generateToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        title: user.title
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Google authentication failed"
    });
  }
};

const getGoogleConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      googleClientId: process.env.GOOGLE_LOGIN_CLIENT_ID || ""
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address."
      });
    }

    const user = await User.findOne({ email });

    // Note: Return generic success to prevent account enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists in our system, a reset link has been sent."
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Expiry: 30 minutes
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #444; border-radius: 10px; background-color: #0d1117; color: #c9d1d9; border-top: 4px solid #aa3bff;">
        <h2 style="color: #58a6ff; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
        <p style="font-size: 16px; line-height: 1.6;">You requested a password reset. Please click the button below to set a new password. This link will expire in 30 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(90deg, #aa3bff 0%, #00f0ff 100%); color: #0d1117; padding: 12px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 15px rgba(170, 59, 255, 0.4);">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #8b949e; margin-top: 30px;">If the button above does not work, copy and paste this URL into your browser:</p>
        <p style="font-size: 12px; color: #58a6ff; word-break: break-all;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #30363d; margin: 20px 0;" />
        <p style="font-size: 11px; color: #8b949e; text-align: center;">CodeExpo — Explore, Code, Innovate.</p>
      </div>
    `;

    // Log reset link to terminal for local developer testing/bypass
    console.log("----------------------------------------");
    console.log("PASSWORD RESET URL FOR TESTING:");
    console.log(resetUrl);
    console.log("----------------------------------------");

    try {
      await sendEmail({
        email: user.email,
        subject: "CodeExpo - Password Reset Request",
        html: message
      });
    } catch (err) {
      console.error("SMTP Email dispatch failed:", err);
      console.log("Developer notice: SMTP failed, but password reset token is preserved for local testing. Use the PASSWORD RESET URL printed above.");
    }

    res.status(200).json({
      success: true,
      message: "If that email exists in our system, a reset link has been sent."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token."
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.isVerified = true; // resets also prove verification

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in with your new password."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports={
    registerUser,
    loginUser,
    my_profile,
    totalUser,
    logoutUser,
    changePassword,
    getPublicStats,
    googleLogin,
    getGoogleConfig,
    forgotPassword,
    resetPassword
}