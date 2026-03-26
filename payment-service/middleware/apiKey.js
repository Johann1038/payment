/**
 * API Key middleware
 *
 * Callers must include the header:  X-API-Key: <your key>
 * Set API_KEY in .env to enable. If not set, all requests are allowed (dev mode).
 */
module.exports = function apiKeyAuth(req, res, next) {
  const configuredKey = process.env.API_KEY;

  // Auth disabled if no key is configured
  if (!configuredKey) return next();

  const providedKey = req.headers['x-api-key'];
  if (providedKey === configuredKey) return next();

  res.status(401).json({ error: 'Unauthorized: missing or invalid X-API-Key header' });
};
