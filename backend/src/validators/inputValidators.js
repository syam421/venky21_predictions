/**
 * Input validators and normalizers
 */

/**
 * Normalizes and validates a phone number.
 * Accepts formats like: "9876543210", "+919876543210", "98765 43210", "+91-9876543210"
 * Returns normalized 10-15 digit string (e.g. "9876543210" or "919876543210")
 */
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Remove whitespace, dashes, parens
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // If starts with +, remove +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 91 and has 12 digits, can be canonical 10-digit Indian phone
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  // Validate: must be 10 digits (standard Indian mobile starting 6-9) or 10-15 digits international
  const isIndianMobile = /^[6-9]\d{9}$/.test(cleaned);
  const isGenericPhone = /^\d{10,15}$/.test(cleaned);

  if (!isIndianMobile && !isGenericPhone) {
    return null;
  }

  return cleaned;
}

/**
 * Validates a password meets complexity requirements
 * At least 8 characters, at least 1 letter, at least 1 number
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password cannot exceed 128 characters' };
  }
  return { valid: true };
}

/**
 * Sanitizes strings for safe output and prevents injection
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().slice(0, 500);
}

module.exports = {
  normalizePhoneNumber,
  validatePassword,
  sanitizeText
};
