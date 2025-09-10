/*/ Global variables
        /*let currentSelectedExam = null;
        let monitoringActive = false;
        let studentActivityInterval = null;
        let examDurationInterval = null;
        let currentMeetingConfig = null;*

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Admin Proctoring Dashboard loaded');
            loadActiveExams();
            setupEventListeners();
            
            // Load admin name
            const adminName = localStorage.getItem('adminName') || 'Administrator';
            document.getElementById('adminName').textContent = adminName;
        });

        // Setup event listeners
        function setupEventListeners() {
            // Auto-refresh active exams every 30 seconds
            setInterval(loadActiveExams, 30000);
        }

        // Load active exams
       /* async function loadActiveExams() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/exams/:id', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load active exams');
                }

                const result = await response.json();
                console.log('Active exams loaded:', result);

                displayActiveExams(result.data || []);
            } catch (error) {
                console.error('Error loading active exams:', error);
                showError('Failed to load active exams: ' + error.message);
            }
        }

        // Display active exams
        function displayActiveExams(exams) {
            const container = document.getElementById('activeExamsList');
            
            if (!exams || exams.length === 0) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="text-center py-4">
                            <i class="fas fa-clipboard-list fa-2x text-muted"></i>
                            <p class="mt-2 text-muted">No active exams with students found</p>
                            <button class="btn btn-outline-primary" onclick="loadActiveExams()">
                                <i class="fas fa-refresh"></i> Refresh
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = exams.map(exam => `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="exam-info-card ${currentSelectedExam && currentSelectedExam._id === exam._id ? 'active' : ''}" 
                         onclick="selectExam('${exam._id}')">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0">${exam.title}</h6>
                            <span class="status-indicator ${exam.studentsCount > 0 ? 'status-active' : 'status-pending'}"></span>
                        </div>
                        <p class="text-muted small mb-2">${exam.category}</p>
                        <div class="d-flex justify-content-between small">
                            <span><i class="fas fa-users"></i> ${exam.studentsCount || 0} students</span>
                            <span><i class="fas fa-clock"></i> ${exam.duration} min</span>
                        </div>
                        ${exam.meetingNumber ? `
                            <div class="mt-2">
                                <small class="text-success">
                                    <i class="fas fa-video"></i> Meeting: ${exam.meetingNumber}
                                </small>
                            </div>
                        ` : ''}
                        ${exam.studentsCount > 0 ? `
                            <button class="btn btn-sm btn-outline-primary mt-2 w-100">
                                <i class="fas fa-eye"></i> Start Monitoring
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        // Select exam for monitoring
        async function selectExam(examId) {
            try {
                showLoading('Loading exam details...');
                
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/exams/${examId}/details`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load exam details');
                }

                const result = await response.json();
                currentSelectedExam = result.data;
                
                console.log('Selected exam:', currentSelectedExam);
                
                // Update UI
                document.getElementById('currentExamTitle').textContent = currentSelectedExam.title;
                document.getElementById('monitoringControls').style.display = 'block';
                
                // Update exam cards
                document.querySelectorAll('.exam-info-card').forEach(card => {
                    card.classList.remove('active');
                });
                event.target.closest('.exam-info-card').classList.add('active');
                
                // Create or get meeting configuration
                await setupMeetingForExam(currentSelectedExam);
                
                hideLoading();
                
            } catch (error) {
                console.error('Error selecting exam:', error);
                showError('Failed to select exam: ' + error.message);
                hideLoading();
            }
        }

        // Setup meeting for exam
        async function setupMeetingForExam(exam) {
            try {
                const token = localStorage.getItem('token');
                
                // Check if meeting already exists for this exam
                if (!exam.meetingNumber) {
                    // Create new meeting
                    const response = await fetch('/api/zoom/create-meeting', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            examId: exam._id,
                            examTitle: exam.title,
                            durationMinutes: exam.duration
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to create meeting');
                    }

                    const result = await response.json();
                    exam.meetingNumber = result.data.meetingNumber;
                    exam.meetingPassword = result.data.password;
                    
                    console.log('Meeting created:', result.data);
                }

                // Store meeting configuration
                currentMeetingConfig = {
                    meetingNumber: exam.meetingNumber,
                    passWord: exam.meetingPassword || '',
                    userName: 'Exam Proctor',
                    userEmail: 'proctor@cspdcl.com'
                };

                console.log('Meeting config ready:', currentMeetingConfig);
                
            } catch (error) {
                console.error('Error setting up meeting:', error);
                throw error;
            }
        }*
       // Fixed JavaScript for adminlive.html
// Replace the existing script section with this corrected version

// Load active exams - FIXED VERSION
async function loadActiveExams() {
    try {
        const token = localStorage.getItem('token');
        
        // FIXED: Use the correct endpoint for getting active exams with student counts
        const response = await fetch('/api/exams/active-with-students', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, redirect to login
                localStorage.clear();
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Active exams loaded:', result);

        // FIXED: Handle the response structure properly
        const exams = result.data || result.exams || [];
        displayActiveExams(exams);
        
    } catch (error) {
        console.error('Error loading active exams:', error);
        showError('Failed to load active exams: ' + error.message);
        
        // Show fallback UI
        const container = document.getElementById('activeExamsList');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    Unable to load active exams. 
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadActiveExams()">
                        <i class="fas fa-refresh"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }
}

// FIXED: Better exam selection with proper error handling
async function selectExam(examId) {
    try {
        showLoading('Loading exam details...');
        
        const token = localStorage.getItem('token');
        
        // FIXED: Use the correct endpoint structure
        const response = await fetch(`/api/exams/${examId}/details`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load exam details: HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error('Invalid response format from server');
        }
        
        currentSelectedExam = result.data;
        
        console.log('Selected exam:', currentSelectedExam);
        
        // Update UI
        document.getElementById('currentExamTitle').textContent = currentSelectedExam.title;
        document.getElementById('monitoringControls').style.display = 'block';
        
        // Update exam cards - FIXED: Proper event handling
        document.querySelectorAll('.exam-info-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Find and activate the selected card
        const selectedCard = document.querySelector(`[onclick="selectExam('${examId}')"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
        
        // FIXED: Better meeting setup
        await setupMeetingForExam(currentSelectedExam);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error selecting exam:', error);
        showError('Failed to select exam: ' + error.message);
        hideLoading();
    }
}

// FIXED: Meeting setup with better error handling
async function setupMeetingForExam(exam) {
    try {
        const token = localStorage.getItem('token');
        
        // Check if meeting already exists
        if (exam.zoomMeetingConfig && exam.zoomMeetingConfig.meetingNumber) {
            console.log('Using existing meeting config');
            currentMeetingConfig = {
                meetingNumber: exam.zoomMeetingConfig.meetingNumber,
                passWord: exam.zoomMeetingConfig.password || '',
                userName: 'Exam Proctor',
                userEmail: 'proctor@cspdcl.com'
            };
            return;
        }

        // FIXED: Use the correct endpoint for setting up meetings
        const response = await fetch(`/api/exams/${exam._id}/setup-meeting`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // If meeting setup fails, we can still proceed with monitoring
            console.warn('Failed to setup meeting, proceeding without Zoom integration');
            currentMeetingConfig = null;
            return;
        }

        const result = await response.json();
        if (result.success && result.data) {
            currentMeetingConfig = {
                meetingNumber: result.data.meetingNumber,
                passWord: result.data.password || '',
                userName: 'Exam Proctor',
                userEmail: 'proctor@cspdcl.com'
            };
            
            console.log('Meeting setup successful:', currentMeetingConfig);
        }
        
    } catch (error) {
        console.error('Error setting up meeting:', error);
        // Don't throw error, just log it and continue without Zoom integration
        currentMeetingConfig = null;
    }
}

// FIXED: Enhanced display function with better error handling
function displayActiveExams(exams) {
    const container = document.getElementById('activeExamsList');
    
    if (!Array.isArray(exams)) {
        console.error('Invalid exams data:', exams);
        exams = [];
    }
    
    // Filter to show only exams with students
    const activeExamsWithStudents = exams.filter(exam => 
        exam && (exam.studentsCount > 0 || exam.activeStudents?.length > 0)
    );
    
    if (activeExamsWithStudents.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-4">
                    <i class="fas fa-clipboard-list fa-2x text-muted"></i>
                    <h5 class="mt-3 text-muted">No Active Exams</h5>
                    <p class="text-muted">No exams with active students found</p>
                    <button class="btn btn-outline-primary" onclick="loadActiveExams()">
                        <i class="fas fa-refresh"></i> Refresh
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = activeExamsWithStudents.map(exam => {
        const studentsCount = exam.studentsCount || exam.activeStudents?.length || 0;
        const meetingNumber = exam.zoomMeetingConfig?.meetingNumber || exam.meetingNumber;
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="exam-info-card ${currentSelectedExam && currentSelectedExam._id === exam._id ? 'active' : ''}" 
                     onclick="selectExam('${exam._id}')">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0" title="${exam.title}">${exam.title.length > 30 ? exam.title.substring(0, 30) + '...' : exam.title}</h6>
                        <span class="status-indicator ${studentsCount > 0 ? 'status-active' : 'status-pending'}"></span>
                    </div>
                    <p class="text-muted small mb-2">${exam.category || exam.branch || 'General'}</p>
                    <div class="d-flex justify-content-between small mb-2">
                        <span><i class="fas fa-users"></i> ${studentsCount} active</span>
                        <span><i class="fas fa-clock"></i> ${exam.duration || 60} min</span>
                    </div>
                    ${exam.collegeId ? `
                        <div class="small text-muted mb-2">
                            <i class="fas fa-university"></i> College: ${exam.collegeId}
                        </div>
                    ` : ''}
                    ${meetingNumber ? `
                        <div class="mb-2">
                            <small class="text-success">
                                <i class="fas fa-video"></i> Meeting Ready
                            </small>
                        </div>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-primary w-100" onclick="event.stopPropagation(); selectExam('${exam._id}')">
                        <i class="fas fa-eye"></i> Start Monitoring
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// FIXED: Enhanced error handling and loading states
function showError(message, isRetryable = true) {
    document.getElementById('errorMessage').textContent = message;
    
    // Show/hide retry button based on error type
    const retryBtn = document.querySelector('#errorModal .btn-primary');
    if (retryBtn) {
        retryBtn.style.display = isRetryable ? 'inline-block' : 'none';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
    hideLoading();
}

// FIXED: Better retry logic
function retryOperation() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('errorModal'));
    if (modal) modal.hide();
    
    // Clear any previous errors
    console.log('Retrying operation...');
    
    // Retry loading active exams
    loadActiveExams();
}

// FIXED: Enhanced initialization with better error handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Proctoring Dashboard initializing...');
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No authentication token found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    // Load admin name
    const adminName = localStorage.getItem('adminName') || 
                     localStorage.getItem('userName') || 
                     'Administrator';
    document.getElementById('adminName').textContent = adminName;
    
    // Initialize
    setupEventListeners();
    loadActiveExams();
    
    console.log('Admin Proctoring Dashboard loaded successfully');
});

// FIXED: Better event listeners setup
function setupEventListeners() {
    // Auto-refresh active exams every 30 seconds
    setInterval(() => {
        if (!monitoringActive) {  // Only refresh when not actively monitoring
            loadActiveExams();
        }
    }, 30000);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !monitoringActive) {
            loadActiveExams();
        }
    });
}

        // Start live monitoring
        async function startLiveMonitoring() {
            if (!currentSelectedExam || !currentMeetingConfig) {
                showError('Please select an exam first');
                return;
            }

            try {
                showLoading('Starting monitoring session...');
                
                // Initialize Zoom Admin SDK
                if (typeof window.zoomAdmin === 'undefined') {
                    showError('Zoom Admin SDK not loaded properly');
                    return;
                }

                // Join meeting as host/admin
                await window.zoomAdmin.joinAsHost(currentMeetingConfig);
                
                // Update UI
                monitoringActive = true;
                document.getElementById('startMonitoringBtn').style.display = 'none';
                document.getElementById('pauseMonitoringBtn').style.display = 'inline-block';
                document.getElementById('stopMonitoringBtn').style.display = 'inline-block';
                document.getElementById('noMeetingMessage').style.display = 'none';
                document.getElementById('zoom-proctor-meeting-container').style.display = 'block';
                
                // Start monitoring intervals
                startMonitoringIntervals();
                
                hideLoading();
                
                console.log('Live monitoring started for exam:', currentSelectedExam.title);
                
            } catch (error) {
                console.error('Error starting monitoring:', error);
                showError('Failed to start monitoring: ' + error.message);
                hideLoading();
            }
        }

        // Start monitoring intervals
        function startMonitoringIntervals() {
            // Update student activity every 10 seconds
            studentActivityInterval = setInterval(updateStudentActivity, 10000);
            
            // Update exam duration every second
            examDurationInterval = setInterval(updateExamDuration, 1000);
            
            // Initial updates
            updateStudentActivity();
        }

        // Update student activity
        async function updateStudentActivity() {
            if (!monitoringActive || !currentSelectedExam) return;

            try {
                // Get monitoring status from Zoom Admin SDK
                const status = window.zoomAdmin ? window.zoomAdmin.getMonitoringStatus() : null;
                
                if (status && status.participants) {
                    updateStudentsList(status.participants);
                    document.getElementById('connectedStudents').textContent = status.participantCount || 0;
                }
                
                // Also get violations data
                await updateViolationsLog();
                
            } catch (error) {
                console.error('Error updating student activity:', error);
            }
        }

        // Update students list
        function updateStudentsList(participants) {
            const container = document.getElementById('studentActivityList');
            
            if (!participants || participants.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-user-slash fa-2x text-muted"></i>
                        <p class="mt-2 text-muted">No students connected</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = participants.map(student => {
                const warningClass = student.violationCount >= 2 ? 'danger' : student.violationCount > 0 ? 'warning' : '';
                
                return `
                    <div class="student-card ${warningClass}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">${student.name || 'Unknown Student'}</h6>
                                <small class="text-muted">${student.email || ''}</small>
                            </div>
                            <div class="text-end">
                                <small class="d-block">
                                    ${student.videoStatus ? '<i class="fas fa-video text-success"></i>' : '<i class="fas fa-video-slash text-danger"></i>'}
                                    ${student.audioStatus ? '<i class="fas fa-microphone text-success"></i>' : '<i class="fas fa-microphone-slash text-warning"></i>'}
                                </small>
                                ${student.violationCount > 0 ? `<small class="text-danger">${student.violationCount} violations</small>` : ''}
                            </div>
                        </div>
                        <small class="text-muted">Duration: ${student.duration || '00:00:00'}</small>
                    </div>
                `;
            }).join('');
        }

        // Update violations log
        async function updateViolationsLog() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/violations/exam/${currentSelectedExam._id}/recent`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    const violations = result.data || [];
                    
                    const container = document.getElementById('violationsList');
                    
                    if (violations.length === 0) {
                        container.innerHTML = '<p class="text-muted small">No violations recorded</p>';
                    } else {
                        container.innerHTML = violations.slice(0, 5).map(violation => `
                            <div class="violation-alert">
                                <strong>${violation.studentName || 'Unknown Student'}</strong>
                                <small class="d-block">${violation.violationType}</small>
                                <small class="text-muted">${new Date(violation.timestamp).toLocaleTimeString()}</small>
                            </div>
                        `).join('');
                    }
                    
                    // Update total violations count
                    const totalViolations = violations.reduce((sum, v) => sum + (v.violationCount || 1), 0);
                    document.getElementById('totalViolations').textContent = totalViolations;
                }
                
            } catch (error) {
                console.error('Error updating violations:', error);
            }
        }

        // Update exam duration
        function updateExamDuration() {
            if (!monitoringActive || !currentSelectedExam) return;
            
            // This would be calculated based on exam start time
            // For now, just show a placeholder
            const durationElement = document.getElementById('examDuration');
            if (durationElement) {
                // Implementation depends on how you track exam start time
                durationElement.textContent = '00:00:00'; // Placeholder
            }
        }

        // Pause monitoring
        function pauseMonitoring() {
            monitoringActive = false;
            
            if (studentActivityInterval) {
                clearInterval(studentActivityInterval);
                studentActivityInterval = null;
            }
            
            if (examDurationInterval) {
                clearInterval(examDurationInterval);
                examDurationInterval = null;
            }
            
            document.getElementById('pauseMonitoringBtn').style.display = 'none';
            document.getElementById('startMonitoringBtn').style.display = 'inline-block';
            document.getElementById('startMonitoringBtn').innerHTML = '<i class="fas fa-play"></i> Resume Monitoring';
            
            console.log('Monitoring paused');
        }

        // Stop monitoring
        async function stopMonitoring() {
            if (!confirm('Are you sure you want to stop monitoring? This will end the proctoring session.')) {
                return;
            }

            try {
                showLoading('Stopping monitoring session...');
                
                // Stop intervals
                if (studentActivityInterval) {
                    clearInterval(studentActivityInterval);
                    studentActivityInterval = null;
                }
                
                if (examDurationInterval) {
                    clearInterval(examDurationInterval);
                    examDurationInterval = null;
                }
                
                // End Zoom meeting if active
                if (window.zoomAdmin && monitoringActive) {
                    await window.zoomAdmin.endMeeting();
                }
                
                // Reset UI
                monitoringActive = false;
                document.getElementById('startMonitoringBtn').style.display = 'inline-block';
                document.getElementById('startMonitoringBtn').innerHTML = '<i class="fas fa-play"></i> Start Monitoring';
                document.getElementById('pauseMonitoringBtn').style.display = 'none';
                document.getElementById('stopMonitoringBtn').style.display = 'none';
                document.getElementById('noMeetingMessage').style.display = 'block';
                document.getElementById('zoom-proctor-meeting-container').style.display = 'none';
                
                // Clear student list
                document.getElementById('studentActivityList').innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-user-slash fa-2x text-muted"></i>
                        <p class="mt-2 text-muted">Monitoring stopped</p>
                    </div>
                `;
                
                hideLoading();
                console.log('Monitoring stopped');
                
            } catch (error) {
                console.error('Error stopping monitoring:', error);
                showError('Error stopping monitoring: ' + error.message);
                hideLoading();
            }
        }

        // Utility functions
        function showLoading(message = 'Loading...') {
            document.getElementById('loadingMessage').textContent = message;
            const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
            modal.show();
        }

        function hideLoading() {
            const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
            if (modal) modal.hide();
        }

        function showError(message) {
            document.getElementById('errorMessage').textContent = message;
            const modal = new bootstrap.Modal(document.getElementById('errorModal'));
            modal.show();
            hideLoading();
        }

        function retryOperation() {
            const modal = bootstrap.Modal.getInstance(document.getElementById('errorModal'));
            if (modal) modal.hide();
            
            // Retry the last operation (loading active exams)
            loadActiveExams();
        }

        function logout() {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
        }*/


// Enhanced adminlive.js with proper student webcam monitoring integration
// Global variables
let currentSelectedExam = null;
let monitoringActive = false;
let studentActivityInterval = null;
let examDurationInterval = null;
let currentMeetingConfig = null;
let meetingStartTime = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Proctoring Dashboard loaded');
    loadActiveExams();
    setupEventListeners();
    
    // Load admin name
    const adminName = localStorage.getItem('adminName') || localStorage.getItem('userName') || 'Administrator';
    document.getElementById('adminName').textContent = adminName;
});

// Setup event listeners
function setupEventListeners() {
    // Auto-refresh active exams every 30 seconds
    setInterval(() => {
        if (!monitoringActive) {  // Only refresh when not actively monitoring
            loadActiveExams();
        }
    }, 30000);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !monitoringActive) {
            loadActiveExams();
        }
    });
}

// UPDATED: Load active exams with proper error handling
async function loadActiveExams() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.log('No authentication token found, redirecting to login');
            window.location.href = '/login.html';
            return;
        }
        
        // Try multiple endpoints to find active exams with students
        let response;
        let result;
        
        // First try: Get all active exams
        try {
            response = await fetch('/api/exams/active-with-students', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                result = await response.json();
                console.log('Active exams loaded:', result);
                
                if (result.success && result.data) {
                    // Enhance exams with student count info
                    const examsWithStudents = await enhanceExamsWithStudentCounts(result.data);
                    displayActiveExams(examsWithStudents);
                    return;
                }
            }
        } catch (error) {
            console.log('First attempt failed, trying alternative endpoint');
        }
        
        // Second try: Get all exams and filter active ones
        try {
            response = await fetch('/api/exams', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                result = await response.json();
                if (result.success && result.data) {
                    // Filter active exams
                    const activeExams = result.data.filter(exam => {
                        const now = new Date();
                        return exam.isActive && 
                               (!exam.endDate || new Date(exam.endDate) >= now);
                    });
                    
                    const examsWithStudents = await enhanceExamsWithStudentCounts(activeExams);
                    displayActiveExams(examsWithStudents);
                    return;
                }
            }
        } catch (error) {
            console.error('Second attempt failed:', error);
        }
        
        // If all attempts fail, show error
        throw new Error('Unable to load active exams from any endpoint');
        
    } catch (error) {
        console.error('Error loading active exams:', error);
        showError('Failed to load active exams: ' + error.message);
        
        // Show fallback UI
        const container = document.getElementById('activeExamsList');
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Unable to load active exams. 
                        <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadActiveExams()">
                            <i class="fas fa-refresh"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// UPDATED: Enhance exams with student counts
async function enhanceExamsWithStudentCounts(exams) {
    if (!Array.isArray(exams)) return [];
    
    const token = localStorage.getItem('token');
    const enhancedExams = [];
    
    for (const exam of exams) {
        try {
            // Get active students for this exam
            const response = await fetch(`/api/results/exam/${exam._id}/active-students`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            let studentsCount = 0;
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    studentsCount = result.data?.length || 0;
                }
            }
            
            // Check if exam has Zoom meeting configured
            const meetingResponse = await fetch(`/api/zoom/exam/${exam._id}/meeting-config`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            let meetingInfo = null;
            if (meetingResponse.ok) {
                const meetingResult = await meetingResponse.json();
                if (meetingResult.success && meetingResult.data?.hasMeeting) {
                    meetingInfo = {
                        meetingNumber: meetingResult.data.meetingNumber,
                        isActive: meetingResult.data.isActive
                    };
                }
            }
            
            enhancedExams.push({
                ...exam,
                studentsCount,
                meetingInfo,
                hasActiveStudents: studentsCount > 0
            });
            
        } catch (error) {
            console.error(`Error enhancing exam ${exam._id}:`, error);
            enhancedExams.push({
                ...exam,
                studentsCount: 0,
                hasActiveStudents: false
            });
        }
    }
    
    return enhancedExams.filter(exam => exam.hasActiveStudents);
}

// UPDATED: Display active exams with better UI
function displayActiveExams(exams) {
    const container = document.getElementById('activeExamsList');
    
    if (!Array.isArray(exams)) {
        console.error('Invalid exams data:', exams);
        exams = [];
    }
    
    if (exams.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-4">
                    <i class="fas fa-clipboard-list fa-2x text-muted"></i>
                    <h5 class="mt-3 text-muted">No Active Exams</h5>
                    <p class="text-muted">No exams with active students found for monitoring</p>
                    <button class="btn btn-outline-primary" onclick="loadActiveExams()">
                        <i class="fas fa-refresh"></i> Refresh
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = exams.map(exam => {
        const studentsCount = exam.studentsCount || 0;
        const meetingNumber = exam.meetingInfo?.meetingNumber || 'Not configured';
        const hasZoomMeeting = !!exam.meetingInfo?.meetingNumber;
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="exam-info-card ${currentSelectedExam && currentSelectedExam._id === exam._id ? 'active' : ''}" 
                     onclick="selectExam('${exam._id}')">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0" title="${exam.title}">
                            ${exam.title.length > 25 ? exam.title.substring(0, 25) + '...' : exam.title}
                        </h6>
                        <span class="status-indicator ${studentsCount > 0 ? 'status-active' : 'status-pending'}"></span>
                    </div>
                    <p class="text-muted small mb-2">
                        ${exam.category || exam.branch || 'General'} • ${exam.college?.name || exam.collegeId || 'All Colleges'}
                    </p>
                    <div class="d-flex justify-content-between small mb-2">
                        <span><i class="fas fa-users text-primary"></i> ${studentsCount} active</span>
                        <span><i class="fas fa-clock text-info"></i> ${exam.duration || 60} min</span>
                    </div>
                    ${hasZoomMeeting ? `
                        <div class="mb-2">
                            <small class="text-success">
                                <i class="fas fa-video"></i> Video: ${meetingNumber}
                            </small>
                        </div>
                    ` : `
                        <div class="mb-2">
                            <small class="text-warning">
                                <i class="fas fa-video-slash"></i> No video meeting
                            </small>
                        </div>
                    `}
                    <button class="btn btn-sm btn-outline-primary w-100" 
                            onclick="event.stopPropagation(); selectExam('${exam._id}')"
                            ${studentsCount === 0 ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i> ${hasZoomMeeting ? 'Monitor with Video' : 'Monitor Activity'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// UPDATED: Select exam with enhanced monitoring setup
async function selectExam(examId) {
    try {
        showLoading('Loading exam details...');
        
        const token = localStorage.getItem('token');
        
        // Load exam details
        const response = await fetch(`/api/exams/${examId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load exam details: HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error('Invalid response format from server');
        }
        
        currentSelectedExam = result.data;
        
        console.log('Selected exam:', currentSelectedExam);
        
        // Update UI
        document.getElementById('currentExamTitle').textContent = currentSelectedExam.title;
        document.getElementById('monitoringControls').style.display = 'block';
        
        // Update exam cards
        document.querySelectorAll('.exam-info-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Find and activate the selected card
        const selectedCard = document.querySelector(`[onclick*="${examId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
        
        // Setup meeting for monitoring
        await setupMeetingForExam(currentSelectedExam);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error selecting exam:', error);
        showError('Failed to select exam: ' + error.message);
        hideLoading();
    }
}

// UPDATED: Meeting setup with auto-creation if needed
async function setupMeetingForExam(exam) {
    try {
        const token = localStorage.getItem('token');
        
        // Check if meeting already exists
        const configResponse = await fetch(`/api/zoom/exam/${exam._id}/meeting-config`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (configResponse.ok) {
            const configResult = await configResponse.json();
            if (configResult.success && configResult.data?.hasMeeting) {
                currentMeetingConfig = {
                    meetingNumber: configResult.data.meetingNumber,
                    passWord: configResult.data.password || '',
                    userName: 'Exam Proctor',
                    userEmail: 'proctor@cspdcl.com',
                    hasExistingMeeting: true
                };
                
                console.log('Using existing meeting config:', currentMeetingConfig);
                return;
            }
        }
        
        // Auto-create meeting if none exists
        console.log('No existing meeting found, creating new one...');
        const createResponse = await fetch('/api/zoom/create-meeting', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                examId: exam._id,
                examTitle: exam.title,
                durationMinutes: exam.duration || 120
            })
        });

        if (createResponse.ok) {
            const createResult = await createResponse.json();
            if (createResult.success) {
                currentMeetingConfig = {
                    meetingNumber: createResult.data.meetingNumber,
                    passWord: createResult.data.password || '',
                    userName: 'Exam Proctor',
                    userEmail: 'proctor@cspdcl.com',
                    hasExistingMeeting: false
                };
                
                console.log('Meeting created successfully:', currentMeetingConfig);
                showTemporaryMessage('📹 Video meeting created for monitoring', 'success', 3000);
            }
        } else {
            console.warn('Meeting creation failed, proceeding without video monitoring');
            currentMeetingConfig = null;
        }
        
    } catch (error) {
        console.error('Error setting up meeting:', error);
        currentMeetingConfig = null;
        showTemporaryMessage('⚠️ Video monitoring unavailable, using basic monitoring', 'warning', 4000);
    }
}

// UPDATED: Start live monitoring with Zoom integration
async function startLiveMonitoring() {
    if (!currentSelectedExam) {
        showError('Please select an exam first');
        return;
    }

    try {
        showLoading('Starting monitoring session...');
        
        // Check if we have a Zoom meeting configured
        if (currentMeetingConfig && currentMeetingConfig.meetingNumber) {
            console.log('🎥 Starting monitoring with Zoom video...');
            
            // Initialize Zoom Admin SDK if available
            if (typeof window.zoomAdmin === 'undefined') {
                // Load Zoom Admin SDK dynamically
                await loadZoomAdminSDK();
            }

            if (window.zoomAdmin) {
                try {
                    // Join meeting as host/admin for monitoring
                    await window.zoomAdmin.joinAsHost(currentMeetingConfig);
                    console.log('✅ Successfully joined Zoom meeting as host');
                    showTemporaryMessage('🎥 Video monitoring session started', 'success', 3000);
                } catch (zoomError) {
                    console.error('Zoom join failed:', zoomError);
                    showTemporaryMessage('⚠️ Video monitoring failed, using activity monitoring', 'warning', 4000);
                }
            } else {
                console.warn('Zoom Admin SDK not available');
                showTemporaryMessage('⚠️ Video SDK not available, using activity monitoring', 'warning', 4000);
            }
        } else {
            console.log('📊 Starting activity monitoring (no video meeting)...');
            showTemporaryMessage('📊 Activity monitoring started', 'info', 3000);
        }
        
        // Update UI state
        monitoringActive = true;
        meetingStartTime = Date.now();
        
        document.getElementById('startMonitoringBtn').style.display = 'none';
        document.getElementById('pauseMonitoringBtn').style.display = 'inline-block';
        document.getElementById('stopMonitoringBtn').style.display = 'inline-block';
        
        // Show monitoring interface
        document.getElementById('noMeetingMessage').style.display = 'none';
        document.getElementById('zoom-proctor-meeting-container').style.display = 'block';
        
        // Start monitoring intervals
        startMonitoringIntervals();
        
        hideLoading();
        
        console.log('✅ Live monitoring started for exam:', currentSelectedExam.title);
        
    } catch (error) {
        console.error('Error starting monitoring:', error);
        showError('Failed to start monitoring: ' + error.message);
        hideLoading();
    }
}

// NEW: Load Zoom Admin SDK dynamically
async function loadZoomAdminSDK() {
    try {
        if (typeof window.zoomAdmin !== 'undefined') {
            return; // Already loaded
        }

        console.log('🔄 Loading Zoom Admin SDK...');
        
        // Load the admin SDK script
        const script = document.createElement('script');
        script.src = '/zoom-sdk-admin.js'; // Your admin SDK file
        script.async = true;
        
        return new Promise((resolve, reject) => {
            script.onload = () => {
                console.log('✅ Zoom Admin SDK loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Zoom Admin SDK');
                reject(new Error('Failed to load Zoom Admin SDK'));
            };
            document.head.appendChild(script);
        });
        
    } catch (error) {
        console.error('Error loading Zoom Admin SDK:', error);
        throw error;
    }
}

// UPDATED: Start monitoring intervals with enhanced data
function startMonitoringIntervals() {
    // Update student activity every 5 seconds for real-time monitoring
    studentActivityInterval = setInterval(updateStudentActivity, 5000);
    
    // Update exam duration every second
    examDurationInterval = setInterval(updateExamDuration, 1000);
    
    // Initial updates
    updateStudentActivity();
    updateExamDuration();
}

// UPDATED: Enhanced student activity monitoring
async function updateStudentActivity() {
    if (!monitoringActive || !currentSelectedExam) return;

    try {
        const token = localStorage.getItem('token');
        
        // Get Zoom meeting participants if available
        let zoomParticipants = [];
        if (window.zoomAdmin && window.zoomAdmin.getMonitoringStatus) {
            const status = window.zoomAdmin.getMonitoringStatus();
            if (status && status.participants) {
                zoomParticipants = status.participants;
            }
        }
        
        // Get active exam submissions (students currently taking exam)
        const submissionsResponse = await fetch(`/api/results/exam/${currentSelectedExam._id}/active-students`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        let activeStudents = [];
        if (submissionsResponse.ok) {
            const submissionsResult = await submissionsResponse.json();
            if (submissionsResult.success) {
                activeStudents = submissionsResult.data || [];
            }
        }
        
        // Merge Zoom and submission data
        const mergedData = mergeStudentData(zoomParticipants, activeStudents);
        
        // Update UI
        updateStudentsList(mergedData);
        document.getElementById('connectedStudents').textContent = mergedData.length;
        
        // Update violations log
        await updateViolationsLog();
        
    } catch (error) {
        console.error('Error updating student activity:', error);
    }
}

// NEW: Merge Zoom participants with active students
function mergeStudentData(zoomParticipants, activeStudents) {
    const merged = [];
    
    // Create a map of active students by email
    const studentsByEmail = {};
    activeStudents.forEach(student => {
        if (student.studentEmail) {
            studentsByEmail[student.studentEmail.toLowerCase()] = student;
        }
    });
    
    // Process Zoom participants
    zoomParticipants.forEach(participant => {
        const email = participant.email ? participant.email.toLowerCase() : '';
        const student = studentsByEmail[email] || {};
        
        merged.push({
            id: participant.id,
            name: participant.name || student.studentName || 'Unknown Student',
            email: participant.email || student.studentEmail || '',
            videoStatus: participant.videoStatus || false,
            audioStatus: participant.audioStatus || false,
            duration: participant.duration || '00:00:00',
            joinTime: participant.joinTime,
            hasZoomFeed: true,
            studentId: student.studentId || null,
            submissionId: student._id || null,
            violationCount: student.violationCount || 0,
            lastActivity: student.lastActivity || new Date()
        });
    });
    
    // Add active students not in Zoom
    activeStudents.forEach(student => {
        const email = student.studentEmail ? student.studentEmail.toLowerCase() : '';
        const hasZoom = merged.some(m => m.email === email);
        
        if (!hasZoom) {
            merged.push({
                id: student._id,
                name: student.studentName || 'Unknown Student',
                email: student.studentEmail || '',
                videoStatus: false,
                audioStatus: false,
                duration: calculateExamDuration(student.createdAt),
                hasZoomFeed: false,
                studentId: student.studentId,
                submissionId: student._id,
                violationCount: student.violationCount || 0,
                lastActivity: student.lastActivity || student.createdAt
            });
        }
    });
    
    return merged;
}

// NEW: Calculate exam duration for non-Zoom students
function calculateExamDuration(startTime) {
    if (!startTime) return '00:00:00';
    
    const start = new Date(startTime);
    const now = new Date();
    const duration = Math.floor((now - start) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// UPDATED: Enhanced student list display with video feeds
function updateStudentsList(students) {
    const container = document.getElementById('studentActivityList');
    
    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-user-slash fa-2x text-muted"></i>
                <p class="mt-2 text-muted">No students currently active</p>
            </div>
        `;
        return;
    }

    container.innerHTML = students.map(student => {
        const warningClass = student.violationCount >= 2 ? 'danger' : student.violationCount > 0 ? 'warning' : '';
        const videoIcon = student.hasZoomFeed ? (student.videoStatus ? 'video' : 'video-slash') : 'video-slash';
        const videoColor = student.hasZoomFeed ? (student.videoStatus ? 'success' : 'danger') : 'muted';
        const audioIcon = student.hasZoomFeed ? (student.audioStatus ? 'microphone' : 'microphone-slash') : 'microphone-slash';
        const audioColor = student.hasZoomFeed ? (student.audioStatus ? 'success' : 'warning') : 'muted';
        
        return `
            <div class="student-card ${warningClass}" data-student-id="${student.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="student-info">
                        <h6 class="mb-1">${student.name}</h6>
                        <small class="text-muted">${student.email}</small>
                        ${student.hasZoomFeed ? 
                            '<span class="badge badge-success badge-sm">Video Feed</span>' : 
                            '<span class="badge badge-secondary badge-sm">Activity Only</span>'
                        }
                    </div>
                    <div class="student-status text-end">
                        <div class="mb-1">
                            <i class="fas fa-${videoIcon} text-${videoColor}"></i>
                            <i class="fas fa-${audioIcon} text-${audioColor}"></i>
                        </div>
                        ${student.violationCount > 0 ? 
                            `<small class="text-danger">${student.violationCount} violations</small>` : 
                            '<small class="text-success">No violations</small>'
                        }
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">Duration: ${student.duration}</small>
                    ${student.hasZoomFeed ? 
                        '<button class="btn btn-sm btn-outline-primary" onclick="focusOnStudent(\'' + student.id + '\')">Focus</button>' : 
                        '<button class="btn btn-sm btn-outline-info" onclick="viewStudentDetails(\'' + student.submissionId + '\')">Details</button>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

// NEW: Focus on specific student in Zoom
function focusOnStudent(studentId) {
    if (window.zoomAdmin && window.zoomAdmin.focusOnParticipant) {
        window.zoomAdmin.focusOnParticipant(studentId);
        showTemporaryMessage('🎥 Focused on student', 'info', 2000);
    } else {
        showTemporaryMessage('⚠️ Focus feature not available', 'warning', 2000);
    }
}

// NEW: View student details for non-Zoom students
async function viewStudentDetails(submissionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/results/${submissionId}/details`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showStudentDetailsModal(result.data);
            }
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
        showTemporaryMessage('❌ Could not load student details', 'error', 3000);
    }
}

// NEW: Show student details in modal
function showStudentDetailsModal(studentData) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Student Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <strong>Name:</strong> ${studentData.studentName || 'N/A'}
                        </div>
                        <div class="col-md-6">
                            <strong>Email:</strong> ${studentData.studentEmail || 'N/A'}
                        </div>
                        <div class="col-md-6">
                            <strong>Started:</strong> ${new Date(studentData.createdAt).toLocaleString()}
                        </div>
                        <div class="col-md-6">
                            <strong>Violations:</strong> ${studentData.violationCount || 0}
                        </div>
                        <div class="col-12 mt-2">
                            <strong>Progress:</strong> ${studentData.answeredQuestions || 0}/${studentData.totalQuestions || 0} questions
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// UPDATED: Enhanced violations monitoring
async function updateViolationsLog() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/violations/exam/${currentSelectedExam._id}/recent`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const violations = result.data || [];
            
            const container = document.getElementById('violationsList');
            
            if (violations.length === 0) {
                container.innerHTML = '<p class="text-muted small">No violations recorded</p>';
            } else {
                container.innerHTML = violations.slice(0, 10).map(violation => `
                    <div class="violation-alert alert alert-${violation.severity || 'warning'} alert-sm">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${violation.studentName || 'Unknown Student'}</strong>
                                <small class="d-block">${violation.violationType}</small>
                            </div>
                            <div class="text-end">
                                <small class="text-muted">${new Date(violation.timestamp).toLocaleTimeString()}</small>
                                ${violation.isAutoSubmit ? '<span class="badge badge-danger">Auto-Submitted</span>' : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            
            // Update total violations count
            const totalViolations = violations.length;
            document.getElementById('totalViolations').textContent = totalViolations;
        }
        
    } catch (error) {
        console.error('Error updating violations:', error);
    }
}

// UPDATED: Enhanced exam duration tracking
function updateExamDuration() {
    if (!monitoringActive || !meetingStartTime) return;
    
    const elapsed = Date.now() - meetingStartTime;
    const duration = Math.floor(elapsed / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    const durationString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const durationElement = document.getElementById('examDuration');
    if (durationElement) {
        durationElement.textContent = durationString;
    }
}

// UPDATED: Pause monitoring with Zoom handling
function pauseMonitoring() {
    monitoringActive = false;
    
    // Clear intervals
    if (studentActivityInterval) {
        clearInterval(studentActivityInterval);
        studentActivityInterval = null;
    }
    
    if (examDurationInterval) {
        clearInterval(examDurationInterval);
        examDurationInterval = null;
    }
    
    // Update UI
    document.getElementById('pauseMonitoringBtn').style.display = 'none';
    document.getElementById('startMonitoringBtn').style.display = 'inline-block';
    document.getElementById('startMonitoringBtn').innerHTML = '<i class="fas fa-play"></i> Resume Monitoring';
    
    console.log('🔄 Monitoring paused');
    showTemporaryMessage('⏸️ Monitoring paused', 'info', 2000);
}

// UPDATED: Stop monitoring with complete cleanup
async function stopMonitoring() {
    if (!confirm('Are you sure you want to stop monitoring? This will end the proctoring session for all students.')) {
        return;
    }

    try {
        showLoading('Stopping monitoring session...');
        
        // Stop intervals
        if (studentActivityInterval) {
            clearInterval(studentActivityInterval);
            studentActivityInterval = null;
        }
        
        if (examDurationInterval) {
            clearInterval(examDurationInterval);
            examDurationInterval = null;
        }
        
        // End Zoom meeting if active
        if (window.zoomAdmin && monitoringActive && currentMeetingConfig) {
            try {
                await window.zoomAdmin.endMeeting();
                console.log('✅ Zoom meeting ended successfully');
                
                // Also end meeting on backend
                if (currentSelectedExam) {
                    await endMeetingOnBackend(currentSelectedExam._id);
                }
            } catch (zoomError) {
                console.error('Error ending Zoom meeting:', zoomError);
            }
        }
        
        // Reset state
        monitoringActive = false;
        meetingStartTime = null;
        currentMeetingConfig = null;
        
        // Reset UI
        document.getElementById('startMonitoringBtn').style.display = 'inline-block';
        document.getElementById('startMonitoringBtn').innerHTML = '<i class="fas fa-play"></i> Start Monitoring';
        document.getElementById('pauseMonitoringBtn').style.display = 'none';
        document.getElementById('stopMonitoringBtn').style.display = 'none';
        document.getElementById('noMeetingMessage').style.display = 'block';
        document.getElementById('zoom-proctor-meeting-container').style.display = 'none';
        
        // Clear student list
        document.getElementById('studentActivityList').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-user-slash fa-2x text-muted"></i>
                <p class="mt-2 text-muted">Monitoring stopped</p>
            </div>
        `;
        
        // Reset counters
        document.getElementById('connectedStudents').textContent = '0';
        document.getElementById('totalViolations').textContent = '0';
        document.getElementById('examDuration').textContent = '00:00:00';
        
        hideLoading();
        console.log('✅ Monitoring stopped successfully');
        showTemporaryMessage('🔴 Monitoring session ended', 'success', 3000);
        
    } catch (error) {
        console.error('Error stopping monitoring:', error);
        showError('Error stopping monitoring: ' + error.message);
        hideLoading();
    }
}

// NEW: End meeting on backend
async function endMeetingOnBackend(examId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/zoom/exam/${examId}/end-meeting`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Meeting ended on backend');
        } else {
            console.warn('⚠️ Backend meeting end failed:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Error ending meeting on backend:', error);
    }
}

// NEW: Enhanced temporary message system
function showTemporaryMessage(message, type = 'info', duration = 3000) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.temp-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'temp-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#212529' : 'white'};
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 350px;
        font-size: 14px;
        border: 1px solid rgba(255,255,255,0.2);
        animation: slideInRight 0.3s ease;
    `;
    
    // Add animation CSS if not already present
    if (!document.querySelector('#tempMessageStyles')) {
        const styles = document.createElement('style');
        styles.id = 'tempMessageStyles';
        styles.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }
    }, duration);
}

// NEW: Bulk actions for students
function muteAllStudents() {
    if (window.zoomAdmin && window.zoomAdmin.muteAllParticipants) {
        window.zoomAdmin.muteAllParticipants();
        showTemporaryMessage('🔇 All students muted', 'success', 2000);
    } else {
        showTemporaryMessage('⚠️ Mute feature not available', 'warning', 2000);
    }
}

function unmuteAllStudents() {
    if (window.zoomAdmin && window.zoomAdmin.unmuteAllParticipants) {
        window.zoomAdmin.unmuteAllParticipants();
        showTemporaryMessage('🔊 All students unmuted', 'success', 2000);
    } else {
        showTemporaryMessage('⚠️ Unmute feature not available', 'warning', 2000);
    }
}

function enableAllVideos() {
    if (window.zoomAdmin && window.zoomAdmin.enableAllVideos) {
        window.zoomAdmin.enableAllVideos();
        showTemporaryMessage('📹 All videos enabled', 'success', 2000);
    } else {
        showTemporaryMessage('⚠️ Video control not available', 'warning', 2000);
    }
}

// NEW: Export monitoring data
async function exportMonitoringData() {
    if (!currentSelectedExam) {
        showError('No exam selected');
        return;
    }
    
    try {
        showLoading('Generating monitoring report...');
        
        const token = localStorage.getItem('token');
        
        // Get comprehensive monitoring data
        const [studentsResponse, violationsResponse] = await Promise.all([
            fetch(`/api/results/exam/${currentSelectedExam._id}/active-students`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`/api/violations/exam/${currentSelectedExam._id}/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        const studentsData = await studentsResponse.json();
        const violationsData = await violationsResponse.json();
        
        const reportData = {
            exam: {
                title: currentSelectedExam.title,
                id: currentSelectedExam._id,
                category: currentSelectedExam.category,
                duration: currentSelectedExam.duration
            },
            monitoring: {
                startTime: meetingStartTime ? new Date(meetingStartTime) : null,
                duration: meetingStartTime ? Date.now() - meetingStartTime : 0,
                hasVideoMonitoring: !!currentMeetingConfig
            },
            students: studentsData.success ? studentsData.data : [],
            violations: violationsData.success ? violationsData.data : [],
            generatedAt: new Date()
        };
        
        // Create and download CSV
        const csv = generateMonitoringCSV(reportData);
        downloadCSV(csv, `monitoring-report-${currentSelectedExam.title}-${new Date().toISOString().split('T')[0]}.csv`);
        
        hideLoading();
        showTemporaryMessage('📊 Monitoring report downloaded', 'success', 3000);
        
    } catch (error) {
        console.error('Error exporting monitoring data:', error);
        showError('Failed to export monitoring data: ' + error.message);
        hideLoading();
    }
}

// NEW: Generate CSV for monitoring data
function generateMonitoringCSV(data) {
    const rows = [
        ['Exam Monitoring Report'],
        ['Generated:', data.generatedAt.toLocaleString()],
        ['Exam:', data.exam.title],
        ['Category:', data.exam.category],
        ['Duration:', data.exam.duration + ' minutes'],
        ['Video Monitoring:', data.monitoring.hasVideoMonitoring ? 'Yes' : 'No'],
        [''],
        ['Students Activity'],
        ['Name', 'Email', 'Started', 'Duration', 'Violations', 'Status'],
        ...data.students.map(student => [
            student.studentName || 'N/A',
            student.studentEmail || 'N/A',
            new Date(student.createdAt).toLocaleString(),
            student.duration || 'N/A',
            student.violationCount || 0,
            student.submittedAt ? 'Submitted' : 'Active'
        ]),
        [''],
        ['Violations Log'],
        ['Student', 'Type', 'Time', 'Details'],
        ...data.violations.map(violation => [
            violation.studentName || 'N/A',
            violation.violationType,
            new Date(violation.timestamp).toLocaleString(),
            violation.details || ''
        ])
    ];
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// NEW: Download CSV utility
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// UPDATED: Enhanced utility functions
function showLoading(message = 'Loading...') {
    document.getElementById('loadingMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
    modal.show();
}

function hideLoading() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
    if (modal) modal.hide();
}

function showError(message, isRetryable = true) {
    document.getElementById('errorMessage').textContent = message;
    
    const retryBtn = document.querySelector('#errorModal .btn-primary');
    if (retryBtn) {
        retryBtn.style.display = isRetryable ? 'inline-block' : 'none';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
    hideLoading();
}

function retryOperation() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('errorModal'));
    if (modal) modal.hide();
    
    console.log('Retrying operation...');
    loadActiveExams();
}

// NEW: Get student info helper functions
function getStudentName() {
    return localStorage.getItem('studentName') || 
           localStorage.getItem('userName') || 
           'Student';
}

function getStudentEmail() {
    return localStorage.getItem('studentEmail') || 
           localStorage.getItem('userEmail') || 
           'student@example.com';
}

// NEW: Emergency actions
function emergencyStopAllExams() {
    if (!confirm('⚠️ EMERGENCY STOP\n\nThis will immediately end ALL active proctoring sessions and submit all active exams.\n\nThis action cannot be undone. Proceed?')) {
        return;
    }
    
    if (!confirm('Are you absolutely sure? This will affect ALL students currently taking exams.')) {
        return;
    }
    
    // Implementation would call backend to stop all active exams
    showTemporaryMessage('🚨 Emergency stop initiated - contacting support', 'error', 5000);
}

// NEW: Real-time notifications (if WebSocket available)
function initializeRealTimeNotifications() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('violation_alert', (data) => {
            if (data.examId === currentSelectedExam?._id) {
                showTemporaryMessage(`🚨 Violation: ${data.violationType} - ${data.studentName}`, 'error', 5000);
                updateViolationsLog(); // Refresh violations
            }
        });
        
        socket.on('student_disconnected', (data) => {
            if (data.examId === currentSelectedExam?._id) {
                showTemporaryMessage(`⚠️ Student disconnected: ${data.studentName}`, 'warning', 4000);
                updateStudentActivity(); // Refresh student list
            }
        });
        
        socket.on('exam_auto_submitted', (data) => {
            if (data.examId === currentSelectedExam?._id) {
                showTemporaryMessage(`📝 Auto-submitted: ${data.studentName} (${data.reason})`, 'info', 5000);
                updateStudentActivity(); // Refresh student list
            }
        });
    }
}

// Initialize real-time notifications when monitoring starts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize notifications after a delay to ensure socket.io loads
    setTimeout(initializeRealTimeNotifications, 2000);
});

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login.html';
}            