/**
 * Username Validator for CodeExpo
 * Enforces strict GitHub / Discord style username rules:
 * - 3–20 characters
 * - Lowercase letters (a-z), numbers (0-9), single underscore (_)
 * - No spaces, no uppercase
 * - Cannot start or end with an underscore
 * - No consecutive underscores (__)
 * - Reserved system usernames strictly blocked
 */

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "codeexpo",
  "support",
  "api",
  "settings",
  "login",
  "register",
  "dashboard",
  "rooms",
  "chat",
  "profile",
  "explore",
  "help",
  "auth",
  "user",
  "users",
  "undefined",
  "null",
  "bot",
  "ai",
  "moderator",
  "official",
  "status",
  "docs",
  "config",
  "billing",
  "home",
  "app",
  "dev",
  "developer",
  "terms",
  "privacy",
  "account",
  "feed",
  "messages",
  "dm",
  "notification",
  "notifications",
  "search",
  "public",
  "private",
  "security",
  "team",
  "group",
  "invite",
  "join"
]);

/**
 * Validates a username against all platform rules.
 * @param {string} username 
 * @returns {{ isValid: boolean, errorKey: string|null, message: string|null }}
 */
const validateUsername = (username) => {
  if (typeof username !== "string") {
    return { isValid: false, errorKey: "INVALID_TYPE", message: "Username must be text" };
  }

  const trimmed = username.trim();

  if (!trimmed) {
    return { isValid: false, errorKey: "EMPTY", message: "Username cannot be empty" };
  }

  if (trimmed.length < 3) {
    return { isValid: false, errorKey: "TOO_SHORT", message: "Username must be at least 3 characters long" };
  }

  if (trimmed.length > 20) {
    return { isValid: false, errorKey: "TOO_LONG", message: "Username cannot exceed 20 characters" };
  }

  if (trimmed !== trimmed.toLowerCase()) {
    return { isValid: false, errorKey: "NOT_LOWERCASE", message: "Username must be lowercase only" };
  }

  if (/\s/.test(trimmed)) {
    return { isValid: false, errorKey: "NO_SPACES", message: "Username cannot contain spaces" };
  }

  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return { isValid: false, errorKey: "INVALID_CHARS", message: "Only lowercase letters, numbers, and underscores are allowed" };
  }

  if (trimmed.startsWith("_")) {
    return { isValid: false, errorKey: "STARTS_WITH_UNDERSCORE", message: "Username cannot start with an underscore" };
  }

  if (trimmed.endsWith("_")) {
    return { isValid: false, errorKey: "ENDS_WITH_UNDERSCORE", message: "Username cannot end with an underscore" };
  }

  if (/__/.test(trimmed)) {
    return { isValid: false, errorKey: "CONSECUTIVE_UNDERSCORES", message: "Username cannot contain consecutive underscores" };
  }

  if (RESERVED_USERNAMES.has(trimmed)) {
    return { isValid: false, errorKey: "RESERVED", message: "This username is reserved by CodeExpo" };
  }

  return { isValid: true, errorKey: null, message: null };
};

/**
 * Clean a string into a base candidate string for username generation.
 */
const sanitizeBaseName = (input) => {
  if (!input || typeof input !== "string") return "dev";
  let clean = input.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
  clean = clean.replace(/^_+/, "").replace(/_+$/, "");
  if (clean.length < 3) clean = clean + "_dev";
  if (clean.length > 15) clean = clean.substring(0, 15);
  return clean || "dev";
};

/**
 * Generate smart alternative username suggestions given a base input name.
 * @param {string} rawInput 
 * @param {Function} isTakenAsyncFn - Async callback returning boolean (true if username exists)
 * @param {string} [excludeUserId] - Optional user ID to exclude from availability check
 * @returns {Promise<string[]>}
 */
const generateSuggestions = async (rawInput, isTakenAsyncFn, excludeUserId = null) => {
  const base = sanitizeBaseName(rawInput);
  const currentYear = new Date().getFullYear().toString().slice(-2); // e.g. "26"

  const candidates = [
    `${base}_dev`,
    `${base}_${currentYear}`,
    `${base}_code`,
    `codeby${base}`,
    `${base}k`,
    `${base}_official`,
    `${base}_hq`,
    `the_${base}`,
    `${base}_${Math.floor(10 + Math.random() * 89)}`
  ];

  const validAvailable = [];

  for (const cand of candidates) {
    const valResult = validateUsername(cand);
    if (valResult.isValid) {
      const taken = await isTakenAsyncFn(cand, excludeUserId);
      if (!taken && !validAvailable.includes(cand)) {
        validAvailable.push(cand);
      }
    }
    if (validAvailable.length >= 5) break;
  }

  return validAvailable;
};

module.exports = {
  validateUsername,
  generateSuggestions,
  RESERVED_USERNAMES
};
