// violations routes - API endpoints for handling proctoring violations
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Violation model (you may need to create this)
const Violation = require('../models/Violation');

/**
 * Log a proctoring violation
 */
router.post('/log', authenticateToken, async (req, res) => {
    try {
        const {
            examId,
            violationType,
            timestamp,
            violationCount,
            zoomMeetingActive
        } = req.body;

        const studentId = req.user.userId;
        const studentName = req.user.fullName;
        const studentEmail = req.user.email;

        // Validate required fields
        if (!examId || !violationType) {
            return res.status(400).json({
                success: false,
                message: 'Exam ID and violation type are required'
            });
        }

        // Create violation record
        const violation = new Violation({
            examId,
            studentId,
            studentName,
            studentEmail,
            violationType,
            timestamp: timestamp || new Date(),
            violationCount: violationCount || 1,
            metadata: {
                zoomMeetingActive: zoomMeetingActive || false,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip || req.connection.remoteAddress
            }
        });

        await violation.save();

        // Log for admin monitoring
        console.log(`Proctoring Violation Logged: ${studentName} (${studentEmail}) - ${violationType} in exam ${examId}`);

        res.json({
            success: true,
            message: 'Violation logged successfully',
            data: {
                violationId: violation._id,
                violationType: violation.violationType,
                violationCount: violation.violationCount
            }
        });

    } catch (error) {
        console.error('Error logging violation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log violation',
            error: error.message
        });
    }
});

/**
 * Get violations for a specific exam (admin only)
 */

/**
 * Get violations for a specific exam (admin only)
 */
router.get('/exam/:examId', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Check if user is admin (you may need to implement role checking)
        // For now, assuming all authenticated users can view violations

        const violations = await Violation.find({ examId })
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const totalViolations = await Violation.countDocuments({ examId });

        res.json({
            success: true,
            data: {
                violations,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalViolations / limit),
                totalViolations,
                hasMore: page * limit < totalViolations
            }
        });

    } catch (error) {
        console.error('Error getting exam violations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get exam violations',
            error: error.message
        });
    }
});

/**
 * Get recent violations for a specific exam (for live monitoring)
 */
router.get('/exam/:examId/recent', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const { minutes = 30 } = req.query;

        // Get violations from the last X minutes
        const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

        const violations = await Violation.find({
            examId,
            timestamp: { $gte: cutoffTime }
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

        res.json({
            success: true,
            data: violations
        });

    } catch (error) {
        console.error('Error getting recent violations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent violations',
            error: error.message
        });
    }
});

/**
 * Get violations for a specific student in an exam
 */
router.get('/exam/:examId/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { examId, studentId } = req.params;

        const violations = await Violation.find({
            examId,
            studentId
        })
        .sort({ timestamp: -1 })
        .lean();

        const violationSummary = violations.reduce((acc, violation) => {
            acc[violation.violationType] = (acc[violation.violationType] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                violations,
                totalCount: violations.length,
                violationSummary,
                studentId,
                examId
            }
        });

    } catch (error) {
        console.error('Error getting student violations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get student violations',
            error: error.message
        });
    }
});

/**
 * Get violation statistics for admin dashboard
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { examId, timeRange = 'today' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (timeRange) {
            case 'today':
                dateFilter = {
                    timestamp: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                    }
                };
                break;
            case 'week':
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                dateFilter = { timestamp: { $gte: weekAgo } };
                break;
            case 'month':
                const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                dateFilter = { timestamp: { $gte: monthAgo } };
                break;
        }

        let matchQuery = dateFilter;
        if (examId) {
            matchQuery.examId = examId;
        }

        // Aggregation pipeline for violation statistics
        const stats = await Violation.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$violationType',
                    count: { $sum: 1 },
                    uniqueStudents: { $addToSet: '$studentId' }
                }
            },
            {
                $project: {
                    violationType: '$_id',
                    count: 1,
                    uniqueStudentsCount: { $size: '$uniqueStudents' },
                    _id: 0
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get total counts
        const totalViolations = await Violation.countDocuments(matchQuery);
        const uniqueStudentsWithViolations = await Violation.distinct('studentId', matchQuery);

        res.json({
            success: true,
            data: {
                violationsByType: stats,
                totalViolations,
                uniqueStudentsWithViolations: uniqueStudentsWithViolations.length,
                timeRange,
                examId: examId || 'all'
            }
        });

    } catch (error) {
        console.error('Error getting violation stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get violation statistics',
            error: error.message
        });
    }
});

/**
 * Get live violation alerts (for real-time monitoring)
 */
router.get('/live-alerts', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.query;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        let matchQuery = {
            timestamp: { $gte: fiveMinutesAgo }
        };

        if (examId) {
            matchQuery.examId = examId;
        }

        // Get recent high-priority violations
        const highPriorityTypes = [
            'Tab switching detected during exam',
            'Exited fullscreen during exam',
            'Right-click attempted during exam',
            'Blocked shortcut attempted'
        ];

        const recentViolations = await Violation.find({
            ...matchQuery,
            violationType: { $in: highPriorityTypes }
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

        // Get students with multiple recent violations
        const studentsWithMultipleViolations = await Violation.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$studentId',
                    violationCount: { $sum: 1 },
                    latestViolation: { $max: '$timestamp' },
                    studentName: { $first: '$studentName' },
                    examId: { $first: '$examId' }
                }
            },
            { $match: { violationCount: { $gte: 3 } } },
            { $sort: { violationCount: -1, latestViolation: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                recentHighPriorityViolations: recentViolations,
                studentsAtRisk: studentsWithMultipleViolations,
                alertCount: recentViolations.length + studentsWithMultipleViolations.length
            }
        });

    } catch (error) {
        console.error('Error getting live alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get live violation alerts',
            error: error.message
        });
    }
});

/**
 * Update violation status (for admin actions)
 */
router.patch('/:violationId/status', authenticateToken, async (req, res) => {
    try {
        const { violationId } = req.params;
        const { status, adminNotes } = req.body;

        const validStatuses = ['pending', 'reviewed', 'ignored', 'escalated'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const violation = await Violation.findByIdAndUpdate(
            violationId,
            {
                status,
                adminNotes,
                reviewedAt: new Date(),
                reviewedBy: req.user.userId
            },
            { new: true }
        );

        if (!violation) {
            return res.status(404).json({
                success: false,
                message: 'Violation not found'
            });
        }

        res.json({
            success: true,
            message: 'Violation status updated successfully',
            data: violation
        });

    } catch (error) {
        console.error('Error updating violation status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update violation status',
            error: error.message
        });
    }
});

/**
 * Delete violation record (admin only)
 */
router.delete('/:violationId', authenticateToken, async (req, res) => {
    try {
        const { violationId } = req.params;

        const violation = await Violation.findByIdAndDelete(violationId);

        if (!violation) {
            return res.status(404).json({
                success: false,
                message: 'Violation not found'
            });
        }

        res.json({
            success: true,
            message: 'Violation deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting violation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete violation',
            error: error.message
        });
    }
});

/**
 * Export violations data (admin only)
 */
router.get('/export/:examId', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const { format = 'csv' } = req.query;

        const violations = await Violation.find({ examId })
            .sort({ timestamp: -1 })
            .lean();

        if (format === 'csv') {
            const csv = convertToCSV(violations);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="violations_${examId}.csv"`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data: violations
            });
        }

    } catch (error) {
        console.error('Error exporting violations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export violations',
            error: error.message
        });
    }
});

// Helper function to convert violations to CSV
function convertToCSV(violations) {
    if (violations.length === 0) {
        return 'No violations found';
    }

    const headers = [
        'Timestamp',
        'Student Name',
        'Student Email',
        'Violation Type',
        'Violation Count',
        'Zoom Meeting Active',
        'Status'
    ];

    const csvRows = [headers.join(',')];

    violations.forEach(violation => {
        const row = [
            new Date(violation.timestamp).toISOString(),
            `"${violation.studentName || 'Unknown'}"`,
            `"${violation.studentEmail || 'Unknown'}"`,
            `"${violation.violationType}"`,
            violation.violationCount || 1,
            violation.metadata?.zoomMeetingActive || false,
            violation.status || 'pending'
        ];
        csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
}
/*router.post('/eye-tracking', authenticateToken, async (req, res) => {
    try {
        const { type, data, examId, timestamp } = req.body;
        const userId = req.user.userId;
        
        // Log eye tracking event to database
        // You can create a separate collection or add to existing violations
        
        console.log(`Eye tracking event: ${type}`, data);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Eye tracking log error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});*/

module.exports = router;