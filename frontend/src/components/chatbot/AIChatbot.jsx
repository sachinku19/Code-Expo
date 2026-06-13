import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X, Send, Sparkles, Terminal, Cpu, ArrowRight } from "lucide-react";
import Logo from "../shared/Logo";
import { sendAIChatMessage } from "../../services/aiService";
import "./AIChatbot.css";

export default function AIChatbot() {
  const location = useLocation();
  const isEditorPage = location.pathname.startsWith("/editor/");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "System Online. 🚀 I am **ExpoAI**, your developer assistant. Ask me anything about CodeExpo's compiler engines, live call rooms, or XP ranks! ⚡",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat feed
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue("");
    }

    // Append user message
    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const data = await sendAIChatMessage(text.trim());
      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString() + "-ai",
            sender: "ai",
            text: data.reply,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error("Invalid reply status");
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          sender: "ai",
          text: "⚠️ Connection link disrupted. Please verify server connection and try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to format messages with markdown code blocks and bold text
  const renderMessageText = (text) => {
    const parts = [];
    let currentIdx = 0;

    // Detect code blocks ```javascript ... ```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const matchIdx = match.index;
      const lang = match[1] || "code";
      const code = match[2];

      // Add text before code block
      if (matchIdx > currentIdx) {
        parts.push(renderTextFormatting(text.substring(currentIdx, matchIdx)));
      }

      // Add code block
      parts.push(
        <div key={matchIdx} className="ai-chat-code-block-wrapper">
          <div className="code-block-header">
            <Terminal size={11} />
            <span>{lang.toUpperCase()}</span>
          </div>
          <pre className="code-block-body">
            <code>{code}</code>
          </pre>
        </div>
      );

      currentIdx = codeBlockRegex.lastIndex;
    }

    // Add remaining text
    if (currentIdx < text.length) {
      parts.push(renderTextFormatting(text.substring(currentIdx)));
    }

    return parts;
  };

  // Helper for inline bolding **text**
  const renderTextFormatting = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let currentIdx = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      const matchIdx = match.index;
      const boldText = match[1];

      if (matchIdx > currentIdx) {
        parts.push(text.substring(currentIdx, matchIdx));
      }

      parts.push(<strong key={matchIdx}>{boldText}</strong>);
      currentIdx = boldRegex.lastIndex;
    }

    if (currentIdx < text.length) {
      parts.push(text.substring(currentIdx));
    }

    return parts;
  };

  const suggestions = [
    { label: "Compiler Sandboxes", query: "How do sandboxes work?" },
    { label: "Collaboration Calls", query: "How do I start an audio call?" },
    { label: "XP Points & Ranks", query: "What are developer points?" },
    { label: "Help Desk Support", query: "How do I create a support ticket?" }
  ];

  return (
    <div className={`ai-chatbot-widget-root ${isEditorPage ? "hide-chatbot" : ""}`}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`chatbot-trigger-btn ${isOpen ? "active" : ""}`}
        title="Chat with ExpoAI"
      >
        <div className="pulse-ring ring-1"></div>
        <div className="pulse-ring ring-2"></div>
        <div className="trigger-logo-wrapper">
          {isOpen ? <X size={24} className="close-icon" /> : <Logo size={38} showText={false} />}
        </div>
      </button>

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="chatbot-window-panel glass-panel">
          {/* Futuristic Circuit Header */}
          <div className="chatbot-header">
            <div className="header-left">
              <div className="ai-avatar-pulse">
                <Logo size={24} showText={false} />
                <span className="live-status-dot"></span>
              </div>
              <div className="header-text-block">
                <h4>ExpoAI Control</h4>
                <div className="status-flex">
                  <Cpu size={10} className="status-icon" />
                  <span>ONLINE • PLATFORM CORE</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="btn-close-chatbot" title="Minimize Chat">
              <X size={15} />
            </button>
            <div className="cyber-glow-line"></div>
          </div>

          {/* CHATBODY */}
          <div className="chatbot-body-scroll">
            <div className="chat-messages-container">
              {messages.map((m) => (
                <div key={m.id} className={`chat-message-row ${m.sender === "user" ? "user" : "ai"}`}>
                  <div className="message-bubble">
                    {m.sender === "ai" ? (
                      <div className="message-content-text">
                        {renderMessageText(m.text)}
                      </div>
                    ) : (
                      <p className="message-plain">{m.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="chat-message-row ai">
                  <div className="message-bubble typing">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* SUGGESTIONS PANEL */}
          {messages.length === 1 && !isTyping && (
            <div className="suggestions-bar">
              <span className="suggestion-label">Quick Scans:</span>
              <div className="suggestions-flex">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.query)}
                    className="btn-suggestion"
                  >
                    <span>{s.label}</span>
                    <ArrowRight size={10} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CHAT INPUT AREA */}
          <div className="chatbot-input-row">
            <div className="input-glow-wrapper">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask ExpoAI about CodeExpo..."
                rows="1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="btn-send-chat"
                title="Send instruction"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
