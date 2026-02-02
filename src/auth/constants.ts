/**
 * Enterprise auth: cookie names and TTLs.
 * Override via env: ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC, COOKIE_SECURE.
 */
export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  CSRF_TOKEN: 'csrf_token',
} as const;

/** Access token (JWT) lifetime in seconds. Default 15 minutes. */
export const ACCESS_TOKEN_TTL_SEC =
  parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '', 10) || 15 * 60;

/** Refresh token (opaque) lifetime in seconds. Default 7 days. */
export const REFRESH_TOKEN_TTL_SEC =
  parseInt(process.env.REFRESH_TOKEN_TTL_SEC || '', 10) || 7 * 24 * 60 * 60;

/** Cookie Secure flag: true in production, false for localhost. */
export const COOKIE_SECURE =
  process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';

/** Cookie domain. Empty = current host only. */
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/** SameSite for access token (Lax allows top-level navigations to send cookie). */
export const COOKIE_SAME_SITE_ACCESS: 'lax' | 'strict' | 'none' = 'lax';

/** SameSite for refresh token (Strict = only same-site requests). */
export const COOKIE_SAME_SITE_REFRESH: 'lax' | 'strict' | 'none' = 'strict';
