import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./MobileTestimonials.css";

const defaultTestimonials = [
  {
    _id: "default-1",
    comment: "We transitioned all of our interview sessions and live debugging workflows to CodeExpo. The built-in audio/video runs incredibly smoothly.",
    rating: 5,
    user: { username: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80", programmingLanguages: ["TypeScript", "Rust"] }
  },
  {
    _id: "default-2",
    comment: "Being able to sketch out architectures on the multiplayer whiteboard right next to my editor files is a huge productivity booster.",
    rating: 5,
    user: { username: "Katarina Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80", programmingLanguages: ["Go", "React"] }
  },
  {
    _id: "default-3",
    comment: "The social hub has allowed me to share my daily projects and build a following of developers directly interested in my code.",
    rating: 5,
    user: { username: "Markus Vance", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80", programmingLanguages: ["Python", "Docker"] }
  }
];

export default function MobileTestimonials({ reviews }) {
  const activeReviews = Array.isArray(reviews) && reviews.length > 0 ? reviews : defaultTestimonials;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeReviews.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeReviews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeReviews.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeReviews.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeReviews.length) % activeReviews.length);
  };

  const item = activeReviews[currentIndex];
  const username = item?.user?.username || "Anonymous";
  const avatar = item?.user?.avatar;
  const langs = Array.isArray(item?.user?.programmingLanguages) ? item.user.programmingLanguages : [];
  const title = langs.length > 0 ? langs.join(", ") : "Developer";

  return (
    <section className="mobile-testimonials-section" id="testimonials">
      {/* Header (Exact desktop text) */}
      <div className="mobile-testimonials-header">
        <span className="mobile-section-tag">CLIENT VOICES</span>
        <h2 className="mobile-testimonials-title">Trusted By Developers</h2>
        <p className="mobile-testimonials-sub">
          Real feedback from engineers, builders, and developers who chose CodeExpo to sync their project development and pairing sessions.
        </p>
      </div>

      <div className="testimonial-card-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={item._id || currentIndex}
            className="mobile-testimonial-card"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {/* Stars */}
            <div className="stars-row">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    color: i < (item.rating || 5) ? "#eab308" : "rgba(255, 255, 255, 0.2)",
                    fontSize: "14px"
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            <p className="testimonial-quote">"{item.comment || "No comment provided."}"</p>

            <div className="testimonial-author">
              <div className="author-avatar-wrapper">
                {avatar ? (
                  <img src={avatar} alt={username} className="author-avatar" />
                ) : (
                  <div className="author-avatar-fallback">{username.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="author-info">
                <h4 className="author-name">{username}</h4>
                <span className="author-role">{title}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrow buttons */}
        <div className="testimonial-nav-bar">
          <button className="testimonial-nav-btn" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <span className="testimonial-counter">
            {String(currentIndex + 1).padStart(2, "0")} / {String(activeReviews.length).padStart(2, "0")}
          </span>
          <button className="testimonial-nav-btn" onClick={handleNext} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
