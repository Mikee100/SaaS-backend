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

/**
 * SameSite for access token.
 * Use 'none' when frontend is on a different domain (e.g. Vercel) so cookies are sent cross-site.
 * In production we default to 'none' so hosted frontend (e.g. adeera-pos.vercel.app) can send
 * cookies to API (e.g. saas-business.duckdns.org). Requires Secure=true (HTTPS).
 * Override via env COOKIE_SAME_SITE_ACCESS (lax | strict | none).
 */
export const COOKIE_SAME_SITE_ACCESS: 'lax' | 'strict' | 'none' =
  (process.env.COOKIE_SAME_SITE_ACCESS as 'lax' | 'strict' | 'none') ||
  (process.env.NODE_ENV === 'production' ? 'none' : 'lax');

/**
 * SameSite for refresh token.
 * In production default to 'none' so cross-origin refresh works (e.g. Vercel frontend + duckdns API).
 * Override via env COOKIE_SAME_SITE_REFRESH (lax | strict | none).
 */
export const COOKIE_SAME_SITE_REFRESH: 'lax' | 'strict' | 'none' =
  (process.env.COOKIE_SAME_SITE_REFRESH as 'lax' | 'strict' | 'none') ||
  (process.env.NODE_ENV === 'production' ? 'none' : 'strict');
