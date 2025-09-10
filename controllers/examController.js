
const { Exam, Question } = require('../models');

// Get all exams with filtering
const getAllExams = async (req, res, next) => {
    try {
        const { collegeId, user1Id, branch } = req.query;
        console.log('Fetching exams with filters:', { collegeId, user1Id, branch });
        console.log('Request user:', req.user); // Debug log
        
        // Build filter object
        let filter = {};
        
        // Add filters based on query parameters
        if (collegeId) {
            filter.collegeId = collegeId;
        }
        
        if (user1Id) {
            // You can filter by createdBy or add a field to exam schema
            filter.createdBy = user1Id; // Assuming user1Id is the ID of the user who created the exam
        }
        
        if (branch) {
            filter.branch = branch;
        }

        console.log('Applied filter:', filter);
        
        const exams = await Exam.find(filter).populate('createdBy', 'fullName');
        
        // Get question count for each exam
        const examsWithQuestionCount = await Promise.all(
            exams.map(async (exam) => {
                const questionCount = await Question.countDocuments({ examId: exam._id });
                return {
                    id: exam._id,
                    title: exam.title,
                    description: exam.description,
                    category: exam.category,
                    duration: exam.duration,
                    status: exam.status,
                    questionCount: questionCount,
                    createdAt: exam.createdAt,
                    createdBy: exam.createdBy ? exam.createdBy.fullName : 'Unknown',
                    collegeId: exam.collegeId,
                    branch: exam.branch
                };
            })
        );

        console.log('Fetched exams with filters:', examsWithQuestionCount.length);
        res.json(examsWithQuestionCount);
    } catch (error) {
        console.error('Get exams error:', error);
        next(error);
    }
};

// Create new exam with context parameters
const createExam = async (req, res, next) => {
    try {
        const { title, description, category, duration, status, collegeId, branch } = req.body;
        console.log('Creating exam:', { title, category, duration, status, collegeId, branch });
        console.log('Request user:', req.user); // Debug log

        // Validation
        if (!title || !category || !duration) {
            return res.status(400).json({ message: 'Title, category, and duration are required' });
        }

        // Fix: Use userId instead of user1Id since that's what the auth middleware provides
        const exam = new Exam({
            title,
            description: description || '',
            category,
            duration: parseInt(duration),
            status: status || 'draft',
            createdBy: req.user.userId, // Changed from req.user.user1Id to req.user.userId
            collegeId: collegeId || req.user.collegeId,
            branch: branch || req.user.branch
        });

        const savedExam = await exam.save();
        console.log('Exam created successfully:', savedExam._id);

        res.status(201).json({
            message: 'Exam created successfully',
            exam: {
                id: savedExam._id,
                title: savedExam.title,
                description: savedExam.description,
                category: savedExam.category,
                duration: savedExam.duration,
                status: savedExam.status,
                questionCount: 0,
                createdAt: savedExam.createdAt,
                collegeId: savedExam.collegeId,
                branch: savedExam.branch
            }
        });

    } catch (error) {
        console.error('Create exam error:', error);
        next(error);
    }
};

// Update exam
const updateExam = async (req, res, next) => {
    try {
        const { title, description, category, duration, status, collegeId, branch } = req.body;
        const examId = req.params.id;
        console.log('Updating exam:', examId, { title, category, duration, status, collegeId, branch });

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Optional: Check if user has permission to update this exam
        // You can add permission logic here if needed

        // Update exam fields
        if (title) exam.title = title;
        if (description !== undefined) exam.description = description;
        if (category) exam.category = category;
        if (duration) exam.duration = parseInt(duration);
        if (status) exam.status = status;
        if (collegeId !== undefined) exam.collegeId = collegeId;
        if (branch !== undefined) exam.branch = branch;

        const updatedExam = await exam.save();
        const questionCount = await Question.countDocuments({ examId: exam._id });

        console.log('Exam updated successfully:', updatedExam._id);

        res.json({
            message: 'Exam updated successfully',
            exam: {
                id: updatedExam._id,
                title: updatedExam.title,
                description: updatedExam.description,
                category: updatedExam.category,
                duration: updatedExam.duration,
                status: updatedExam.status,
                questionCount: questionCount,
                createdAt: updatedExam.createdAt,
                collegeId: updatedExam.collegeId,
                branch: updatedExam.branch
            }
        });

    } catch (error) {
        console.error('Update exam error:', error);
        next(error);
    }
};

// Delete exam (with permission check)
const deleteExam = async (req, res, next) => {
    try {
        const examId = req.params.id;
        const { collegeId, user1Id, branch } = req.query;
        console.log('Deleting exam:', examId, { collegeId, user1Id, branch });

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        

        // Delete all questions associated with this exam
        await Question.deleteMany({ examId: examId });
        console.log('Deleted questions for exam:', examId);

        // Delete the exam
        await Exam.findByIdAndDelete(examId);
        console.log('Exam deleted successfully:', examId);

        res.json({ message: 'Exam deleted successfully' });

    } catch (error) {
        console.error('Delete exam error:', error);
        next(error);
    }
};

// Get exam by ID with context validation
const getExamById = async (req, res, next) => {
    try {
        const examId = req.params.id;
        const { collegeId, user1Id, branch } = req.query;
        
        let filter = { _id: examId };
        
        // Add context filters if provided
        if (collegeId) filter.collegeId = collegeId;
        if (branch) filter.branch = branch;
        
        const exam = await Exam.findOne(filter).populate('createdBy', 'fullName');
        
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const questionCount = await Question.countDocuments({ examId: exam._id });
        
        res.json({
            id: exam._id,
            title: exam.title,
            description: exam.description,
            category: exam.category,
            duration: exam.duration,
            status: exam.status,
            questionCount: questionCount,
            createdAt: exam.createdAt,
            createdBy: exam.createdBy ? exam.createdBy.fullName : 'Unknown',
            collegeId: exam.collegeId,
            branch: exam.branch
        });
    } catch (error) {
        console.error('Get exam by ID error:', error);
        next(error);
    }
};

// Get exams by specific context (helper function)
const getExamsByContext = async (req, res, next) => {
    try {
        const { collegeId, branch } = req.params;
        console.log('Fetching exams for context:', { collegeId, branch });

        const filter = {};
        if (collegeId && collegeId !== 'all') filter.collegeId = collegeId;
        if (branch && branch !== 'all') filter.branch = branch;

        const exams = await Exam.find(filter)
            .populate('createdBy', 'fullName')
            .sort({ createdAt: -1 });

        const examsWithQuestionCount = await Promise.all(
            exams.map(async (exam) => {
                const questionCount = await Question.countDocuments({ examId: exam._id });
                return {
                    id: exam._id,
                    title: exam.title,
                    description: exam.description,
                    category: exam.category,
                    duration: exam.duration,
                    status: exam.status,
                    questionCount: questionCount,
                    createdAt: exam.createdAt,
                    createdBy: exam.createdBy ? exam.createdBy.fullName : 'Unknown',
                    collegeId: exam.collegeId,
                    branch: exam.branch
                };
            })
        );

        res.json(examsWithQuestionCount);
    } catch (error) {
        console.error('Get exams by context error:', error);
        next(error);
    }
};

module.exports = {
    getAllExams,
    createExam,
    updateExam,
    deleteExam,
    getExamById,
    getExamsByContext
};
