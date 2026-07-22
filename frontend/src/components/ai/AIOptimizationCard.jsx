import React from "react";
import { Zap, ArrowRight, Copy, Check, Plus, Eye } from "lucide-react";

const AIOptimizationCard = ({ data, onPreviewDiff, onReplaceCode, onInsertBelow }) => {
  if (!data) return null;

  const {
    beforeCode = "",
    afterCode = "",
    timeComplexityBefore = "N/A",
    timeComplexityAfter = "N/A",
    spaceComplexityBefore = "N/A",
    spaceComplexityAfter = "N/A",
    performanceGain = "Optimized",
    explanation = ""
  } = data;

  const handleCopy = () => {
    if (afterCode) {
      navigator.clipboard.writeText(afterCode);
    }
  };

  return (
    <div className="ai-specialized-card optimization-card">
      <div className="card-top-header">
        <div className="header-badge">
          <Zap size={14} />
          <span>Code Optimization Report</span>
        </div>
        <div className="gain-badge">{performanceGain}</div>
      </div>

      <div className="complexity-grid">
        <div className="complexity-box">
          <span className="box-title">Time Complexity</span>
          <div className="complexity-comparison">
            <span className="before">{timeComplexityBefore}</span>
            <ArrowRight size={12} className="arrow" />
            <span className="after">{timeComplexityAfter}</span>
          </div>
        </div>

        <div className="complexity-box">
          <span className="box-title">Space Complexity</span>
          <div className="complexity-comparison">
            <span className="before">{spaceComplexityBefore}</span>
            <ArrowRight size={12} className="arrow" />
            <span className="after">{spaceComplexityAfter}</span>
          </div>
        </div>
      </div>

      {explanation && <p className="optimization-explanation">{explanation}</p>}

      {afterCode && (
        <div className="improved-code-section">
          <div className="section-title-bar">
            <span>Optimized Code</span>
            <div className="code-card-actions">
              <button onClick={handleCopy} title="Copy Code"><Copy size={12} /></button>
              {onPreviewDiff && (
                <button onClick={() => onPreviewDiff(afterCode)} title="Preview Diff"><Eye size={12} /></button>
              )}
              {onInsertBelow && (
                <button onClick={() => onInsertBelow(afterCode)} title="Insert Below"><Plus size={12} /></button>
              )}
              {onReplaceCode && (
                <button onClick={() => onReplaceCode(afterCode)} title="Replace Selection"><Check size={12} /></button>
              )}
            </div>
          </div>
          <pre className="code-block-preview">
            <code>{afterCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default AIOptimizationCard;
