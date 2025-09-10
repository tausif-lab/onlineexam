
const mongoose = require('mongoose');
const canvasAnswerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    dataURL: {
        type: String, // Base64 image data
        required: true
    },
    // NEW: Admin scoring fields
    adminScore: {
        type: Number,
        default: null,
        min: 0
    },
    maxScore: {
        type: Number,
        default: 10, // Default max score for descriptive questions
        min: 1
    },
    adminFeedback: {
        type: String,
        default: ''
    },
    scoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    scoredAt: {
        type: Date,
        default: null
    },
    isScored: {
        type: Boolean,
        default: false
    }
}, { _id: false });
const examSubmissionSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user1Id:{
        type: String,
        ref: 'User',
        required: true,
        trim: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        selectedOption: {
            type: Number,
            required: false, // Allow null for unanswered questions
            default: null
        },
        isCorrect: {
            type: Boolean,
            default: false
        },
        // NEW: Add support for descriptive answers
        answerType: {
            type: String,
            enum: ['multiple_choice', 'true_false', 'canvas'],
            default: 'multiple_choice'
        },
        canvasData: {
            type: String, // Base64 image data for descriptive answers
            required: false
        }
    }],
    // NEW: Store canvas answers separately for better organization
    canvasAnswers: [canvasAnswerSchema],
    
    // NEW: PDF file path for generated descriptive answers
    descriptiveAnswersPdf: {
        type: String, // File path to generated PDF
        required: false
    },
    score: {
        type: Number,
        required: true,
        default: 0,
        min: 0 // Ensure score is never negative
    },
    totalQuestions: {
        type: Number,
        required: true,
        min: 1 // Ensure at least 1 question exists
    },
    percentage: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 100
    },
    timeTaken: {
        type: Number, // in seconds (changed from minutes for better precision)
        default: 0,
        min: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['completed', 'in_progress', 'timeout'],
        default: 'completed'
    },
    // Additional fields for better tracking
    answeredQuestions: {
        type: Number,
        default: 0,
        min: 0
    },
    isAutoSubmit: {
        type: Boolean,
        default: false
    },
    // Store raw user answers object for debugging
    rawUserAnswers: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
     proctoringData: {
    violationCount: {
        type: Number,
        default: 0
    },
    submittedDueToViolations: {
        type: Boolean,
        default: false
    },
    proctoringEnabled: {
        type: Boolean,
        default: false
    },
    // Add to examSubmissionSchema - new field for descriptive scores
descriptiveScore: {
    type: Number,
    default: 0,
    min: 0
},
maxDescriptiveScore: {
    type: Number,
    default: 0,
    min: 0
},
finalScore: {
    type: Number, // Combined MCQ + Descriptive score
    default: 0,
    min: 0
},
finalPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
},


    zoomMeetingUsed: {
        type: Boolean,
        default: false
    }
 }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
    // Add this after the existing fields in examSubmissionSchema

});


// NEW: Method to save canvas answers as PDF
examSubmissionSchema.methods.saveCanvasAnswersAsPdf = async function() {
    try {
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path');
        
        // Skip if no canvas answers
        if (!this.canvasAnswers || this.canvasAnswers.length === 0) {
            console.log('No canvas answers to save as PDF');
            return null;
        }
        
        // Create PDF directory structure: uploads/pdfs/examId/userId/
        const pdfDir = path.join('uploads', 'pdfs', this.examId.toString(), this.studentId.toString());
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const pdfFilename = `descriptive-answers-${timestamp}.pdf`;
        const pdfPath = path.join(pdfDir, pdfFilename);
        
        // Create PDF document
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);
        
        // Add header
        doc.fontSize(16).text('Descriptive Exam Answers', 50, 50);
        doc.fontSize(12).text(`Submission ID: ${this._id}`, 50, 80);
        doc.fontSize(12).text(`Student ID: ${this.user1Id}`, 50, 100);
        doc.fontSize(12).text(`Submitted: ${this.submittedAt.toLocaleString()}`, 50, 120);
        
        let yPosition = 160;
        
        // Process each canvas answer
        for (let i = 0; i < this.canvasAnswers.length; i++) {
            const canvasAnswer = this.canvasAnswers[i];
            
            // Add new page if needed
            if (yPosition > 650) {
                doc.addPage();
                yPosition = 50;
            }
            
            // Add question header
            doc.fontSize(14).text(`Question ${i + 1}:`, 50, yPosition);
            yPosition += 30;
            
            try {
                // Convert base64 to buffer and add image
                const base64Data = canvasAnswer.dataURL.replace(/^data:image\/png;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');
                
                // Add image to PDF
                doc.image(imageBuffer, 50, yPosition, {
                    fit: [500, 300],
                    align: 'left'
                });
                
                yPosition += 320;
                
            } catch (imageError) {
                console.error('Error adding image to PDF:', imageError);
                doc.fontSize(10).text('Error loading answer image', 50, yPosition);
                yPosition += 30;
            }
            
            yPosition += 20; // Extra spacing between questions
        }
        
        // Finalize PDF
        doc.end();
        
        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log('PDF saved successfully:', pdfPath);
                resolve(pdfPath);
            });
            
            writeStream.on('error', (error) => {
                console.error('Error saving PDF:', error);
                reject(error);
            });
        });
        
    } catch (error) {
        console.error('Error creating PDF:', error);
        throw error;
    }
};
// Prevent duplicate submissions
examSubmissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Add index for faster queries
examSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
examSubmissionSchema.index({ examId: 1, submittedAt: -1 });

// Pre-save middleware to calculate and validate data
examSubmissionSchema.pre('save', function(next) {
    try {
        // Ensure score and totalQuestions are valid numbers
        this.score = parseInt(this.score) || 0;
        this.totalQuestions = parseInt(this.totalQuestions) || 0;
        this.timeTaken = parseInt(this.timeTaken) || 0;
        
        // Calculate percentage safely
        if (this.totalQuestions > 0) {
            this.percentage = parseFloat(((this.score / this.totalQuestions) * 100).toFixed(2));
        } else {
            this.percentage = 0;
        }
        
        // Ensure percentage is within valid range
        this.percentage = Math.max(0, Math.min(100, this.percentage));
        
        // Count answered questions
        if (this.answers && Array.isArray(this.answers)) {
            this.answeredQuestions = this.answers.filter(answer => 
                answer.selectedOption !== null && 
                answer.selectedOption !== undefined && 
                answer.selectedOption !== -1
            ).length;
        }
        
        console.log('ExamSubmission pre-save:', {
            score: this.score,
            totalQuestions: this.totalQuestions,
            percentage: this.percentage,
            answeredQuestions: this.answeredQuestions
        });
        
        next();
    } catch (error) {
        console.error('ExamSubmission pre-save error:', error);
        next(error);
    }
});

// Post-save middleware for logging
examSubmissionSchema.post('save', function(doc) {
    console.log('ExamSubmission saved successfully:', {
        id: doc._id,
        examId: doc.examId,
        studentId: doc.studentId,
        user1Id: doc.user1Id,
        score: doc.score,
        totalQuestions: doc.totalQuestions,
        percentage: doc.percentage,
        answeredQuestions: doc.answeredQuestions
    });
});

// Virtual field for pass/fail status
examSubmissionSchema.virtual('passStatus').get(function() {
    return this.percentage >= 60 ? 'PASSED' : 'FAILED';
});

// Method to recalculate score (useful for data correction)
examSubmissionSchema.methods.recalculateScore = async function() {
    try {
        const Question = mongoose.model('Question');
        const questions = await Question.find({
            _id: { $in: this.answers.map(a => a.questionId) }
        });
        
        let newScore = 0;
        
        this.answers.forEach(answer => {
            const question = questions.find(q => q._id.toString() === answer.questionId.toString());
            if (question && answer.selectedOption === question.correctAnswer) {
                answer.isCorrect = true;
                newScore++;
            } else {
                answer.isCorrect = false;
            }
        });
        
        this.score = newScore;
        this.totalQuestions = questions.length;
        
        if (this.totalQuestions > 0) {
            this.percentage = parseFloat(((this.score / this.totalQuestions) * 100).toFixed(2));
        }
        
        return this.save();
    } catch (error) {
        console.error('Error recalculating score:', error);
        throw error;
    }
};

// Static method to find submissions with detailed data
examSubmissionSchema.statics.findWithDetails = function(query = {}) {
    return this.find(query)
        .populate('examId', 'title category duration')
        .populate('studentId', 'name email')
        .populate('answers.questionId', 'question text options correctAnswer')
        .sort({ submittedAt: -1 });
};

// Static method to get submission statistics
examSubmissionSchema.statics.getStatistics = async function(examId) {
    try {
        const submissions = await this.find({ examId });
        
        if (submissions.length === 0) {
            return {
                totalSubmissions: 0,
                averageScore: 0,
                averagePercentage: 0,
                passRate: 0
            };
        }
        
        const validScores = submissions.map(s => parseInt(s.score) || 0);
        const validPercentages = submissions.map(s => parseFloat(s.percentage) || 0);
        const passCount = submissions.filter(s => (parseFloat(s.percentage) || 0) >= 60).length;
        
        return {
            totalSubmissions: submissions.length,
            averageScore: (validScores.reduce((sum, score) => sum + score, 0) / submissions.length).toFixed(2),
            averagePercentage: (validPercentages.reduce((sum, pct) => sum + pct, 0) / submissions.length).toFixed(2),
            passRate: ((passCount / submissions.length) * 100).toFixed(2)
        };
    } catch (error) {
        console.error('Error calculating statistics:', error);
        return {
            totalSubmissions: 0,
            averageScore: 0,
            averagePercentage: 0,
            passRate: 0
        };
    }
};

// Instance method to get detailed result
examSubmissionSchema.methods.getDetailedResult = async function() {
    try {
        await this.populate([
            { path: 'examId', select: 'title category duration' },
            { path: 'answers.questionId', select: 'question text options correctAnswer' }
        ]);
        
        const detailedQuestions = this.answers.map((answer, index) => ({
            question: answer.questionId.question || answer.questionId.text,
            options: answer.questionId.options || [],
            correctAnswer: answer.questionId.correctAnswer,
            selectedOption: answer.selectedOption,
            isCorrect: answer.isCorrect
        }));
        
       /* return {
            score: this.score,
            totalQuestions: this.totalQuestions,
            percentage: this.percentage,
            submittedAt: this.submittedAt,
            timeTaken: this.timeTaken,
            examTitle: this.examId ? this.examId.title : 'Unknown Exam',
            examCategory: this.examId ? this.examId.category : 'Unknown Category',
            questions: detailedQuestions,
            answeredQuestions: this.answeredQuestions,
            passStatus: this.passStatus
        };*/
        return {
    score: this.score,
    totalQuestions: this.totalQuestions,
    percentage: this.percentage,
    submittedAt: this.submittedAt,
    timeTaken: this.timeTaken,
    examTitle: this.examId ? this.examId.title : 'Unknown Exam',
    examCategory: this.examId ? this.examId.category : 'Unknown Category',
    questions: detailedQuestions,
    answeredQuestions: this.answeredQuestions,
    passStatus: this.passStatus,
    // Add proctoring information
    proctoringData: this.proctoringData || {},
    isAutoSubmit: this.isAutoSubmit || false,
    wasViolationSubmit: this.proctoringData?.submittedDueToViolations || false
};
    } catch (error) {
        console.error('Error getting detailed result:', error);
        throw error;
    }
};
// Method to calculate final score including descriptive answers
examSubmissionSchema.methods.calculateFinalScore = function() {
    // MCQ score (existing)
    const mcqScore = this.score || 0;
    
    // Calculate descriptive score
    let descriptiveScore = 0;
    let maxDescriptiveScore = 0;
    
    if (this.canvasAnswers && this.canvasAnswers.length > 0) {
        this.canvasAnswers.forEach(canvasAnswer => {
            maxDescriptiveScore += canvasAnswer.maxScore || 10;
            if (canvasAnswer.isScored && canvasAnswer.adminScore !== null) {
                descriptiveScore += canvasAnswer.adminScore || 0;
            }
        });
    }
    
    this.descriptiveScore = descriptiveScore;
    this.maxDescriptiveScore = maxDescriptiveScore;
    this.finalScore = mcqScore + descriptiveScore;
    
    // Calculate final percentage
    const totalMaxScore = this.totalQuestions + maxDescriptiveScore;
    if (totalMaxScore > 0) {
        this.finalPercentage = parseFloat(((this.finalScore / totalMaxScore) * 100).toFixed(2));
    } else {
        this.finalPercentage = 0;
    }
    
    return {
        mcqScore,
        descriptiveScore,
        maxDescriptiveScore,
        finalScore: this.finalScore,
        finalPercentage: this.finalPercentage
    };
};

// Ensure virtual fields are included in JSON output
examSubmissionSchema.set('toJSON', { virtuals: true });
examSubmissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ExamSubmission', examSubmissionSchema);
