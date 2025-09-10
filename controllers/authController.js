
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Generate JWT token - FIXED TYPOS
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id, 
           
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );
};

/*/ Register new user
const register = async (req, res, next) => {
    try {
        const { fullName, email, collegeId, user1Id, password, confirmPassword, branch, role } = req.body;

        // Validation
        if (!fullName || !email || !password || !confirmPassword || !role || !collegeId || !user1Id || !branch) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        
        if (user1Id.length < 12) {
            return res.status(400).json({ message: 'Id must be 12 characters long' });
        }
        
        if (collegeId.length < 6) {
            return res.status(400).json({ message: 'College ID must be at least 6 characters long' });
        }

        // Validate role
        if (!['student', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user
        const user = new User({
            fullName,
            email,
            collegeId,
            user1Id,
            password,
            branch,
            role,
            userType: "university"
        });

        await user.save();
        console.log('User registered successfully:', user.email);

        // Generate JWT token
        const token = generateToken(user);
        
        // Send response with token and user details
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                collegeId: user.collegeId,
                user1Id: user.user1Id,
                email: user.email,
                branch: user.branch,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};*/
// authController.js - Update the register function

const register = async (req, res, next) => {
    try {
        const { fullName, email, collegeId, user1Id, password, confirmPassword, branch, role, faceEmbedding } = req.body;

        // Validation
        if (!fullName || !email || !password || !confirmPassword || !role || !collegeId || !user1Id || !branch) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Face embedding validation for students
        if (role === 'student' && (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0)) {
            return res.status(400).json({ message: 'Face enrollment is required for students' });
        }

        // ... existing validations remain the same ...

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user
        const userData = {
            fullName,
            email,
            collegeId,
            user1Id,
            password,
            branch,
            role,
            userType: "university"
        };

        // Add face embedding for students
        if (role === 'student' && faceEmbedding) {
            userData.faceEmbedding = faceEmbedding;
        }

        const user = new User(userData);

        await user.save();
        console.log('User registered successfully with face enrollment:', user.email);

        // Generate JWT token
        const token = generateToken(user);
        
        // Send response with token and user details
        res.status(201).json({
            message: 'Registration successful with face enrollment',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                collegeId: user.collegeId,
                user1Id: user.user1Id,
                email: user.email,
                branch: user.branch,
                role: user.role,
                faceEnrolled: !!user.faceEmbedding
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};

// register for the coaching student
const registerC = async (req, res, next) => {
    try {
        const { fullName, email,  password, confirmPassword,  role } = req.body;

        // Validation
        if (!fullName || !email || !password || !confirmPassword || !role ) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        
        

        // Validate role
        if (!['student', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user
        const user = new User({
            fullName,
            email,
            password,
            role,
            userType:"coaching"
        });

        await user.save();
        console.log('User registered successfully:', user.email);

        // Generate JWT token
        const token = generateToken(user);
        
        // Send response with token and user details
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                
                email: user.email,
                
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};




const login = async (req, res, next) => {
    try {
        const { email, password,  role } = req.body;
        console.log('Login attempt:', email, role);

        // Validation
        if (!email || !password || !role ) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Find user by email and other credentials
        const user = await User.findOne({ email, role });
         // FIXED: was user1Id, branch (not used in this context)
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check role
        if (user.role !== role) {
            console.log('Role mismatch for user:', email, 'Expected:', role, 'Actual:', user.role);
            return res.status(401).json({ message: 'Invalid role selected' });
        }

        // Generate JWT token
        const token = generateToken(user);

        
       let redirectUrl;
       if (user.collegeId && user.user1Id && user.branch) {
            if (role === 'admin') {
                redirectUrl = `/admin-dashboard.html?collegeId=${user.collegeId}&user1Id=${user.user1Id}&branch=${user.branch}`;
            }
            else {
                redirectUrl = `/student-dashboard.html?collegeId=${user.collegeId}&user1Id=${user.user1Id}&branch=${user.branch}`;
            }
        }else{
            if (role === 'admin') {
                redirectUrl=`/admin-dashboard.html?Email=${encodeURIComponent(user.email)}&id=${user._id}`;
            }
            else{
                redirectUrl=`/student-dashboard.html?Email=${encodeURIComponent(user.email)}&id=${user._id}`;
            }    
        }



        console.log('Login successful for:', email, 'Redirecting to:', redirectUrl);

        
        // In the login function, update the user object in the response:

   res.json({
    message: 'Login successful',
    token,
    redirectUrl,
    user: {
        id: user._id,
        _id: user._id, // Add this for compatibility
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        // Include university fields if they exist (for university users)
        ...(user.collegeId && { collegeId: user.collegeId }),
        ...(user.user1Id && { user1Id: user.user1Id }),
        ...(user.branch && { branch: user.branch }),
        userType: user.userType
    }
 });

    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

// Get user profile
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).select('-password'); // FIXED: was req.user.id
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        next(error);
    }
};

// Logout (client-side will handle token removal)
const logout = (req, res) => {
    res.json({ message: 'Logout successful' });
};
const verifyFace = async (req, res, next) => {
    try {
        const { faceDescriptor, examId } = req.body;
        const userId = req.user.userId;
        
        // Validation
        if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
            return res.status(400).json({ 
                message: 'Invalid face descriptor provided' 
            });
        }
        
        if (!examId) {
            return res.status(400).json({ 
                message: 'Exam ID is required' 
            });
        }
        
        // Get user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        // Check if user has stored face embedding
        if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
            return res.status(400).json({ 
                message: 'No face enrollment found for this user' 
            });
        }
        
        // Calculate similarity between stored embedding and current face descriptor
        // Using Euclidean distance (you can also use cosine similarity)
        const distance = calculateEuclideanDistance(user.faceEmbedding, faceDescriptor);
        
        // Threshold for face matching (adjust based on your requirements)
        const SIMILARITY_THRESHOLD = 0.6; // Lower values mean stricter matching
        
        const verified = distance < SIMILARITY_THRESHOLD;
        
        // Log verification attempt
        console.log(`Face verification for user ${user.email}: Distance=${distance.toFixed(4)}, Verified=${verified}`);
        
        if (verified) {
            res.json({
                verified: true,
                message: 'Face verification successful',
                similarity: (1 - distance).toFixed(4) // Convert distance to similarity score
            });
        } else {
            res.json({
                verified: false,
                message: 'Face verification failed - identity could not be confirmed'
            });
        }
        
    } catch (error) {
        console.error('Face verification error:', error);
        res.status(500).json({ 
            message: 'Face verification failed due to server error' 
        });
    }
};

// Helper function to calculate Euclidean distance between two face descriptors
function calculateEuclideanDistance(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
        throw new Error('Face embeddings must have the same dimensions');
    }
    
    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
        const diff = embedding1[i] - embedding2[i];
        sum += diff * diff;
    }
    
    return Math.sqrt(sum);
}

// Alternative helper function using cosine similarity (often more accurate for face recognition)
function calculateCosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
        throw new Error('Face embeddings must have the same dimensions');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
        return 0;
    }
    
    return dotProduct / (norm1 * norm2);
}



module.exports = {
    register,
    registerC,
    login,
    getProfile,
    verifyFace,
    logout
};

