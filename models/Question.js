const mongoose = require('mongoose');


// Update your Question model (models/Question.js) to include photoUrl


const questionSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    text: {
        type: String,
        required: function() {
            return !this.photoUrl; // Text is required only if no photo
        }
    },
    photoUrl: {
        type: String,
        required: function() {
            return !this.text; // Photo is required only if no text
        }
    },
    type: {
        type: String,
        required: true,
        enum: ['multiple-choice', 'true-false','descriptive'] // Added 'descriptive' type
    },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'At least one option is required'
        }
    },
    correctAnswer: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                return v >= 0 && v < this.options.length;
            },
            message: 'Correct answer must be a valid option index'
        }
    }
}, {
    timestamps: true
});

// Add validation to ensure either text or photoUrl is provided
questionSchema.pre('validate', function(next) {
    if (!this.text && !this.photoUrl) {
        next(new Error('Either text or photoUrl must be provided'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Question', questionSchema);