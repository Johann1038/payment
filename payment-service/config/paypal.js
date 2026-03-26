/**
 * PayPal API Helper
 * Handles OAuth token caching and order payload building.
 */

const axios = require('axios');

const BASE_URL = process.env.PAYPAL_BASE_URL;
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// ── Token cache ───────────────────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    `${BASE_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
  console.log('[PayPal] New access token obtained');
  return cachedToken;
}

/**
 * Build a PayPal Orders API v2 payload.
 *
 * @param {Array}  items       - [{name, price, quantity}]
 * @param {string} ref         - Internal order reference
 * @param {Object} options
 * @param {string} options.currency    - ISO currency code (default: 'USD')
 * @param {string} options.description - Order description shown to buyer
 */
function buildOrderPayload(items, ref, options = {}) {
  const { currency = 'USD', description } = options;
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: ref,
        description: description || `Order #${ref}`,
        amount: {
          currency_code: currency,
          value: itemTotal.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: itemTotal.toFixed(2),
            },
          },
        },
        items: items.map((item) => ({
          name: item.name,
          quantity: String(item.quantity),
          unit_amount: {
            currency_code: currency,
            value: Number(item.price).toFixed(2),
          },
        })),
      },
    ],
  };
}

module.exports = { getAccessToken, buildOrderPayload, BASE_URL };
