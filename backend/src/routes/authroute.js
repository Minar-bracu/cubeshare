const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/me', auth.verifyTokenMiddleware, (req, res) => {
  // req.user is available
  res.json({ id: req.user.id, username: req.user.username });
});

module.exports = router;