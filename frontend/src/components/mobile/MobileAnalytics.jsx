import React from "react";
import { motion } from "framer-motion";
import { Users, BarChart2, Award, Terminal, Flame, Code, Bot } from "lucide-react";
import "./MobileAnalytics.css";

export default function MobileAnalytics() {
  return (
    <section className="mobile-analytics-section" id="analytics">
      {/* Header (Exact desktop text) */}
      <div className="mobile-analytics-header">
        <span className="mobile-section-tag">NETWORK ANALYTICS</span>
        <h2 className="mobile-analytics-title">Measure your footprint.</h2>
        <p className="mobile-analytics-sub">
          Track your profile growth, coding execution metrics, and language skills inside a beautiful visual statistics dashboard.
        </p>
      </div>

      {/* Swipeable Deck Cards Container */}
      <div className="analytics-swipe-container">
        {/* Card 1: Developer Profile Deck */}
        <div className="analytics-card">
          <div className="analytics-card-top">
            <div className="card-badge blue">
              <Users size={16} />
              <span>Developer Profile Deck</span>
            </div>
          </div>

          <div className="profile-user-row">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"
              alt="Sachin"
              className="profile-user-avatar"
            />
            <div>
              <h4 className="profile-user-name">Sachin Kumar</h4>
              <span className="profile-user-title">Principal Architect • LVL 12</span>
            </div>
          </div>

          <div className="analytics-stats-grid">
            <div className="stat-pill">
              <Terminal size={14} className="pill-icon purple" />
              <span>145.8 hrs</span>
            </div>
            <div className="stat-pill">
              <Award size={14} className="pill-icon emerald" />
              <span>2,400 pts</span>
            </div>
            <div className="stat-pill">
              <Flame size={14} className="pill-icon amber" />
              <span>21 Days Streak</span>
            </div>
          </div>
        </div>

        {/* Card 2: Leaderboard Standings */}
        <div className="analytics-card">
          <div className="analytics-card-top">
            <div className="card-badge emerald">
              <BarChart2 size={16} />
              <span>Leaderboard Standings</span>
            </div>
          </div>

          <div className="leaderboard-mini-list">
            <div className="lb-item">
              <span className="lb-rank">#1</span>
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60&h=60&q=80" alt="Sachin" className="lb-avatar" />
              <span className="lb-name">Sachin Kumar</span>
              <span className="lb-rep">2.4k rep</span>
            </div>
            <div className="lb-item">
              <span className="lb-rank">#2</span>
              <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=60&h=60&q=80" alt="Aman" className="lb-avatar" />
              <span className="lb-name">Aman Sharma</span>
              <span className="lb-rep">1.9k rep</span>
            </div>
            <div className="lb-item">
              <span className="lb-rank">#3</span>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=60&h=60&q=80" alt="Katarina" className="lb-avatar" />
              <span className="lb-name">Katarina Chen</span>
              <span className="lb-rep">1.8k rep</span>
            </div>
          </div>
        </div>

        {/* Card 3: Language Competence */}
        <div className="analytics-card">
          <div className="analytics-card-top">
            <div className="card-badge purple">
              <Award size={16} />
              <span>Language Competence</span>
            </div>
          </div>

          <div className="skills-stack-mini">
            <div className="skill-row">
              <div className="skill-info">
                <span>JavaScript Core</span>
                <span>95%</span>
              </div>
              <div className="skill-bar-track">
                <div className="skill-bar-fill" style={{ width: "95%", backgroundColor: "#3b82f6" }} />
              </div>
            </div>

            <div className="skill-row">
              <div className="skill-info">
                <span>Python Sandbox</span>
                <span>88%</span>
              </div>
              <div className="skill-bar-track">
                <div className="skill-bar-fill" style={{ width: "88%", backgroundColor: "#10b981" }} />
              </div>
            </div>

            <div className="skill-row">
              <div className="skill-info">
                <span>C++ Native</span>
                <span>70%</span>
              </div>
              <div className="skill-bar-track">
                <div className="skill-bar-fill" style={{ width: "70%", backgroundColor: "#a855f7" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
