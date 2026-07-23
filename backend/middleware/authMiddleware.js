const User = require("../models/User");
const jwt = require("jsonwebtoken");

const auth_protect = async (req, res, next) => {
    let token;
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // extract token
            token = req.headers.authorization.split(" ")[1];

            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({
                    success: false,
                    message: "Not authorized, token missing"
                });
            }

            // token verification
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // find user
            req.user = await User.findById(decoded.id).select("-password");
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found"
                });
            }
            return next();
        } else {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token"
            });
        }
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, token failed"
        });
    }
};

module.exports = auth_protect;