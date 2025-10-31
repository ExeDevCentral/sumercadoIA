const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { validateLogin } = require('../middleware/validators');

router.post('/login', validateLogin, authCtrl.login);

module.exports = router;
