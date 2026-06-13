import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode2, MessageSquare, Play, Users, Send, Check } from "lucide-react";
import "./CollaborationDemo.css";

function CollaborationDemo() {
  const [activeFile, setActiveFile] = useState("App.jsx");
  const [chatMessages, setChatMessages] = useState([
    { user: "Aman", text: "Hey! Let's build the new UI structure.", time: "10:42" },
    { user: "Sachin", text: "Sure, let's write it in App.jsx.", time: "10:43" }
  ]);
  const [inputText, setInputText] = useState("");
  const [editorCode, setEditorCode] = useState({
    "App.jsx": `import React from 'react';\nimport { Room } from './Room';\n\nexport default function App() {\n  return (\n    <Room name="Code Expo Dev" />\n  );\n}`,
    "api.js": `export async function fetchUsers() {\n  const res = await fetch('/api/users');\n  return res.json();\n}`,
    "index.css": `body {\n  margin: 0;\n  background: #080710;\n  color: #fff;\n}`
  });

  const chatEndRef = useRef(null);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      user: "You",
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulate reactive teammate typing a response
    setTimeout(() => {
      const responseMsg = {
        user: "Aman",
        text: "That looks super clean! Let's execute the compiler now.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, responseMsg]);
      
      // Auto-scroll chat window
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 1500);
  };

  const handleEditorChange = (file, value) => {
    setEditorCode((prev) => ({
      ...prev,
      [file]: value
    }));
  };

  return (
    <section className="collaboration">
      <div className="collab-header">
        <span className="collab-badge">
          <Users size={14} className="collab-badge-icon" />
          <span>Real-time Multi-User Mockup</span>
        </span>

        <h2>Write Code Together in Real-Time</h2>

        <p>
          Simulate a workspace session below. Choose a file, type your edits directly, and chat with your mock team.
        </p>
      </div>

      <motion.div
        className="workspace-preview"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7 }}
      >
        {/* Workspace Sidebar: File Tree */}
        <div className="workspace-sidebar">
          <div className="sidebar-title">Workspace Files</div>
          {Object.keys(editorCode).map((file) => (
            <div
              key={file}
              className={`file-item ${activeFile === file ? "active" : ""}`}
              onClick={() => setActiveFile(file)}
            >
              <FileCode2 size={16} className="file-icon" />
              <span>{file}</span>
            </div>
          ))}
          <div className="sidebar-footer">
            <span className="sync-badge">
              <Check size={12} /> Sync Active
            </span>
          </div>
        </div>

        {/* Workspace Center: Dynamic Text Area Editor */}
        <div className="workspace-editor">
          <div className="editor-user user1-tag">Sachin editing</div>
          <div className="editor-user user2-tag">Aman active</div>

          <div className="editor-tabs">
            <span className="editor-tab active">{activeFile}</span>
            <span className="editor-tab-hint">Interactive - Feel free to type below!</span>
          </div>

          <div className="editor-textarea-wrapper">
            <textarea
              className="editor-textarea"
              value={editorCode[activeFile]}
              onChange={(e) => handleEditorChange(activeFile, e.target.value)}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Workspace Right Side: Live Team Chat */}
        <div className="workspace-chat">
          <div className="chat-title">
            <MessageSquare size={16} />
            <span>Multiplayer Chat</span>
          </div>

          <div className="chat-messages-container">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble-item ${msg.user === "You" ? "own-message" : ""}`}>
                <div className="chat-meta">
                  <span className="chat-user">{msg.user}</span>
                  <span className="chat-time">{msg.time}</span>
                </div>
                <div className="chat-text">{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input-bar" onSubmit={handleSendChat}>
            <input
              type="text"
              placeholder="Send message to team..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" aria-label="Send Message">
              <Send size={14} />
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
}

export default CollaborationDemo;
