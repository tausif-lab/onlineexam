// Add these variables at the top of your student.js file
let faceApiLoaded = false;
let currentStream = null;
let currentExamId = null;

// Add this function to load Face-API models
async function loadFaceApiModels() {
    if (faceApiLoaded) return true;
    if (typeof faceapi === 'undefined') {
        console.error('Face-API library not loaded');
        return false;
    }
    
    try {
       /* const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);*/
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/';

await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
]);
        
        faceApiLoaded = true;
        console.log('Face-API models loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load Face-API models:', error);
        return false;
    }
}
// Get URL parameters
        function getURLParameters() {
            const urlParams = new URLSearchParams(window.location.search);
            return {
                collegeId: urlParams.get('collegeId'),
                user1Id: urlParams.get('user1Id'),
                branch: urlParams.get('branch')
            };
        }

        // Update dashboard content based on URL parameters
        function updateDashboardContent() {
            const params = getURLParameters();
            
            if (params.collegeId || params.user1Id || params.branch) {
                let subtitle = 'CSPDCL Vocational Training Online Exam System';
                
                if (params.collegeId) {
                    subtitle += ` - College: ${params.collegeId}`;
                }
                if (params.branch) {
                    subtitle += ` - Branch: ${params.branch}`;
                }
                if (params.user1Id) {
                    subtitle += ` - ID: ${params.user1Id}`;
                }
                
                document.getElementById('dashboardSubtitle').textContent = subtitle;
            }
        }

        window.addEventListener('load', function() {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (!token || user.role !== 'student') {
                window.location.href = '/login';
                return;
            }
            
            // Display user name
            document.getElementById('userName').textContent = user.fullName || 'Student';
            
            // Update dashboard content based on URL parameters
            updateDashboardContent();
            
            // Load user profile
            loadProfile();
            
            // Load recent activity
            loadRecentActivity();
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

        async function loadRecentActivity() {
            const recentActivityContainer = document.getElementById('recentActivity');
            
            // Simulate loading recent activity
            setTimeout(() => {
                recentActivityContainer.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>No recent activity found</span>
                        <small class="text-muted">Today</small>
                    </div>
                `;
            }, 1000);
        }
        
        /*function startExamWithId() {
            const examId = document.getElementById('examIdInput').value.trim();
            
            if (!examId) {
                alert('Please enter an exam ID before starting the exam.');
                return;
            }
            
            // Validate exam ID format (you can customize this validation)
            if (examId.length < 3) {
                alert('Please enter a valid exam ID.');
                return;
            }
            
            // Start proctoring features
            startExam();
            
            // Redirect to exam page with the entered exam ID
            setTimeout(() => {
                window.location.href = `/student-exam.html?examId=${examId}`;
            }, 1000);
        }*/
       async function startExamWithId() {
    const examId = document.getElementById('examIdInput').value.trim();
    
    if (!examId) {
        alert('Please enter an exam ID before starting the exam.');
        return;
    }
    
    // Validate exam ID format
    if (examId.length < 3) {
        alert('Please enter a valid exam ID.');
        return;
    }
    
    // Store exam ID for later use
    currentExamId = examId;
    
    // Get current user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Check if user is university type and has face embedding
    if (user.userType === 'university' && user.role === 'student') {
        // Require face authentication for university students
        await initiateFaceAuthentication();
    } else {
        // For coaching students, proceed directly to exam
        proceedToExam();
    }
}
        
       function viewResults() {
    alert('MCQ Results module will be implemented in the next phase');
}
// New function to initiate face authentication
async function initiateFaceAuthentication() {
    // Load Face-API models if not already loaded
    const modelsLoaded = await loadFaceApiModels();
    if (!modelsLoaded) {
        alert('Failed to load face recognition models. Please refresh and try again.');
        return;
    }
    
    // Show face authentication modal
    const modal = new bootstrap.Modal(document.getElementById('faceAuthModal'));
    modal.show();
    
    // Reset modal to initial state
    resetFaceAuthModal();
    
    // Initialize camera
    await initializeFaceAuthCamera();
}

// Function to reset face auth modal
function resetFaceAuthModal() {
    document.getElementById('faceAuthStep1').style.display = 'block';
    document.getElementById('faceAuthStep2').style.display = 'none';
    document.getElementById('faceAuthSuccess').style.display = 'none';
    document.getElementById('faceAuthFailure').style.display = 'none';
    document.getElementById('faceAuthFooter').style.display = 'block';
    document.getElementById('startAuthBtn').disabled = true;
    document.getElementById('authStatus').textContent = 'Initializing camera...';
    document.getElementById('authProgress').style.display = 'none';
}

// Function to initialize camera for face auth
async function initializeFaceAuthCamera() {
    try {
        // Stop any existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        const video = document.getElementById('faceAuthVideo');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 400, 
                height: 300,
                facingMode: 'user'
            } 
        });
        
        video.srcObject = stream;
        currentStream = stream;
        
        // Wait for video to load
        video.addEventListener('loadedmetadata', () => {
            document.getElementById('authStatus').textContent = 'Camera ready. Click "Start Authentication" when ready.';
            document.getElementById('startAuthBtn').disabled = false;
        });
        
    } catch (error) {
        console.error('Camera initialization failed:', error);
        document.getElementById('authStatus').textContent = 'Camera access failed. Please allow camera permission.';
    }
}

// Function to start face authentication process
async function startFaceAuthentication() {
    const video = document.getElementById('faceAuthVideo');
    const canvas = document.getElementById('faceAuthCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Update UI
    document.getElementById('authStatus').textContent = 'Detecting face...';
    document.getElementById('authProgress').style.display = 'block';
    document.getElementById('startAuthBtn').disabled = true;
    
    try {
        // Capture current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Detect face and get descriptor
        const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        if (detections.length === 0) {
            throw new Error('No face detected. Please ensure your face is clearly visible.');
        }
        
        if (detections.length > 1) {
            throw new Error('Multiple faces detected. Please ensure only your face is visible.');
        }
        
        // Update progress
        document.querySelector('#authProgress .progress-bar').style.width = '50%';
        document.getElementById('authStatus').textContent = 'Face detected. Verifying identity...';
        
        // Switch to step 2
        document.getElementById('faceAuthStep1').style.display = 'none';
        document.getElementById('faceAuthStep2').style.display = 'block';
        document.getElementById('faceAuthFooter').style.display = 'none';
        
        // Get user's stored face embedding
        const currentFaceDescriptor = detections[0].descriptor;
        await verifyFaceWithServer(Array.from(currentFaceDescriptor));
        
    } catch (error) {
        console.error('Face authentication error:', error);
        showAuthFailure(error.message);
    }
}

// Function to verify face with server
async function verifyFaceWithServer(faceDescriptor) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/verify-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                faceDescriptor: faceDescriptor,
                examId: currentExamId
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.verified) {
            showAuthSuccess();
        } else {
            throw new Error(result.message || 'Face verification failed');
        }
        
    } catch (error) {
        console.error('Face verification error:', error);
        showAuthFailure('Verification failed. Please try again.');
    }
}

// Function to show authentication success
function showAuthSuccess() {
    document.getElementById('faceAuthStep2').style.display = 'none';
    document.getElementById('faceAuthSuccess').style.display = 'block';
    
    // Auto-redirect after 2 seconds
    setTimeout(() => {
        closeFaceAuthModal();
        proceedToExam();
    }, 2000);
}

// Function to show authentication failure
function showAuthFailure(message) {
    document.getElementById('faceAuthStep1').style.display = 'none';
    document.getElementById('faceAuthStep2').style.display = 'none';
    document.getElementById('faceAuthSuccess').style.display = 'none';
    document.getElementById('faceAuthFailure').style.display = 'block';
    document.getElementById('authErrorMessage').textContent = message;
    document.getElementById('faceAuthFooter').style.display = 'none';
}

// Function to retry face authentication
function retryFaceAuth() {
    resetFaceAuthModal();
    initializeFaceAuthCamera();
}

// Function to cancel face authentication
function cancelFaceAuth() {
    closeFaceAuthModal();
    currentExamId = null;
}

// Function to close face auth modal and cleanup
function closeFaceAuthModal() {
    // Stop camera stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('faceAuthModal'));
    if (modal) {
        modal.hide();
    }
}

// Function to proceed to exam (called after successful auth or for coaching students)
function proceedToExam() {
    if (!currentExamId) return;
    
    // Start proctoring features
    startExam();
    
    // Redirect to exam page
    setTimeout(() => {
        window.location.href = `/student-exam.html?examId=${currentExamId}`;
    }, 1000);
}




function showDescriptiveResultForm() {
    const modal = new bootstrap.Modal(document.getElementById('descriptiveResultModal'));
    modal.show();
}

function viewDescriptiveResults() {
    const examId = document.getElementById('descriptiveExamId').value.trim();
    
    if (!examId) {
        alert('Please enter an exam ID');
        return;
    }
    
    if (!isValidObjectId(examId)) {
        alert('Invalid exam ID format');
        return;
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('descriptiveResultModal'));
    modal.hide();
    
    // Redirect to descriptive results page
    window.location.href = `/dis-result.html?examId=${examId}`;
}

function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}
        
        function viewProfile() {
            alert('Profile module will be implemented in the next phase');
        }
        
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        
        function startExam() {
            // Fullscreen
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err);
                });
            }

            // Webcam
            navigator.mediaDevices.getUserMedia({ video: true })
                .then((stream) => {
                    const webcamElement = document.getElementById("webcam");
                    if (webcamElement) {
                        webcamElement.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.log('Camera access failed:', err);
                    alert('Camera access is required for exam proctoring.');
                });

            // Tab switch detection
            let violations = 0;
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    violations++;
                    alert(`Tab switch detected (${violations}/3).`);
                    if (violations >= 3) {
                        alert("Too many violations. Exam will be submitted.");
                        submitExam();
                    }
                }
            };
            
            document.addEventListener("visibilitychange", handleVisibilityChange);

            // Fullscreen exit detection
            const handleFullscreenChange = () => {
                if (!document.fullscreenElement) {
                    alert("Fullscreen exited! Please return immediately.");
                }
            };
            
            document.addEventListener("fullscreenchange", handleFullscreenChange);
        }

        function submitExam() {
            // Implementation for submitting exam
            console.log('Exam submitted due to violations');
            // You can add your exam submission logic here
        }

        // Allow Enter key to start exam
        document.addEventListener('DOMContentLoaded', function() {
            const examIdInput = document.getElementById('examIdInput');
            if (examIdInput) {
                examIdInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        startExamWithId();
                    }
                });
            }
            document.addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                const modal = document.getElementById('descriptiveResultModal');
             if (modal && modal.classList.contains('show')) {
                const examIdInput = document.getElementById('descriptiveExamId');
                if (document.activeElement === examIdInput) {
                    viewDescriptiveResults();
                }
             }
           }
          });
        });
