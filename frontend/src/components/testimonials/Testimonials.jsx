import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { getWebsiteRatingInfo } from "../../services/websiteRatingService";
import "./Testimonials.css";

function Testimonials() {
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, ratingsCount: 0 });
  const [reviewsList, setReviewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const data = await getWebsiteRatingInfo();
        if (data.success) {
          setRatingStats({
            averageRating: data.averageRating,
            ratingsCount: data.ratingsCount
          });
          // Filter reviews that have comments
          const comments = (data.reviews || []).filter(
            (review) => review.comment && review.comment.trim() !== ""
          );
          setReviewsList(comments);
        }
      } catch (err) {
        console.error("Error fetching website ratings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRatings();
  }, []);

  return (
    <section className="testimonials">
      <div className="testimonials-header">
        <h2>Loved by Developers Worldwide</h2>
        
        {!isLoading && ratingStats.ratingsCount > 0 && (
          <div className="rating-summary-badge">
            <div className="stars-container">
              {[...Array(5)].map((_, i) => {
                const isFilled = i < Math.round(ratingStats.averageRating);
                return (
                  <Star
                    key={i}
                    size={16}
                    className={isFilled ? "star-filled" : "star-empty"}
                  />
                );
              })}
            </div>
            <span className="rating-text">
              <strong>{ratingStats.averageRating} / 5</strong> ({ratingStats.ratingsCount} review{ratingStats.ratingsCount !== 1 ? 's' : ''})
            </span>
          </div>
        )}
        
        <p>Read how engineering teams, startups, and developers build faster with Code Expo.</p>
      </div>

      {isLoading ? (
        <div className="testimonials-loading">
          <div className="loading-spinner"></div>
          <p>Fetching platform reviews...</p>
        </div>
      ) : reviewsList.length === 0 ? (
        <div className="empty-reviews-state">
          <p>No feedback comments submitted yet. Join the workspace to submit your review!</p>
        </div>
      ) : (
        <div className="testimonials-grid">
          {reviewsList.map((review, index) => {
            const username = review.user?.username || "Verified Developer";
            const handle = `@${username.toLowerCase()}`;
            const firstLetter = username.charAt(0).toUpperCase();
            const mainLang = review.user?.programmingLanguages?.[0];
            const role = mainLang ? `${mainLang} Developer` : "Software Engineer";
            const colors = ["#a855f7", "#22d3ee", "#f43f5e", "#10b981", "#f59e0b", "#ec4899"];
            const color = colors[index % colors.length];

            return (
              <motion.div
                key={review._id || index}
                className="testimonial-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                whileHover={{ y: -6, scale: 1.01 }}
              >
                <div className="testimonial-header-row">
                  {review.user?.avatar ? (
                    <img src={review.user.avatar} alt={username} className="user-avatar-img" />
                  ) : (
                    <div 
                      className="avatar-placeholder" 
                      style={{ background: `linear-gradient(135deg, ${color}, #080710)` }}
                    >
                      {firstLetter}
                    </div>
                  )}
                  <div className="user-info">
                    <h4>{username}</h4>
                    <span>{handle}</span>
                  </div>
                  <Quote size={20} className="quote-icon" />
                </div>

                <div className="rating-row">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      className={i < review.rating ? "star-filled" : "star-empty"} 
                    />
                  ))}
                  <span className="role-tag">{role}</span>
                </div>

                <p className="testimonial-text">"{review.comment}"</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Testimonials;
