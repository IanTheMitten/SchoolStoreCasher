/**
 * Session configuration and timeout middleware.
 *
 * Timeout rules:
 * - Default: 10 minutes inactivity (rolling)
 * - 12:00–12:40: 35 minute max from session start
 * - 4:00–4:30: 20 minute max from session start
 *
 * Uses server local time. Set TZ env var if you need a specific timezone.
 */

import session from 'express-session';

// Timeout constants (minutes)
const DEFAULT_INACTIVITY_MIN = 10;
const LUNCH_WINDOW_MAX_MIN = 35;  // 12:00–12:40
const AFTERNOON_WINDOW_MAX_MIN = 20;  // 4:00–4:30

/** Returns true if time is within 12:00–12:40 */
function isInLunchWindow(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  return h === 12 && m < 40;
}

/** Returns true if time is within 4:00–4:30 */
function isInAfternoonWindow(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  return h === 16 && m < 30;
}

/** Get max session duration in ms for the given time */
function getMaxDurationMs(now) {
  if (isInLunchWindow(now)) return LUNCH_WINDOW_MAX_MIN * 60 * 1000;
  if (isInAfternoonWindow(now)) return AFTERNOON_WINDOW_MAX_MIN * 60 * 1000;
  return DEFAULT_INACTIVITY_MIN * 60 * 1000;
}

/**
 * Session timeout check. Call this on authenticated requests.
 * Destroys session and redirects to /login if expired.
 */
export function sessionTimeoutMiddleware(req, res, next) {
  if (!req.session?.isAuthenticated) {
    return next();
  }

  const now = Date.now();
  const sessionStart = req.session.createdAt ?? now;
  const lastActivity = req.session.lastActivity ?? sessionStart;

  // Rolling inactivity: 10 min when not in special windows
  const maxInactivityMs = DEFAULT_INACTIVITY_MIN * 60 * 1000;
  const inactiveMs = now - lastActivity;

  // Time-window limits: max duration from session start
  const maxDurationMs = getMaxDurationMs(new Date(now));

  const sessionAgeMs = now - sessionStart;
  const exceededWindowLimit = sessionAgeMs > maxDurationMs;
  const exceededInactivity = inactiveMs > maxInactivityMs;

  if (exceededWindowLimit || exceededInactivity) {
    return req.session.destroy((err) => {
      if (err) return next(err);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Session expired', redirect: '/login' });
      }
      return res.redirect('/login?expired=1');
    });
  }

  // Extend last activity
  req.session.lastActivity = now;
  next();
}

/**
 * Express-session configuration for SITE_PASSWORD auth.
 * Uses 10-minute cookie as base; actual limits enforced by sessionTimeoutMiddleware.
 */
export function getSessionConfig() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required when using SITE_PASSWORD');
  }

  return {
    secret,
    resave: false,
    saveUninitialized: false,
    name: 'schoolstore.sid',
    cookie: {
      maxAge: 10 * 60 * 1000, // 10 min base; middleware enforces time-window limits
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };
}

/** Require session auth. Redirects to /login or returns 401 for API. */
export function requireAuth(req, res, next) {
  if (req.session?.isAuthenticated) return next();
  if (req.path.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Authentication required', redirect: '/login' });
  }
  return res.redirect('/login');
}

export { session };
