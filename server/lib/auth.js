import session from 'express-session';

export function sessionMiddleware() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  return session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
      // Explicitly set domain to undefined (use current domain)
      // This helps with Render's domain setup and prevents cookie issues
      domain: undefined,
    },
  });
}

export function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }

  // For API routes, always return JSON 401 (no HTML redirects)
  // This works for both integrated and separate frontend deployments
  // The frontend will handle redirecting to login page
  return res.status(401).json({ error: 'Authentication required' });
}

export const apiKeyAuth = (req, res, next) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return next();
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    return res.status(401).json({ error: 'API key required. Provide x-api-key header.' });
  }

  if (providedKey !== apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

