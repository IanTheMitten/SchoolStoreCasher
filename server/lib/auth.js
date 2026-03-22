/**
 * Simple API key authentication middleware
 */

export const apiKeyAuth = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  
  // If no API key is set, skip authentication
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

