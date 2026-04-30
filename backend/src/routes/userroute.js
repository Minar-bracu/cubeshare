const user = require('../controllers/usercontroller');
const express = require('express');
const router = express.Router();


router.post('/register', user.register);
router.post('/login', user.login);

module.exports = router;