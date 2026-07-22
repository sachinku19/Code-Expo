const MAX_PROMPT_LENGTH = 10000;
const MAX_CODE_LENGTH = 20000;

const validateAIRequest = (req, res, next) => {
  const { prompt, selectedCode, code, roomId } = req.body;

  if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Room ID is required"
    });
  }

  const userPrompt = prompt || "";
  const codeContent = selectedCode || code || "";

  if (!userPrompt.trim() && !codeContent.trim()) {
    return res.status(400).json({
      success: false,
      message: "Either a prompt or code snippet must be provided."
    });
  }

  if (userPrompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Prompt exceeds maximum allowed length of ${MAX_PROMPT_LENGTH} characters.`
    });
  }

  if (codeContent.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Code snippet exceeds maximum allowed length of ${MAX_CODE_LENGTH} characters.`
    });
  }

  next();
};

module.exports = {
  validateAIRequest
};
