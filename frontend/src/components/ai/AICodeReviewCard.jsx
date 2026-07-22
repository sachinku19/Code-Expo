import React from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, Sparkles, Copy, Check, Plus, Eye } from "lucide-react";

const ScoreBar = ({ label, score }) => {
  const getScoreColor = (val) => {
    if (val >= 85) return "#34d399";
    if (val >= 70) return "#fbbf24";
    return "#f87171";
  };

  return (
    <div className="score-bar-item">
      <div className="score-bar-header">
        <span>{label}</span>
        <span style={{ color: getScoreColor(score), fontWeight: 700 }}>{score}%</span>
      </div>
      <div className="score-progress-track">
        <div
          className="score-progress-fill"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreColor(score)
          }}
        />
      </div>
    </div>
  );
};

const AICodeReviewCard = ({ data, onPreviewDiff, onReplaceCode, onInsertBelow }) => {
  if (!data) return null;

  const {
    overallScore = 80,
    readabilityScore = 80,
    maintainabilityScore = 80,
    performanceScore = 80,
    securityScore = 80,
    bestPractices = [],
    suggestions = [],
    improvedCode = "",
    summary = ""
  } = data;

  const handleCopy = () => {
    if (improvedCode) {
      navigator.clipboard.writeText(improvedCode);
    }
  };

  return (
    <div className="ai-specialized-card code-review-card">
      <div className="card-top-header">
        <div className="header-badge">
          <ShieldCheck size={14} />
          <span>Code Review Report</span>
        </div>
        <div className="overall-score-pill">
          <span className="score-num">{overallScore}</span>
          <span className="score-denom">/ 100</span>
        </div>
      </div>

      {summary && <p className="review-summary-text">{summary}</p>}

      <div className="scores-grid">
        <ScoreBar label="Readability" score={readabilityScore} />
        <ScoreBar label="Maintainability" score={maintainabilityScore} />
        <ScoreBar label="Performance" score={performanceScore} />
        <ScoreBar label="Security" score={securityScore} />
      </div>

      {bestPractices.length > 0 && (
        <div className="review-section">
          <h4><CheckCircle2 size={13} className="text-success" /> Best Practices Followed</h4>
          <ul>
            {bestPractices.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="review-section">
          <h4><AlertTriangle size={13} className="text-warning" /> Suggested Improvements</h4>
          <ul>
            {suggestions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {improvedCode && (
        <div className="improved-code-section">
          <div className="section-title-bar">
            <span><Sparkles size={13} /> Improved Code Solution</span>
            <div className="code-card-actions">
              <button onClick={handleCopy} title="Copy Code"><Copy size={12} /></button>
              {onPreviewDiff && (
                <button onClick={() => onPreviewDiff(improvedCode)} title="Preview Diff"><Eye size={12} /></button>
              )}
              {onInsertBelow && (
                <button onClick={() => onInsertBelow(improvedCode)} title="Insert Below"><Plus size={12} /></button>
              )}
              {onReplaceCode && (
                <button onClick={() => onReplaceCode(improvedCode)} title="Replace Selection"><Check size={12} /></button>
              )}
            </div>
          </div>
          <pre className="code-block-preview">
            <code>{improvedCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default AICodeReviewCard;
