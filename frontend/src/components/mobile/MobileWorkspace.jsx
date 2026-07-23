import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileCode,
  Folder,
  Play,
  CheckCircle2,
  Copy,
  Users,
  Terminal,
  Zap,
  ChevronRight
} from "lucide-react";
import "./MobileWorkspace.css";

const workspaceFiles = {
  "index.js": `// Real-time Collaborative Code Sharing\nconst session = {\n  room: "multiplayer-sandbox",\n  users: ["Sachin", "Aman", "You"],\n  sync: true\n};\n\nconsole.log("Ready to build faster together!");`,
  "main.py": `# Python 3 Real-time Sandbox Simulation\nimport time\n\ndevs = ["Sachin", "Aman", "You"]\nprint("Spinning up secure Docker container...")\nfor user in devs:\n    print(f"Collaborator: {user} joined workspace")`,
  "main.cpp": `// High Performance Coding Environment\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Room state synchronized successfully." << endl;\n    return 0;\n}`,
  "Main.java": `public class Main {\n    public static void main(String[] args) {\n        System.out.println("CodeExpo Java 21 Sandbox Ready!");\n    }\n}`
};

export default function MobileWorkspace() {
  const [activeFile, setActiveFile] = useState("index.js");
  const [activeTab, setActiveTab] = useState("editor"); // 'explorer' | 'editor' | 'output'
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState(null);

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput(null);
    setActiveTab("output");
    setTimeout(() => {
      setIsRunning(false);
      setOutput("✓ Execution logs: Docker container HEALTHY (0.012s warmup)\n> Console ready. Room state synchronized successfully.");
    }, 1000);
  };

  return (
    <section className="mobile-workspace-section" id="editor-section">
      <div className="mobile-workspace-header">
        <span className="mobile-section-tag">MULTI-FILE WORKSPACE</span>
        <h2 className="mobile-workspace-title">A complete local IDE, in your browser.</h2>
        <p className="mobile-workspace-sub">
          Manage folder directories, edit multiple files in tabs, set compilation entry points, and execute source code with stdin buffers.
        </p>
      </div>

      {/* Floating Mobile IDE Frame */}
      <motion.div
        className="mobile-phone-frame"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {/* IDE Header Bar with Official Logo */}
        <div className="ide-top-nav">
          <div className="ide-logo-group">
            <img src="/logo.png" alt="CodeExpo" className="ide-logo-img" />
            <span className="ide-room-title">Sorting-Array <small className="room-id">#jciajy</small></span>
          </div>

          <div className="ide-status-badge">
            <span className="dot-online" />
            <span>Connected</span>
          </div>
        </div>

        {/* IDE Navigation Tabs */}
        <div className="ide-tab-bar">
          <button
            className={`ide-tab ${activeTab === "explorer" ? "active" : ""}`}
            onClick={() => setActiveTab("explorer")}
          >
            <Folder size={13} />
            <span>Files</span>
          </button>
          <button
            className={`ide-tab ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => setActiveTab("editor")}
          >
            <FileCode size={13} />
            <span>{activeFile}</span>
          </button>
          <button
            className={`ide-tab ${activeTab === "output" ? "active" : ""}`}
            onClick={() => setActiveTab("output")}
          >
            <Terminal size={13} />
            <span>Terminal</span>
          </button>
        </div>

        {/* IDE Content View */}
        <div className="ide-content-body">
          {activeTab === "explorer" && (
            <div className="ide-explorer-view">
              <span className="explorer-sub-title">WORKSPACE FILES</span>
              {Object.keys(workspaceFiles).map((file) => (
                <div
                  key={file}
                  className={`tree-file-item ${file === activeFile ? "active" : ""}`}
                  onClick={() => {
                    setActiveFile(file);
                    setActiveTab("editor");
                  }}
                >
                  <FileCode size={14} className="code-icon" />
                  <span>{file}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "editor" && (
            <div className="ide-editor-view">
              <div className="code-line-numbers">
                {workspaceFiles[activeFile].split("\n").map((_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <pre className="code-display">
                <code>
                  {workspaceFiles[activeFile]}
                  <span className="blinking-cursor">|</span>
                </code>
              </pre>

              {/* Collaborative Cursor */}
              <div className="floating-user-cursor">
                <span className="cursor-tag">Sachin: editing...</span>
              </div>
            </div>
          )}

          {activeTab === "output" && (
            <div className="ide-output-view">
              {isRunning ? (
                <div className="output-status running">
                  <Zap size={16} className="spin-icon" />
                  <span>Compiling and running code...</span>
                </div>
              ) : output ? (
                <div className="output-status success">
                  <pre>{output}</pre>
                </div>
              ) : (
                <div className="output-status empty">
                  <span>Console ready. Click "Run Program" to compile.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IDE Footer Run Bar */}
        <div className="ide-run-bar">
          <button className="mobile-run-btn" onClick={handleRunCode} disabled={isRunning}>
            <Play size={14} fill="currentColor" />
            <span>{isRunning ? "Running..." : "Run Program"}</span>
          </button>
        </div>
      </motion.div>
    </section>
  );
}
