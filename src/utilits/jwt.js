// src/utils/jwt.js
const jwt = require("jsonwebtoken");

// Replace with a strong secret in production
const JWT_SECRET = "your_jwt_secret";
const JWT_EXPIRES_IN = "7d"; // token expires in 7 days

// Generates a token with user payload
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = { generateToken, JWT_SECRET };
