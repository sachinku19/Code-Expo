const aiService = require("../services/aiService");

/**
 * Generic handler wrapper for AI operations
 */
const executeAIOperation = async (req, res, actionType) => {
  try {
    const { prompt, selectedCode, code, language, targetLanguage, roomId } = req.body;
    const user = req.user;

    const result = await aiService.processAIRequest({
      actionType,
      prompt,
      selectedCode: selectedCode || code || "",
      language: language || targetLanguage || "javascript",
      targetLanguage: targetLanguage || language || "javascript",
      roomId,
      user
    });

    return res.status(200).json({
      success: true,
      actionType: result.actionType,
      language: result.language,
      reply: result.response
    });
  } catch (error) {
    console.error(`AI Controller Error (${actionType}):`, error);
    return res.status(500).json({
      success: false,
      message: error.message || `Failed to process AI ${actionType} request.`
    });
  }
};

exports.handleAIChat = (req, res) => executeAIOperation(req, res, "chat");
exports.handleExplain = (req, res) => executeAIOperation(req, res, "explain");
exports.handleFix = (req, res) => executeAIOperation(req, res, "fix");
exports.handleOptimize = (req, res) => executeAIOperation(req, res, "optimize");
exports.handleReview = (req, res) => executeAIOperation(req, res, "review");
exports.handleGenerateTests = (req, res) => executeAIOperation(req, res, "generate-tests");
exports.handleDocumentation = (req, res) => executeAIOperation(req, res, "documentation");
exports.handleConvertLanguage = (req, res) => executeAIOperation(req, res, "convert-language");

/**
 * Get Room AI Conversation History
 */
exports.getRoomAIHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ success: false, message: "Room ID is required" });
    }

    const history = await aiService.getRoomHistory(roomId);
    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch room AI history"
    });
  }
};

/**
 * Clear Room AI Conversation History
 */
exports.clearRoomAIHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ success: false, message: "Room ID is required" });
    }

    await aiService.clearRoomHistory(roomId);
    return res.status(200).json({
      success: true,
      message: "Room AI history cleared successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to clear room AI history"
    });
  }
};
