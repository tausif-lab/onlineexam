

const express = require('express');
const router = express.Router();
const {
    getAllExams,
    createExam,
    updateExam,
    deleteExam,
    getExamById,
    getExamsByContext
} = require('../controllers/examController');

const { 
    authenticateToken, 
    authenticateAdminOnly,
    requireAdmin, 
    requireStudent 
} = require('../middleware/auth');
const zoomController = require('../controllers/zoomController');
const Exam = require('../models/Exam');
const Result = require('../models/ExamSubmission');

// GET /api/exams - Get all exams with optional filtering
// Users can only see exams from their own collegeId/branch
router.get('/', authenticateToken, getAllExams);

// GET /api/exams/context/:collegeId/:branch - Get exams by specific context
// Users can only access their own collegeId/branch context
router.get('/context/:collegeId/:branch', authenticateToken, getExamsByContext);

// FIXED: Get active exams with student counts (for admin dashboard)
router.get('/active-with-students', authenticateToken, async (req, res) => {
    try {
        // Get current time
        const now = new Date();

        // Find exams that are currently active
        const activeExams = await Exam.find({
            isActive: true,
            $or: [
                { startDate: { $lte: now }, endDate: { $gte: now } },
                { startDate: { $exists: false }, endDate: { $exists: false } }
            ]
        }).lean();

        console.log('Found active exams:', activeExams.length);

        // For each exam, get the count of students currently taking it
        const examsWithStudents = await Promise.all(activeExams.map(async (exam) => {
            try {
                const activeResults = await Result.find({
                    examId: exam._id,
                    submittedAt: null // Not submitted yet
                }).lean();

                console.log(`Exam ${exam.title}: ${activeResults.length} active students`);

                return {
                    ...exam,
                    studentsCount: activeResults.length,
                    activeStudents: activeResults.map(result => ({
                        studentId: result.studentId,
                        studentName: result.studentName || 'Unknown',
                        startedAt: result.createdAt
                    })),
                    meetingNumber: exam.zoomMeetingConfig?.meetingNumber || null,
                    meetingActive: exam.zoomMeetingConfig?.isActive || false
                };
            } catch (error) {
                console.error(`Error processing exam ${exam._id}:`, error);
                return {
                    ...exam,
                    studentsCount: 0,
                    activeStudents: [],
                    meetingNumber: null,
                    meetingActive: false
                };
            }
        }));

        // Filter to only return exams with active students or meetings
        const relevantExams = examsWithStudents.filter(exam => 
            exam.studentsCount > 0 || exam.meetingActive
        );

        console.log('Returning exams with students:', relevantExams.length);

        res.json({
            success: true,
            data: relevantExams,
            message: `Found ${relevantExams.length} active exams`
        });

    } catch (error) {
        console.error('Error getting active exams:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active exams',
            error: error.message
        });
    }
});

// POST /api/exams - Create new exam (Admin only, can create for any college)
router.post('/', authenticateAdminOnly, createExam);

// GET /api/exams/:id - Get specific exam by ID
// Users can only access exams they have permission for
router.get('/:id', authenticateToken, getExamById);

// FIXED: Get exam details with student count (for admin)
router.get('/:examId/details', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId).lean();
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Get active students count (those currently taking the exam)
        const activeResults = await Result.find({
            examId: examId,
            submittedAt: null // Not submitted yet
        }).lean();

        // Add student count to exam data
        const examWithDetails = {
            ...exam,
            studentsCount: activeResults.length,
            activeStudents: activeResults.map(result => ({
                studentId: result.studentId,
                studentName: result.studentName || 'Unknown',
                startedAt: result.createdAt
            }))
        };

        res.json({
            success: true,
            data: examWithDetails
        });

    } catch (error) {
        console.error('Error getting exam details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get exam details',
            error: error.message
        });
    }
});

// FIXED: Get exam meeting configuration for student
router.get('/:examId/meeting-config', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const studentId = req.user.userId;

        // Find the exam
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Check if student is enrolled or exam is public
        if (exam.isPrivate && !exam.enrolledStudents?.includes(studentId)) {
            return res.status(403).json({
                success: false,
                message: 'You are not enrolled in this exam'
            });
        }

        // Check if exam has an active meeting
        let meetingConfig = null;
        if (exam.zoomMeetingConfig) {
            meetingConfig = {
                meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                password: exam.zoomMeetingConfig.password,
                studentName: req.user.fullName || 'Student',
                studentEmail: req.user.email || ''
            };
        }

        res.json({
            success: true,
            data: meetingConfig
        });

    } catch (error) {
        console.error('Error getting meeting config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get meeting configuration',
            error: error.message
        });
    }
});

// FIXED: Create or update Zoom meeting for an exam (admin)
router.post('/:examId/setup-meeting', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Check if meeting already exists
        if (exam.zoomMeetingConfig && exam.zoomMeetingConfig.meetingNumber) {
            return res.json({
                success: true,
                message: 'Meeting already exists for this exam',
                data: {
                    meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                    password: exam.zoomMeetingConfig.password,
                    joinUrl: exam.zoomMeetingConfig.joinUrl,
                    startUrl: exam.zoomMeetingConfig.startUrl
                }
            });
        }

        // Create new Zoom meeting
        const meetingData = await zoomController.createProctorMeeting(
            examId,
            exam.title,
            exam.duration
        );

        // Update exam with meeting configuration
        exam.zoomMeetingConfig = {
            meetingId: meetingData.meetingId,
            meetingNumber: meetingData.meetingNumber,
            password: meetingData.password,
            joinUrl: meetingData.joinUrl,
            startUrl: meetingData.startUrl,
            topic: meetingData.topic,
            createdAt: new Date(),
            isActive: true
        };

        await exam.save();

        res.json({
            success: true,
            message: 'Zoom meeting created successfully',
            data: {
                meetingNumber: meetingData.meetingNumber,
                password: meetingData.password,
                joinUrl: meetingData.joinUrl,
                startUrl: meetingData.startUrl
            }
        });

    } catch (error) {
        console.error('Error setting up meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to setup meeting',
            error: error.message
        });
    }
});

// PUT /api/exams/:id - Update specific exam (Admin only, can update any exam)
router.put('/:id', authenticateAdminOnly, updateExam);

// DELETE /api/exams/:id - Delete specific exam (Admin only, can delete any exam)
router.delete('/:id', authenticateAdminOnly, deleteExam);

// Additional utility routes for debugging
router.get('/debug/all-exams', authenticateToken, async (req, res) => {
    try {
        const exams = await Exam.find({}).lean();
        const results = await Result.find({}).lean();
        
        res.json({
            success: true,
            data: {
                totalExams: exams.length,
                activeExams: exams.filter(e => e.isActive).length,
                totalResults: results.length,
                activeResults: results.filter(r => !r.submittedAt).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;