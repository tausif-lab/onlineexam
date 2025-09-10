
// Check authentication
window.addEventListener('load', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
        window.location.href = '/login';
        return;
    }
    
    // Display admin name
    document.getElementById('adminName').textContent = user.fullName || 'Admin';
    
    // Load admin profile and statistics
    loadProfile();
    loadStatistics();
});

async function loadProfile() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            document.getElementById('adminName').textContent = user.fullName;
            
            // Update localStorage with complete user data including collegeId, user1Id, branch
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = {
                ...existingUser,
                fullName: user.fullName,
                email: user.email,
                collegeId: user.collegeId,
                user1Id: user.user1Id,
                branch: user.branch,
                role: user.role,
                _id: user._id
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
            console.error('Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function loadStatistics() {
    // Mock statistics - will be implemented with real data later
    document.getElementById('totalStudents').textContent = '45';
    document.getElementById('activeExams').textContent = '3';
    document.getElementById('completedExams').textContent = '12';
    document.getElementById('averageScore').textContent = '78%';
}

window.addEventListener('DOMContentLoaded', function() {
    // Get user from localStorage
    let user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Set admin name if needed
    if (user.fullName) {
        document.getElementById('adminName').textContent = user.fullName;
    }
    
    // Set up Manage Exams button
    document.getElementById('manageExamsBtn').addEventListener('click', function() {
        // Get fresh user data from localStorage (in case it was updated by loadProfile)
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Check if user has university fields (collegeId, user1Id, branch)
        if (currentUser.collegeId && currentUser.user1Id && currentUser.branch) {
            // University user - redirect with university parameters
            window.location.href = `/manage-exam.html?collegeId=${encodeURIComponent(currentUser.collegeId)}&userId=${encodeURIComponent(currentUser.user1Id)}&branch=${encodeURIComponent(currentUser.branch)}`;
        } else {
            // Coaching user - redirect with email and id parameters
            window.location.href = `/manage-exam.html?Email=${encodeURIComponent(currentUser.email)}&id=${encodeURIComponent(currentUser.id || currentUser._id)}`;
        }
    });
    
    document.getElementById('admin-analysisBtn').addEventListener('click', function() {
        // Get fresh user data from localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Check if user has university fields
        if (currentUser.collegeId && currentUser.user1Id && currentUser.branch) {
            // University user
            window.location.href = `/admin-analysis.html?collegeId=${encodeURIComponent(currentUser.collegeId)}&userId=${encodeURIComponent(currentUser.user1Id)}&branch=${encodeURIComponent(currentUser.branch)}`;
        } else {
            // Coaching user
            window.location.href = `/admin-analysis.html?Email=${encodeURIComponent(currentUser.email)}&id=${encodeURIComponent(currentUser.id || currentUser._id)}`;
        }
    });
    document.getElementById('admin-analysisBtn').addEventListener('click', function() {
        // Get fresh user data from localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Check if user has university fields
        if (currentUser.collegeId && currentUser.user1Id && currentUser.branch) {
            // University user
            window.location.href = `/admin-analysis.html?collegeId=${encodeURIComponent(currentUser.collegeId)}&userId=${encodeURIComponent(currentUser.user1Id)}&branch=${encodeURIComponent(currentUser.branch)}`;
        } else {
            // Coaching user
            window.location.href = `/admin-analysis.html?Email=${encodeURIComponent(currentUser.email)}&id=${encodeURIComponent(currentUser.id || currentUser._id)}`;
        }
    });
    
    document.getElementById('openExamchecking').addEventListener('click', function() {
        // Get fresh user data from localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Check if user has university fields
        if (currentUser.collegeId && currentUser.user1Id && currentUser.branch) {
            // University user
            window.location.href = `/admin-checking.html?collegeId=${encodeURIComponent(currentUser.collegeId)}&userId=${encodeURIComponent(currentUser.user1Id)}&branch=${encodeURIComponent(currentUser.branch)}`;
        } else {
            // Coaching user
            window.location.href = `/admin-checking.html?Email=${encodeURIComponent(currentUser.email)}&id=${encodeURIComponent(currentUser.id || currentUser._id)}`;
        }
    });
});

function manageUsers() {
    alert('User management module will be implemented in the next phase');
}

function viewReports() {
    alert('Reports module will be implemented in the next phase');
}

function systemSettings() {
    alert('System settings module will be implemented in the next phase');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('redirectedOnce'); // Clear the redirect flag
    window.location.href = '/login';
}
