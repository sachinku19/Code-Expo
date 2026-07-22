import React from "react";
import { DiffEditor } from "@monaco-editor/react";
import { X, Check, Plus, Copy } from "lucide-react";
import "./AIDiffViewerModal.css";

const AIDiffViewerModal = ({
  isOpen,
  onClose,
  originalCode = "",
  modifiedCode = "",
  language = "javascript",
  onReplace,
  onInsertBelow
}) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(modifiedCode);
  };

  return (
    <div className="ai-diff-modal-overlay" onClick={onClose}>
      <div className="ai-diff-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ai-diff-modal-header">
          <div className="header-title-group">
            <span className="diff-badge">Code Diff Preview</span>
            <h3>Compare Original vs AI Solution</h3>
          </div>
          <button className="diff-close-btn" onClick={onClose} title="Close Preview">
            <X size={18} />
          </button>
        </div>

        <div className="ai-diff-modal-body">
          <div className="diff-labels-bar">
            <span className="label-original">Original Code Selection</span>
            <span className="label-modified">AI Proposed Refactor</span>
          </div>

          <div className="monaco-diff-editor-wrapper">
            <DiffEditor
              height="380px"
              language={language.toLowerCase()}
              original={originalCode}
              modified={modifiedCode}
              theme={document.body.classList.contains("light") ? "vs" : "vs-dark"}
              options={{
                renderSideBySide: true,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: "Fira Code, JetBrains Mono, monospace"
              }}
            />
          </div>
        </div>

        <div className="ai-diff-modal-footer">
          <button className="diff-btn secondary" onClick={handleCopy}>
            <Copy size={14} />
            <span>Copy Solution</span>
          </button>
          
          <div className="footer-primary-actions">
            {onInsertBelow && (
              <button
                className="diff-btn action-insert"
                onClick={() => {
                  onInsertBelow(modifiedCode);
                  onClose();
                }}
              >
                <Plus size={14} />
                <span>Insert Below Selection</span>
              </button>
            )}

            {onReplace && (
              <button
                className="diff-btn action-replace"
                onClick={() => {
                  onReplace(modifiedCode);
                  onClose();
                }}
              >
                <Check size={14} />
                <span>Replace Selected Code</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDiffViewerModal;
