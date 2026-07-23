import React from "react";
import { motion } from "framer-motion";
import {
  Code,
  Video,
  Layout,
  Compass,
  MicOff,
  Heart,
  MessageCircle,
  Lock,
  Mic,
  PhoneOff
} from "lucide-react";
import "./MobileFeatures.css";

export default function MobileFeatures() {
  return (
    <section className="mobile-features-section" id="features">
      {/* Section Header (Exact desktop text) */}
      <div className="mobile-features-header">
        <span className="mobile-section-tag">Value Proposition</span>
        <h2 className="mobile-features-title">Built for developer productivity.</h2>
        <p className="mobile-features-sub">
          All the tools you need to pair program, debug, share knowledge, and build your digital footprint in one unified interface.
        </p>
      </div>

      {/* Feature Cards Stack */}
      <div className="features-stack">
        {/* Card 1: Real-time Document Synchronization */}
        <motion.div
          className="mobile-feature-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="feature-card-header">
            <div className="feature-icon-badge blue">
              <Code size={18} />
            </div>
            <h3 className="feature-card-title">Real-time Document Synchronization</h3>
          </div>
          <p className="feature-card-desc">
            Collaborate instantly with zero latency using advanced Conflict-free Replicated Data Types (CRDTs). Experience conflict-free simultaneous editing in any language.
          </p>
          <div className="mini-graphic code-sync-box">
            <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "11px", color: "#3b82f6" }}>
              {`// Syncing thread...\nyDoc.getText('monaco')\n  .insert(0, '// Start collaboration');`}
            </pre>
          </div>
        </motion.div>

        {/* Card 2: Integrated Calls */}
        <motion.div
          className="mobile-feature-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="feature-card-header">
            <div className="feature-icon-badge purple">
              <Video size={18} />
            </div>
            <h3 className="feature-card-title">Integrated Calls</h3>
          </div>
          <p className="feature-card-desc">
            No need to switch to Zoom or Slack. Start audio and video calls directly within your coding session.
          </p>
          <div className="mini-graphic calls-box">
            <div className="call-feed-row">
              <div className="mini-feed-item">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Sachin"
                  className="feed-avatar"
                />
                <span className="feed-name">Sachin</span>
              </div>
              <div className="mini-feed-item muted">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Aman"
                  className="feed-avatar"
                />
                <span className="feed-name">Aman</span>
                <MicOff size={10} className="mute-icon" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Shared Whiteboard */}
        <motion.div
          className="mobile-feature-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="feature-card-header">
            <div className="feature-icon-badge emerald">
              <Layout size={18} />
            </div>
            <h3 className="feature-card-title">Shared Whiteboard</h3>
          </div>
          <p className="feature-card-desc">
            Sketch architecture diagrams, lay out system flows, and brainstorm UI layouts with multiplayer drawing canvas tools.
          </p>
          <div className="mini-graphic whiteboard-box">
            <div className="whiteboard-diagram">
              <span className="wb-box">Client App</span>
              <span className="wb-arrow">→</span>
              <span className="wb-box gateway">API Gateway</span>
              <span className="wb-arrow">→</span>
              <span className="wb-box db">Postgres</span>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Developer Social Space */}
        <motion.div
          className="mobile-feature-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="feature-card-header">
            <div className="feature-icon-badge amber">
              <Compass size={18} />
            </div>
            <h3 className="feature-card-title">Developer Social Space</h3>
          </div>
          <p className="feature-card-desc">
            Post code snippets, share engineering notes, build your follower base, and connect with other developers globally.
          </p>
          <div className="feed-post-preview">
            <div className="post-header-mini">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&h=60&q=80"
                alt="Sachin"
                className="post-avatar"
              />
              <div>
                <span className="post-user-name">Sachin Kumar</span>
                <span className="post-handle">@sachin_codes</span>
              </div>
            </div>
            <p className="post-text">
              Optimized the collaborative canvas component using matrix coordinates. Sync rates are up 40%! ⚡
            </p>
            <div className="post-stats">
              <span><Heart size={11} /> 42 likes</span>
              <span><MessageCircle size={11} /> 8 comments</span>
              <span className="tag">#react</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
