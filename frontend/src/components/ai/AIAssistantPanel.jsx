import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  RefreshCw,
  Zap,
  Code2,
  ShieldCheck,
  CheckSquare,
  FileText,
  Languages,
  MessageSquare,
  ChevronRight,
  Plus,
  FilePlus,
  Eye,
  Terminal,
  HelpCircle,
  AlertCircle,
  RotateCcw,
  X,
  GripHorizontal,
  Bot,
  Wrench,
  Globe,
  Cpu,
  FileCode2
} from "lucide-react";
import * as aiService from "../../services/aiService";
import AICodeReviewCard from "./AICodeReviewCard";
import AIOptimizationCard from "./AIOptimizationCard";
import AITestCasesCard from "./AITestCasesCard";
import AIDocumentationCard from "./AIDocumentationCard";
import AIDiffViewerModal from "./AIDiffViewerModal";
import "./AIAssistantPanel.css";

const QUICK_ACTIONS = [
  { id: "explain", label: "Explain Code", icon: HelpCircle, color: "#38bdf8" },
  { id: "fix", label: "Fix Bug", icon: Wrench, color: "#ef4444" },
  { id: "optimize", label: "Optimize Code", icon: Zap, color: "#eab308" },
  { id: "generate-code", label: "Generate Code", icon: Code2, color: "#a855f7" },
  { id: "generate-comments", label: "Generate Comments", icon: MessageSquare, color: "#10b981" },
  { id: "documentation", label: "Generate Docs", icon: FileText, color: "#c084fc" },
  { id: "review", label: "Review Code", icon: ShieldCheck, color: "#10b981" },
  { id: "generate-tests", label: "Generate Tests", icon: CheckSquare, color: "#3b82f6" },
  { id: "convert-language", label: "Convert Language", icon: Languages, color: "#ec4899" },
  { id: "chat", label: "Ask AI", icon: Sparkles, color: "#6366f1" }
];

const AIAssistantPanel = ({
  roomId,
  username = "Developer",
  selectedCode = "",
  fullCode = "",
  activeFileName = "active file",
  language = "javascript",
  onReplaceCode,
  onInsertBelow,
  onUndoCode,
  isCollapsed = false,
  onToggleCollapse,
  onClose,
  onHeaderMouseDown,
  isDragging = false
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const getDetectedLanguage = () => {
    if (activeFileName && activeFileName.includes(".")) {
      const ext = activeFileName.split(".").pop().toLowerCase();
      const extMap = {
        cpp: "C++",
        c: "C",
        py: "Python",
        js: "JavaScript",
        jsx: "JavaScript (React)",
        ts: "TypeScript",
        tsx: "TypeScript (React)",
        java: "Java",
        go: "Go",
        rs: "Rust",
        html: "HTML",
        css: "CSS",
        json: "JSON",
        sql: "SQL",
        sh: "Shell Script"
      };
      if (extMap[ext]) return extMap[ext];
    }
    return language || "Auto-Detected";
  };
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [insertedMsgId, setInsertedMsgId] = useState(null);
  
  // Diff viewer state
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState("");
  const [diffModified, setDiffModified] = useState("");

  const chatEndRef = useRef(null);

  useEffect(() => {
    // Initial welcome message personalized with username
    setMessages([
      {
        id: "init-1",
        sender: "ai",
        actionType: "chat",
        text: `Welcome ${username}! 👋 I am ExpoAI, your dedicated AI Assistant. Highlight any code in Monaco Editor OR simply type your question below — active code is automatically attached as context!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  }, [username]);

  const extractRawCode = (text) => {
    if (!text || typeof text !== "string") return text;
    const codeBlockRegex = /```(?:[a-zA-Z0-9#+-]+)?\s*\n?([\s\S]*?)\s*```/g;
    const matches = [];
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        matches.push(match[1].trim());
      }
    }
    if (matches.length > 0) {
      return matches.join("\n\n");
    }
    return text.trim();
  };

  const formatMarkdownText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");
    const elements = [];
    let inList = false;
    let listItems = [];

    const flushList = (key) => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`ul-${key}`} className="formatted-markdown-list">
            {listItems.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const formatInline = (str) => {
      if (!str) return "";
      const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return <code key={i} className="inline-code-badge">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("### ")) {
        flushList(index);
        elements.push(<h4 key={index} className="formatted-md-h4">{formatInline(trimmed.slice(4))}</h4>);
      } else if (trimmed.startsWith("## ")) {
        flushList(index);
        elements.push(<h3 key={index} className="formatted-md-h3">{formatInline(trimmed.slice(3))}</h3>);
      } else if (trimmed.startsWith("# ")) {
        flushList(index);
        elements.push(<h2 key={index} className="formatted-md-h2">{formatInline(trimmed.slice(2))}</h2>);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.slice(2));
      } else if (trimmed === "") {
        flushList(index);
      } else {
        flushList(index);
        elements.push(
          <p key={index} className="formatted-md-p">
            {formatInline(trimmed)}
          </p>
        );
      }
    });

    flushList(lines.length);
    return <div className="formatted-markdown-body">{elements}</div>;
  };

  const renderMessageContent = (text, msg) => {
    if (!text || typeof text !== "string") return <div>{text}</div>;

    const codeBlockRegex = /```([a-zA-Z0-9#+-]*)\s*\n?([\s\S]*?)\s*```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index).trim();
        if (textBefore) {
          parts.push({ type: "text", content: textBefore });
        }
      }

      const lang = match[1] || getDetectedLanguage() || "CODE";
      const codeSnippet = match[2].trim();
      parts.push({ type: "code", language: lang, content: codeSnippet });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const textAfter = text.slice(lastIndex).trim();
      if (textAfter) {
        parts.push({ type: "text", content: textAfter });
      }
    }

    if (parts.length === 0) {
      return formatMarkdownText(text);
    }

    return (
      <div className="parsed-message-container" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
        {parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              <div key={idx} className="text-explanation-block" style={{ width: "100%" }}>
                {formatMarkdownText(part.content)}
              </div>
            );
          }

          return (
            <div key={idx} className="dedicated-code-card">
              <div className="code-card-header">
                <div className="code-card-title">
                  <Code2 size={12} className="text-accent" />
                  <span>{part.language.toUpperCase()} CODE</span>
                </div>
                <div className="code-card-actions">
                  <button
                    className="ai-card-mini-btn"
                    onClick={() => navigator.clipboard.writeText(part.content)}
                    title="Copy Code Only"
                  >
                    <Copy size={11} /> Copy
                  </button>
                  {onReplaceCode && (
                    <button
                      className="ai-card-mini-btn btn-accent"
                      onClick={() => onReplaceCode(part.content)}
                      title="Replace Code in Editor"
                    >
                      <Check size={11} /> Replace
                    </button>
                  )}
                  {onInsertBelow && (
                    <button
                      className="ai-card-mini-btn btn-success"
                      onClick={() => {
                        onInsertBelow(part.content);
                        setInsertedMsgId(msg.id);
                      }}
                      title="Insert Code Below Selection"
                    >
                      <Plus size={11} /> Insert
                    </button>
                  )}
                </div>
              </div>

              <div className="code-card-body">
                <pre><code>{part.content}</code></pre>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (actionType = "chat", customPrompt = "") => {
    const promptToSend = customPrompt || inputText;
    const snippetToAttach = selectedCode || fullCode || "";

    if (!promptToSend.trim() && !snippetToAttach.trim() && actionType === "chat") {
      return;
    }

    setErrorMsg("");
    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    const userMsg = {
      id: userMsgId,
      sender: "user",
      text: promptToSend || `[Action: ${actionType}]`,
      codeSnippet: selectedCode ? `[Selection: ${selectedCode.split('\n').length} lines]\n${selectedCode}` : (fullCode ? `[File: ${activeFileName}]\n${fullCode.slice(0, 1000)}` : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const payload = {
        roomId,
        prompt: promptToSend || `Perform ${actionType} on attached code.`,
        selectedCode: snippetToAttach,
        language: getDetectedLanguage(),
        targetLanguage: getDetectedLanguage()
      };

      let res;
      switch (actionType) {
        case "explain": res = await aiService.explainCode(payload); break;
        case "fix": res = await aiService.fixCode(payload); break;
        case "optimize": res = await aiService.optimizeCode(payload); break;
        case "review": res = await aiService.reviewCode(payload); break;
        case "generate-tests": res = await aiService.generateTests(payload); break;
        case "documentation": res = await aiService.generateDocumentation(payload); break;
        case "convert-language": res = await aiService.convertLanguage(payload); break;
        case "chat":
        default:
          res = await aiService.sendAIChat(payload);
          break;
      }

      const aiMsg = {
        id: aiMsgId,
        sender: "ai",
        actionType: res.actionType || actionType,
        responsePayload: res.reply,
        text: typeof res.reply === "string" ? res.reply : null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Request failed:", err);
      const errText = err.response?.data?.message || err.message || "Failed to reach AI Assistant server.";
      setErrorMsg(errText);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          isError: true,
          text: `⚠️ ${errText}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: "ai",
        actionType: "chat",
        text: "Chat history cleared. How can I assist you next?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const openDiffViewer = (modifiedText) => {
    setDiffOriginal(selectedCode || "// Selected code block");
    setDiffModified(modifiedText);
    setDiffModalOpen(true);
  };

  if (isCollapsed) {
    return (
      <div className="ai-panel-collapsed-bar" onClick={onToggleCollapse} title="Expand AI Panel">
        <Sparkles size={16} className="sparkle-pulse" />
        <span className="collapsed-title">ExpoAI Assistant</span>
      </div>
    );
  }

  return (
    <div className="ai-assistant-panel-container">
      {/* Header (Draggable) */}
      <div
        className="ai-panel-header"
        onMouseDown={onHeaderMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        title="Click & Drag to move AI Assistant anywhere"
      >
        <div className="ai-brand-group">
          <div className="ai-drag-handle" style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.4)", marginRight: "2px" }}>
            <GripHorizontal size={16} />
          </div>
          <div className="ai-avatar-icon">
            <Bot size={18} className="ai-copilot-bot-icon" />
          </div>
          <div>
            <h3 className="ai-panel-title">ExpoAI Assistant</h3>
            <span className="ai-panel-subtitle">CodeExpo Copilot</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="icon-action-btn" onClick={handleClearChat} title="Clear Chat History">
            <Trash2 size={14} />
          </button>
          {onToggleCollapse && (
            <button className="icon-action-btn" onClick={onToggleCollapse} title="Collapse Panel">
              <ChevronRight size={16} />
            </button>
          )}
          {(onClose || onToggleCollapse) && (
            <button
              className="icon-action-btn close-action-btn"
              onClick={onClose || onToggleCollapse}
              title="Close AI Assistant"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Selected Code / Active File Context Bar */}
      {selectedCode ? (
        <div className="selected-code-banner" style={{ background: "rgba(99, 102, 241, 0.15)", borderBottom: "1px solid rgba(99, 102, 241, 0.3)" }}>
          <div className="banner-info">
            <Code2 size={13} style={{ color: "#818cf8" }} />
            <span className="banner-text" style={{ color: "#c7d2fe" }}>Highlighted Code Attached ({selectedCode.split("\n").length} lines)</span>
          </div>
          <span className="active-dot" style={{ backgroundColor: "#818cf8" }} />
        </div>
      ) : fullCode ? (
        <div className="selected-code-banner" style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div className="banner-info">
            <FileCode2 size={13} style={{ color: "#10b981" }} />
            <span className="banner-text" style={{ color: "#9ca3af" }}>Active File Context: <strong>{activeFileName}</strong> ({fullCode.split("\n").length} lines)</span>
          </div>
          <span className="active-dot" style={{ backgroundColor: "#10b981" }} />
        </div>
      ) : null}

      {/* Quick Action Chips Bar */}
      <div className="quick-actions-bar">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className="quick-action-chip"
              onClick={() => handleSend(action.id)}
              disabled={loading}
            >
              <Icon size={13} style={{ color: action.color }} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Auto-Detected Language Status Bar */}
      <div className="target-lang-bar">
        <span className="target-lang-label"><Globe size={13} style={{ color: "#818cf8" }} /> Auto-Detected Language:</span>
        <span className="auto-detected-badge">
          <Cpu size={12} style={{ color: "#a855f7" }} /> {getDetectedLanguage()}
        </span>
      </div>

      {/* Chat Messages Feed */}
      <div className="ai-messages-feed">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const textContent = msg.text || (typeof msg.responsePayload === "string" ? msg.responsePayload : null);
          return (
            <div key={msg.id} className={`message-row ${isUser ? "user-message" : "ai-message"} ${msg.isError ? "error-message" : ""}`}>
              <div className="message-header-row">
                <span className="sender-label">{isUser ? "You" : "ExpoAI"}</span>
                <span className="timestamp">{msg.timestamp}</span>
              </div>

              {msg.codeSnippet && (
                <div className="user-attached-snippet">
                  <span className="snippet-tag">Context Snippet:</span>
                  <pre><code>{msg.codeSnippet}</code></pre>
                </div>
              )}

              {/* Render Standard Text vs Specialized Structured Component */}
              <div className="message-bubble">
                {msg.actionType === "review" && typeof msg.responsePayload === "object" ? (
                  <AICodeReviewCard
                    data={msg.responsePayload}
                    onPreviewDiff={openDiffViewer}
                    onReplaceCode={onReplaceCode}
                    onInsertBelow={onInsertBelow}
                  />
                ) : msg.actionType === "optimize" && typeof msg.responsePayload === "object" ? (
                  <AIOptimizationCard
                    data={msg.responsePayload}
                    onPreviewDiff={openDiffViewer}
                    onReplaceCode={onReplaceCode}
                    onInsertBelow={onInsertBelow}
                  />
                ) : msg.actionType === "generate-tests" && typeof msg.responsePayload === "object" ? (
                  <AITestCasesCard
                    data={msg.responsePayload}
                    onInsertBelow={onInsertBelow}
                  />
                ) : msg.actionType === "documentation" && typeof msg.responsePayload === "object" ? (
                  <AIDocumentationCard
                    data={msg.responsePayload}
                    onInsertBelow={onInsertBelow}
                  />
                ) : (
                  <div className="markdown-content-body">
                    {renderMessageContent(textContent || JSON.stringify(msg.responsePayload), msg)}
                    
                    {!isUser && textContent && (
                      <div className="ai-bubble-actions-row">
                        <button
                          className="ai-action-btn ai-btn-copy"
                          onClick={() => navigator.clipboard.writeText(extractRawCode(textContent))}
                          title="Copy Response"
                        >
                          <Copy size={11} /> Copy
                        </button>
                        {onReplaceCode && (
                          <button
                            className="ai-action-btn ai-btn-replace"
                            onClick={() => onReplaceCode(extractRawCode(textContent))}
                            title="Replace Selected Code in Editor"
                          >
                            <CheckCheck size={12} /> Replace Code
                          </button>
                        )}
                        {onInsertBelow && (
                          <button
                            className="ai-action-btn ai-btn-insert"
                            onClick={() => {
                              onInsertBelow(extractRawCode(textContent));
                              setInsertedMsgId(msg.id);
                            }}
                            title="Insert Below Selection"
                          >
                            <FilePlus size={12} /> Insert Below
                          </button>
                        )}
                        {onUndoCode && (
                          <button
                            className="ai-action-btn ai-btn-undo"
                            onClick={() => onUndoCode()}
                            title="Undo Last Insertion (or press Ctrl+Z in editor)"
                          >
                            <RotateCcw size={11} /> Undo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="message-row ai-message thinking-indicator">
            <div className="thinking-bubble">
              <Loader2 size={14} className="spin-loader" />
              <span>ExpoAI is analyzing your code...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <div className="ai-input-area">
        <form
          className="input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend("chat");
          }}
        >
          <input
            type="text"
            className="ai-chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={selectedCode ? "Ask AI about selected code..." : "Ask ExpoAI anything..."}
            disabled={loading}
          />
          <button type="submit" className="send-btn" disabled={loading || !inputText.trim()}>
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* Diff Preview Modal */}
      <AIDiffViewerModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        originalCode={diffOriginal}
        modifiedCode={diffModified}
        language={language}
        onReplace={onReplaceCode}
        onInsertBelow={onInsertBelow}
      />
    </div>
  );
};

export default AIAssistantPanel;
