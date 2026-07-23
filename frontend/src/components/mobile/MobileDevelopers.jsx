import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./MobileDevelopers.css";

const stories = [
  {
    id: 1,
    user: "sachin_codes",
    name: "Sachin Kumar",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
    status: "Refactoring Socket Engine",
    color: "#3b82f6",
    code: `const io = new Server(server, {\n  cors: {\n    origin: "*",\n    methods: ["GET", "POST"]\n  }\n});`
  },
  {
    id: 2,
    user: "aman_dev",
    name: "Aman Sharma",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80",
    status: "Coding Python Sandbox",
    color: "#10b981",
    code: `import docker\n\ndef spin_sandbox(image):\n    client = docker.from_env()\n    return client.containers.run(\n        image, detach=True, tty=True\n    )`
  },
  {
    id: 3,
    user: "katarina_chen",
    name: "Katarina Chen",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
    status: "Designing Multiplayer Canvas",
    color: "#a855f7",
    code: `ctx.beginPath();\nctx.strokeStyle = activeColor;\nctx.lineWidth = brushWidth;\nctx.moveTo(prevX, prevY);\nctx.lineTo(currentX, currentY);\nctx.stroke();`
  },
  {
    id: 4,
    user: "sarah_sys",
    name: "Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
    status: "Configuring WebRTC iceCandidates",
    color: "#f59e0b",
    code: `pc.onicecandidate = (event) => {\n  if (event.candidate) {\n    socket.emit("ice-candidate", {\n      candidate: event.candidate,\n      roomId\n    });\n  }\n};`
  },
  {
    id: 5,
    user: "markus_vance",
    name: "Markus Vance",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
    status: "Optimizing Follow Array Sync",
    color: "#ec4899",
    code: `await User.updateMany(\n  {},\n  { $pull: { followers: userId, following: userId } }\n);\nawait Follow.deleteMany({ follower: userId });`
  }
];

export default function MobileDevelopers() {
  const [activeStory, setActiveStory] = useState(null);
  const navigate = useNavigate();

  return (
    <section className="mobile-devs-section">
      <div className="mobile-devs-header">
        <h3 className="mobile-stories-title">
          <Sparkles size={16} style={{ color: "#3b82f6" }} />
          <span>Live Developers Sharing Code</span>
        </h3>
      </div>

      {/* Swipeable Carousel */}
      <div className="mobile-devs-carousel">
        {stories.map((story) => (
          <div
            key={story.id}
            className="mobile-story-card"
            onClick={() => setActiveStory(story)}
          >
            <div className="story-card-top">
              <div className="story-avatar-wrapper" style={{ borderColor: story.color }}>
                <img src={story.avatar} alt={story.name} className="story-avatar" />
                <span className="story-pulse-dot" style={{ backgroundColor: story.color }} />
              </div>
              <div className="story-user-info">
                <span className="story-user-name">{story.name}</span>
                <span className="story-handle">@{story.user}</span>
              </div>
            </div>

            <div className="story-card-body">
              <span className="story-status-tag" style={{ color: story.color }}>● LIVE SNAPSHOT</span>
              <p className="story-status-text">{story.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Story Modal */}
      <AnimatePresence>
        {activeStory && (
          <div className="story-modal-overlay" onClick={() => setActiveStory(null)}>
            <motion.div
              className="story-modal-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="story-modal-header">
                <div className="story-modal-profile">
                  <img src={activeStory.avatar} alt={activeStory.name} className="modal-avatar" />
                  <div>
                    <h4 className="modal-name">{activeStory.name}</h4>
                    <span className="modal-handle">@{activeStory.user}</span>
                  </div>
                </div>
                <button className="modal-close-btn" onClick={() => setActiveStory(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="story-modal-body">
                <span className="modal-tag" style={{ color: activeStory.color }}>● LIVE CODE SNAPSHOT</span>
                <p className="modal-status">{activeStory.status}</p>
                <pre className="modal-code">
                  <code>{activeStory.code}</code>
                </pre>
              </div>

              <div className="story-modal-footer">
                <button
                  className="modal-action-btn"
                  onClick={() => {
                    setActiveStory(null);
                    navigate("/register");
                  }}
                >
                  <span>Join Coding Room</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
