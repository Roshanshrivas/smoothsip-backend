// src/utils/token.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || (process.env.SECRET_KEY + '_refresh');


// ─── FAIL FAST ────────────────────────────────
// If these are undefined, crash on startup instead of at runtime
if (!ACCESS_TOKEN_SECRET) {
  throw new Error(
    'ACCESS_TOKEN_SECRET (or SECRET_KEY) is missing from .env — cannot start server.'
  );
}

export const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId, role) => {
  return jwt.sign({ userId, role }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};


// Export the same secret so the password-reset flow uses it too
export const PASSWORD_RESET_SECRET = ACCESS_TOKEN_SECRET;