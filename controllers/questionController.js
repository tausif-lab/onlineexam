

const { Exam, Question } = require('../models');
const ExamSubmission = require('../models/ExamSubmission');
const mongoose = require('mongoose');

// Get questions for students (WITHOUT correct answers but WITH images)
const getExamQuestions = async (req, res, next) => {
    try {
        const { examId } = req.params;
        const studentId = req.user.user1Id;

        console.log('Student fetching questions for exam:', examId);

        // Check if exam exists and is active
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        if (exam.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'This exam is not currently active'
            });
        }

        // Check if student has already submitted this exam
        const existingSubmission = await ExamSubmission.findOne({
            examId,
            studentId
        });

        if (existingSubmission) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted this exam',
                submissionId: existingSubmission._id
            });
        }

        // FIXED: Get questions WITHOUT correct answers but WITH photoUrl for images
        const questions = await Question.find({ examId })
            .select('_id text type options createdAt photoUrl') // ← Added photoUrl here!
            .sort({ createdAt: 1 });

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No questions found for this exam'
            });
        }

        console.log('Questions sent to student (with images, without answers):', questions.length);
        
        // Debug: Log each question to see if photoUrl is included
        questions.forEach((q, index) => {
            console.log(`Question ${index + 1}:`, {
                id: q._id,
                hasText: !!q.text,
                hasImage: !!q.photoUrl,
                photoUrl: q.photoUrl || 'none'
            });
        });

        res.status(200).json({
            success: true,
            data: {
                exam: {
                    id: exam._id,
                    title: exam.title,
                    description: exam.description,
                    duration: exam.duration,
                    category: exam.category,
                    totalQuestions: questions.length
                },
                questions: questions
            }
        });

    } catch (error) {
        console.error('Error fetching exam questions for student:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching questions',
            error: error.message
        });
    }
};

// Get questions for an exam (Admin version - with correct answers)
const getQuestionsForAdmin = async (req, res, next) => {
    try {
        const examId = req.params.examId || req.params.id;

        // Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        console.log('Admin fetching questions for exam:', examId);

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        // Admin gets ALL fields including correctAnswer and photoUrl
        const questions = await Question.find({ examId: examId }).sort({ createdAt: 1 });
        console.log('Found questions:', questions.length);

        res.json({
            success: true,
            data: {
                exam: exam,
                questions: questions,
                totalQuestions: questions.length
            }
        });
    } catch (error) {
        console.error('Get admin questions error:', error);
        next(error);
    }
};

// Add question to exam
const addQuestion = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        const { text, type, options, correctAnswer, photoUrl } = req.body;

        // Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        console.log('Adding question to exam:', examId, { text, type, options, correctAnswer, photoUrl });

        // Validation - at least text OR photoUrl must be provided
        if ((!text || !text.trim()) && (!photoUrl || !photoUrl.trim())) {
            return res.status(400).json({ 
                message: 'Either question text or image is required' 
            });
        }

        if (!type || !options || correctAnswer === undefined) {
            return res.status(400).json({ message: 'Type, options, and correct answer are required' });
        }

        if (!Array.isArray(options) || options.length === 0) {
            return res.status(400).json({ message: 'Options must be a non-empty array' });
        }

        // Check if exam exists
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const question = new Question({
            examId: examId,
            text: text || '',
            photoUrl: photoUrl || null,
            type,
            options,
            correctAnswer: parseInt(correctAnswer)
        });

        const savedQuestion = await question.save();
        console.log('Question added successfully:', savedQuestion._id);

        res.status(201).json({
            success: true,
            message: 'Question added successfully',
            question: savedQuestion
        });
    } catch (error) {
        console.error('Add question error:', error);
        next(error);
    }
};

// Update question
const updateQuestion = async (req, res, next) => {
    try {
        const questionId = req.params.id;
        const { text, type, options, correctAnswer, photoUrl } = req.body;

        // Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        console.log('Updating question:', questionId, { text, type, options, correctAnswer, photoUrl });

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ error: 'Invalid question ID format' });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Update question fields
        if (text !== undefined) question.text = text;
        if (photoUrl !== undefined) question.photoUrl = photoUrl;
        if (type) question.type = type;
        if (options) question.options = options;
        if (correctAnswer !== undefined) question.correctAnswer = parseInt(correctAnswer);

        const updatedQuestion = await question.save();
        console.log('Question updated successfully:', updatedQuestion._id);

        res.json({
            success: true,
            message: 'Question updated successfully',
            question: updatedQuestion
        });
    } catch (error) {
        console.error('Update question error:', error);
        next(error);
    }
};

// Delete question
const deleteQuestion = async (req, res, next) => {
    try {
        const questionId = req.params.id;

        // Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        console.log('Attempting to delete question:', questionId);

        // Validate that questionId exists
        if (!questionId) {
            return res.status(400).json({ error: 'Question ID is required' });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ error: 'Invalid question ID format' });
        }

        // Find the question first to ensure it exists
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Delete the question
        await Question.findByIdAndDelete(questionId);
        console.log('Question deleted successfully:', questionId);

        res.json({
            success: true,
            message: 'Question deleted successfully',
            deletedId: questionId
        });
    } catch (error) {
        console.error('Delete question error:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid question ID format' });
        }

        // Handle other errors
        res.status(500).json({
            error: 'Internal server error while deleting question',
            details: error.message
        });
    }
};

// Get question by ID
const getQuestionById = async (req, res, next) => {
    try {
        const questionId = req.params.id;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ error: 'Invalid question ID format' });
        }

        const question = await Question.findById(questionId).populate('examId', 'title');
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json({
            success: true,
            data: question
        });
    } catch (error) {
        console.error('Get question by ID error:', error);
        next(error);
    }
};

// Keep your original function as alias for backward compatibility
const getQuestionsByExam = getQuestionsForAdmin;

module.exports = {
    getQuestionsByExam,      // Your original function (now points to admin version)
    getQuestionsForAdmin,    // Admin version with correct answers
    getExamQuestions,        // Student version without correct answers but with images
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionById
};