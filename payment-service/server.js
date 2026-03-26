require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── CORS — only allow configured origins ──────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
}));

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health', require('./routes/health'));
app.get('/', (req, res) => res.redirect('/health'));
app.use('/orders', require('./routes/orders'));
app.use('/sessions', require('./routes/sessions'));
app.use('/checkout', require('./routes/checkout'));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[PaymentService Error]', err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[PaymentService] Running on http://localhost:${PORT}`);
  console.log(`[PaymentService] PayPal base URL: ${process.env.PAYPAL_BASE_URL}`);
  console.log(`[PaymentService] API key auth: ${process.env.API_KEY ? 'enabled' : 'disabled (no API_KEY set)'}`);
});
