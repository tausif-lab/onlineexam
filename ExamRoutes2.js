/*const express = require('express');
const router = express.Router();
const {
    getAllExams,
    createExam,
    updateExam,
    deleteExam,
    getExamById,
    getExamsByContext
} = require('../controllers/examController');

// Import the middleware correctly - destructure it from the auth module
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/exams - Get all exams with optional filtering
// Query params: collegeId, user1Id, branch, status
router.get('/', getAllExams);

// GET /api/exams/context/:collegeId/:branch - Get exams by specific context
router.get('/context/:collegeId/:branch', getExamsByContext);

// POST /api/exams - Create new exam (Admin only)
router.post('/', requireAdmin, createExam);

// GET /api/exams/:id - Get specific exam by ID
// Query params: collegeId, user1Id, branch (for validation)
router.get('/:id', getExamById);

// PUT /api/exams/:id - Update specific exam (Admin only)
router.put('/:id', requireAdmin, updateExam);

// DELETE /api/exams/:id - Delete specific exam (Admin only)
// Query params: collegeId, user1Id, branch (for permission check)
router.delete('/:id', requireAdmin, deleteExam);

module.exports = router;*/
/*const express = require('express');
const router = express.Router();
const {
    getAllExams,
    createExam,
    updateExam,
    deleteExam,
    getExamById,
    getExamsByContext
} = require('../controllers/examController');

// Import the middleware correctly - destructure it from the auth module
const { 
    authenticateToken, 
    authenticateTokenStrict, 
    authenticateAdminOnly,
    checkUnauthorizedAccess,
    requireAdmin, 
    requireStudent 
} = require('../middleware/auth');

// GET /api/exams - Get all exams with optional filtering
// Query params: collegeId, user1Id, branch, status
// Students see only their exams, admins can see all
router.get('/', authenticateToken, getAllExams);

// GET /api/exams/context/:collegeId/:branch - Get exams by specific context
// Must match user's collegeId for students, admins can access any
router.get('/context/:collegeId/:branch', authenticateToken,checkUnauthorizedAccess, getExamsByContext);

// POST /api/exams - Create new exam (Admin only, can create for any college)
router.post('/', authenticateAdminOnly, createExam);

// GET /api/exams/:id - Get specific exam by ID
// Query params: collegeId, user1Id, branch (for validation)
// Students can only access exams from their college, admins can access any
router.get('/:id', authenticateToken, getExamById);

// PUT /api/exams/:id - Update specific exam (Admin only, can update any exam)
router.put('/:id', authenticateAdminOnly, updateExam);

// DELETE /api/exams/:id - Delete specific exam (Admin only, can delete any exam)
// Query params: collegeId, user1Id, branch (for permission check)
router.delete('/:id', authenticateAdminOnly, deleteExam);

module.exports = router;*/


/*
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

// GET /api/exams - Get all exams with optional filtering
// Users can only see exams from their own collegeId/branch
router.get('/', authenticateToken, getAllExams);

// GET /api/exams/context/:collegeId/:branch - Get exams by specific context
// Users can only access their own collegeId/branch context
router.get('/context/:collegeId/:branch', authenticateToken, getExamsByContext);

// POST /api/exams - Create new exam (Admin only, can create for any college)
router.post('/', authenticateAdminOnly, createExam);

// GET /api/exams/:id - Get specific exam by ID
// Users can only access exams they have permission for
router.get('/:id', authenticateToken, getExamById);

// PUT /api/exams/:id - Update specific exam (Admin only, can update any exam)
router.put('/:id', authenticateAdminOnly, updateExam);

// DELETE /api/exams/:id - Delete specific exam (Admin only, can delete any exam)
router.delete('/:id', authenticateAdminOnly, deleteExam);

/*module.exports = router;*/
/*/ Enhanced exam routes with Zoom meeting integration
const express = require('express');
const Exam = require('../models/Exam');
const Result = require('../models/ExamSubmission');
const { authenticateToken } = require('../middleware/auth');
const zoomController = require('../controllers/zoomController');
const router = express.Router();

/* Get exam meeting configuration for student
 *
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

/**
 * Get exam details with student count (for admin)
 *
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
        exam.studentsCount = activeResults.length;
        exam.activeStudents = activeResults.map(result => ({
            studentId: result.studentId,
            studentName: result.studentName || 'Unknown',
            startedAt: result.createdAt
        }));

        res.json({
            success: true,
            data: exam
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

/**
 * Get active exams with student counts (for admin dashboard)
 *
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

        // For each exam, get the count of students currently taking it
        const examsWithStudents = await Promise.all(activeExams.map(async (exam) => {
            const activeResults = await Result.find({
                examId: exam._id,
                submittedAt: null // Not submitted yet
            }).lean();

            return {
                ...exam,
                studentsCount: activeResults.length,
                meetingNumber: exam.zoomMeetingConfig?.meetingNumber || null,
                meetingActive: exam.zoomMeetingConfig?.isActive || false
            };
        }));

        res.json({
            success: true,
            data: examsWithStudents
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

/**
 * Create or update Zoom meeting for an exam (admin)
 *
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

/**
 * End Zoom meeting for an exam (admin)
 *
router.post('/:examId/end-meeting', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        if (!exam.zoomMeetingConfig || !exam.zoomMeetingConfig.meetingId) {
            return res.status(400).json({
                success: false,
                message: 'No active meeting found for this exam'
            });
        }

        // End the Zoom meeting
        await zoomController.endMeeting(exam.zoomMeetingConfig.meetingId);

        // Update exam meeting status
        exam.zoomMeetingConfig.isActive = false;
        exam.zoomMeetingConfig.endedAt = new Date();
        await exam.save();

        res.json({
            success: true,
            message: 'Meeting ended successfully'
        });

    } catch (error) {
        console.error('Error ending meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end meeting',
            error: error.message
        });
    }
});

/**
 * Get meeting participants for an exam (admin)
 *
router.get('/:examId/meeting-participants', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        if (!exam.zoomMeetingConfig || !exam.zoomMeetingConfig.meetingId) {
            return res.json({
                success: true,
                data: {
                    participants: [],
                    participantCount: 0
                }
            });
        }

        // Get meeting participants from Zoom
        const participants = await zoomController.getMeetingParticipants(
            exam.zoomMeetingConfig.meetingId
        );

        res.json({
            success: true,
            data: {
                participants: participants,
                participantCount: participants.length,
                meetingNumber: exam.zoomMeetingConfig.meetingNumber
            }
        });

    } catch (error) {
        console.error('Error getting meeting participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get meeting participants',
            error: error.message
        });
    }
});

/**
 * Get exam statistics for admin dashboard
 *
router.get('/admin/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        // Get total number of unique students who have taken exams
        const totalStudents = await Result.distinct('studentId').countDocuments();

        // Get active exams count
        const now = new Date();
        const activeExams = await Exam.countDocuments({
            isActive: true,
            $or: [
                { startDate: { $lte: now }, endDate: { $gte: now } },
                { startDate: { $exists: false }, endDate: { $exists: false } }
            ]
        });

        // Get completed exams count
        const completedExams = await Result.countDocuments({
            submittedAt: { $ne: null }
        });

        // Calculate average score
        const avgResult = await Result.aggregate([
            { $match: { submittedAt: { $ne: null }, score: { $ne: null } } },
            { $group: { _id: null, averageScore: { $avg: '$score' } } }
        ]);
        const averageScore = avgResult.length > 0 ? Math.round(avgResult[0].averageScore) : 0;

        res.json({
            success: true,
            data: {
                totalStudents,
                activeExams,
                completedExams,
                averageScore
            }
        });

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard statistics',
            error: error.message
        });
    }
});

/**
 * Get recent activity for admin dashboard
 *
router.get('/admin/recent-activity', authenticateToken, async (req, res) => {
    try {
        // Get recent exam submissions
        const recentResults = await Result.find({
            submittedAt: { $ne: null }
        })
        .sort({ submittedAt: -1 })
        .limit(10)
        .populate('examId', 'title')
        .lean();

        // Get active exams with student counts
        const now = new Date();
        const activeExams = await Exam.find({
            isActive: true,
            $or: [
                { startDate: { $lte: now }, endDate: { $gte: now } },
                { startDate: { $exists: false }, endDate: { $exists: false } }
            ]
        }).lean();

        // Add student counts to active exams
        const liveExams = await Promise.all(activeExams.map(async (exam) => {
            const activeResults = await Result.find({
                examId: exam._id,
                submittedAt: null
            }).lean();

            // Get violation count for this exam
            const violationsCount = await getExamViolationsCount(exam._id);

            return {
                ...exam,
                studentsCount: activeResults.length,
                violationsCount,
                meetingNumber: exam.zoomMeetingConfig?.meetingNumber || null
            };
        }));

        // Format recent activity
        const recentActivity = recentResults.map(result => ({
            type: 'exam_submitted',
            description: `${result.studentName || 'Student'} submitted exam`,
            details: `${result.examId?.title} - Score: ${result.score}/${result.totalQuestions}`,
            timestamp: result.submittedAt
        }));

        res.json({
            success: true,
            data: {
                recentActivity,
                liveExams: liveExams.filter(exam => exam.studentsCount > 0)
            }
        });

    } catch (error) {
        console.error('Error getting recent activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent activity',
            error: error.message
        });
    }
});

/**
 * Helper function to get violation count for an exam
 *
async function getExamViolationsCount(examId) {
    try {
        // This would query your violations collection
        // For now, return 0 as a placeholder
        const Violation = require('../models/Violation'); // Assuming you have a violations model
        return await Violation.countDocuments({ examId });
    } catch (error) {
        console.error('Error getting violations count:', error);
        return 0;
    }
}

module.exports = router;*/