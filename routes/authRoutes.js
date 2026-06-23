const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register',authController.register);
router.post('/login',authController.login); // LOGIN SEGURO
router.post('/login-vulnerable', authController.loginVulnerable); //LOGIN VULNERABLE

module.exports= router;