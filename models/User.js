const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
     userType: { type: String, enum: ["university", "coaching"], required: true },
    collegeId: {
        type: String,
        //required: true,
        required: function () {
      return this.userType === "university";
    },
        trim: true
    },
    user1Id:{
        type: String,
       // required: true,
       required: function () {
      return this.userType === "university";
    },
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    branch:{
        type: String,
        //required: true,
        required: function () {
      return this.userType === "university";
    },
        trim: true
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    faceEmbedding: {
        type: [Number], // Array of numbers representing face descriptor
        required: function() {
            return this.userType === "university" && this.role === "student";
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        this.updatedAt = Date.now();
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        this.updatedAt = Date.now();
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
