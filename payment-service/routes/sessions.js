/**
 * Sessions Route
 *
 * POST /sessions — called by your app's backend to create a checkout session.
 * Returns a checkoutUrl to redirect the user to.
 *
 * Requires X-API-Key header.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const apiKeyAuth = require('../middleware/apiKey');
const { createSession } = require('../store/sessions');

const router = express.Router();

router.post('/', apiKeyAuth, (req, res) => {
  const { items, description, callbackUrl, cancelUrl, currency, customerName } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }
  if (!callbackUrl) {
    return res.status(400).json({ error: 'callbackUrl is required' });
  }

  const sessionId = uuidv4();
  const serviceUrl = process.env.SERVICE_URL || `http://localhost:${process.env.PORT || 4000}`;

  createSession({
    sessionId,
    items,
    description: description || 'Payment',
    callbackUrl,
    cancelUrl: cancelUrl || callbackUrl,
    currency: currency || 'USD',
    customerName: customerName || '',
    status: 'pending',
  });

  res.json({
    sessionId,
    checkoutUrl: `${serviceUrl}/checkout?session=${sessionId}`,
  });
});

module.exports = router;
