// Enhanced student.js with proctoring features
document.addEventListener('DOMContentLoaded', loadAvailableExams);

// Proctoring variables
let violations = 0;
let maxViolations = 3;
let webcamStream = null;
let isExamActive = false;
let examId = null;

async function loadAvailableExams() {
    const token = localStorage.getItem('token');
    const examsContainer = document.getElementById('examsList');
    examsContainer.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-white" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2 mb-0">Loading exams...</p></div>';

    // Debug: Check if token exists
    if (!token) {
        examsContainer.innerHTML = '<div class="alert alert-danger mb-0" role="alert"><i class="fas fa-exclamation-circle me-2"></i>No authentication token found.</div>';
        return;
    }

    try {
        console.log('Fetching exams from /api/exams');
        const response = await fetch('/api/exams', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            examsContainer.innerHTML = `<div class="alert alert-warning mb-0" role="alert"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load exams. Status: ${response.status}</div>`;
            return;
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Check different possible response formats
        let examsArray = null;
        
        if (data.success && data.data && Array.isArray(data.data)) {
            examsArray = data.data;
        } else if (Array.isArray(data)) {
            examsArray = data;
        } else if (data.exams && Array.isArray(data.exams)) {
            examsArray = data.exams;
        } else {
            console.log('Unexpected data format:', data);
        }

        if (!examsArray || examsArray.length === 0) {
            examsContainer.innerHTML = '<div class="alert alert-info mb-0" role="alert"><i class="fas fa-info-circle me-2"></i>No exams available at the moment.</div>';
            return;
        }

        // Generate exam links with proctoring start button
        examsContainer.innerHTML = examsArray.map(exam => `
            <div class="exam-item">
                <div class="d-flex flex-column">
                    <h6 class="mb-1">${exam.title || exam.name || 'Untitled Exam'}</h6>
                    ${exam.description ? `<small class="text-white-50 mb-2">${exam.description}</small>` : ''}
                    <button class="btn btn-light btn-sm" onclick="startProctoredExam('${exam._id || exam.id}')">
                        <i class="fas fa-play me-1"></i>Start Proctored Exam
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Fetch error:', error);
        examsContainer.innerHTML = `<div class="alert alert-danger mb-0" role="alert"><i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}</div>`;
    }
}

// Enhanced startExam function with full proctoring
async function startProctoredExam(examIdParam) {
    examId = examIdParam;
    isExamActive = true;
    violations = 0;

    try {
        // Show proctoring consent dialog
        const consent = await showProctoringConsent();
        if (!consent) {
            return;
        }

        // Initialize proctoring features
        await initializeProctoring();
        
        // Navigate to exam page
        window.location.href = `/student-exam.html?examId=${examId}`;
        
    } catch (error) {
        console.error('Error starting proctored exam:', error);
        alert('Failed to initialize proctoring features. Please check your camera and try again.');
    }
}

// Show proctoring consent dialog
function showProctoringConsent() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Proctored Exam Consent</h5>
                    </div>
                    <div class="modal-body">
                        <h6>This exam includes the following proctoring features:</h6>
                        <ul>
                            <li><strong>Webcam Monitoring:</strong> Your camera will be activated to monitor your exam session</li>
                            <li><strong>Fullscreen Mode:</strong> The exam will run in fullscreen mode</li>
                            <li><strong>Tab Switching Detection:</strong> Switching to other tabs will be detected</li>
                            <li><strong>Window Focus Monitoring:</strong> Leaving the exam window will be tracked</li>
                            <li><strong>Violation Tracking:</strong> Maximum ${maxViolations} violations allowed before auto-submission</li>
                        </ul>
                        <div class="alert alert-warning">
                            <strong>Important:</strong> Any violation of exam rules may result in automatic submission of your exam.
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="proctoringConsent">
                            <label class="form-check-label" for="proctoringConsent">
                                I understand and agree to the proctoring terms and conditions
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeConsentModal(false)">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="closeConsentModal(true)">Start Proctored Exam</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.closeConsentModal = (accepted) => {
            const checkbox = document.getElementById('proctoringConsent');
            if (accepted && !checkbox.checked) {
                alert('Please accept the proctoring terms to continue.');
                return;
            }
            document.body.removeChild(modal);
            resolve(accepted && checkbox.checked);
        };
    });
}

// Initialize proctoring features
async function initializeProctoring() {
    try {
        // 1. Enter fullscreen mode
        await enterFullscreen();
        
        // 2. Request webcam access
        await requestWebcamAccess();
        
        // 3. Setup proctoring event listeners
        setupProctoringListeners();
        
        console.log('Proctoring initialized successfully');
        
    } catch (error) {
        console.error('Proctoring initialization failed:', error);
        throw error;
    }
}

// Enter fullscreen mode with cross-browser support
function enterFullscreen() {
    return new Promise((resolve, reject) => {
        const elem = document.documentElement;
        
        const requestFullscreen = elem.requestFullscreen || 
                                 elem.webkitRequestFullscreen || 
                                 elem.msRequestFullscreen || 
                                 elem.mozRequestFullScreen;
        
        if (requestFullscreen) {
            requestFullscreen.call(elem)
                .then(() => {
                    console.log('Entered fullscreen mode');
                    resolve();
                })
                .catch(reject);
        } else {
            console.warn('Fullscreen API not supported');
            resolve(); // Continue without fullscreen
        }
    });
}

// Request webcam access
async function requestWebcamAccess() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
        });
        
        // Create webcam element if it doesn't exist
        let webcamElement = document.getElementById('webcam');
        if (!webcamElement) {
            webcamElement = document.createElement('video');
            webcamElement.id = 'webcam';
            webcamElement.style.position = 'fixed';
            webcamElement.style.top = '10px';
            webcamElement.style.right = '10px';
            webcamElement.style.width = '200px';
            webcamElement.style.height = '150px';
            webcamElement.style.border = '2px solid #007bff';
            webcamElement.style.borderRadius = '8px';
            webcamElement.style.zIndex = '9999';
            webcamElement.autoplay = true;
            webcamElement.muted = true;
            document.body.appendChild(webcamElement);
        }
        
        webcamElement.srcObject = webcamStream;
        console.log('Webcam access granted');
        
    } catch (error) {
        console.error('Webcam access denied:', error);
        throw new Error('Webcam access is required for proctored exams');
    }
}

// Setup proctoring event listeners
function setupProctoringListeners() {
    // Fullscreen exit detection
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Tab switching detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Window blur detection (Alt+Tab, clicking outside)
    window.addEventListener('blur', handleWindowBlur);
    
    // Right-click and keyboard shortcuts blocking
    document.addEventListener('contextmenu', preventRightClick);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    
    // Mouse leave detection
    document.addEventListener('mouseleave', handleMouseLeave);
    
    console.log('Proctoring event listeners setup complete');
}

// Handle fullscreen changes
function handleFullscreenChange() {
    if (!isExamActive) return;
    
    const isFullscreen = document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.mozFullScreenElement || 
                        document.msFullscreenElement;
    
    if (!isFullscreen) {
        recordViolation('Exited fullscreen mode');
        
        // Try to re-enter fullscreen
        setTimeout(() => {
            if (isExamActive) {
                enterFullscreen().catch(console.error);
            }
        }, 1000);
    }
}

// Handle tab switching/visibility changes
function handleVisibilityChange() {
    if (!isExamActive) return;
    
    if (document.hidden) {
        recordViolation('Tab switching detected');
    }
}

// Handle window blur (Alt+Tab, clicking outside)
function handleWindowBlur() {
    if (!isExamActive) return;
    
    recordViolation('Window focus lost');
}

// Handle mouse leaving the document
function handleMouseLeave() {
    if (!isExamActive) return;
    
    recordViolation('Mouse left the exam area');
}

// Prevent right-click context menu
function preventRightClick(e) {
    if (!isExamActive) return;
    
    e.preventDefault();
    recordViolation('Right-click attempted');
    return false;
}

// Prevent keyboard shortcuts
function preventKeyboardShortcuts(e) {
    if (!isExamActive) return;
    
    // Prevent common shortcuts
    const blockedKeys = [
        'F12', // Developer tools
        'F5',  // Refresh
        'F11', // Fullscreen toggle
    ];
    
    const blockedCombos = [
        { ctrl: true, key: 'c' }, // Copy
        { ctrl: true, key: 'v' }, // Paste
        { ctrl: true, key: 'x' }, // Cut
        { ctrl: true, key: 'a' }, // Select all
        { ctrl: true, key: 'r' }, // Refresh
        { ctrl: true, key: 'u' }, // View source
        { ctrl: true, key: 'i' }, // Developer tools
        { ctrl: true, key: 's' }, // Save
        { ctrl: true, key: 'p' }, // Print
        { ctrl: true, shift: true, key: 'i' }, // Developer tools
        { ctrl: true, shift: true, key: 'j' }, // Console
        { ctrl: true, shift: true, key: 'c' }, // Inspector
        { alt: true, key: 'Tab' }, // Alt+Tab
    ];
    
    // Check blocked single keys
    if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        recordViolation(`Blocked key pressed: ${e.key}`);
        return false;
    }
    
    // Check blocked combinations
    for (let combo of blockedCombos) {
        if (
            (combo.ctrl && e.ctrlKey) &&
            (combo.shift ? e.shiftKey : true) &&
            (combo.alt ? e.altKey : true) &&
            e.key.toLowerCase() === combo.key.toLowerCase()
        ) {
            e.preventDefault();
            recordViolation(`Blocked shortcut: ${combo.ctrl ? 'Ctrl+' : ''}${combo.shift ? 'Shift+' : ''}${combo.alt ? 'Alt+' : ''}${combo.key}`);
            return false;
        }
    }
}

// Record violation and handle consequences
function recordViolation(violationType) {
    violations++;
    console.warn(`Violation ${violations}/${maxViolations}: ${violationType}`);
    
    // Show warning to student
    alert(`⚠️ Proctoring Violation Detected!\n\nViolation: ${violationType}\nCount: ${violations}/${maxViolations}\n\n${violations >= maxViolations ? 'Maximum violations reached. Exam will be submitted automatically.' : 'Please follow exam rules to avoid automatic submission.'}`);
    
    // Log violation (you can send this to your backend)
    logViolation(violationType);
    
    // Auto-submit if max violations reached
    if (violations >= maxViolations) {
        autoSubmitDueToViolations();
    }
}

// Log violation to backend
async function logViolation(violationType) {
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/violations/log', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                examId: examId,
                violationType: violationType,
                timestamp: new Date().toISOString(),
                violationCount: violations
            })
        });
    } catch (error) {
        console.error('Failed to log violation:', error);
    }
}

// Auto-submit exam due to violations
async function autoSubmitDueToViolations() {
    isExamActive = false;
    
    try {
        // Clean up proctoring features
        cleanupProctoring();
        
        // Call the submitExam function from studentExam.js
        if (typeof submitExam === 'function') {
            await submitExam(true); // true indicates auto-submit
        } else {
            // Fallback: redirect to exam page and trigger submit
            alert('Too many violations detected. Redirecting to submit exam...');
            window.location.href = `/student-exam.html?examId=${examId}&autoSubmit=true`;
        }
        
    } catch (error) {
        console.error('Auto-submit failed:', error);
        alert('Exam submission failed due to violations. Please contact support.');
    }
}

// Clean up proctoring features
function cleanupProctoring() {
    // Stop webcam
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    
    // Remove webcam element
    const webcamElement = document.getElementById('webcam');
    if (webcamElement) {
        webcamElement.remove();
    }
    
    // Remove event listeners
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('contextmenu', preventRightClick);
    document.removeEventListener('keydown', preventKeyboardShortcuts);
    document.removeEventListener('mouseleave', handleMouseLeave);
    
    // Exit fullscreen
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
    
    console.log('Proctoring cleanup complete');
}

// Original functions preserved
window.addEventListener('load', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'student') {
        window.location.href = '/login';
        return;
    }
    
    // Display user name
    document.getElementById('userName').textContent = user.fullName || 'Student';
    
    // Load user profile
    loadProfile();
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
            document.getElementById('userName').textContent = user.fullName;
        } else {
            console.error('Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function viewExams() {
    // Scroll to exams section
    document.getElementById('examsList').scrollIntoView({ behavior: 'smooth' });
}

function viewResults() {
    alert('Results module will be implemented in the next phase');
}

function viewProfile() {
    alert('Profile module will be implemented in the next phase');
}

function logout() {
    // Clean up proctoring if active
    if (isExamActive) {
        cleanupProctoring();
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Handle page unload
window.addEventListener('beforeunload', function(e) {
    if (isExamActive) {
        cleanupProctoring();
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave during the proctored exam?';
    }
});

// Export functions for use in other files
window.examProctoring = {
    startProctoredExam,
    cleanupProctoring,
    recordViolation,
    violations,
    maxViolations,
    isExamActive
};