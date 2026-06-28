import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Play, Rocket } from "lucide-react";
import "./CTA.css";

function CTA({ onWatchDemo }) {
  const navigate = useNavigate();

  return (
    <section className="cta">
      <motion.div
        className="cta-card"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6 }}
      >
        <div className="cta-glow"></div>
        <div className="cta-content">
          <span className="cta-badge">
            <Rocket size={14} className="cta-badge-icon" />
            <span>Start Building Today</span>
          </span>

          <h2>
            Build, Collaborate
            <br />
            & Ship Faster
          </h2>

          <p>
            Create secure coding rooms, invite teammates, run code in isolated sandboxes, and build software in real-time.
          </p>

          <div className="cta-buttons">
            <button className="cta-primary" onClick={() => navigate("/register")}>
              Create Workspace
              <ArrowRight size={18} />
            </button>

            <button className="cta-secondary" onClick={onWatchDemo}>
              <Play size={16} />
              Watch Demo
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default CTA;
