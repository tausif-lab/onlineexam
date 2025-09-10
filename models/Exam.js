
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    duration: {
        type: Number,
        required: true,
        min: 1,
        max: 480 // 8 hours max
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft'
    },
    collegeId: {
        type: String,
        required: true,
        trim: true,
        index: true // Add index for better query performance
    },
    branch: {
        type: String,
        required: true,
        trim: true,
        index: true // Add index for better query performance
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Additional metadata
    totalMarks: {
        type: Number,
        default: 0
    },
    passingMarks: {
        type: Number,
        default: 0
    },
    instructions: {
        type: String,
        maxlength: 2000
    },
    // Scheduling fields
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    // Access control
    isPublic: {
        type: Boolean,
        default: false
    },
    allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Question settings
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleOptions: {
        type: Boolean,
        default: false
    },
    showResults: {
        type: Boolean,
        default: true
    },
    allowReview: {
        type: Boolean,
        default: true
    },
    // Attempt settings
    maxAttempts: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    // Proctoring settings
    requireCamera: {
        type: Boolean,
        default: false
    },
    preventTabSwitch: {
        type: Boolean,
        default: false
    },
    // Analytics
    totalAttempts: {
        type: Number,
        default: 0
    },
    averageScore: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for question count (populated dynamically)
examSchema.virtual('questionCount', {
    ref: 'Question',
    localField: '_id',
    foreignField: 'examId',
    count: true
});

// Indexes for better performance
examSchema.index({ collegeId: 1, branch: 1 });
examSchema.index({ status: 1 });
examSchema.index({ createdBy: 1 });
examSchema.index({ startDate: 1, endDate: 1 });

// Pre-save middleware to validate dates
examSchema.pre('save', function(next) {
    if (this.startDate && this.endDate && this.startDate >= this.endDate) {
        return next(new Error('Start date must be before end date'));
    }
    next();
});

// Instance method to check if exam is active
examSchema.methods.isActive = function() {
    const now = new Date();
    return this.status === 'active' && 
           (!this.startDate || this.startDate <= now) &&
           (!this.endDate || this.endDate >= now);
};

// Instance method to check if user can access exam
examSchema.methods.canUserAccess = function(user1Id, userCollegeId, userBranch) {
    // Check if exam is public or user is in allowed list
    if (this.isPublic) return true;
    
    // Check if user is in allowed users list
    if (this.allowedUsers.includes(user1Id)) return true;
    
    // Check if user belongs to same college and branch
    return this.collegeId === userCollegeId && this.branch === userBranch;
};

// Static method to find exams by context
examSchema.statics.findByContext = function(collegeId, branch, status = null) {
    const filter = { collegeId, branch };
    if (status) filter.status = status;
    
    return this.find(filter)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 });
};

// Static method to get active exams for a user
examSchema.statics.getActiveExamsForUser = function(user1Id, collegeId, branch) {
    const now = new Date();
    
    return this.find({
        $and: [
            {
                $or: [
                    { collegeId: collegeId, branch: branch },
                    { isPublic: true },
                    { allowedUsers: user1Id }
                ]
            },
            { status: 'active' },
            {
                $or: [
                    { startDate: { $exists: false } },
                    { startDate: { $lte: now } }
                ]
            },
            {
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: { $gte: now } }
                ]
            }
        ]
    }).populate('createdBy', 'fullName');
};

module.exports = mongoose.model('Exam', examSchema);