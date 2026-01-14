const jwt = require('jsonwebtoken');

require('dotenv').config({ path: __dirname + '/../.env' });

/**
 * Generate JWT token for user
 * @param {Object} payload - User data to include in token
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token or null if not found
 */
// utils/jwt.js

function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  // Expected: "Bearer <token>"
  const parts = authHeader.split(" ");

  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== "bearer") return null;

  return parts[1]; // token only
}

module.exports = { extractTokenFromHeader, verifyToken, generateToken };