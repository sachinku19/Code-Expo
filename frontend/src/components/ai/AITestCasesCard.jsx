import React, { useState } from "react";
import { CheckSquare, Copy, Plus } from "lucide-react";

const TestCategory = ({ title, tests }) => {
  if (!tests || tests.length === 0) return null;
  return (
    <div className="test-category-block">
      <h5>{title}</h5>
      <div className="tests-list">
        {tests.map((test, idx) => (
          <div key={idx} className="test-item-card">
            <div className="test-item-header">
              <span className="test-name">{test.name || test.scenario}</span>
              <span className="expected-pill">Expected: {test.expected}</span>
            </div>
            {test.code && (
              <pre className="test-code-snippet">
                <code>{test.code}</code>
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AITestCasesCard = ({ data, onInsertBelow }) => {
  if (!data) return null;

  const {
    unitTestFramework = "Jest",
    sampleTests = [],
    edgeCases = [],
    largeInputs = [],
    invalidInputs = [],
    testSuiteCode = ""
  } = data;

  const [copied, setCopied] = useState(false);

  const handleCopySuite = () => {
    if (testSuiteCode) {
      navigator.clipboard.writeText(testSuiteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ai-specialized-card test-cases-card">
      <div className="card-top-header">
        <div className="header-badge">
          <CheckSquare size={14} />
          <span>Generated Test Suite ({unitTestFramework})</span>
        </div>
        {testSuiteCode && (
          <div className="card-actions-row">
            <button className="sm-btn" onClick={handleCopySuite}>
              <Copy size={12} />
              <span>{copied ? "Copied!" : "Copy Suite"}</span>
            </button>
            {onInsertBelow && (
              <button className="sm-btn primary" onClick={() => onInsertBelow(testSuiteCode)}>
                <Plus size={12} />
                <span>Insert Below</span>
              </button>
            )}
          </div>
        )}
      </div>

      <TestCategory title="Sample Unit Tests" tests={sampleTests} />
      <TestCategory title="Edge Cases" tests={edgeCases} />
      <TestCategory title="Large Boundary Inputs" tests={largeInputs} />
      <TestCategory title="Invalid Inputs" tests={invalidInputs} />

      {testSuiteCode && (
        <div className="improved-code-section">
          <div className="section-title-bar">
            <span>Complete Test Suite Code</span>
          </div>
          <pre className="code-block-preview">
            <code>{testSuiteCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default AITestCasesCard;
