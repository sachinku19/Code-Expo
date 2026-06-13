import React from "react";
import PropTypes from "prop-types";
import "./QuickActionCard.module.css";
/**
 * QuickActionCard - a clickable card representing a quick action.
 * Props:
 *   icon: React node for the icon (e.g., <Users size={16} />).
 *   title: Text label.
 *   onClick: Click handler.
 */
export default function QuickActionCard({ icon, title, onClick }) {
  return (
    <button className="quick-action-card" onClick={onClick} type="button">
      {icon}
      <span className="qa-label">{title}</span>
    </button>
  );
}

QuickActionCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

QuickActionCard.defaultProps = {
  onClick: () => {},
};
