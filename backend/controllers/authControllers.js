const User=require("../models/User");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcryptjs");
const validator=require("validator");
const mongoose=require("mongoose");


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
        password:hashedPassword
    });

    res.status(200).json({
        success:true,
        message:"User Registered successfully",
        token:generateToken(user._id),
        user:{
            id:user._id,
            username:user.username,
            email:user.email,
            role:user.role,
            title:user.title
        }
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
        user.isOnline=true;
        user.lastSeene=Date.now();

        await user.save();

        //send responses
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
   
         await User.findByIdAndUpdate(
      req.user._id,
      {
        isOnline: false,
        lastSeen: Date.now()
      }
    );

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
        avatar: picture || ""
      });
    } else {
      // User exists, link Google account if not linked
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        await user.save();
      }
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended by an administrator."
      });
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

module.exports={
    registerUser,
    loginUser,
    my_profile,
    totalUser,
    logoutUser,
    changePassword,
    getPublicStats,
    googleLogin,
    getGoogleConfig
}