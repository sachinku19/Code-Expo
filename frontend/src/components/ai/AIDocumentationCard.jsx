import React, { useState } from "react";
import { FileText, Copy, Plus } from "lucide-react";

const AIDocumentationCard = ({ data, onInsertBelow }) => {
  if (!data) return null;

  const [activeTab, setActiveTab] = useState("jsdoc");
  const { jsdocOrCommentsCode = "", functionDocs = "", apiDocs = "", readmeSection = "" } = data;

  const getActiveContent = () => {
    switch (activeTab) {
      case "jsdoc": return jsdocOrCommentsCode;
      case "function": return functionDocs;
      case "api": return apiDocs;
      case "readme": return readmeSection;
      default: return jsdocOrCommentsCode;
    }
  };

  const handleCopy = () => {
    const content = getActiveContent();
    if (content) {
      navigator.clipboard.writeText(content);
    }
  };

  return (
    <div className="ai-specialized-card documentation-card">
      <div className="card-top-header">
        <div className="header-badge">
          <FileText size={14} />
          <span>Generated Documentation</span>
        </div>
      </div>

      <div className="doc-subtabs">
        {jsdocOrCommentsCode && (
          <button
            className={`subtab-btn ${activeTab === "jsdoc" ? "active" : ""}`}
            onClick={() => setActiveTab("jsdoc")}
          >
            JSDoc / Comments
          </button>
        )}
        {functionDocs && (
          <button
            className={`subtab-btn ${activeTab === "function" ? "active" : ""}`}
            onClick={() => setActiveTab("function")}
          >
            Function Docs
          </button>
        )}
        {apiDocs && (
          <button
            className={`subtab-btn ${activeTab === "api" ? "active" : ""}`}
            onClick={() => setActiveTab("api")}
          >
            API Spec
          </button>
        )}
        {readmeSection && (
          <button
            className={`subtab-btn ${activeTab === "readme" ? "active" : ""}`}
            onClick={() => setActiveTab("readme")}
          >
            README Section
          </button>
        )}
      </div>

      <div className="doc-tab-body">
        <div className="section-title-bar">
          <span>Output Preview</span>
          <div className="code-card-actions">
            <button onClick={handleCopy} title="Copy Content"><Copy size={12} /></button>
            {onInsertBelow && (
              <button onClick={() => onInsertBelow(getActiveContent())} title="Insert Below"><Plus size={12} /></button>
            )}
          </div>
        </div>
        <pre className="code-block-preview">
          <code>{getActiveContent()}</code>
        </pre>
      </div>
    </div>
  );
};

export default AIDocumentationCard;
