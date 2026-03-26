const express = require('express');
const router = express.Router();

// Root route — shown when someone opens the service URL in a browser
router.get('/', (req, res) => {
  res.json({
    service: 'payment-service',
    status: 'ok',
    version: '1.0.0',
    endpoints: {
      health:   'GET  /health',
      checkout: 'GET  /checkout?session=:id',
      sessions: 'POST /sessions  (requires X-API-Key)',
      orders:   'POST /orders    (requires X-API-Key)',
      capture:  'POST /orders/:id/capture (requires X-API-Key)',
      getOrder: 'GET  /orders/:ref (requires X-API-Key)',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
