const { executeCode } = require("../services/jdoodleService");
const WorkspaceItem = require("../models/WorkspaceItem");
const { logActivity } = require("./activityControllers");
const User = require("../models/User");

const runCode = async (req, res) => {
    console.log(req.body);

    try {
        const { language, code, input, roomId, roomTitle } = req.body;

        // Validation
        if (!language) {
            return res.status(400).json({
                success: false,
                message: "Language is required"
            });
        }

        let sourceCode = code;
        
        // 1. Check if this room contains any workspace files
        const workspaceCount = await WorkspaceItem.countDocuments({ roomId, type: "file" });
        
        if (workspaceCount > 0) {
            // Find compilation/execution Entry Point
            const items = await WorkspaceItem.find({ roomId, type: "file" });
            let entryPoint = items.find((item) => item.isEntryPoint);

            // Fallbacks if no entry point configured
            if (!entryPoint) {
                const defaults = {
                    javascript: "index.js",
                    python: "main.py",
                    cpp: "main.cpp",
                    java: "Main.java"
                };
                const defaultName = defaults[language];
                entryPoint = items.find((item) => item.name === defaultName);
            }

            // If still no entry point, take first file of matching language extension
            if (!entryPoint) {
                const exts = {
                    javascript: ".js",
                    python: ".py",
                    cpp: ".cpp",
                    java: ".java"
                };
                const ext = exts[language];
                if (ext) {
                    entryPoint = items.find((item) => item.name.endsWith(ext));
                }
            }

            if (!entryPoint) {
                return res.status(400).json({
                    success: false,
                    message: `No entry point selected or default file found for ${language}. Please select an entry point file.`
                });
            }

            sourceCode = entryPoint.content || "";
        } else {
            // Fallback: Run legacy single-file code buffer
            if (!sourceCode) {
                return res.status(400).json({
                    success: false,
                    message: "Code is required for execution"
                });
            }
        }

        // Execute via JDoodle
        const output = await executeCode(language, sourceCode, input);

        await User.findByIdAndUpdate(req.user._id, { $inc: { executionsCount: 1 } });
        logActivity(req.user._id, req.user.username, roomId || null, roomTitle || "Sandbox", "executed");
       
        res.status(200).json({
            success: true,
            output
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            output: error.message || String(error)
        });
    }
};

module.exports = {
    runCode,
};