// models/Violation.js - MongoDB model for proctoring violations
const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    // Exam and student information
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: true
    },
    studentEmail: {
        type: String,
        required: true
    },
    
    // Violation details
    /*violationType: {
        type: String,
        required: true,
        enum: [
            'Tab switching detected during exam',
            'Exited fullscreen during exam', 
            'Window focus lost during exam',
            'Mouse left exam area',
            'Right-click attempted during exam',
            'Blocked key pressed',
            'Blocked shortcut attempted',
            'Webcam access denied or failed',
            'Video proctoring connection lost',
            'Multiple browser instances detected',
            'Screen sharing detected',
            'External application opened',
            'Copy paste attempted',
            'Developer tools opened',
            'Zoom meeting disconnected',
            'Audio/video disabled during exam',
            'Suspicious behavior detected',
            'Failed to enter required fullscreen mode',
            'Other'
        ]
    },*/
    violationType: {
    type: String,
    required: true,
    enum: [
        'Tab switching detected during exam',
        'Exited fullscreen during exam', 
        'Window focus lost during exam',
        'Mouse left exam area',
        'Right-click attempted during exam',
        'Blocked key pressed',
        'Blocked shortcut attempted',
        'Webcam access denied or failed',
        'Video proctoring connection lost',
        'Multiple browser instances detected',
        'Screen sharing detected',
        'External application opened',
        'Copy paste attempted',
        'Developer tools opened',
        'Zoom meeting disconnected',
        'Audio/video disabled during exam',
        'Suspicious behavior detected',
        'Failed to enter required fullscreen mode',
        // Add these new eye tracking violations
        'Eye Tracking: Looking left for extended period',
        'Eye Tracking: Looking right for extended period', 
        'Eye Tracking: Looking down for extended period',
        'Eye Tracking: Looking away for extended period',
        'Eye Tracking Activity: looking_away_extended',
        'Eye Tracking Activity: multiple_faces_detected',
        'Eye Tracking Activity: no_face_detected',
        'Other'
    ]
},
    
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    violationCount: {
        type: Number,
        default: 1,
        min: 1
    },
    
    // Additional metadata
    metadata: {
        zoomMeetingActive: {
            type: Boolean,
            default: false
        },
        userAgent: String,
        ipAddress: String,
        screenResolution: String,
        additionalDetails: String
    },
    
    // Admin review information
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'ignored', 'escalated'],
        default: 'pending',
        index: true
    },
    
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    reviewedAt: Date,
    
    adminNotes: String,
    
    // Severity level (can be used for prioritization)
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    
    // Whether this violation contributed to exam auto-submission
    causedAutoSubmit: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'violations'
});

// Indexes for better query performance
violationSchema.index({ examId: 1, timestamp: -1 });
violationSchema.index({ studentId: 1, timestamp: -1 });
violationSchema.index({ violationType: 1, timestamp: -1 });
violationSchema.index({ status: 1, timestamp: -1 });
violationSchema.index({ examId: 1, studentId: 1 });

// Virtual for violation age in minutes
violationSchema.virtual('ageInMinutes').get(function() {
    return Math.floor((new Date() - this.timestamp) / (1000 * 60));
});

// Virtual for formatted timestamp
violationSchema.virtual('formattedTimestamp').get(function() {
    return this.timestamp.toLocaleString();
});

// Static method to get violation counts by type for an exam
violationSchema.statics.getViolationSummaryForExam = async function(examId) {
    return this.aggregate([
        { $match: { examId: mongoose.Types.ObjectId(examId) } },
        {
            $group: {
                _id: '$violationType',
                count: { $sum: '$violationCount' },
                uniqueStudents: { $addToSet: '$studentId' },
                latestViolation: { $max: '$timestamp' }
            }
        },
        {
            $project: {
                violationType: '$_id',
                count: 1,
                uniqueStudentsCount: { $size: '$uniqueStudents' },
                latestViolation: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Static method to get students with high violation counts
violationSchema.statics.getHighRiskStudents = async function(examId, minViolations = 3) {
    return this.aggregate([
        { $match: { examId: mongoose.Types.ObjectId(examId) } },
        {
            $group: {
                _id: '$studentId',
                totalViolations: { $sum: '$violationCount' },
                violationTypes: { $addToSet: '$violationType' },
                latestViolation: { $max: '$timestamp' },
                studentName: { $first: '$studentName' },
                studentEmail: { $first: '$studentEmail' }
            }
        },
        { $match: { totalViolations: { $gte: minViolations } } },
        { $sort: { totalViolations: -1, latestViolation: -1 } }
    ]);
};

// Static method to get recent violations for live monitoring
violationSchema.statics.getRecentViolations = async function(examId, minutes = 5) {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return this.find({
        examId: mongoose.Types.ObjectId(examId),
        timestamp: { $gte: cutoffTime }
    })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();
};

// Instance method to mark violation as reviewed
violationSchema.methods.markAsReviewed = function(adminId, notes) {
    this.status = 'reviewed';
    this.reviewedBy = adminId;
    this.reviewedAt = new Date();
    this.adminNotes = notes;
    return this.save();
};

// Pre-save middleware to set severity based on violation type
violationSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('violationType')) {
        const highSeverityTypes = [
            'Tab switching detected during exam',
            'Exited fullscreen during exam',
            'Developer tools opened',
            'Copy paste attempted'
        ];
        
        const criticalSeverityTypes = [
            'Multiple browser instances detected',
            'Screen sharing detected',
            'External application opened'
        ];
        
        if (criticalSeverityTypes.includes(this.violationType)) {
            this.severity = 'critical';
        } else if (highSeverityTypes.includes(this.violationType)) {
            this.severity = 'high';
        } else if (this.violationType === 'Other') {
            this.severity = 'low';
        } else {
            this.severity = 'medium';
        }
    }
    next();
});

// Post-save middleware for logging
violationSchema.post('save', function(doc) {
    if (doc.isNew) {
        console.log(`New violation logged: ${doc.violationType} by ${doc.studentName} in exam ${doc.examId}`);
        
        // Here you could add additional logic like:
        // - Send notifications to admins for critical violations
        // - Update exam monitoring dashboards in real-time
        // - Trigger automatic actions based on violation patterns
    }
});

const Violation = mongoose.model('Violation', violationSchema);

module.exports = Violation;