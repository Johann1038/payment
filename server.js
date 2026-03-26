require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

// ── View engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', require('./routes/index'));
app.use('/api/paypal', require('./routes/paypal'));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message });
});

// ── Start server ──────────────────────────────────────────────────────────────
// Render injects PORT automatically. Locally we fall back to 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[PayPal] Using base URL: ${process.env.PAYPAL_BASE_URL}`);
});
