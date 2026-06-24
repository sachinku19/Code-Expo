import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { Bot, CheckCircle2, Sparkles, MessageCircleCode, ArrowRight } from "lucide-react";
import "./AIShowcase.css";

function AIShowcase() {
  const [selectedPrompt, setSelectedPrompt] = useState("hook");
  const [isThinking, setIsThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState(
    "useEffect is a hook for side effects. It takes a callback and an array of dependencies, executing after render updates are complete..."
  );

  const prompts = {
    hook: {
      question: "Explain the useEffect React Hook simply",
      response: "useEffect runs side effects after rendering. It takes a dependency array: empty array [] runs once, specific values [dep] run when they change, and returning a function cleanups subscriptions."
    },
    query: {
      question: "Optimize this SQL query: SELECT * FROM users WHERE active = 1 ORDER BY date",
      response: "Add an index on columns: (active, date). Replace SELECT * with explicit column names. Query: SELECT id, name, email FROM users WHERE active = 1 ORDER BY date DESC LIMIT 100;"
    },
    api: {
      question: "Generate an Express GET route to fetch articles",
      response: "app.get('/api/articles', async (req, res) => {\n  const articles = await Article.find({ status: 'published' });\n  res.status(200).json({ success: true, data: articles });\n});"
    },
    race: {
      question: "How do I fix a JS async race condition?",
      response: "Use an AbortController to cancel previous fetch calls before starting new ones, or use a boolean flag (ignore) inside useEffect to ignore out-of-order replies."
    }
  };

  const handlePromptClick = (key) => {
    if (key === selectedPrompt) return;
    setIsThinking(true);
    setSelectedPrompt(key);
    
    // Simulate AI thinking and generating
    setTimeout(() => {
      setAiResponse(prompts[key].response);
      setIsRunningType(true);
      setIsThinking(false);
    }, 700);
  };

  const [isRunningType, setIsRunningType] = useState(true);

  return (
    <section className="ai-showcase">
      <div className="ai-left">
        <span className="ai-badge">
          <Bot size={14} className="ai-badge-icon" />
          <span>Intelligent Assistant</span>
        </span>

        <h2>Your AI Pair Programmer</h2>

        <p>
          Interact with our built-in Expo AI. Click any question below to test its intelligence in real-time.
        </p>

        <div className="ai-prompt-selector-grid">
          <button 
            className={`prompt-pill ${selectedPrompt === "hook" ? "active" : ""}`}
            onClick={() => handlePromptClick("hook")}
          >
            <MessageCircleCode size={16} />
            <span>Explain React Hook</span>
          </button>
          <button 
            className={`prompt-pill ${selectedPrompt === "query" ? "active" : ""}`}
            onClick={() => handlePromptClick("query")}
          >
            <MessageCircleCode size={16} />
            <span>Optimize SQL Query</span>
          </button>
          <button 
            className={`prompt-pill ${selectedPrompt === "api" ? "active" : ""}`}
            onClick={() => handlePromptClick("api")}
          >
            <MessageCircleCode size={16} />
            <span>Generate REST API Route</span>
          </button>
          <button 
            className={`prompt-pill ${selectedPrompt === "race" ? "active" : ""}`}
            onClick={() => handlePromptClick("race")}
          >
            <MessageCircleCode size={16} />
            <span>Fix Async Race Condition</span>
          </button>
        </div>

        <div className="ai-features">
          <div>
            <CheckCircle2 size={16} className="text-purple" />
            <span>Explain code and query logic</span>
          </div>
          <div>
            <CheckCircle2 size={16} className="text-purple" />
            <span>Find and squash architectural bugs</span>
          </div>
          <div>
            <CheckCircle2 size={16} className="text-purple" />
            <span>Generate boilerplates on-the-fly</span>
          </div>
        </div>
      </div>

      <div className="ai-right-container">
        <motion.div
          className="ai-right"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="ai-window">
            {/* Header */}
            <div className="ai-header">
              <span className="ai-header-title">
                <Sparkles size={16} className="ai-sparkle-icon" />
                <span>Code Expo AI</span>
              </span>
              <span className={`ai-header-status ${isThinking ? "thinking" : ""}`}>
                {isThinking ? "analyzing context" : "online"}
              </span>
            </div>

            {/* Simulated Chat Feed */}
            <div className="ai-chat-body">
              <div className="ai-user-bubble">
                {prompts[selectedPrompt].question}
              </div>

              <div className="ai-assistant-bubble">
                <div className="bot-avatar">
                  <Sparkles size={12} />
                </div>
                <div className="ai-response-text">
                  {isThinking ? (
                    <div className="typing-loader">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedPrompt}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <pre className="code-output-block">
                          <code>{aiResponse}</code>
                        </pre>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
            
            <div className="ai-window-footer">
              <span className="footer-tip">Powered by Gemini 3.5 Flash Model</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default AIShowcase;
