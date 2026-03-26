/**
 * Checkout Routes (public — no API key needed)
 *
 * GET  /checkout?session=:id     — render the hosted checkout page
 * POST /checkout/:id/pay         — create a PayPal order for this session
 * POST /checkout/:id/capture     — capture the approved payment, redirect to callbackUrl
 */

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getSession, updateSession } = require('../store/sessions');
const { getAccessToken, buildOrderPayload, BASE_URL } = require('../config/paypal');
const { createOrder, updateOrder } = require('../store/orders');

const router = express.Router();

// ── GET /checkout ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const session = getSession(req.query.session);

  if (!session) {
    return res.status(400).render('expired');
  }

  const total = session.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  res.render('checkout', {
    sessionId: session.sessionId,
    items: session.items,
    description: session.description,
    total: total.toFixed(2),
    cancelUrl: session.cancelUrl,
    clientId: process.env.PAYPAL_JS_SDK_CLIENT_ID,
  });
});

// ── POST /checkout/:sessionId/pay ─────────────────────────────────────────────
router.post('/:sessionId/pay', async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(400).json({ error: 'Session expired or invalid' });

  try {
    const ref = uuidv4().slice(0, 8).toUpperCase();
    const accessToken = await getAccessToken();
    const payload = buildOrderPayload(session.items, ref, {
      currency: session.currency,
      description: session.description,
    });

    const response = await axios.post(
      `${BASE_URL}/v2/checkout/orders`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const paypalOrderId = response.data.id;
    const { customerName, customerPhone } = req.body;

    createOrder({
      ref,
      paypalOrderId,
      items: session.items,
      total: session.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      customerName: customerName || session.customerName || '',
      customerPhone: customerPhone || '',
      status: 'PENDING',
    });

    updateSession(req.params.sessionId, { ref });

    res.json({ id: paypalOrderId, ref });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[Checkout] pay error:', detail);
    res.status(500).json({ error: 'Failed to create order', detail });
  }
});

// ── POST /checkout/:sessionId/capture ─────────────────────────────────────────
router.post('/:sessionId/capture', async (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(400).json({ error: 'Session expired or invalid' });

  try {
    const { orderID, ref } = req.body;
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${BASE_URL}/v2/checkout/orders/${orderID}/capture`,
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

    updateSession(req.params.sessionId, { status: 'completed' });

    // Build the redirect URL back to the calling app
    const redirectUrl = new URL(session.callbackUrl);
    redirectUrl.searchParams.set('ref', ref);
    redirectUrl.searchParams.set('transactionId', capture.id);

    console.log('[Checkout] Payment complete, redirecting to:', redirectUrl.toString());
    res.json({ success: true, redirectUrl: redirectUrl.toString() });
  } catch (err) {
    console.error('[Checkout] capture error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to capture payment' });
  }
});

module.exports = router;
