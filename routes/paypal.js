/**
 * PayPal Routes — Food App
 *
 * These routes are thin proxies to the payment-service.
 * The food app no longer calls PayPal directly.
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4000';
const PAYMENT_SERVICE_API_KEY = process.env.PAYMENT_SERVICE_API_KEY || '';

const serviceHeaders = {
  'Content-Type': 'application/json',
  'X-API-Key': PAYMENT_SERVICE_API_KEY,
};

// ── POST /api/paypal/create-order ─────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    const { cart, customerName, customerPhone } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    const response = await axios.post(
      `${PAYMENT_SERVICE_URL}/orders`,
      { items: cart, customerName, customerPhone, description: 'BiteBox Order' },
      { headers: serviceHeaders }
    );

    // Forward the {id, ref} response to the browser unchanged
    res.json(response.data);
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[App] create-order error:', detail);
    res.status(500).json({ error: 'Failed to create order', detail });
  }
});

// ── POST /api/paypal/capture-order ────────────────────────────────────────────
router.post('/capture-order', async (req, res) => {
  try {
    const { orderID, ref } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: 'orderID is required' });
    }

    const response = await axios.post(
      `${PAYMENT_SERVICE_URL}/orders/${orderID}/capture`,
      { ref },
      { headers: serviceHeaders }
    );

    res.json(response.data);
  } catch (err) {
    console.error('[App] capture-order error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to capture payment' });
  }
});

module.exports = router;
