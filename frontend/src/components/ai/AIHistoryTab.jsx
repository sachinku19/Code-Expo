import React, { useEffect, useState } from "react";
import { History, Trash2, RefreshCw, Sparkles, MessageSquare } from "lucide-react";
import * as aiService from "../../services/aiService";

const AIHistoryTab = ({ roomId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await aiService.getAIHistory(roomId);
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error("Failed to load AI History:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [roomId]);

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear AI conversation history for this room?")) return;
    try {
      await aiService.clearAIHistory(roomId);
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear AI History:", err);
    }
  };

  return (
    <div className="ai-history-tab-pane">
      <div className="ai-history-header">
        <span className="ai-history-title">
          <History size={15} /> Room AI Prompt History
        </span>

        <div className="ai-history-actions">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="ai-history-btn"
          >
            <RefreshCw size={12} className={loading ? "spin-loader" : ""} />
            Refresh
          </button>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="ai-history-btn btn-danger"
            >
              <Trash2 size={12} />
              Clear History
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ai-history-empty">
          Fetching room AI interactions...
        </div>
      ) : history.length > 0 ? (
        <div className="ai-history-list">
          {history.map((item) => (
            <div key={item._id} className="ai-history-card">
              <div className="ai-history-card-top">
                <span className="ai-history-action-tag">
                  <Sparkles size={12} /> Action: {item.actionType || "chat"} ({item.language || "js"})
                </span>
                <span className="ai-history-time">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="ai-history-prompt">
                <strong>Prompt:</strong> {item.prompt}
              </div>
              {item.codeSnippet && (
                <pre className="ai-history-code-preview">
                  <code>{item.codeSnippet.slice(0, 200)}{item.codeSnippet.length > 200 ? "..." : ""}</code>
                </pre>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="ai-history-empty">
          <MessageSquare size={24} style={{ marginBottom: "6px", opacity: 0.5 }} />
          <div>No AI prompt history recorded for this room yet.</div>
        </div>
      )}
    </div>
  );
};

export default AIHistoryTab;
