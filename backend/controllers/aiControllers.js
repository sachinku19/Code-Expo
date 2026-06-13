const User = require("../models/User");

// Intelligent rule-based developer assistant engine
const getLocalAIResponse = (message, username = "Guest Developer") => {
  const msg = message.toLowerCase().trim();

  // Greetings
  if (msg.match(/\b(hello|hi|hey|greetings|yo)\b/)) {
    return `Hello ${username}! 🚀 Welcome to **CodeExpo**. I am **ExpoAI**, your futuristic coding assistant. How can I help you write, compile, or collaborate today? ⚡`;
  }

  // Compiler / execution / sandbox
  if (msg.includes("compile") || msg.includes("run") || msg.includes("sandbox") || msg.includes("playground") || msg.includes("execute") || msg.includes("compiler")) {
    return `💻 **CodeExpo Sandbox & Compiler:**\n\nCodeExpo features an integrated compiler engine powered by Judge0. You can:\n- Run code in **JavaScript**, **Python**, **C++**, and **Java**.\n- Launch isolated sandbox playgrounds.\n- Collaborate live inside workspaces with other developers.\n\nEvery run compiles inside a secured sandbox and syncs output instantly!`;
  }

  // Collaboration / call / room / chat
  if (msg.includes("room") || msg.includes("collaborate") || msg.includes("call") || msg.includes("audio") || msg.includes("video") || msg.includes("voice") || msg.includes("share")) {
    return `👥 **Real-Time Collaboration Workspaces:**\n\nCodeExpo supports live collaboration:\n- **Rooms:** Create custom rooms with specific language environments.\n- **Audio & Video Call:** Switch on calls in the top-right header to talk to your team while coding.\n- **Live Chat:** Send instant messages in the workspace panel.\n- **Invite:** Copy the Room ID using the "Share" button to invite other developers to code with you.`;
  }

  // XP / points / rank / execution count
  if (msg.includes("xp") || msg.includes("point") || msg.includes("rank") || msg.includes("executionscount") || msg.includes("score") || msg.includes("level")) {
    return `🏆 **Gamification & Developer XP:**\n\nAt CodeExpo, your coding activity matters:\n- **Lifetime XP:** Directly synced to your code compiler executions count.\n- **Ranks:** Progress from **Developer** to **Senior Developer**, **Elite Developer**, and eventually **Legendary Developer**.\n- Display your points proudly on your Dashboard and Public Developer Profiles!`;
  }

  // Help Desk / support / ticket
  if (msg.includes("ticket") || msg.includes("help") || msg.includes("support") || msg.includes("helpdesk") || msg.includes("issue") || msg.includes("problem")) {
    return `🎫 **Help Desk Support System:**\n\nIf you encounter any issues:\n1. Head over to the **Help Desk** tab in your user sidebar.\n2. Click **Create Ticket** and describe the issue.\n3. Admins will receive the ticket in the moderation center.\n4. You can converse directly with support agents inside the ticket discussion feed!`;
  }

  // Admin control
  if (msg.includes("admin") || msg.includes("control room") || msg.includes("diagnostics") || msg.includes("moderation")) {
    return `🛡️ **Admin Control Panel:**\n\nPlatform administrators have access to a back-office panel to:\n- View real-time server/CPU resource gauges.\n- Ban, unban, or change developer accounts and titles.\n- Moderation controls for collaboration rooms and chat logs.\n- Broadcast alerts and advertisements to the landing page.`;
  }

  // Coding assistance fallback
  if (msg.includes("code") || msg.includes("write") || msg.includes("function") || msg.includes("html") || msg.includes("css") || msg.includes("javascript") || msg.includes("python") || msg.includes("c++") || msg.includes("java") || msg.includes("create")) {
    return `🤖 **ExpoAI Coding Guidance:**\n\nHere is a clean code pattern example:\n\`\`\`javascript\n// ExpoAI live helper\nconst greetDev = (name) => {\n  console.log(\`🚀 CodeExpo welcomes \${name}!\`);\n};\ngreetDev("${username}");\n\`\`\`\nLet me know if you need to debug a specific language, write algorithms, or build layouts!`;
  }

  // Default response
  return `🤖 **ExpoAI Assistant:**\n\nI am here to assist you with the **CodeExpo** platform! You can ask me about:\n- isolated sandbox compiler engines 💻\n- real-time audio/video calls 👥\n- user profile XP and rank titles 🏆\n- Help Desk ticket creation 🎫\n\nLet me know what you'd like to explore!`;
};

// AI Chat Controller
exports.handleAIChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      });
    }

    // Try to retrieve logged in user info (if session present or authorization header evaluated)
    let username = "Guest Developer";
    if (req.user) {
      username = req.user.username;
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      // System instructions to guide Gemini
      const systemPrompt = `You are "ExpoAI", a futuristic virtual coding assistant on the CodeExpo platform. 
CodeExpo is a collaborative real-time coding workspace supporting online compilations (JS, Python, C++, Java), live whiteboard screens, video/audio calls, developer XP gamification (earned by compiling code), and help desk ticketing. 
Keep your responses futuristic, technical yet encouraging, use emojis (🚀, 💻, ⚡, 🛡️, 🤖) where appropriate. Be concise and formatted in clean markdown. 
The user talking to you is: ${username}.`;

      try {
        let response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `${systemPrompt}\n\nUser Question: ${message}`
                    }
                  ]
                }
              ]
            })
          }
        );

        // Fallback to gemini-1.5-flash if gemini-2.5-flash is not available for this key
        if (response.status === 404) {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `${systemPrompt}\n\nUser Question: ${message}`
                      }
                    ]
                  }
                ]
              })
            }
          );
        }

        if (response.ok) {
          const data = await response.json();
          const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponseText) {
            return res.status(200).json({
              success: true,
              reply: aiResponseText.trim()
            });
          }
        }
      } catch (err) {
        console.error("Gemini fetch error, using local fallback:", err);
      }
    }

    // Fallback to local rule-based response
    const reply = getLocalAIResponse(message, username);
    res.status(200).json({
      success: true,
      reply
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process chat query"
    });
  }
};
