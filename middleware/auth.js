


const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Authenticate token middleware with authorization checks
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user from database to ensure they still exist
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            collegeId: user.collegeId,
            user1Id: user.user1Id,
            branch: user.branch
        };

        // Authorization check: Verify user can only access their own data
        // EVEN ADMINS are now restricted to their own data unless using authenticateAdminOnly
        const unauthorizedAccess = checkUnauthorizedAccess(req);
        if (unauthorizedAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        
        return res.status(500).json({ message: 'Authentication error' });
    }
};

// Function to check for unauthorized access attempts
const checkUnauthorizedAccess = (req) => {
    // Check URL parameters (req.params)
    if (req.params.collegeId && req.params.collegeId !== req.user.collegeId) {
        console.log(`Access denied: URL collegeId ${req.params.collegeId} does not match user collegeId ${req.user.collegeId}`);
        return true;
    }
    
    if (req.params.userId && req.params.userId !== req.user.userId) {
        console.log(`Access denied: URL userId ${req.params.userId} does not match user userId ${req.user.userId}`);
        return true;
    }
    
    if (req.params.user1Id && req.params.user1Id !== req.user.user1Id) {
        console.log(`Access denied: URL user1Id ${req.params.user1Id} does not match user user1Id ${req.user.user1Id}`);
        return true;
    }

    if (req.params.branch && req.params.branch !== req.user.branch) {
        console.log(`Access denied: URL branch ${req.params.branch} does not match user branch ${req.user.branch}`);
        return true;
    }

    if (req.params.id) {
        // For generic :id parameters, check if it matches userId (MongoDB ObjectId)
        if (req.params.id !== req.user.userId) {
            console.log(`Access denied: URL id ${req.params.id} does not match user userId ${req.user.userId}`);
            return true;
        }
    }

    // Check query parameters (req.query)
    if (req.query.collegeId && req.query.collegeId !== req.user.collegeId) {
        console.log(`Access denied: Query collegeId ${req.query.collegeId} does not match user collegeId ${req.user.collegeId}`);
        return true;
    }
    
    if (req.query.userId && req.query.userId !== req.user.userId) {
        console.log(`Access denied: Query userId ${req.query.userId} does not match user userId ${req.user.userId}`);
        return true;
    }
    
    if (req.query.user1Id && req.query.user1Id !== req.user.user1Id) {
        console.log(`Access denied: Query user1Id ${req.query.user1Id} does not match user user1Id ${req.user.user1Id}`);
        return true;
    }

    if (req.query.branch && req.query.branch !== req.user.branch) {
        console.log(`Access denied: Query branch ${req.query.branch} does not match user branch ${req.user.branch}`);
        return true;
    }

    // Check request body for common user identifier fields
    if (req.body) {
        if (req.body.collegeId && req.body.collegeId !== req.user.collegeId) {
            console.log(`Access denied: Body collegeId ${req.body.collegeId} does not match user collegeId ${req.user.collegeId}`);
            return true;
        }
        
        if (req.body.userId && req.body.userId !== req.user.userId) {
            console.log(`Access denied: Body userId ${req.body.userId} does not match user userId ${req.user.userId}`);
            return true;
        }
        
        if (req.body.user1Id && req.body.user1Id !== req.user.user1Id) {
            console.log(`Access denied: Body user1Id ${req.body.user1Id} does not match user user1Id ${req.user.user1Id}`);
            return true;
        }

        if (req.body.branch && req.body.branch !== req.user.branch) {
            console.log(`Access denied: Body branch ${req.body.branch} does not match user branch ${req.user.branch}`);
            return true;
        }
    }

    return false;
};

// Enhanced authenticate token with strict authorization (no admin bypass)
const authenticateTokenStrict = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user from database to ensure they still exist
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            collegeId: user.collegeId,
            user1Id: user.user1Id,
            branch: user.branch
        };

        // Authorization check: Even admins must access their own data for strict routes
        const unauthorizedAccess = checkUnauthorizedAccess(req);
        if (unauthorizedAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        
        return res.status(500).json({ message: 'Authentication error' });
    }
};

// Role-based access control middleware
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'Access denied. Insufficient permissions.' 
            });
        }

        next();
    };
};

// Admin only middleware
const requireAdmin = requireRole(['admin']);

// Student only middleware
const requireStudent = requireRole(['student']);

// Middleware for admin-only routes that bypass authorization checks
const authenticateAdminOnly = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user from database to ensure they still exist
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        req.user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            collegeId: user.collegeId,
            user1Id: user.user1Id,
            branch: user.branch
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        
        return res.status(500).json({ message: 'Authentication error' });
    }
};

module.exports = {
    authenticateToken,
    authenticateTokenStrict,
    authenticateAdminOnly,
    requireRole,
    requireAdmin,
    requireStudent
};