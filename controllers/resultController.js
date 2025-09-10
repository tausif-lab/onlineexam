

       
const ExamSubmission = require('../models/ExamSubmission');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    return id && mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper function to safely convert to ObjectId
const toObjectId = (id) => {
    if (!isValidObjectId(id)) {
        throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new mongoose.Types.ObjectId(id);
};

// Submit exam answers and calculate results
exports.submitExam = async (req, res, next) => {
    try {
        const { examId } = req.params;
        const { answers, timeTaken, userAnswers ,canvasAnswers  } = req.body;
        const studentId = req.user.userId;

        // Validate examId format
        if (!isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID format'
            });
        }

        // Validate studentId format
        if (!isValidObjectId(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }

        /*console.log('Submit exam data received:', {
            examId,
            answersLength: answers?.length,
            timeTaken,
            userAnswersKeys: userAnswers ? Object.keys(userAnswers).length : 0
        });*/
        console.log('Submit exam data received:', {
            examId,
            answersLength: answers?.length,
            timeTaken,
            canvasAnswersCount: canvasAnswers ? Object.keys(canvasAnswers).length : 0
        });

        // Validate input
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: 'Answers array is required'
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

        // Check if student has already submitted
        const existingSubmission = await ExamSubmission.findOne({
            examId,
            studentId
        });

        if (existingSubmission) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted this exam'
            });
        }

        // Get all questions for this exam
        const questions = await Question.find({ examId });
        
        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No questions found for this exam'
            });
        }

        console.log(`Found ${questions.length} questions for exam ${examId}`);

        // Calculate results
        let score = 0;
        const processedAnswers = [];
        let isCorrect = false; 
        const processedCanvasAnswers = [];
        let selectedOption = null;
                let answerType = 'multiple_choice';

        // Process answers array format
        /*answers.forEach(answer => {
            // Validate questionId format
            if (!isValidObjectId(answer.questionId)) {
                console.log(`Invalid question ID format: ${answer.questionId}`);
                return;
            }

            const question = questions.find(q => q._id.toString() === answer.questionId);
            
            if (question) {
                
                let selectedOption = null;
                let answerType = 'multiple_choice';
                // Check if answer is valid (not -1 and not null/undefined)
                const hasValidAnswer = answer.selectedOption !== null && 
                                     answer.selectedOption !== undefined && 
                                     answer.selectedOption !== -1;
                
                let isCorrect = false;
                if (hasValidAnswer) {
                    isCorrect = question.correctAnswer === answer.selectedOption;
                    if (isCorrect) {
                        score++;
                        console.log(`Question ${question._id}: Correct! Selected: ${answer.selectedOption}, Correct: ${question.correctAnswer}`);
                    } else {
                        console.log(`Question ${question._id}: Wrong! Selected: ${answer.selectedOption}, Correct: ${question.correctAnswer}`);
                    }
                } else {
                    console.log(`Question ${question._id}: Not answered`);
                }

                processedAnswers.push({
                    questionId: answer.questionId,
                    selectedOption: hasValidAnswer ? answer.selectedOption : null,
                    isCorrect: isCorrect
                });
            } else if (answer.answerType === 'canvas' && answer.canvasData) {
                    // Descriptive question with canvas data
                    answerType = 'canvas';
                    selectedOption = 0; // Mark as answered
                    isCorrect = true; // Descriptive answers are considered correct for now
                    
                    // Store canvas data separately
                    processedCanvasAnswers.push({
                        questionId: answer.questionId,
                        canvasData: answer.canvasData,
                        dataURL: answer.canvasData,
                        timestamp: new Date()
                    });
                    
                    score++; // Give full marks for descriptive answers
                    
                }  {
                    // Regular multiple choice/true-false
                    const hasValidAnswer = answer.selectedOption !== null && 
                                         answer.selectedOption !== undefined && 
                                         answer.selectedOption !== -1;
                    
                    if (hasValidAnswer) {
                        selectedOption = answer.selectedOption;
                        isCorrect = question.correctAnswer === answer.selectedOption;
                        if (isCorrect) score++;
                    }
                }

                processedAnswers.push({
                    questionId: answer.questionId,
                    selectedOption: selectedOption,
                    isCorrect: isCorrect,
                    answerType: answerType,
                    canvasData: answerType === 'canvas' ? answer.canvasData : null
                });

                console.log(`Question ${question._id}: Type: ${answerType}, Correct: ${isCorrect}`);
        
            
            /*else {
                console.log(`Question not found for ID: ${answer.questionId}`);
            }*
        });*/
        // Replace the answers.forEach section (around lines 108-176) with this:

// Process answers array format
answers.forEach(answer => {
    // Validate questionId format
    if (!isValidObjectId(answer.questionId)) {
        console.log(`Invalid question ID format: ${answer.questionId}`);
        return;
    }

    const question = questions.find(q => q._id.toString() === answer.questionId);
    
    if (question) {
        let selectedOption = null;
        let answerType = 'multiple_choice';
        let isCorrect = false;

        // Check if this is a canvas/descriptive answer
        if (answer.answerType === 'canvas' && answer.canvasData) {
            // Descriptive question with canvas data
            answerType = 'canvas';
            selectedOption = 0; // Mark as answered
            isCorrect = true; // Descriptive answers are considered correct for now
            
            // Store canvas data separately
            processedCanvasAnswers.push({
                questionId: answer.questionId,
                canvasData: answer.canvasData,
                dataURL: answer.canvasData,
                timestamp: new Date()
            });
            
            score++; // Give full marks for descriptive answers
        } else {
            // Regular multiple choice/true-false
            const hasValidAnswer = answer.selectedOption !== null && 
                                 answer.selectedOption !== undefined && 
                                 answer.selectedOption !== -1;
            
            if (hasValidAnswer) {
                selectedOption = answer.selectedOption;
                isCorrect = question.correctAnswer === answer.selectedOption;
                if (isCorrect) {
                    score++;
                    console.log(`Question ${question._id}: Correct! Selected: ${answer.selectedOption}, Correct: ${question.correctAnswer}`);
                } else {
                    console.log(`Question ${question._id}: Wrong! Selected: ${answer.selectedOption}, Correct: ${question.correctAnswer}`);
                }
            } else {
                console.log(`Question ${question._id}: Not answered`);
            }
        }

        processedAnswers.push({
            questionId: answer.questionId,
            selectedOption: selectedOption,
            isCorrect: isCorrect,
            answerType: answerType,
            canvasData: answerType === 'canvas' ? answer.canvasData : null
        });

        console.log(`Question ${question._id}: Type: ${answerType}, Correct: ${isCorrect}`);
    }
});

        /*if (canvasAnswers && typeof canvasAnswers === 'object') {
            Object.keys(canvasAnswers).forEach(questionId => {
                if (!isValidObjectId(questionId)) return;
                
                const question = questions.find(q => q._id.toString() === questionId);
                if (question && question.type === 'descriptive') {
                    const canvasData = canvasAnswers[questionId];
                    
                    // Check if not already processed
                    if (!processedCanvasAnswers.find(ca => ca.questionId === questionId)) {
                        processedCanvasAnswers.push({
                            questionId: questionId,
                            canvasData: canvasData.dataURL || canvasData,
                            dataURL: canvasData.dataURL || canvasData,
                            timestamp: new Date()
                        });
                        
                        // Add to processed answers if not already there
                        if (!processedAnswers.find(a => a.questionId === questionId)) {
                            processedAnswers.push({
                                questionId: questionId,
                                selectedOption: 0,
                                isCorrect: true,
                                answerType: 'canvas',
                                canvasData: canvasData.dataURL || canvasData
                            });
                            score++;
                        }
                    }
                }
            });
        }*/
       // In the submitExam function, update the canvas processing:
     if (canvasAnswers && typeof canvasAnswers === 'object') {
    Object.keys(canvasAnswers).forEach(questionId => {
        if (!isValidObjectId(questionId)) return;
        
        const question = questions.find(q => q._id.toString() === questionId);
        if (question && question.type === 'descriptive') {
            const canvasData = canvasAnswers[questionId];
            
            // Check if not already processed
            if (!processedCanvasAnswers.find(ca => ca.questionId === questionId)) {
                processedCanvasAnswers.push({
                    questionId: questionId,
                    canvasData: canvasData.dataURL || canvasData,
                    dataURL: canvasData.dataURL || canvasData,
                    timestamp: new Date()
                });
                
                // Add to processed answers if not already there
                if (!processedAnswers.find(a => a.questionId === questionId)) {
                    processedAnswers.push({
                        questionId: questionId,
                        selectedOption: 0,
                        isCorrect: true,
                        answerType: 'canvas',
                        canvasData: canvasData.dataURL || canvasData
                    });
                    score++;
                }
            }
        }
    });
}

        console.log(`Final score calculation: ${score}/${questions.length}`);
        console.log(`Canvas answers processed: ${processedCanvasAnswers.length}`);
        

        // Also process userAnswers object format if available (fallback)
        if (userAnswers && Object.keys(userAnswers).length > 0) {
            console.log('Processing userAnswers object as fallback...');
            
            Object.keys(userAnswers).forEach(questionId => {
                const selectedOption = userAnswers[questionId];
                
                // Validate questionId format
                if (!isValidObjectId(questionId)) {
                    console.log(`Invalid question ID format in userAnswers: ${questionId}`);
                    return;
                }
                
                // Skip if already processed in answers array
                if (processedAnswers.find(a => a.questionId === questionId)) {
                    return;
                }
                
                const question = questions.find(q => q._id.toString() === questionId);
                
                if (question && selectedOption !== null && selectedOption !== undefined) {
                    const isCorrect = question.correctAnswer === selectedOption;
                    if (isCorrect) score++;

                    processedAnswers.push({
                        questionId: questionId,
                        selectedOption: selectedOption,
                        isCorrect: isCorrect
                    });
                }
            });
        }

        console.log(`Final score calculation: ${score}/${questions.length}`);

        // Ensure we have all questions represented
        questions.forEach(question => {
            if (!processedAnswers.find(a => a.questionId === question._id.toString())) {
                processedAnswers.push({
                    questionId: question._id.toString(),
                    selectedOption: null,
                    isCorrect: false
                });
            }
        });

        // Create submission record with validated data
       /* const submission = new ExamSubmission({
            examId,
            studentId,
            user1Id: req.user.user1Id || req.user.name || 'Unknown', // Add user1Id field
            answers: processedAnswers,
            score: score,
            totalQuestions: questions.length,
            timeTaken: timeTaken || 0,
            status: 'completed',
            submittedAt: new Date(),
            rawUserAnswers: userAnswers || {}
        });*/
        
        const submission = new ExamSubmission({
    examId,
    studentId,
    user1Id: req.user.user1Id || req.user.name || 'Unknown',
    answers: processedAnswers,
    canvasAnswers: processedCanvasAnswers || [],
    score: score,
    totalQuestions: questions.length,
    timeTaken: timeTaken || 0,
    status: 'completed',
    submittedAt: new Date(),
    rawUserAnswers: userAnswers || {},
    // Add proctoring data handling
    proctoringData: req.body.proctoringData || {
        violationCount: 0,
        submittedDueToViolations: false,
        proctoringEnabled: false,
        zoomMeetingUsed: false
    },
    isAutoSubmit: req.body.isAutoSubmit || false
});

        await submission.save();

        console.log('Submission saved:', {
            submissionId: submission._id,
            score: submission.score,
            totalQuestions: submission.totalQuestions
        });
        // NEW: Generate PDF for canvas answers if any exist
        let pdfPath = null;
        if (processedCanvasAnswers.length > 0) {
            try {
                console.log('Generating PDF for descriptive answers...');
                pdfPath = await generateCanvasAnswersPdf(submission);
                
                if (pdfPath) {
                    // Update submission with PDF path
                    submission.descriptiveAnswersPdf = pdfPath;
                    await submission.save();
                    console.log('PDF generated and path saved:', pdfPath);
                }
            } catch (pdfError) {
                console.error('PDF generation failed:', pdfError);
                // Continue without failing the submission
            }
        }

        // Calculate percentage
        const percentage = questions.length > 0 ? ((score / questions.length) * 100).toFixed(2) : 0;

        // Return result
        res.status(201).json({
            success: true,
            message: 'Exam submitted successfully',
            data: {
                submissionId: submission._id,
                score: score,
                totalQuestions: questions.length,
                percentage: percentage,
                correctAnswers: score,
                incorrectAnswers: questions.length - score,
                timeTaken: timeTaken || 0,
                submittedAt: submission.submittedAt,
                hasDescriptiveAnswers: processedCanvasAnswers.length > 0,
                pdfGenerated: !!pdfPath
            }
        });

    } catch (error) {
        console.error('Error submitting exam:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting exam',
            error: error.message
        });
    }
};
// NEW: Function to generate PDF from canvas answers
async function generateCanvasAnswersPdf(submission) {
    try {
        if (!submission.canvasAnswers || submission.canvasAnswers.length === 0) {
            return null;
        }
        // Populate student data if not already populated
        if (!submission.studentId.name) {
            await submission.populate('studentId', 'name email user1Id');
        }

        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path')
        // Create directory structure: uploads/pdfs/examId/userId/
        const pdfDir = path.join('uploads', 'pdfs', submission.examId.toString(), submission.studentId.toString());
        
        // Ensure directory exists
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
        const pdfFilename = `descriptive-answers-${timestamp}.pdf`;
        const pdfPath = path.join(pdfDir, pdfFilename);

        // Create PDF document
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        // Add document header
        doc.fontSize(18).text('Descriptive Exam Answers', 50, 50, { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12);
        doc.text(`Student Name: ${submission.studentId.name}`, 50, doc.y);
        doc.text(`Student Email: ${submission.studentId.email}`, 50, doc.y);
        doc.text(`Submission ID: ${submission._id}`, 50, doc.y);
        doc.text(`Student ID: ${submission.user1Id}`, 50, doc.y);
        doc.text(`Exam ID: ${submission.examId}`, 50, doc.y);
        doc.text(`Submitted: ${submission.submittedAt.toLocaleString()}`, 50, doc.y);
        doc.text(`Total Canvas Answers: ${submission.canvasAnswers.length}`, 50, doc.y);
        
        doc.moveDown(2);

        // Process each canvas answer
        for (let i = 0; i < submission.canvasAnswers.length; i++) {
            const canvasAnswer = submission.canvasAnswers[i];

            // Check if we need a new page
            if (doc.y > 650) {
                doc.addPage();
            }

            // Add question header
            doc.fontSize(14).text(`Question ${i + 1}`, 50, doc.y, { underline: true });
             doc.fontSize(10).text(`Question ID: ${canvasAnswer.questionId}`, 50, doc.y);
            
            doc.fontSize(12).text(`Question ID: ${canvasAnswer.questionId}`, 50, doc.y);
            doc.text(`Answered at: ${canvasAnswer.timestamp.toLocaleString()}`, 50, doc.y);

            // Show scoring status
            if (canvasAnswer.isScored) {
                doc.text(`Score: ${canvasAnswer.adminScore}/${canvasAnswer.maxScore}`, 50, doc.y);
                if (canvasAnswer.adminFeedback) {
                    doc.text(`Feedback: ${canvasAnswer.adminFeedback}`, 50, doc.y);
                }
                doc.text(`Scored at: ${canvasAnswer.scoredAt.toLocaleString()}`, 50, doc.y);
            } else {
                doc.text(`Status: Not scored yet`, 50, doc.y);
            }
            doc.moveDown();

            try {
                // Extract base64 data from data URL
                const dataURL = canvasAnswer.dataURL || canvasAnswer.canvasData;
                if (!dataURL || !dataURL.includes('base64,')) {
                    throw new Error('Invalid canvas data format');
                }

                const base64Data = dataURL.split('base64,')[1];
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Calculate image dimensions to fit page
                const maxWidth = 500;
                const maxHeight = 300;

                // Add image to PDF
                doc.image(imageBuffer, 50, doc.y, {
                    fit: [maxWidth, maxHeight],
                    align: 'left'
                });

                // Move cursor down by image height + padding
                doc.y += maxHeight + 30;

            } catch (imageError) {
                console.error(`Error processing image for question ${i + 1}:`, imageError);
                doc.fontSize(10).text(`Error loading answer image: ${imageError.message}`, 50, doc.y);
                doc.moveDown();
            }

            // Add separator line between questions
            if (i < submission.canvasAnswers.length - 1) {
                doc.strokeColor('#cccccc')
                   .lineWidth(1)
                   .moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke();
                doc.moveDown();
            }
        }

        // Add footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8)
               .text(`Page ${i + 1} of ${pages.count} | Generated: ${new Date().toLocaleString()}`, 
                     50, doc.page.height - 50, { align: 'center' });
        }

        // Finalize the PDF
        doc.end();

        // Return promise that resolves when PDF is written
        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log('PDF successfully generated:', pdfPath);
                resolve(pdfPath);
            });

            writeStream.on('error', (error) => {
                console.error('Error writing PDF file:', error);
                reject(error);
            });
        });
        
       // Add summary footer
        doc.addPage();
        doc.fontSize(16).text('Scoring Summary', 50, 50, { underline: true });
        doc.fontSize(12);
        doc.text(`MCQ Score: ${submission.score}/${submission.totalQuestions}`, 50, 100);
        doc.text(`Descriptive Score: ${submission.descriptiveScore || 0}/${submission.maxDescriptiveScore || 0}`, 50, 120);
        doc.text(`Final Score: ${submission.finalScore || submission.score}`, 50, 140);
        doc.text(`Final Percentage: ${submission.finalPercentage || submission.percentage}%`, 50, 160);

        doc.end();

        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log('PDF successfully generated:', pdfPath);
                resolve(pdfPath);
            });

            writeStream.on('error', (error) => {
                console.error('Error writing PDF file:', error);
                reject(error);
            });
        });
       

    } catch (error) {
        console.error('Error in generateCanvasAnswersPdf:', error);
        throw error;
    }
}

// NEW: Get PDF for descriptive answers
exports.getDescriptiveAnswersPdf = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.userId;

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        // Find submission and verify ownership
        const submission = await ExamSubmission.findOne({
            _id: submissionId,
            studentId: userId
        });

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found or access denied'
            });
        }

        if (!submission.descriptiveAnswersPdf || !fs.existsSync(submission.descriptiveAnswersPdf)) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found or not generated'
            });
        }

        // Send PDF file
        const filename = path.basename(submission.descriptiveAnswersPdf);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const fileStream = fs.createReadStream(submission.descriptiveAnswersPdf);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error serving descriptive answers PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving PDF',
            error: error.message
        });
    }
};
// Helper function to validate ObjectId (existing)



// Get exam results for a specific exam and user - UPDATED VERSION
exports.getExamResult = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.userId;
        
        // Validate ObjectId formats
        if (!isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID format'
            });
        }

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        console.log(`Fetching results for examId: ${examId}, userId: ${userId}`);
        
        // Find the submission for this user and exam
        const submission = await ExamSubmission.findOne({
            examId: examId,
            studentId: userId
        });
        
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'No results found for this exam'
            });
        }
        
        console.log('Found submission:', {
            id: submission._id,
            score: submission.score,
            totalQuestions: submission.totalQuestions,
            percentage: submission.percentage
        });
        
        // Use the new getDetailedResult method
        const detailedResult = await submission.getDetailedResult();
        
        console.log('Sending detailed result:', {
            score: detailedResult.score,
            totalQuestions: detailedResult.totalQuestions,
            questionsCount: detailedResult.questions.length
        });
        
        res.json({
            success: true,
            data: detailedResult
        });
        
    } catch (error) {
        console.error('Get exam results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exam results',
            error: error.message
        });
    }
};

// Get all results for a student
exports.getStudentResults = async (req, res, next) => {
    try {
        const studentId = req.user.userId;

        // Validate studentId format
        if (!isValidObjectId(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }

        const submissions = await ExamSubmission.find({ studentId })
            .populate('examId', 'title description category duration')
            .sort({ submittedAt: -1 });

        const results = submissions.map(submission => {
            const score = Number(submission.score) || 0;
            const totalQuestions = Number(submission.totalQuestions) || 0;
            const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(2) : 0;
            
            return {
                submissionId: submission._id,
                exam: {
                    id: submission.examId._id,
                    title: submission.examId.title,
                    category: submission.examId.category,
                    duration: submission.examId.duration
                },
                score: score,
                totalQuestions: totalQuestions,
                percentage: percentage,
                timeTaken: submission.timeTaken,
                submittedAt: submission.submittedAt,
                status: submission.status
            };
        });

        res.status(200).json({
            success: true,
            data: {
                totalExamsTaken: submissions.length,
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

// Get all results for an exam (Admin only)
exports.getExamResults = async (req, res, next) => {
    try {
        const { examId } = req.params;

        // Validate examId format
        if (!isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID format'
            });
        }

        // Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        const submissions = await ExamSubmission.find({ examId })
            .populate('studentId', 'name email')
            .sort({ submittedAt: -1 });

        // Calculate statistics with proper number validation
        const totalSubmissions = submissions.length;
        const validScores = submissions.map(sub => Number(sub.score) || 0);
        const averageScore = totalSubmissions > 0 
            ? (validScores.reduce((sum, score) => sum + score, 0) / totalSubmissions).toFixed(2)
            : 0;

        const validPercentages = submissions.map(sub => {
            const score = Number(sub.score) || 0;
            const total = Number(sub.totalQuestions) || 0;
            return total > 0 ? (score / total) * 100 : 0;
        });
        
        const averagePercentage = totalSubmissions > 0
            ? (validPercentages.reduce((sum, pct) => sum + pct, 0) / totalSubmissions).toFixed(2)
            : 0;

        const results = submissions.map(submission => {
            const score = Number(submission.score) || 0;
            const totalQuestions = Number(submission.totalQuestions) || 0;
            const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(2) : 0;
            
            return {
                submissionId: submission._id,
                student: {
                    id: submission.studentId._id,
                    name: submission.studentId.name,
                    email: submission.studentId.email,
                    user1Id: submission.user1Id // Include user1Id in response
                },
                score: score,
                totalQuestions: totalQuestions,
                percentage: percentage,
                timeTaken: submission.timeTaken,
                submittedAt: submission.submittedAt,
                status: submission.status
            };
        });

        res.status(200).json({
            success: true,
            data: {
                exam: {
                    id: exam._id,
                    title: exam.title,
                    category: exam.category,
                    duration: exam.duration
                },
                statistics: {
                    totalSubmissions,
                    averageScore,
                    averagePercentage
                },
                results: results
            }
        });

    } catch (error) {
        console.error('Error fetching exam results:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching exam results',
            error: error.message
        });
    }
};

// Delete a submission (Admin only)
exports.deleteSubmission = async (req, res, next) => {
    try {
        const { submissionId } = req.params;

        // Validate submissionId format
        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        // Verify user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const submission = await ExamSubmission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        await ExamSubmission.findByIdAndDelete(submissionId);

        res.status(200).json({
            success: true,
            message: 'Submission deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting submission:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting submission',
            error: error.message
        });
    }
};

// Add these new functions to your resultController.js

// NEW: Score individual canvas answer
exports.scoreCanvasAnswer = async (req, res) => {
    try {
        const { submissionId, questionId } = req.params;
        const { score, maxScore, feedback } = req.body;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(submissionId) || !isValidObjectId(questionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission or question ID format'
            });
        }

        const submission = await ExamSubmission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        // Find the specific canvas answer
        const canvasAnswer = submission.canvasAnswers.find(
            ca => ca.questionId.toString() === questionId
        );

        if (!canvasAnswer) {
            return res.status(404).json({
                success: false,
                message: 'Canvas answer not found'
            });
        }

        // Update canvas answer with score
        canvasAnswer.adminScore = Math.max(0, Math.min(score, maxScore || 10));
        canvasAnswer.maxScore = maxScore || 10;
        canvasAnswer.adminFeedback = feedback || '';
        canvasAnswer.scoredBy = req.user.userId;
        canvasAnswer.scoredAt = new Date();
        canvasAnswer.isScored = true;

        // Recalculate final scores
        submission.calculateFinalScore();
        
        await submission.save();

        res.json({
            success: true,
            message: 'Canvas answer scored successfully',
            data: {
                submissionId: submission._id,
                questionId: questionId,
                score: canvasAnswer.adminScore,
                maxScore: canvasAnswer.maxScore,
                finalScore: submission.finalScore,
                finalPercentage: submission.finalPercentage
            }
        });

    } catch (error) {
        console.error('Error scoring canvas answer:', error);
        res.status(500).json({
            success: false,
            message: 'Error scoring canvas answer',
            error: error.message
        });
    }
};

// NEW: Get submissions for scoring (with student details)
exports.getSubmissionsForScoring = async (req, res) => {
    try {
        const { examId } = req.params;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID format'
            });
        }

        const submissions = await ExamSubmission.find({
            examId: examId,
            canvasAnswers: { $exists: true, $ne: [] }
        })
        .populate('studentId', 'name email user1Id')
        .populate('canvasAnswers.questionId', 'question text')
        .sort({ submittedAt: -1 });

        const scoringData = submissions.map(submission => {
            const canvasAnswers = submission.canvasAnswers.map(ca => ({
                questionId: ca.questionId._id,
                questionText: ca.questionId.question || ca.questionId.text,
                dataURL: ca.dataURL,
                adminScore: ca.adminScore,
                maxScore: ca.maxScore || 10,
                adminFeedback: ca.adminFeedback,
                isScored: ca.isScored,
                scoredAt: ca.scoredAt
            }));

            return {
                submissionId: submission._id,
                student: {
                    id: submission.studentId._id,
                    name: submission.studentId.name,
                    email: submission.studentId.email,
                    user1Id: submission.user1Id
                },
                submittedAt: submission.submittedAt,
                mcqScore: submission.score,
                totalMcqQuestions: submission.totalQuestions,
                descriptiveScore: submission.descriptiveScore || 0,
                maxDescriptiveScore: submission.maxDescriptiveScore || 0,
                finalScore: submission.finalScore || submission.score,
                finalPercentage: submission.finalPercentage || submission.percentage,
                canvasAnswers: canvasAnswers,
                totalCanvasAnswers: canvasAnswers.length,
                scoredCanvasAnswers: canvasAnswers.filter(ca => ca.isScored).length
            };
        });

        res.json({
            success: true,
            data: {
                examId: examId,
                totalSubmissions: scoringData.length,
                submissions: scoringData
            }
        });

    } catch (error) {
        console.error('Error fetching submissions for scoring:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving submissions',
            error: error.message
        });
    }
};

// Add to resultController.js

// NEW: Get detailed canvas submission for scoring
exports.getSubmissionCanvasDetails = async (req, res) => {
    try {
        const { submissionId } = req.params;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        const submission = await ExamSubmission.findById(submissionId)
            .populate('studentId', 'name email user1Id')
            .populate('canvasAnswers.questionId', 'question text type')
            .populate('examId', 'title');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        const canvasDetails = submission.canvasAnswers.map((ca, index) => ({
            questionId: ca.questionId._id,
            questionNumber: index + 1,
            questionText: ca.questionId.question || ca.questionId.text,
            questionType: ca.questionId.type,
            dataURL: ca.dataURL,
            adminScore: ca.adminScore,
            maxScore: ca.maxScore || 10,
            adminFeedback: ca.adminFeedback,
            isScored: ca.isScored,
            scoredAt: ca.scoredAt,
            scoredBy: ca.scoredBy
        }));

        res.json({
            success: true,
            data: {
                submissionId: submission._id,
                exam: {
                    id: submission.examId._id,
                    title: submission.examId.title
                },
                student: {
                    id: submission.studentId._id,
                    name: submission.studentId.name,
                    email: submission.studentId.email,
                    user1Id: submission.user1Id
                },
                submittedAt: submission.submittedAt,
                mcqScore: submission.score,
                totalMcqQuestions: submission.totalQuestions,
                descriptiveScore: submission.descriptiveScore || 0,
                maxDescriptiveScore: submission.maxDescriptiveScore || 0,
                finalScore: submission.finalScore || submission.score,
                finalPercentage: submission.finalPercentage || submission.percentage,
                canvasAnswers: canvasDetails
            }
        });

    } catch (error) {
        console.error('Error fetching canvas details:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving canvas details',
            error: error.message
        });
    }
};

// NEW: Bulk score update for multiple canvas answers
exports.bulkScoreCanvasAnswers = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { scores } = req.body; // Array of {questionId, score, maxScore, feedback}

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        const submission = await ExamSubmission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        let updatedCount = 0;

        // Update each canvas answer
        scores.forEach(scoreData => {
            const canvasAnswer = submission.canvasAnswers.find(
                ca => ca.questionId.toString() === scoreData.questionId
            );

            if (canvasAnswer) {
                canvasAnswer.adminScore = Math.max(0, Math.min(scoreData.score, scoreData.maxScore || 10));
                canvasAnswer.maxScore = scoreData.maxScore || 10;
                canvasAnswer.adminFeedback = scoreData.feedback || '';
                canvasAnswer.scoredBy = req.user.userId;
                canvasAnswer.scoredAt = new Date();
                canvasAnswer.isScored = true;
                updatedCount++;
            }
        });

        // Recalculate final scores
        submission.calculateFinalScore();
        
        await submission.save();

        res.json({
            success: true,
            message: `Successfully updated scores for ${updatedCount} canvas answers`,
            data: {
                submissionId: submission._id,
                updatedCount,
                finalScore: submission.finalScore,
                finalPercentage: submission.finalPercentage
            }
        });

    } catch (error) {
        console.error('Error bulk scoring canvas answers:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating scores',
            error: error.message
        });
    }
};






// NEW: Admin function to get all descriptive PDFs for an exam
exports.getExamDescriptivePdfs = async (req, res) => {
    try {
        const { examId } = req.params;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID format'
            });
        }

        // Find all submissions with descriptive answers for this exam
        const submissions = await ExamSubmission.find({
            examId: examId,
            canvasAnswers: { $exists: true, $ne: [] },
            descriptiveAnswersPdf: { $exists: true, $ne: null }
        })
        .populate('studentId', 'name email')
        .select('_id studentId user1Id descriptiveAnswersPdf submittedAt canvasAnswers score totalQuestions')
        .sort({ submittedAt: -1 });

        const pdfList = submissions.map(submission => ({
            submissionId: submission._id,
            student: {
                id: submission.studentId._id,
                name: submission.studentId.name,
                email: submission.studentId.email,
                user1Id: submission.user1Id
            },
            pdfPath: submission.descriptiveAnswersPdf,
            submittedAt: submission.submittedAt,
            canvasAnswersCount: submission.canvasAnswers.length,
            score: submission.score,
            totalQuestions: submission.totalQuestions,
            downloadUrl: `/api/results/admin/submission/${submission._id}/descriptive-pdf`
        }));

        res.json({
            success: true,
            data: {
                examId: examId,
                totalSubmissions: pdfList.length,
                pdfs: pdfList
            }
        });

    } catch (error) {
        console.error('Error fetching exam descriptive PDFs:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving descriptive PDFs',
            error: error.message
        });
    }
};

// NEW: Admin function to download any submission's descriptive PDF
exports.getSubmissionDescriptivePdfAdmin = async (req, res) => {
    try {
        const { submissionId } = req.params;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        // Find submission (admin can access any)
        const submission = await ExamSubmission.findById(submissionId)
            .populate('studentId', 'name email');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        if (!submission.descriptiveAnswersPdf || !fs.existsSync(submission.descriptiveAnswersPdf)) {
            return res.status(404).json({
                success: false,
                message: 'Descriptive answers PDF not found'
            });
        }

        // Generate meaningful filename for download
        const studentName = submission.studentId.name.replace(/[^a-zA-Z0-9]/g, '-');
        const timestamp = submission.submittedAt.toISOString().split('T')[0];
        const downloadFilename = `descriptive-answers-${studentName}-${timestamp}.pdf`;

        // Send PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        
        const fileStream = fs.createReadStream(submission.descriptiveAnswersPdf);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error serving admin descriptive PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving PDF',
            error: error.message
        });
    }
};

// NEW: Batch download all descriptive PDFs for an exam (zip file)
exports.downloadAllExamDescriptivePdfs = async (req, res) => {
    try {
        const { examId } = req.params;
        
        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const archiver = require('archiver');
        
        const submissions = await ExamSubmission.find({
            examId: examId,
            descriptiveAnswersPdf: { $exists: true, $ne: null }
        }).populate('studentId', 'name email');

        if (submissions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No descriptive PDFs found for this exam'
            });
        }

        // Create zip archive
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="exam-${examId}-descriptive-answers.zip"`);
        
        archive.pipe(res);

        // Add each PDF to the archive
        submissions.forEach(submission => {
            if (fs.existsSync(submission.descriptiveAnswersPdf)) {
                const studentName = submission.studentId.name.replace(/[^a-zA-Z0-9]/g, '-');
                const filename = `${studentName}_${submission._id}.pdf`;
                archive.file(submission.descriptiveAnswersPdf, { name: filename });
            }
        });

        archive.finalize();

    } catch (error) {
        console.error('Error creating zip archive:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating archive',
            error: error.message
        });
    }
};

// NEW: Regenerate PDF for a submission (in case of corruption)
exports.regenerateSubmissionPdf = async (req, res) => {
    try {
        const { submissionId } = req.params;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const submission = await ExamSubmission.findById(submissionId);
        
        if (!submission || !submission.canvasAnswers || submission.canvasAnswers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found or no canvas answers available'
            });
        }

        // Delete existing PDF if it exists
        if (submission.descriptiveAnswersPdf && fs.existsSync(submission.descriptiveAnswersPdf)) {
            fs.unlinkSync(submission.descriptiveAnswersPdf);
        }

        // Regenerate PDF
        const pdfPath = await generateCanvasAnswersPdf(submission);
        
        if (pdfPath) {
            submission.descriptiveAnswersPdf = pdfPath;
            await submission.save();
            
            res.json({
                success: true,
                message: 'PDF regenerated successfully',
                data: {
                    submissionId: submission._id,
                    pdfPath: pdfPath,
                    regeneratedAt: new Date()
                }
            });
        } else {
            throw new Error('PDF generation failed');
        }

    } catch (error) {
        console.error('Error regenerating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error regenerating PDF',
            error: error.message
        });
    }
};

// Add to resultController.js

// NEW: Get detailed canvas submission for scoring
exports.getSubmissionCanvasDetails = async (req, res) => {
    try {
        const { submissionId } = req.params;

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        const submission = await ExamSubmission.findById(submissionId)
            .populate('studentId', 'name email user1Id')
            .populate('canvasAnswers.questionId', 'question text type')
            .populate('examId', 'title');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        const canvasDetails = submission.canvasAnswers.map((ca, index) => ({
            questionId: ca.questionId._id,
            questionNumber: index + 1,
            questionText: ca.questionId.question || ca.questionId.text,
            questionType: ca.questionId.type,
            dataURL: ca.dataURL,
            adminScore: ca.adminScore,
            maxScore: ca.maxScore || 10,
            adminFeedback: ca.adminFeedback,
            isScored: ca.isScored,
            scoredAt: ca.scoredAt,
            scoredBy: ca.scoredBy
        }));

        res.json({
            success: true,
            data: {
                submissionId: submission._id,
                exam: {
                    id: submission.examId._id,
                    title: submission.examId.title
                },
                student: {
                    id: submission.studentId._id,
                    name: submission.studentId.name,
                    email: submission.studentId.email,
                    user1Id: submission.user1Id
                },
                submittedAt: submission.submittedAt,
                mcqScore: submission.score,
                totalMcqQuestions: submission.totalQuestions,
                descriptiveScore: submission.descriptiveScore || 0,
                maxDescriptiveScore: submission.maxDescriptiveScore || 0,
                finalScore: submission.finalScore || submission.score,
                finalPercentage: submission.finalPercentage || submission.percentage,
                canvasAnswers: canvasDetails
            }
        });

    } catch (error) {
        console.error('Error fetching canvas details:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving canvas details',
            error: error.message
        });
    }
};

// NEW: Bulk score update for multiple canvas answers
exports.bulkScoreCanvasAnswers = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { scores } = req.body; // Array of {questionId, score, maxScore, feedback}

        // Verify admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }

        const submission = await ExamSubmission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }

        let updatedCount = 0;

        // Update each canvas answer
        scores.forEach(scoreData => {
            const canvasAnswer = submission.canvasAnswers.find(
                ca => ca.questionId.toString() === scoreData.questionId
            );

            if (canvasAnswer) {
                canvasAnswer.adminScore = Math.max(0, Math.min(scoreData.score, scoreData.maxScore || 10));
                canvasAnswer.maxScore = scoreData.maxScore || 10;
                canvasAnswer.adminFeedback = scoreData.feedback || '';
                canvasAnswer.scoredBy = req.user.userId;
                canvasAnswer.scoredAt = new Date();
                canvasAnswer.isScored = true;
                updatedCount++;
            }
        });

        // Recalculate final scores
        submission.calculateFinalScore();
        
        await submission.save();

        res.json({
            success: true,
            message: `Successfully updated scores for ${updatedCount} canvas answers`,
            data: {
                submissionId: submission._id,
                updatedCount,
                finalScore: submission.finalScore,
                finalPercentage: submission.finalPercentage
            }
        });

    } catch (error) {
        console.error('Error bulk scoring canvas answers:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating scores',
            error: error.message
        });
    }
};


// Add this method to resultController.js
exports.getDescriptiveResult = async (req, res) => {
    try {
        const { examId } = req.params;
        const studentId = req.user.userId;

        // Validate examId format
        if (!isValidObjectId(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid exam ID format'
            });
        }

        // Find submission for this specific student and exam
        const submission = await ExamSubmission.findOne({
            examId: examId,
            studentId: studentId
        })
        .populate('examId', 'title category duration')
        .populate('studentId', 'fullName email user1Id');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'No submission found for this exam'
            });
        }

        // Check if submission has descriptive answers
        if (!submission.canvasAnswers || submission.canvasAnswers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No descriptive answers found for this exam'
            });
        }

        // Prepare descriptive results
        const descriptiveResults = {
            examInfo: {
                id: submission.examId._id,
                title: submission.examId.title,
                category: submission.examId.category
            },
            studentInfo: {
                name: submission.studentId.fullName,
                email: submission.studentId.email,
                user1Id: submission.user1Id
            },
            submissionInfo: {
                submittedAt: submission.submittedAt,
                timeTaken: submission.timeTaken,
                totalDescriptiveQuestions: submission.canvasAnswers.length
            },
            scores: {
                mcqScore: submission.score,
                totalMcqQuestions: submission.totalQuestions,
                descriptiveScore: submission.descriptiveScore || 0,
                maxDescriptiveScore: submission.maxDescriptiveScore || 0,
                finalScore: submission.finalScore || submission.score,
                finalPercentage: submission.finalPercentage || submission.percentage
            },
            descriptiveAnswers: submission.canvasAnswers.map((answer, index) => ({
                questionNumber: index + 1,
                questionId: answer.questionId,
                isScored: answer.isScored,
                adminScore: answer.adminScore,
                maxScore: answer.maxScore || 10,
                adminFeedback: answer.adminFeedback,
                scoredAt: answer.scoredAt
            })),
            pdfAvailable: !!submission.descriptiveAnswersPdf,
            allDescriptiveScored: submission.canvasAnswers.every(answer => answer.isScored)
        };

        res.json({
            success: true,
            data: descriptiveResults
        });

    } catch (error) {
        console.error('Error fetching descriptive result:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving descriptive result',
            error: error.message
        });
    }
};