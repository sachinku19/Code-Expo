import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./MobileCTA.css";

export default function MobileCTA({ user }) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (user) {
      navigate(user?.role === "admin" ? "/admin" : "/dashboard");
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="mobile-cta-section">
      <motion.div
        className="mobile-cta-card"
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="cta-heading">Ready to write code together?</h2>
        <p className="cta-desc">
          Spin up a secure multiplayer coding environment and connect with other developers instantly.
        </p>

        <button className="cta-primary-btn" onClick={handleAction}>
          <span>{user ? "Go to Dashboard" : "Get Started for Free"}</span>
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </section>
  );
}
