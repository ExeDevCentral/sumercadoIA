const express = require('express');
const router = express.Router();

// Minimal dashboard endpoints placeholder
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Dashboard endpoints placeholder' });
});

module.exports = router;
