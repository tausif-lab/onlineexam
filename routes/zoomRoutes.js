


const express = require('express');
const zoomController = require('../controllers/zoomController');
const { authenticateToken, authenticateAdminOnly } = require('../middleware/auth');
const Exam = require('../models/Exam');
const Result = require('../models/ExamSubmission');
const router = express.Router();

/**
 * Generate signature for student to join meeting
 */
router.post('/student-signature', authenticateToken, async (req, res) => {
    try {
        const { meetingNumber, userName, userEmail } = req.body;
        
        if (!meetingNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Meeting number is required' 
            });
        }

        // Role 0 = participant (student)
        const signatureData = zoomController.generateSignature(meetingNumber, 0);
        
        // Add user specific data
        signatureData.userName = userName || req.user.fullName || 'Student';
        signatureData.userEmail = userEmail || req.user.email || '';
        
        res.json({
            success: true,
            data: signatureData
        });
        
    } catch (error) {
        console.error('Error generating student signature:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate meeting signature',
            error: error.message 
        });
    }
});

/**
 * Generate signature for admin to host/monitor meeting
 */
router.post('/admin-signature', authenticateToken, async (req, res) => {
    try {
        const { meetingNumber } = req.body;
        
        if (!meetingNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Meeting number is required' 
            });
        }

        // Role 1 = host (admin/proctor)
        const signatureData = zoomController.generateSignature(meetingNumber, 1);
        
        // Add admin specific data
        signatureData.userName = req.user.fullName || 'Exam Proctor';
        signatureData.userEmail = req.user.email || '';
        
        res.json({
            success: true,
            data: signatureData
        });
        
    } catch (error) {
        console.error('Error generating admin signature:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate meeting signature',
            error: error.message 
        });
    }
});

/**
 * Create a new proctored meeting for an exam (Admin only)
 * This can be called manually or automatically when exam starts
 */
router.post('/create-meeting', authenticateAdminOnly, async (req, res) => {
    try {
        const { examId, examTitle, durationMinutes } = req.body;
        
        if (!examId || !examTitle) {
            return res.status(400).json({ 
                success: false, 
                message: 'Exam ID and title are required' 
            });
        }

        // Check if exam exists
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Check if meeting already exists for this exam
        if (exam.zoomMeetingConfig && exam.zoomMeetingConfig.meetingNumber) {
            return res.json({
                success: true,
                message: 'Meeting already exists for this exam',
                data: {
                    examId,
                    meetingId: exam.zoomMeetingConfig.meetingId,
                    meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                    password: exam.zoomMeetingConfig.password,
                    joinUrl: exam.zoomMeetingConfig.joinUrl,
                    startUrl: exam.zoomMeetingConfig.startUrl,
                    isActive: exam.zoomMeetingConfig.isActive
                }
            });
        }

        // Create new Zoom meeting
        const meeting = await zoomController.createProctorMeeting(
            examId, 
            examTitle, 
            durationMinutes || exam.duration || 120
        );

        // Update exam with meeting configuration
        exam.zoomMeetingConfig = {
            meetingId: meeting.meetingId,
            meetingNumber: meeting.meetingNumber,
            password: meeting.password,
            joinUrl: meeting.joinUrl,
            startUrl: meeting.startUrl,
            topic: meeting.topic,
            createdAt: new Date(),
            isActive: true
        };

        await exam.save();

        res.json({
            success: true,
            message: 'Proctored meeting created successfully',
            data: {
                examId,
                meetingId: meeting.meetingId,
                meetingNumber: meeting.meetingNumber,
                password: meeting.password,
                joinUrl: meeting.joinUrl,
                startUrl: meeting.startUrl,
                topic: meeting.topic,
                isActive: true
            }
        });
        
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create proctored meeting',
            error: error.message 
        });
    }
});

/**
 * Auto-create meeting when exam starts (called internally or by student)
 */
router.post('/auto-create-meeting/:examId', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;

        // Find the exam
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Check if exam is active
        const now = new Date();
        const isExamActive = exam.isActive && 
            (!exam.startDate || exam.startDate <= now) && 
            (!exam.endDate || exam.endDate >= now);

        if (!isExamActive) {
            return res.status(400).json({
                success: false,
                message: 'Exam is not currently active'
            });
        }

        // Check if meeting already exists
        if (exam.zoomMeetingConfig && exam.zoomMeetingConfig.isActive) {
            return res.json({
                success: true,
                message: 'Meeting already active for this exam',
                data: {
                    meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                    password: exam.zoomMeetingConfig.password,
                    joinUrl: exam.zoomMeetingConfig.joinUrl
                }
            });
        }

        // Create meeting automatically
        const meeting = await zoomController.createProctorMeeting(
            examId,
            exam.title,
            exam.duration || 120
        );

        // Update exam with meeting configuration
        exam.zoomMeetingConfig = {
            meetingId: meeting.meetingId,
            meetingNumber: meeting.meetingNumber,
            password: meeting.password,
            joinUrl: meeting.joinUrl,
            startUrl: meeting.startUrl,
            topic: meeting.topic,
            createdAt: new Date(),
            isActive: true
        };

        await exam.save();

        res.json({
            success: true,
            message: 'Meeting auto-created for exam',
            data: {
                meetingNumber: meeting.meetingNumber,
                password: meeting.password,
                joinUrl: meeting.joinUrl
            }
        });

    } catch (error) {
        console.error('Error auto-creating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to auto-create meeting',
            error: error.message
        });
    }
});

/**
 * Get meeting configuration for specific exam
 */
router.get('/exam/:examId/meeting-config', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Check if user has access to this exam
        if (req.user.role === 'student') {
            // For students, check if they're enrolled or exam is public
            if (exam.isPrivate && !exam.enrolledStudents?.includes(req.user.userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not enrolled in this exam'
                });
            }
        }

        // Return meeting config if exists
        if (exam.zoomMeetingConfig && exam.zoomMeetingConfig.isActive) {
            res.json({
                success: true,
                data: {
                    hasMeeting: true,
                    meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                    password: exam.zoomMeetingConfig.password,
                    joinUrl: exam.zoomMeetingConfig.joinUrl,
                    startUrl: req.user.role === 'admin' ? exam.zoomMeetingConfig.startUrl : undefined,
                    topic: exam.zoomMeetingConfig.topic,
                    isActive: exam.zoomMeetingConfig.isActive
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    hasMapping: false,
                    message: 'No active meeting for this exam'
                }
            });
        }

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
 * Get meeting participants (for admin monitoring)
 */
router.get('/meeting/:meetingId/participants', authenticateAdminOnly, async (req, res) => {
    try {
        const { meetingId } = req.params;
        
        const participants = await zoomController.getMeetingParticipants(meetingId);
        
        res.json({
            success: true,
            data: {
                meetingId,
                participantCount: participants.length,
                participants: participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    joinTime: p.join_time,
                    duration: p.duration,
                    videoStatus: p.video,
                    audioStatus: p.audio
                }))
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
 * Get participants for exam meeting (admin monitoring)
 */
router.get('/exam/:examId/participants', authenticateAdminOnly, async (req, res) => {
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
                    participantCount: 0,
                    message: 'No meeting active for this exam'
                }
            });
        }

        // Get meeting participants from Zoom
        const participants = await zoomController.getMeetingParticipants(
            exam.zoomMeetingConfig.meetingId
        );

        // Get exam submissions to cross-reference
        const examSubmissions = await Result.find({
            examId: examId,
            submittedAt: null
        }).lean();

        res.json({
            success: true,
            data: {
                examId,
                meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                participants: participants,
                participantCount: participants.length,
                activeStudents: examSubmissions.map(sub => ({
                    studentId: sub.studentId,
                    studentName: sub.studentName,
                    startedAt: sub.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Error getting exam participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get exam participants',
            error: error.message
        });
    }
});

/**
 * End a meeting (when exam is completed)
 */
router.post('/end-meeting', authenticateAdminOnly, async (req, res) => {
    try {
        const { meetingId, examId } = req.body;
        
        if (!meetingId && !examId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Meeting ID or Exam ID is required' 
            });
        }

        let finalMeetingId = meetingId;

        // If examId is provided, get meetingId from exam
        if (examId && !meetingId) {
            const exam = await Exam.findById(examId);
            if (!exam || !exam.zoomMeetingConfig) {
                return res.status(404).json({
                    success: false,
                    message: 'No active meeting found for this exam'
                });
            }
            finalMeetingId = exam.zoomMeetingConfig.meetingId;
        }

        const result = await zoomController.endMeeting(finalMeetingId);

        // Update exam meeting status if examId provided
        if (examId) {
            await Exam.findByIdAndUpdate(examId, {
                'zoomMeetingConfig.isActive': false,
                'zoomMeetingConfig.endedAt': new Date()
            });
        }
        
        res.json({
            success: true,
            message: result.message,
            data: { meetingId: finalMeetingId, examId }
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
 * End meeting by exam ID
 */
router.post('/exam/:examId/end-meeting', authenticateAdminOnly, async (req, res) => {
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
            message: 'Meeting ended successfully',
            data: {
                examId,
                meetingId: exam.zoomMeetingConfig.meetingId
            }
        });

    } catch (error) {
        console.error('Error ending exam meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end meeting',
            error: error.message
        });
    }
});

/**
 * Get all active meetings (admin dashboard)
 */
router.get('/active-meetings', authenticateAdminOnly, async (req, res) => {
    try {
        const activeMeetings = await Exam.find({
            'zoomMeetingConfig.isActive': true
        }).select('title zoomMeetingConfig createdAt').lean();

        const meetingsWithParticipants = await Promise.all(
            activeMeetings.map(async (exam) => {
                try {
                    const participants = await zoomController.getMeetingParticipants(
                        exam.zoomMeetingConfig.meetingId
                    );
                    return {
                        examId: exam._id,
                        examTitle: exam.title,
                        meetingId: exam.zoomMeetingConfig.meetingId,
                        meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                        participantCount: participants.length,
                        createdAt: exam.zoomMeetingConfig.createdAt
                    };
                } catch (error) {
                    console.error(`Error getting participants for meeting ${exam.zoomMeetingConfig.meetingId}:`, error);
                    return {
                        examId: exam._id,
                        examTitle: exam.title,
                        meetingId: exam.zoomMeetingConfig.meetingId,
                        meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                        participantCount: 0,
                        error: 'Failed to get participant count'
                    };
                }
            })
        );

        res.json({
            success: true,
            data: meetingsWithParticipants
        });

    } catch (error) {
        console.error('Error getting active meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active meetings',
            error: error.message
        });
    }
});

/**
 * Health check for Zoom API connectivity
 */
router.get('/health', async (req, res) => {
    try {
        // Test OAuth token generation
        await zoomController.generateOAuthToken();
        
        res.json({
            success: true,
            message: 'Zoom API connectivity is working',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Zoom API health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Zoom API connectivity failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
