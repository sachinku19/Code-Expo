/**
 * CodeExpo Unified Avatar Utility
 * Provides deterministic, consistent colors and initials for user avatars across the entire application.
 */

// Production-grade curated harmonious color palette with high-contrast text support
export const AVATAR_PALETTE = [
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#ef4444", // Rose
  "#84cc16"  // Lime
];

/**
 * Generates a deterministic, consistent background color from any user identifier (username, email, or id)
 * @param {string} name - The user's username, displayName, or id
 * @returns {string} Hex color code
 */
export const getAvatarColor = (name) => {
  if (!name) return AVATAR_PALETTE[0];
  const cleanName = String(name).toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

/**
 * Extracts a clean, single uppercase initial from a user's name/username
 * @param {string} name - The user's name or username
 * @returns {string} 1-letter uppercase initial (e.g. 'R')
 */
export const getAvatarInitial = (name) => {
  if (!name || typeof name !== "string") return "D";
  const clean = name.trim().replace(/^@/, "");
  return clean.charAt(0).toUpperCase() || "D";
};
