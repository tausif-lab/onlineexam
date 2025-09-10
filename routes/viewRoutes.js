

const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const { 
    authenticateToken,
    authenticateAdminOnly,
    requireAdmin,
    requireStudent 
} = require('../middleware/auth');

// ===== PUBLIC ROUTES =====
router.get('/', viewController.getHomePage);
router.get('/login', viewController.getLoginPage);
router.get('/register', viewController.getRegisterPage);
router.get('/register-coaching', viewController.getRegisterCPage);

// ===== STUDENT-ONLY ROUTES =====
// Students can only access their own dashboard/exam pages
router.get('/student-dashboard'/*, authenticateToken, requireStudent*/, viewController.getStudentDashboard);
router.get('/student-dashboard.html'/*, authenticateToken, requireStudent*/, viewController.getStudentDashboard);
router.get('/student-exam',/* authenticateToken, requireStudent,*/ viewController.getExamPage);
router.get('/student-exam.html', /*authenticateToken, requireStudent,*/ viewController.getExamPage);
// ===== ADMIN-ONLY ROUTES =====
// Admin dashboard - admins can only access their own dashboard
router.get('/admin-dashboard', /*authenticateToken ,/*requireAdmin*/ viewController.getAdminDashboard);
// Admin live monitoring page   
router.get('/admin-live',   viewController.getadminlive);

// Management pages - admins have full access
router.get('/manage-exams', authenticateAdminOnly, viewController.getManageExamsPage);
router.get('/results', authenticateAdminOnly, viewController.getadminResultsPage);

// Parents dashboard - accessible to parents
router.get('/parents-dashboard',  viewController.getparentsDashboard);
router.get('/admin-checking',  viewController.getcheckingPage);
// New route for student result display
router.get('/descriptive-result',  viewController.getstudentResult);
// Error handling
router.use('*', (req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>The requested page ${req.originalUrl} was not found.</p>
        <a href="/">Back to Home</a>
    `);
});

module.exports = router;
