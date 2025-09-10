
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/register-coaching', authController.registerC);
router.post('/login', authController.login);

// Protected routes - users can only access their own profile
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/logout', authController.logout);
router.post('/verify-face',authenticateToken, authController.verifyFace);

module.exports = router;