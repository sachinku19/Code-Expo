import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trophy, Calendar, Send, Flame, Sparkles, Award } from "lucide-react";
import "./SocialHubShowcase.css";

function SocialHubShowcase() {
  const [messages, setMessages] = useState([
    { sender: "Sachin", text: "Hey! Let's work on the compiling server.", time: "11:15 AM" },
    { sender: "Aman", text: "Sure, let's open room 'collaborative-sandbox' and run some code.", time: "11:16 AM" }
  ]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);

  // Simulated leaderboard records
  const leaderboard = [
    { rank: 1, name: "Sachin", badge: "System Admin", points: 8420, activeHours: 420 },
    { rank: 2, name: "Aman", badge: "Legendary Architect", points: 7650, activeHours: 382 },
    { rank: 3, name: "You (Mock Profile)", badge: "Elite Builder", points: 3120, activeHours: 156 }
  ];

  // Simulated Heatmap Grid (12 columns x 7 rows representing a mini calendar grid)
  const heatmapCols = 12;
  const heatmapRows = 7;
  const heatmapCells = Array.from({ length: heatmapCols * heatmapRows }, (_, i) => {
    // Generate levels dynamically for realistic heatmap look
    const val = (i * 7 + i % 3 * 19) % 5;
    return { id: i, level: val, points: val * 10 };
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender: "You",
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulate response from Sachin or Aman
    setTimeout(() => {
      const bots = ["Sachin", "Aman"];
      const selectedBot = bots[Math.floor(Math.random() * bots.length)];
      const botReplies = [
        "That's a great approach! I just pushed some changes.",
        "Let's sync up on the shared whiteboard to diagram this structure.",
        "Compiling Python sandbox... Exited successfully in 0.14s!",
        "Let's start a video call directly inside the workspace room.",
        "I'll check the activity heatmap feed to log our points."
      ];

      const responseMsg = {
        sender: selectedBot,
        text: botReplies[Math.floor(Math.random() * botReplies.length)],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, responseMsg]);
    }, 1200);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <section className="social-hub-showcase-section" id="social-hub">
      <div className="sh-header">
        <span className="sh-badge">
          <Trophy size={14} className="sh-badge-icon" />
          <span>Developer Ecosystem</span>
        </span>
        <h2>Developer Social Network & Rankings</h2>
        <p>
          Connect with builders, grow your followers, log daily contributions, and rank on the global leaderboard.
        </p>
      </div>

      <div className="sh-showcase-grid">
        {/* Left Side: Contribution Heatmap and Leaderboard */}
        <div className="sh-left-panel">
          {/* Heatmap Card */}
          <div className="sh-card heatmap-card">
            <div className="card-header">
              <Calendar size={16} className="card-icon" />
              <span>Contribution Activity Calendar</span>
              <span className="points-label"><Flame size={12} /> 1,240 pts earned this year</span>
            </div>
            
            <div className="heatmap-grid-container">
              <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${heatmapCols}, 1fr)` }}>
                {heatmapCells.map((cell) => (
                  <div
                    key={cell.id}
                    className={`heatmap-box level-${cell.level}`}
                    title={`${cell.points} points earned`}
                  />
                ))}
              </div>
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="heatmap-box level-0" />
              <div className="heatmap-box level-1" />
              <div className="heatmap-box level-2" />
              <div className="heatmap-box level-3" />
              <div className="heatmap-box level-4" />
              <span>More</span>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="sh-card leaderboard-card">
            <div className="card-header">
              <Trophy size={16} className="card-icon" />
              <span>Global Developer Leaderboard</span>
            </div>
            <div className="leaderboard-list">
              {leaderboard.map((dev) => (
                <div key={dev.name} className="leaderboard-item">
                  <span className={`rank rank-${dev.rank}`}>{dev.rank}</span>
                  <div className="dev-details">
                    <span className="dev-name">{dev.name}</span>
                    <span className="dev-badge-pill" style={{
                      background: dev.rank === 1 ? "linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)" : 
                                  dev.rank === 2 ? "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)" : "rgba(255,255,255,0.06)"
                    }}>
                      {dev.badge}
                    </span>
                  </div>
                  <div className="dev-stats-points">
                    <strong>{dev.points}</strong>
                    <span>pts ({dev.activeHours}h)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Simulated Chat DM Box */}
        <div className="sh-right-panel">
          <div className="sh-card chat-card">
            <div className="card-header">
              <MessageSquare size={16} className="card-icon" />
              <span>Direct Messaging Chat</span>
              <span className="status-indicator">Sachin, Aman Online</span>
            </div>

            <div className="chat-body-container">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message-bubble ${msg.sender === "You" ? "own-message" : ""}`}>
                  <div className="message-meta">
                    <span className="sender-name">{msg.sender}</span>
                    <span className="message-time">{msg.time}</span>
                  </div>
                  <p className="message-content">{msg.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-row">
              <input
                type="text"
                placeholder="Type your message to Aman or Sachin..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button type="submit" aria-label="Send message">
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SocialHubShowcase;
