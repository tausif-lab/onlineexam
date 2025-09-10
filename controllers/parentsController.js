

// controllers/parentController.js - Fixed implementation with null checks
const User = require('../models/User');
const ExamSubmission = require('../models/ExamSubmission');
const Exam = require('../models/Exam');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    return id && mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to calculate statistics
const calculateCategoryStats = (results) => {
    const categoryPerformance = {};
    
    results.forEach(result => {
        const category = result.exam.category;
        if (!categoryPerformance[category]) {
            categoryPerformance[category] = {
                totalExams: 0,
                totalScore: 0,
                passed: 0,
                failed: 0,
                scores: []
            };
        }
        
        categoryPerformance[category].totalExams++;
        categoryPerformance[category].totalScore += result.percentage;
        categoryPerformance[category].scores.push(result.percentage);
        
        if (result.percentage >= 60) {
            categoryPerformance[category].passed++;
        } else {
            categoryPerformance[category].failed++;
        }
    });

    // Calculate averages and additional stats
    Object.keys(categoryPerformance).forEach(category => {
        const stats = categoryPerformance[category];
        stats.averagePercentage = parseFloat((stats.totalScore / stats.totalExams).toFixed(2));
        stats.passRate = parseFloat(((stats.passed / stats.totalExams) * 100).toFixed(2));
        stats.maxScore = Math.max(...stats.scores);
        stats.minScore = Math.min(...stats.scores);
        
        // Remove scores array to keep response clean
        delete stats.scores;
    });

    return categoryPerformance;
};

// Parent login - validates child credentials
exports.parentLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        console.log('Parent login attempt for child email:', email);

        // Find student by email
        const student = await User.findOne({ 
            email: email.toLowerCase().trim(),
            role: 'student',
            isActive: true
        });

        if (!student) {
            console.log('Student not found:', email);
            return res.status(404).json({
                success: false,
                message: 'Student not found or account is inactive'
            });
        }

        // Verify password
        const isPasswordValid = await student.comparePassword(password);
        if (!isPasswordValid) {
            console.log('Invalid password for student:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        console.log('Parent login successful for student:', student.fullName);

        // Return student info (without sensitive data)
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                studentId: student._id,
                fullName: student.fullName,
                email: student.email,
                collegeId: student.collegeId,
                branch: student.branch,
                user1Id: student.user1Id
            }
        });

    } catch (error) {
        console.error('Parent login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
};

// Get all exam results for a specific student
exports.getStudentResults = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Validate studentId format
        if (!isValidObjectId(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }

        console.log('Fetching results for student ID:', studentId);

        // Verify student exists
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Get all submissions for this student
        const submissions = await ExamSubmission.find({ studentId })
            .populate({
                path: 'examId',
                select: 'title description category duration totalMarks passingMarks createdAt'
            })
            .sort({ submittedAt: -1 });

        console.log(`Found ${submissions.length} submissions for student ${student.fullName}`);

        // Filter out submissions with null examId and format results
        const validSubmissions = submissions.filter(submission => 
            submission.examId && submission.examId._id
        );

        console.log(`${validSubmissions.length} valid submissions (${submissions.length - validSubmissions.length} had null examId)`);

        const results = validSubmissions.map(submission => {
            const score = Number(submission.score) || 0;
            const totalQuestions = Number(submission.totalQuestions) || 0;
            const percentage = totalQuestions > 0 ? 
                parseFloat(((score / totalQuestions) * 100).toFixed(2)) : 0;
            
            // Safely access exam properties with fallbacks
            const exam = submission.examId;
            
            return {
                submissionId: submission._id,
                exam: {
                    id: exam._id,
                    title: exam.title || 'Unknown Exam',
                    description: exam.description || '',
                    category: exam.category || 'Uncategorized',
                    duration: exam.duration || 0,
                    totalMarks: exam.totalMarks || totalQuestions,
                    passingMarks: exam.passingMarks || Math.ceil(totalQuestions * 0.6),
                    createdAt: exam.createdAt || submission.submittedAt
                },
                score: score,
                totalQuestions: totalQuestions,
                percentage: percentage,
                timeTaken: submission.timeTaken || 0,
                submittedAt: submission.submittedAt,
                status: submission.status,
                passStatus: percentage >= 60 ? 'PASSED' : 'FAILED',
                answeredQuestions: submission.answeredQuestions || 0,
                isAutoSubmit: submission.isAutoSubmit || false
            };
        });

        // Calculate overall statistics
        const totalExams = results.length;
        const passedExams = results.filter(r => r.percentage >= 60).length;
        const failedExams = totalExams - passedExams;
        const averagePercentage = totalExams > 0 ? 
            parseFloat((results.reduce((sum, r) => sum + r.percentage, 0) / totalExams).toFixed(2)) : 0;

        // Category-wise performance
        const categoryPerformance = totalExams > 0 ? calculateCategoryStats(results) : {};

        // Recent performance (last 5 exams)
        const recentResults = results.slice(0, 5);
        const recentAverage = recentResults.length > 0 ?
            parseFloat((recentResults.reduce((sum, r) => sum + r.percentage, 0) / recentResults.length).toFixed(2)) : 0;

        // Performance trend analysis
        const performanceTrend = results.length >= 3 ? 
            (() => {
                const recent3 = results.slice(0, 3);
                const previous3 = results.slice(3, 6);
                if (previous3.length === 0) return 'insufficient_data';
                
                const recentAvg = recent3.reduce((sum, r) => sum + r.percentage, 0) / recent3.length;
                const previousAvg = previous3.reduce((sum, r) => sum + r.percentage, 0) / previous3.length;
                
                const difference = recentAvg - previousAvg;
                if (difference > 5) return 'improving';
                if (difference < -5) return 'declining';
                return 'stable';
            })() : 'insufficient_data';

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    fullName: student.fullName,
                    email: student.email,
                    collegeId: student.collegeId,
                    branch: student.branch,
                    user1Id: student.user1Id
                },
                statistics: {
                    totalExams,
                    passedExams,
                    failedExams,
                    averagePercentage,
                    recentAverage,
                    passRate: totalExams > 0 ? parseFloat(((passedExams / totalExams) * 100).toFixed(2)) : 0,
                    performanceTrend,
                    validSubmissions: validSubmissions.length,
                    totalSubmissions: submissions.length,
                    nullExamIds: submissions.length - validSubmissions.length
                },
                categoryPerformance,
                results: results
            }
        });

    } catch (error) {
        console.error('Error fetching student results:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching results',
            error: error.message
        });
    }
};

// Get detailed result for a specific exam submission
exports.getDetailedResult = async (req, res) => {
    try {
        const { studentId, submissionId } = req.params;

        // Validate IDs
        if (!isValidObjectId(studentId) || !isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        console.log('Fetching detailed result for submission:', submissionId);

        // Find submission with populated data
        const submission = await ExamSubmission.findOne({
            _id: submissionId,
            studentId: studentId
        }).populate([
            {
                path: 'examId',
                select: 'title description category duration totalMarks passingMarks'
            },
            {
                path: 'answers.questionId',
                select: 'question text options correctAnswer explanation category difficulty'
            }
        ]);

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Check if exam exists
        if (!submission.examId) {
            return res.status(404).json({
                success: false,
                message: 'Associated exam not found'
            });
        }

        // Get detailed result using the model method if available, otherwise build manually
        let detailedResult;
        
        if (typeof submission.getDetailedResult === 'function') {
            detailedResult = await submission.getDetailedResult();
        } else {
            // Manual detailed result construction
            const score = Number(submission.score) || 0;
            const totalQuestions = Number(submission.totalQuestions) || 0;
            const percentage = totalQuestions > 0 ? 
                parseFloat(((score / totalQuestions) * 100).toFixed(2)) : 0;

            detailedResult = {
                submissionId: submission._id,
                exam: {
                    title: submission.examId.title || 'Unknown Exam',
                    description: submission.examId.description || '',
                    category: submission.examId.category || 'Uncategorized',
                    duration: submission.examId.duration || 0
                },
                score: score,
                totalQuestions: totalQuestions,
                percentage: percentage,
                timeTaken: submission.timeTaken || 0,
                submittedAt: submission.submittedAt,
                status: submission.status,
                passStatus: percentage >= 60 ? 'PASSED' : 'FAILED'
            };
        }

        // Add additional analytics with null checks
        const questionAnalysis = submission.answers ? submission.answers.map((answer, index) => {
            const question = answer.questionId;
            return {
                questionNumber: index + 1,
                question: question ? (question.question || question.text || 'Question not available') : 'Question not found',
                category: question ? question.category : 'Unknown',
                difficulty: question ? question.difficulty : 'Unknown',
                options: question ? question.options : [],
                correctAnswer: question ? question.correctAnswer : null,
                selectedAnswer: answer.selectedOption,
                isCorrect: answer.isCorrect,
                explanation: question ? question.explanation : null,
                wasAnswered: answer.selectedOption !== null && answer.selectedOption !== undefined
            };
        }) : [];

        res.status(200).json({
            success: true,
            data: {
                ...detailedResult,
                questionAnalysis,
                recommendations: generateRecommendations(questionAnalysis)
            }
        });

    } catch (error) {
        console.error('Error fetching detailed result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch detailed result',
            error: error.message
        });
    }
};

// Get performance analytics for parent dashboard
exports.getPerformanceAnalytics = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { category, timeframe, limit } = req.query;

        // Validate studentId format
        if (!isValidObjectId(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }

        console.log('Fetching performance analytics for student:', studentId);

        // Build query filters
        const matchFilter = { studentId: new mongoose.Types.ObjectId(studentId) };

        // Add timeframe filter if specified
        if (timeframe && timeframe !== 'all') {
            const now = new Date();
            let startDate;
            
            switch (timeframe) {
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'quarter':
                    startDate = new Date(now.setMonth(now.getMonth() - 3));
                    break;
                case 'year':
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    startDate = null;
            }
            
            if (startDate) {
                matchFilter.submittedAt = { $gte: startDate };
            }
        }

        // Aggregation pipeline for category analytics with null checks
        const categoryPipeline = [
            { $match: matchFilter },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            { $unwind: { path: '$exam', preserveNullAndEmptyArrays: false } }, // Filter out null exams
            ...(category && category !== 'all' ? [{ $match: { 'exam.category': category } }] : []),
            {
                $group: {
                    _id: '$exam.category',
                    totalExams: { $sum: 1 },
                    totalScore: { $sum: '$score' },
                    totalQuestions: { $sum: '$totalQuestions' },
                    averagePercentage: { $avg: '$percentage' },
                    maxPercentage: { $max: '$percentage' },
                    minPercentage: { $min: '$percentage' },
                    passedExams: {
                        $sum: { $cond: [{ $gte: ['$percentage', 60] }, 1, 0] }
                    },
                    recentExams: {
                        $push: {
                            examTitle: '$exam.title',
                            percentage: '$percentage',
                            submittedAt: '$submittedAt',
                            score: '$score',
                            totalQuestions: '$totalQuestions'
                        }
                    }
                }
            },
            {
                $addFields: {
                    passRate: {
                        $multiply: [
                            { $divide: ['$passedExams', '$totalExams'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { averagePercentage: -1 } }
        ];

        // Get time-based performance trend with null checks
        const trendPipeline = [
            { $match: matchFilter },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            { $unwind: { path: '$exam', preserveNullAndEmptyArrays: false } }, // Filter out null exams
            ...(category && category !== 'all' ? [{ $match: { 'exam.category': category } }] : []),
            {
                $group: {
                    _id: {
                        year: { $year: '$submittedAt' },
                        month: { $month: '$submittedAt' }
                    },
                    averagePercentage: { $avg: '$percentage' },
                    examCount: { $sum: 1 },
                    passCount: {
                        $sum: { $cond: [{ $gte: ['$percentage', 60] }, 1, 0] }
                    }
                }
            },
            {
                $addFields: {
                    passRate: {
                        $multiply: [
                            { $divide: ['$passCount', '$examCount'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];

        // Execute both pipelines
        const [categoryAnalytics, performanceTrend] = await Promise.all([
            ExamSubmission.aggregate(categoryPipeline),
            ExamSubmission.aggregate(trendPipeline)
        ]);

        // Get recent submissions for additional insights with null checks
        const recentSubmissions = await ExamSubmission.find(matchFilter)
            .populate('examId', 'title category duration')
            .sort({ submittedAt: -1 })
            .limit(parseInt(limit) || 10);

        // Filter out submissions with null examId
        const validRecentSubmissions = recentSubmissions.filter(sub => sub.examId);

        res.status(200).json({
            success: true,
            data: {
                categoryAnalytics,
                performanceTrend,
                recentSubmissions: validRecentSubmissions.map(sub => ({
                    examTitle: sub.examId.title || 'Unknown Exam',
                    category: sub.examId.category || 'Uncategorized',
                    percentage: sub.percentage || 0,
                    submittedAt: sub.submittedAt,
                    passStatus: (sub.percentage || 0) >= 60 ? 'PASSED' : 'FAILED'
                })),
                filters: {
                    category: category || 'all',
                    timeframe: timeframe || 'all',
                    limit: parseInt(limit) || 10
                },
                metadata: {
                    totalSubmissions: recentSubmissions.length,
                    validSubmissions: validRecentSubmissions.length,
                    nullExamIds: recentSubmissions.length - validRecentSubmissions.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching performance analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance analytics',
            error: error.message
        });
    }
};

// Helper function to generate recommendations based on question analysis
function generateRecommendations(questionAnalysis) {
    if (!questionAnalysis || questionAnalysis.length === 0) {
        return [{
            type: 'no_data',
            message: 'No question data available for analysis.',
            priority: 'low'
        }];
    }

    const recommendations = [];
    
    // Analyze incorrect answers by category
    const categoryErrors = {};
    const difficultyErrors = {};
    
    questionAnalysis.forEach(q => {
        if (!q.isCorrect && q.wasAnswered) {
            categoryErrors[q.category] = (categoryErrors[q.category] || 0) + 1;
            difficultyErrors[q.difficulty] = (difficultyErrors[q.difficulty] || 0) + 1;
        }
    });
    
    // Generate category-based recommendations
    const topErrorCategories = Object.entries(categoryErrors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    topErrorCategories.forEach(([category, errors]) => {
        recommendations.push({
            type: 'category_improvement',
            category,
            message: `Focus more on ${category} topics. ${errors} incorrect answers in this area.`,
            priority: errors > 3 ? 'high' : 'medium'
        });
    });
    
    // Check for unanswered questions
    const unanswered = questionAnalysis.filter(q => !q.wasAnswered).length;
    if (unanswered > 0) {
        recommendations.push({
            type: 'time_management',
            message: `${unanswered} questions were left unanswered. Work on time management.`,
            priority: unanswered > 5 ? 'high' : 'medium'
        });
    }
    
    // Check difficulty level performance
    const totalQuestions = questionAnalysis.length;
    const correctAnswers = questionAnalysis.filter(q => q.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    if (accuracy < 40) {
        recommendations.push({
            type: 'study_plan',
            message: 'Consider reviewing fundamental concepts and practicing more basic questions.',
            priority: 'high'
        });
    } else if (accuracy < 60) {
        recommendations.push({
            type: 'practice',
            message: 'Good foundation! Focus on practicing medium-difficulty questions.',
            priority: 'medium'
        });
    } else if (accuracy >= 80) {
        recommendations.push({
            type: 'excellence',
            message: 'Excellent performance! Try challenging yourself with advanced topics.',
            priority: 'low'
        });
    }
    
    // If no recommendations generated, add a default one
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'general',
            message: 'Keep practicing regularly to maintain and improve performance.',
            priority: 'low'
        });
    }
    
    return recommendations;
}

module.exports = {
    parentLogin: exports.parentLogin,
    getStudentResults: exports.getStudentResults,
    getDetailedResult: exports.getDetailedResult,
    getPerformanceAnalytics: exports.getPerformanceAnalytics
};