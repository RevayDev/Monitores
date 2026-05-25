import crypto from 'crypto';

export const RESET_TOKEN_TTL_MINUTES = 30;

export const createResetToken = () => crypto.randomBytes(32).toString('base64url');

export const hashResetToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

export const getResetExpiry = (now = new Date()) =>
  new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

export const buildResetLink = (baseUrl, token) => {
  const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
  return `${cleanBase}/reset-password?token=${encodeURIComponent(token)}`;
};
