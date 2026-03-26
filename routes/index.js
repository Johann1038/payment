const express = require('express');
const axios = require('axios');
const menu = require('../data/menu');

const router = express.Router();

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4000';
const PAYMENT_SERVICE_API_KEY = process.env.PAYMENT_SERVICE_API_KEY || '';

// Menu page
router.get('/', (req, res) => {
  res.render('menu', { menu });
});

// Cart page (client-side only — no server data needed)
router.get('/cart', (req, res) => {
  res.render('cart');
});

// Checkout page — passes PayPal client ID into the EJS template
// LEARNING NOTE: The JS SDK client ID IS safe to expose in the browser.
// It is NOT a secret. The secret stays server-side only.
router.get('/checkout', (req, res) => {
  res.render('checkout', {
    clientId: process.env.PAYPAL_JS_SDK_CLIENT_ID,
  });
});

// Success page — fetches order from payment-service by ref query param
router.get('/success', async (req, res) => {
  const { ref } = req.query;
  let order = null;

  if (ref) {
    try {
      const response = await axios.get(`${PAYMENT_SERVICE_URL}/orders/${ref}`, {
        headers: { 'X-API-Key': PAYMENT_SERVICE_API_KEY },
      });
      order = response.data;
    } catch (err) {
      // 404 is expected if ref is wrong; other errors we log
      if (err.response?.status !== 404) {
        console.error('[App] Failed to fetch order:', err.message);
      }
    }
  }

  res.render('success', {
    order,
    whatsappNumber: process.env.WHATSAPP_NUMBER || '',
  });
});

// Cancel page
router.get('/cancel', (req, res) => {
  res.render('cancel');
});

module.exports = router;
