// routes/parentRoutes.js
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentsController');

// Rate limiting middleware (optional but recommended)
const rateLimit = require('express-rate-limit');

// Rate limit for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ===== PARENT ROUTES =====
// Parent login - validates child's credentials
router.post('/login', loginLimiter, parentController.parentLogin);

// Get all results for a specific student
router.get('/:studentId', parentController.getStudentResults);

// Get detailed result for a specific exam submission
router.get('/:studentId/submission/:submissionId', parentController.getDetailedResult);

// Get performance analytics for parent dashboard
router.get('/:studentId/analytics', parentController.getPerformanceAnalytics);

module.exports = router;