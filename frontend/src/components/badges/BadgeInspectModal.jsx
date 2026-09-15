import React from "react";
import { X, CheckCircle2, Lock, Sparkles, Award, Zap, Share2 } from "lucide-react";
import { BadgeInsignia } from "./BadgeInsignia";

export const BadgeInspectModal = ({ badge, isOpen, onClose }) => {
  if (!isOpen || !badge) return null;

  const isUnlocked = Boolean(badge.condition);
  const currentVal = badge.progress?.current ?? 0;
  const targetVal = badge.progress?.target ?? 1;
  const progressPercent = Math.min(100, Math.round((currentVal / targetVal) * 100));

  const rarityLabel = (badge.rarity || "COMMON").toUpperCase();

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`🏆 I unlocked the "${badge.title}" (${rarityLabel}) badge on CodeExpo!`);
      alert("Achievement link copied to clipboard!");
    }
  };

  return (
    <div className="badge-inspect-backdrop" onClick={onClose}>
      <div className="badge-inspect-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with close button */}
        <div className="badge-inspect-header">
          <div className="badge-inspect-category-tag">
            <Sparkles size={13} className="sparkle-icon" />
            <span>{badge.category || "Platform Milestone"}</span>
          </div>
          <button className="badge-inspect-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Hero Section: Large Badge Insignia & Rarity Ring */}
        <div className="badge-inspect-hero">
          <div className={`badge-inspect-crest-showcase ${isUnlocked ? "unlocked" : "locked"}`}>
            <BadgeInsignia id={badge.id} rarity={badge.rarity} isUnlocked={isUnlocked} size={112} />
          </div>
          <div className={`badge-inspect-rarity-pill ${badge.rarity ? badge.rarity.toLowerCase() : "common"}`}>
            {rarityLabel} TIER
          </div>
          <h2 className="badge-inspect-title">{badge.title}</h2>
          <div className="badge-inspect-xp-pill">
            <Zap size={14} />
            <span>+{badge.points || 100} XP Award</span>
          </div>
        </div>

        {/* Body Section: Criteria & Progress */}
        <div className="badge-inspect-body">
          <div className="badge-inspect-description">
            <p>{badge.desc}</p>
          </div>

          <div className="badge-inspect-status-card">
            <div className="status-card-header">
              <span className="status-label">UNLOCK STATUS</span>
              {isUnlocked ? (
                <span className="status-pill unlocked">
                  <CheckCircle2 size={13} /> Unlocked
                </span>
              ) : (
                <span className="status-pill locked">
                  <Lock size={13} /> Locked
                </span>
              )}
            </div>

            {/* Progress Gauge */}
            <div className="badge-inspect-progress-section">
              <div className="progress-info-row">
                <span className="progress-title">Criteria Progression</span>
                <span className="progress-count">
                  {currentVal} / {targetVal} {badge.progress?.unit || ""} ({progressPercent}%)
                </span>
              </div>
              <div className="badge-inspect-bar-track">
                <div
                  className={`badge-inspect-bar-fill ${isUnlocked ? "completed" : ""}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="badge-inspect-footer">
          {isUnlocked && (
            <button className="badge-inspect-share-btn" onClick={handleShare}>
              <Share2 size={15} />
              <span>Share Badge</span>
            </button>
          )}
          <button className="badge-inspect-dismiss-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeInspectModal;
