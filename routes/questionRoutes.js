const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const questionController = require('../controllers/questionController');
const { 
    authenticateToken, 
    authenticateAdminOnly,
    requireStudent 
} = require('../middleware/auth');

// ===== STUDENT ROUTES =====
// Get questions for exam (WITHOUT correct answers - for taking exam)
router.get('/exam/:examId', authenticateToken, requireStudent, questionController.getExamQuestions);

// ===== ADMIN ROUTES =====
// Get questions for admin (WITH correct answers - for managing)
router.get('/admin/exam/:examId', authenticateAdminOnly, questionController.getQuestionsForAdmin);

// CRUD operations for questions (Admin only)
router.post('/exam/:examId', authenticateAdminOnly, questionController.addQuestion);
router.put('/:id', authenticateAdminOnly, questionController.updateQuestion);
router.delete('/:id', authenticateAdminOnly, questionController.deleteQuestion);
router.get('/:id', authenticateAdminOnly, questionController.getQuestionById);

// ===== BACKWARD COMPATIBILITY =====
router.get('/exam/:examId/all', authenticateToken, questionController.getQuestionsByExam);

// ===== FILE UPLOAD SETUP =====
// Create uploads directory if it doesn't exist
// Use path.resolve to get absolute path from project root
const uploadsDir = path.resolve(process.cwd(), 'uploads', 'questions');
console.log('Uploads directory path:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use the absolute path
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = 'question-' + uniqueSuffix + path.extname(file.originalname);
        console.log('Generated filename:', fileName);
        cb(null, fileName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        console.log('File upload attempt:', file.originalname, file.mimetype);
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPG, PNG, GIF)'), false);
        }
    }
});

// Upload endpoint
router.post('/upload/question-photo', 
    authenticateAdminOnly, // Ensure only admins can upload
    upload.single('questionPhoto'), 
    (req, res) => {
        try {
            console.log('Upload request received');
            console.log('File info:', req.file);
            
            if (!req.file) {
                return res.status(400).json({ 
                    success: false,
                    message: 'No file uploaded' 
                });
            }
            
            // Check if file exists
            const filePath = req.file.path;
            if (!fs.existsSync(filePath)) {
                console.error('File not found at path:', filePath);
                return res.status(500).json({
                    success: false,
                    message: 'File upload failed - file not saved'
                });
            }
            
            // Return the URL to access the uploaded file
            const photoUrl = `/uploads/questions/${req.file.filename}`;
            
            console.log('File uploaded successfully:', {
                filename: req.file.filename,
                path: filePath,
                url: photoUrl
            });
            
            res.json({ 
                success: true,
                photoUrl: photoUrl,
                fileName: req.file.filename
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Upload failed', 
                error: error.message 
            });
        }
    }
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
    console.error('Router error:', error);
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
    }
    next(error);
});

module.exports = router;