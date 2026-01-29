import express from 'express';

const router = express.Router();

function ensureSitePassword() {
  if (!process.env.SITE_PASSWORD) {
    throw new Error('SITE_PASSWORD environment variable is required');
  }
}

router.get('/login', (req, res) => {
  ensureSitePassword();

  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/');
  }

  const error = req.query.error ? 'Invalid password' : '';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>School Store Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px rgba(15,23,42,0.08);
      width: 100%;
      max-width: 360px;
    }
    h1 {
      margin-top: 0;
      margin-bottom: 0.75rem;
      font-size: 1.25rem;
      text-align: center;
      color: #111827;
    }
    p {
      margin-top: 0;
      margin-bottom: 1.25rem;
      text-align: center;
      color: #6b7280;
    }
    .field {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      color: #374151;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #d1d5db;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border-radius: 0.5rem;
      border: none;
      background: #2563eb;
      color: white;
      font-weight: 500;
      font-size: 0.95rem;
      cursor: pointer;
    }
    button:hover {
      background: #1d4ed8;
    }
    .error {
      color: #b91c1c;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>School Store</h1>
    <p>Enter the shared access password.</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/login">
      <div class="field">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" />
      </div>
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`);
});

router.post('/login', (req, res) => {
  ensureSitePassword();

  const { password } = req.body;
  const expected = process.env.SITE_PASSWORD;

  if (!password || password !== expected) {
    // Return JSON for API calls, redirect for HTML form submissions
    if (req.accepts('json')) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    return res.redirect('/login?error=1');
  }

  req.session.isAuthenticated = true;
  
  // Explicitly save session before redirect (critical for Render/proxy setups)
  // This ensures the session cookie is set before the redirect happens
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      if (req.accepts('json')) {
        return res.status(500).json({ error: 'Session save failed' });
      }
      return res.redirect('/login?error=1');
    }
    
    // Return JSON for API calls, redirect for HTML form submissions
    if (req.accepts('json')) {
      return res.json({ ok: true, message: 'Login successful' });
    }
    return res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

export default router;

