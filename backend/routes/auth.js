const express = require('express');
const router = express.Router();

router.post('/send-code', (_req, res) => {
  res.status(501).json({ error: 'Brevo verification endpoint is being rebuilt.' });
});

router.post('/verify-code', (_req, res) => {
  res.status(501).json({ error: 'Verification endpoint is being rebuilt.' });
});

module.exports = router;
