/**
 * Orders Routes
 *
 * POST /orders           — create a PayPal order
 * POST /orders/:id/capture — capture (charge) an approved order
 * GET  /orders/:ref      — retrieve an order by internal ref
 */

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getAccessToken, buildOrderPayload, BASE_URL } = require('../config/paypal');
const { createOrder, getOrder, updateOrder } = require('../store/orders');
const apiKeyAuth = require('../middleware/apiKey');

const router = express.Router();

// All order routes require a valid API key
router.use(apiKeyAuth);

// ── POST /orders — create a PayPal order ─────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { items, customerName, customerPhone, currency, description } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }

    const ref = uuidv4().slice(0, 8).toUpperCase();
    const accessToken = await getAccessToken();
    const payload = buildOrderPayload(items, ref, { currency, description });

    console.log('[PaymentService] Creating order | Ref:', ref);

    const response = await axios.post(
      `${BASE_URL}/v2/checkout/orders`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const paypalOrderId = response.data.id;

    createOrder({
      ref,
      paypalOrderId,
      items,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      status: 'PENDING',
    });

    console.log('[PaymentService] Order created:', paypalOrderId);
    res.json({ id: paypalOrderId, ref });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[PaymentService] create error:', JSON.stringify(detail));
    res.status(500).json({ error: 'Failed to create PayPal order', detail });
  }
});

// ── POST /orders/:paypalOrderId/capture — charge the buyer ───────────────────
router.post('/:paypalOrderId/capture', async (req, res) => {
  try {
    const { paypalOrderId } = req.params;
    const { ref } = req.body;

    const accessToken = await getAccessToken();

    console.log('[PaymentService] Capturing order:', paypalOrderId);

    const response = await axios.post(
      `${BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const captureData = response.data;
    const capture = captureData.purchase_units[0].payments.captures[0];

    updateOrder(ref, {
      status: 'COMPLETED',
      captureId: capture.id,
      payerName: `${captureData.payer.name.given_name} ${captureData.payer.name.surname}`,
      payerEmail: captureData.payer.email_address,
      capturedAt: capture.create_time,
    });

    console.log('[PaymentService] Captured! Transaction ID:', capture.id);
    res.json({ success: true, ref, transactionId: capture.id });
  } catch (err) {
    console.error('[PaymentService] capture error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to capture payment' });
  }
});

// ── GET /orders/:ref — get order details ──────────────────────────────────────
router.get('/:ref', (req, res) => {
  const order = getOrder(req.params.ref);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

module.exports = router;
