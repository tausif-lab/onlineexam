/*
*/

//Enhanced studentExam.js with proctoring integration
// Global variables
let currentExam = null;
let questions = [];
let userAnswers = {};
let examTimer = null;
let timeRemaining = 0;
let examStartTime = null;
let isFullscreenTransition = false;
let eyeTrackingViolations = 0;
let maxEyeTrackingViolations = 5;
let isCurrentlyInViolation = false; // Prevent multiple violations for same event

// Proctoring variables
let violations = 0;
let maxViolations = 5;
let webcamStream = null;
let isExamActive = false;
let proctoringEnabled = true;
let openCvReady = false;
let eyeTracker = null;
let faceClassifier = null;
let eyeClassifier = null;
let videoElement = null;
let visionCanvas = null;
let visionContext = null;

// Replace existing eyeTrackingData and related variables with:
let faceMesh = null;
let mediapipeCamera = null;
let eyeTrackingData = {
    isLookingAway: false,
    lookAwayStartTime: null,
    totalLookAwayTime: 0,
    noFaceDetectedTime: 0,
    multipleFacesDetectedTime: 0,
    lastValidGaze: 'center',
    leftRatio: 0.5,
    rightRatio: 0.5,
    fpsCounter: 0,
    lastFpsTime: performance.now(),
     lastDirectionChange: 0 
};

const EYE_TRACKING_CONFIG = {
    LOOK_AWAY_THRESHOLD: 5000, // 3 seconds
    NO_FACE_THRESHOLD: 2000,   // 2 seconds
    PROCESSING_INTERVAL: 100,  // 100ms between processing
    CONFIDENCE_THRESHOLD: 0.7,
    GAZE_CENTER_RANGE: [0.35, 0.65] // Range for center gaze
};

// MediaPipe landmark indices
/*const IRIS_LANDMARKS = {
    LEFT_IRIS: [474, 475, 476, 477],
    RIGHT_IRIS: [469, 470, 471, 472],
    LEFT_EYE: [33, 133],
    RIGHT_EYE: [362, 263]
};*/
// MediaPipe landmark indices - UPDATED for iris detection
const IRIS_LANDMARKS = {
    LEFT_IRIS: [468, 469, 470, 471],    // Left iris landmarks
    RIGHT_IRIS: [473, 474, 475, 476],   // Right iris landmarks
    LEFT_EYE: [33, 133],
    RIGHT_EYE: [362, 263]
};


// Zoom integration variables
//let zoomMeetingConfig = null;
let zoomMeetingActive = false;
let zoomInitialized = false;
// Add these global variables at the top (add to existing globals)
let zoomMeetingJoined = false;
let zoomMeetingConfig = null;
let proctoringInitialized = false;
// 1. UPDATE: Add canvas-related variables to global scope (add these to your existing globals)
let canvasAnswers = {}; // Store canvas data for descriptive questions
let activeCanvas = null;
let canvasModal = null;


// Initialize exam when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing exam');
    setupEventListeners();
    initializeExam();
});


// Enhanced initialization with automatic Zoom meeting start
async function initializeExam() {
    showLoading();
    
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('examId');
    const autoSubmit = urlParams.get('autoSubmit');
    
    if (!examId) {
        showError('No exam ID provided in URL parameters');
        return;
    }
    
    // Handle auto-submit from violations
    if (autoSubmit === 'true') {
        await handleAutoSubmitFromViolations();
        return;
    }
    
    try {
        // Check if exam was already submitted
        const submissionStatus = await checkExamSubmissionStatus(examId);
        
        if (submissionStatus.isSubmitted) {
            showExamResults(submissionStatus.result);
            return;
        }
        
        // Load exam first to get exam details
        await loadExam(examId);
        
        // Initialize comprehensive proctoring with automatic Zoom meeting
        await initializeAllProctoring(examId);
        
    } catch (error) {
        console.error('Failed to initialize exam:', error);
        showError('Failed to load exam: ' + error.message);
    }
}


async function initializeAllProctoring(examId) {
    if (!proctoringEnabled) {
        console.log('Proctoring disabled, skipping initialization');
        return;
    }

    try {
        console.log('🔒 Starting comprehensive proctoring initialization...');

        // Step 1: Setup basic proctoring listeners FIRST
        setupProctoringListeners();
        proctoringInitialized = true;

        // Step 2: Request webcam access
        await ensureWebcamAccess();

        // Step 3: AUTO-START Zoom meeting when exam begins
        await autoStartZoomMeeting(examId);

        // Step 4: Enter fullscreen mode
        setTimeout(async () => {
            await enterFullscreen();
            isExamActive = true;
            console.log('✅ All proctoring features initialized successfully');
            showTemporaryMessage('🔒 Enhanced security monitoring is now active', 'success', 3000);

            // Step 5: Auto-join Zoom meeting after other features are ready
            if (zoomMeetingConfig && !zoomMeetingJoined) {
                await autoJoinZoomMeeting();
            }
        }, 1000);

        
    } catch (err) {
        console.error('❌ Error initializing proctoring:', err);
    }
}




function initializeEyeTracking() {
    if (!videoElement) {
        console.warn('Video element not ready for eye tracking');
        return;
    }

    try {
        // Initialize MediaPipe FaceMesh
        faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onFaceMeshResults);

        // Setup canvas for visualization
        setupVisualizationCanvas();

        // Start processing with MediaPipe Camera
        if (videoElement && videoElement.srcObject) {
            mediapipeCamera = new Camera(videoElement, {
                onFrame: async () => {
                    if (isExamActive && videoElement.srcObject) {
                        await faceMesh.send({ image: videoElement });
                    }
                },
                width: 640,
                height: 480
            });
            mediapipeCamera.start();
            
            console.log('✅ MediaPipe iris tracking initialized successfully');
            updateEyeTrackingStatus('Ready');
        }
        
    } catch (error) {
        console.error('Eye tracking initialization failed:', error);
        updateEyeTrackingStatus('Init Failed');
    }
}
function setupVisualizationCanvas() {
    visionCanvas = document.getElementById('visionCanvas');
    if (!visionCanvas) {
        visionCanvas = document.createElement('canvas');
        visionCanvas.id = 'visionCanvas';
        visionCanvas.width = 640;
        visionCanvas.height = 480;
        visionCanvas.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 320px;
            height: 240px;
            border: 2px solid #007bff;
            border-radius: 8px;
            z-index: 9998;
            display: ${DEBUG_EYE_TRACKING ? 'block' : 'none'};
        `;
        document.body.appendChild(visionCanvas);
    }
    visionContext = visionCanvas.getContext('2d');
}

function onFaceMeshResults(results) {
    const currentTime = performance.now();
    
    // FPS calculation
    eyeTrackingData.fpsCounter++;
    if (currentTime - eyeTrackingData.lastFpsTime > 1000) {
        console.log(`Eye tracking FPS: ${eyeTrackingData.fpsCounter}`);
        eyeTrackingData.fpsCounter = 0;
        eyeTrackingData.lastFpsTime = currentTime;
    }

    // Clear canvas for visualization
    if (visionContext && DEBUG_EYE_TRACKING) {
        visionContext.save();
        visionContext.clearRect(0, 0, visionCanvas.width, visionCanvas.height);
        visionContext.drawImage(results.image, 0, 0, visionCanvas.width, visionCanvas.height);
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0];
        
        // Reset no face timer
        eyeTrackingData.noFaceDetectedTime = 0;
        
        // Process iris tracking
        const gazeData = processIrisTracking(faceLandmarks);
        
        if (gazeData) {
            analyzeGazeDirection(gazeData,currentTime);
            
            // Draw iris landmarks if debugging
            if (DEBUG_EYE_TRACKING && visionContext) {
                drawIrisLandmarks(faceLandmarks);
            }
        }
        
        updateEyeTrackingStatus(`Tracking - ${eyeTrackingData.lastValidGaze}`);
        
    } else {
        // No face detected
        eyeTrackingData.noFaceDetectedTime += EYE_TRACKING_CONFIG.PROCESSING_INTERVAL;
        
        if (eyeTrackingData.noFaceDetectedTime > EYE_TRACKING_CONFIG.NO_FACE_THRESHOLD) {
            logSuspiciousActivity('no_face_detected', {
                duration: eyeTrackingData.noFaceDetectedTime,
                timestamp: currentTime
            });
            eyeTrackingData.noFaceDetectedTime = 0;
        }
        
        updateEyeTrackingStatus('No Face');
    }

    if (visionContext && DEBUG_EYE_TRACKING) {
        visionContext.restore();
    }
}

function processIrisTracking(faceLandmarks) {
    try {
        // Get iris centers
        const leftIrisCenter = getIrisCenter(faceLandmarks, IRIS_LANDMARKS.LEFT_IRIS);
        const rightIrisCenter = getIrisCenter(faceLandmarks, IRIS_LANDMARKS.RIGHT_IRIS);
        
        // Get eye corners
        const leftOuter = getLandmarkCoord(faceLandmarks, IRIS_LANDMARKS.LEFT_EYE[0]);
        const leftInner = getLandmarkCoord(faceLandmarks, IRIS_LANDMARKS.LEFT_EYE[1]);
        const rightOuter = getLandmarkCoord(faceLandmarks, IRIS_LANDMARKS.RIGHT_EYE[0]);
        const rightInner = getLandmarkCoord(faceLandmarks, IRIS_LANDMARKS.RIGHT_EYE[1]);
        
        // Calculate gaze ratios
        const leftRatio = calculateEyeRatio(leftIrisCenter, leftOuter, leftInner);
        const rightRatio = calculateEyeRatio(rightIrisCenter, rightOuter, rightInner);
        
        eyeTrackingData.leftRatio = leftRatio;
        eyeTrackingData.rightRatio = rightRatio;
        
        return {
            leftRatio,
            rightRatio,
            leftIrisCenter,
            rightIrisCenter,
            isLookingCenter: isLookingAtCenter(leftRatio, rightRatio)
        };
        
    } catch (error) {
        console.error('Error processing iris tracking:', error);
        return null;
    }
}

function getIrisCenter(faceLandmarks, irisIndices) {
    let sumX = 0, sumY = 0;
    for (const index of irisIndices) {
        sumX += faceLandmarks[index].x;
        sumY += faceLandmarks[index].y;
    }
    return {
        x: sumX / irisIndices.length,
        y: sumY / irisIndices.length
    };
}

function getLandmarkCoord(faceLandmarks, index) {
    return {
        x: faceLandmarks[index].x,
        y: faceLandmarks[index].y
    };
}

function calculateEyeRatio(irisCenter, outerCorner, innerCorner) {
    const eyeWidth = Math.abs(innerCorner.x - outerCorner.x);
    const irisOffset = irisCenter.x - outerCorner.x;
    return eyeWidth !== 0 ? irisOffset / eyeWidth : 0.5;
}

function isLookingAtCenter(leftRatio, rightRatio) {
    const [min, max] = EYE_TRACKING_CONFIG.GAZE_CENTER_RANGE;
    return (leftRatio >= min && leftRatio <= max && 
            rightRatio >= min && rightRatio <= max);
}


function analyzeGazeDirection(gazeData) {
    const currentTime = Date.now();
    
    // Determine gaze direction based on iris position
    let direction = 'center';
    
    // Calculate average iris position
    const avgIrisX = (gazeData.leftIrisCenter.x + gazeData.rightIrisCenter.x) / 2;
    const avgIrisY = (gazeData.leftIrisCenter.y + gazeData.rightIrisCenter.y) / 2;
    
    // Determine direction based on thresholds
    if (avgIrisX < 0.40) {
        direction = 'looking_left';
    } else if (avgIrisX > 0.55) {
        direction = 'looking_right';
    } else if (avgIrisY > 0.65) {
        direction = 'looking_down';
    } else {
        direction = 'center';
    }
    
    // Update direction with debounce (only if enough time has passed)
    const timeSinceLastChange = currentTime - (eyeTrackingData.lastDirectionChange || 0);
    if (direction !== eyeTrackingData.lastValidGaze && timeSinceLastChange > 500) {
        eyeTrackingData.lastValidGaze = direction;
        eyeTrackingData.lastDirectionChange = currentTime;
        console.log(`Direction changed to: ${direction}`);
    }
    
    // Handle gaze direction changes
    if (eyeTrackingData.lastValidGaze !== 'center') {
        // Student is looking away
        if (!eyeTrackingData.isLookingAway) {
            // Start new look-away session
            eyeTrackingData.isLookingAway = true;
            eyeTrackingData.lookAwayStartTime = currentTime;
            isCurrentlyInViolation = false; // RESET violation flag for new session
            console.log(`Started looking away: ${eyeTrackingData.lastValidGaze}`);
        } else if (!isCurrentlyInViolation) {
            // Check if threshold exceeded for current session
            const lookAwayDuration = currentTime - eyeTrackingData.lookAwayStartTime;
            if (lookAwayDuration > EYE_TRACKING_CONFIG.LOOK_AWAY_THRESHOLD) {
                // Trigger violation
                isCurrentlyInViolation = true; // Set flag to prevent multiple violations
                
                console.log(`VIOLATION: Looking ${eyeTrackingData.lastValidGaze} for ${Math.round(lookAwayDuration/1000)}s`);
                
                logSuspiciousActivity('looking_away_extended', {
                    direction: eyeTrackingData.lastValidGaze,
                    duration: lookAwayDuration,
                    avgIrisX: avgIrisX.toFixed(5),
                    avgIrisY: avgIrisY.toFixed(5),
                    timestamp: currentTime
                });
                
                recordEyeTrackingViolation(`Looking ${eyeTrackingData.lastValidGaze.replace('looking_', '')} for extended period`);
            }
        }
    } else {
        // Student is looking at center - reset everything
        if (eyeTrackingData.isLookingAway || isCurrentlyInViolation) {
            const lookAwayDuration = eyeTrackingData.lookAwayStartTime ? 
                currentTime - eyeTrackingData.lookAwayStartTime : 0;
            
            console.log(`Back to center after ${Math.round(lookAwayDuration/1000)}s`);
            
            // COMPLETE RESET - This is the key fix
            eyeTrackingData.isLookingAway = false;
            eyeTrackingData.lookAwayStartTime = null;
            isCurrentlyInViolation = false; // CRITICAL: Reset violation flag
        }
    }
}
function resetEyeTrackingState() {
    eyeTrackingData.isLookingAway = false;
    eyeTrackingData.lookAwayStartTime = null;
    eyeTrackingData.lastValidGaze = 'center';
    eyeTrackingData.lastDirectionChange = 0;
    isCurrentlyInViolation = false;
    console.log('Eye tracking state completely reset');
}


function drawIrisLandmarks(faceLandmarks) {
    if (!visionContext) return;
    
    // Draw iris points
    visionContext.fillStyle = 'yellow';
    for (const index of [...IRIS_LANDMARKS.LEFT_IRIS, ...IRIS_LANDMARKS.RIGHT_IRIS]) {
        const point = faceLandmarks[index];
        const x = point.x * visionCanvas.width;
        const y = point.y * visionCanvas.height;
        visionContext.beginPath();
        visionContext.arc(x, y, 3, 0, 2 * Math.PI);
        visionContext.fill();
    }
    
    // Calculate gaze data for display
    const leftIrisCenter = getIrisCenter(faceLandmarks, IRIS_LANDMARKS.LEFT_IRIS);
    const rightIrisCenter = getIrisCenter(faceLandmarks, IRIS_LANDMARKS.RIGHT_IRIS);
    const avgIrisX = (leftIrisCenter.x + rightIrisCenter.x) / 2;
    const avgIrisY = (leftIrisCenter.y + rightIrisCenter.y) / 2;
    
    // FIXED: Use updated thresholds for display
    let direction = 'center';
    if (avgIrisX < 0.40) direction = 'LEFT';
    else if (avgIrisX > 0.55) direction = 'RIGHT';
    else if (avgIrisY > 0.65) direction = 'DOWN';
    
    // Display info with violation counters
    visionContext.fillStyle = direction === 'center' ? 'green' : 'red';
    visionContext.font = '12px Arial';
    visionContext.fillText(`X: ${avgIrisX.toFixed(3)} Y: ${avgIrisY.toFixed(3)}`, 10, 20);
    visionContext.fillText(`Direction: ${direction}`, 10, 35);
    visionContext.fillText(`Eye V: ${eyeTrackingViolations}/${maxEyeTrackingViolations}`, 10, 50);
    visionContext.fillText(`Total V: ${violations}/${maxViolations}`, 10, 65);
    
    // Show look-away timer if applicable
    if (eyeTrackingData.isLookingAway) {
        const lookAwayTime = Math.round((performance.now() - eyeTrackingData.lookAwayStartTime) / 1000);
        const threshold = Math.round(EYE_TRACKING_CONFIG.LOOK_AWAY_THRESHOLD / 1000);
        visionContext.fillStyle = 'orange';
        visionContext.fillText(`Look-away: ${lookAwayTime}s/${threshold}s`, 10, 80);
    }
}
function getIrisCenter(faceLandmarks, irisIndices) {
    let sumX = 0, sumY = 0;
    for (const index of irisIndices) {
        sumX += faceLandmarks[index].x;
        sumY += faceLandmarks[index].y;
    }
    return {
        x: sumX / irisIndices.length,
        y: sumY / irisIndices.length
    };
}
// Add this new function after the existing recordViolation function

function recordEyeTrackingViolation(violationType) {
    eyeTrackingViolations++;
    console.warn(`Eye Tracking Violation ${eyeTrackingViolations}/${maxEyeTrackingViolations}: ${violationType}`);
    
    showEyeTrackingViolationWarning(violationType);
    logEyeTrackingViolation(violationType);
    
    // ADDED: Force reset after 2 seconds to ensure system doesn't get stuck
    setTimeout(() => {
        if (isCurrentlyInViolation) {
            console.log('Force resetting violation state after timeout');
            isCurrentlyInViolation = false;
        }
    }, 2000);
    
    if (eyeTrackingViolations >= maxEyeTrackingViolations) {
        console.log('Maximum eye tracking violations reached, triggering auto-submit');
        autoSubmitDueToViolations();
    }
}

function showEyeTrackingViolationWarning(violationType) {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${eyeTrackingViolations >= maxEyeTrackingViolations ? '#dc3545' : '#ff6b35'};
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        min-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        border: 3px solid white;
    `;
    
    warningDiv.innerHTML = `
        <h4>👁️ EYE TRACKING VIOLATION</h4>
        <p><strong>Violation:</strong> ${violationType}</p>
        <p><strong>Eye Tracking Violations:</strong> ${eyeTrackingViolations}/${maxEyeTrackingViolations}</p>
        <p><strong>Total Violations:</strong> ${violations}/${maxViolations}</p>
        ${eyeTrackingViolations >= maxEyeTrackingViolations ? 
            '<p style="color: #ffeb3b; font-weight: bold; font-size: 16px;">🚨 MAXIMUM EYE VIOLATIONS REACHED! 🚨</p><p><strong>Your exam will be submitted automatically!</strong></p>' : 
            '<p>Please keep your eyes on the screen to avoid automatic submission.</p>'
        }
    `;
    
    document.body.appendChild(warningDiv);
    
    setTimeout(() => {
        if (warningDiv.parentNode) {
            warningDiv.parentNode.removeChild(warningDiv);
        }
    }, eyeTrackingViolations >= maxEyeTrackingViolations ? 8000 : 5000);
}

/*async function logEyeTrackingViolation(violationType) {
    try {
        const token = getAuthToken();
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('examId');
        
        await fetch('/api/violations/eye-tracking-violation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                examId: examId,
                violationType: violationType,
                timestamp: new Date().toISOString(),
                eyeTrackingViolationCount: eyeTrackingViolations,
                totalViolationCount: violations,
                isEyeTrackingViolation: true
            })
        });
    } catch (error) {
        console.error('Failed to log eye tracking violation:', error);
    }
}*/
async function logEyeTrackingViolation(violationType) {
    try {
        const token = getAuthToken();
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('examId');
        
        await fetch('/api/violations/log', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                examId: examId,
                violationType: `Eye Tracking: ${violationType}`,
                timestamp: new Date().toISOString(),
                violationCount: eyeTrackingViolations,
                metadata: {
                    zoomMeetingActive: zoomMeetingJoined,
                    userAgent: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    additionalDetails: `Eye violations: ${eyeTrackingViolations}/${maxEyeTrackingViolations}, Total: ${violations}/${maxViolations}`,
                    eyeTrackingData: {
                        leftRatio: eyeTrackingData.leftRatio,
                        rightRatio: eyeTrackingData.rightRatio,
                        lastValidGaze: eyeTrackingData.lastValidGaze
                    }
                }
            })
        });
    } catch (error) {
        console.error('Failed to log eye tracking violation:', error);
    }
}

  





// FIXED: Zoom proctoring with auto-create meeting functionality
async function initializeZoomProctoring(examId) {
    if (!proctoringEnabled) return;
    
    try {
        console.log('🔵 Initializing Zoom proctoring for exam:', examId);
        
        // First, try to get existing meeting configuration
        let meetingConfig = await getExamMeetingConfig(examId);
        
        // If no meeting exists, try to auto-create one
        if (!meetingConfig) {
            console.log('No existing meeting found, attempting to auto-create...');
            meetingConfig = await autoCreateMeeting(examId);
        }
        
        if (meetingConfig) {
            zoomMeetingConfig = meetingConfig;
            console.log('📝 Zoom meeting config received:', {
                meetingNumber: meetingConfig.meetingNumber,
                hasPassword: !!meetingConfig.passWord
            });
            
            // Generate signature for student to join
            await generateStudentSignature(meetingConfig.meetingNumber);
            
            console.log('✅ Zoom proctoring setup completed successfully');
            showTemporaryMessage('📹 Video proctoring connected successfully', 'success', 4000);
            
        } else {
            console.warn('⚠️ Could not establish Zoom meeting, continuing with basic proctoring');
            showTemporaryMessage('📹 Video proctoring unavailable, using enhanced monitoring', 'warning', 5000);
        }
        
    } catch (error) {
        console.error('❌ Zoom proctoring initialization failed:', error);
        showTemporaryMessage('📹 Video proctoring setup failed, continuing with security monitoring', 'warning', 6000);
    }
}

// FIXED: Auto-create meeting when starting exam
async function autoCreateMeeting(examId) {
    try {
        console.log('🔵 Attempting to auto-create Zoom meeting...');
        
        const token = getAuthToken();
        const response = await fetch(`/api/zoom/auto-create-meeting/${examId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            console.log('✅ Meeting auto-created successfully');
            return {
                meetingNumber: result.data.meetingNumber,
                passWord: result.data.password || '',
                userName: getStudentName(),
                userEmail: getStudentEmail()
            };
        } else {
            console.warn('⚠️ Auto-create meeting failed:', result.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error auto-creating meeting:', error);
        return null;
    }
}
async function autoStartZoomMeeting(examId) {
    if (!proctoringEnabled) {
        console.log('Proctoring disabled, skipping Zoom meeting');
        return;
    }
    
    try {
        console.log('🔵 Auto-starting Zoom meeting for exam:', examId);
        
        // Try to get existing meeting or auto-create one
        let meetingConfig = await getExamMeetingConfig(examId);
        
        if (!meetingConfig || !meetingConfig.hasMeeting) {
            console.log('No existing meeting found, attempting to auto-create...');
            meetingConfig = await autoCreateMeeting(examId);
        }
        
        if (meetingConfig) {
            zoomMeetingConfig = {
                meetingNumber: meetingConfig.meetingNumber,
                passWord: meetingConfig.password || '',
                userName: getStudentName(),
                userEmail: getStudentEmail()
            };
            
            console.log('✅ Zoom meeting config ready:', {
                meetingNumber: zoomMeetingConfig.meetingNumber,
                hasPassword: !!zoomMeetingConfig.passWord
            });
            
            // Generate signature and prepare for auto-join
            await generateStudentSignature(zoomMeetingConfig.meetingNumber);
            
            showTemporaryMessage('🔹 Video proctoring session ready', 'success', 3000);
            
        } else {
            console.warn('⚠️ Could not establish Zoom meeting');
            showTemporaryMessage('🔹 Video proctoring unavailable, using enhanced monitoring', 'warning', 4000);
        }
        
    } catch (error) {
        console.error('❌ Auto-start Zoom meeting failed:', error);
        showTemporaryMessage('🔹 Video proctoring setup failed, continuing with security monitoring', 'warning', 5000);
    }
}
async function autoJoinZoomMeeting() {
    if (!zoomMeetingConfig || zoomMeetingJoined) {
        return;
    }
    
    try {
        console.log('🔵 Auto-joining Zoom meeting...');
        
        // Check if Zoom SDK is available
        if (typeof window.zoomStudent !== 'undefined' && window.zoomStudent) {
            await window.zoomStudent.joinMeeting(zoomMeetingConfig);
            zoomMeetingJoined = true;
            console.log('✅ Successfully joined Zoom proctoring meeting');
        } else {
            console.warn('⚠️ Zoom SDK not available, skipping video proctoring');
            showTemporaryMessage('🔹 Video proctoring SDK not available', 'warning', 3000);
        }
        
    } catch (error) {
        console.error('❌ Auto-join Zoom meeting failed:', error);
        showTemporaryMessage('🔹 Could not connect to video proctoring', 'warning', 4000);
    }
}
function showTemporaryMessage(message, type = 'info', duration = 3000) {
    const messageDiv = document.createElement('div');
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
    `;
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateX(100%)';
            messageDiv.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                messageDiv.parentNode.removeChild(messageDiv);
            }, 300);
        }
    }, duration);
}


// FIXED: Generate signature for student to join meeting
async function generateStudentSignature(meetingNumber) {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/zoom/student-signature', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meetingNumber: meetingNumber,
                userName: getStudentName(),
                userEmail: getStudentEmail()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Student signature generated successfully');
            // Here you would use the signature to join the meeting
            // This depends on your Zoom SDK implementation
            return result.data;
        }
        
    } catch (error) {
        console.error('❌ Error generating student signature:', error);
    }
    
    return null;
}

// Get meeting configuration for exam
async function getExamMeetingConfig(examId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/zoom/exam/${examId}/meeting-config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.hasMeeting) {
                return {
                    meetingNumber: result.data.meetingNumber,
                    passWord: result.data.password || '',
                    userName: getStudentName(),
                    userEmail: getStudentEmail()
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting meeting config:', error);
        return null;
    }
}




// Enhanced initialization with proctoring

async function initializeExam() {
    showLoading();
    
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('examId');
    const autoSubmit = urlParams.get('autoSubmit');
    
    if (!examId) {
        showError('No exam ID provided in URL parameters');
        return;
    }
    
    // Handle auto-submit from violations
    if (autoSubmit === 'true') {
        await handleAutoSubmitFromViolations();
        return;
    }
    
    try {
        // Check if exam was already submitted
        const submissionStatus = await checkExamSubmissionStatus(examId);
        
        if (submissionStatus.isSubmitted) {
            showExamResults(submissionStatus.result);
            return;
        }
        
        // Load exam first
        await loadExam(examId);
        
        // Show proctoring consent dialog instead of auto-initializing
        showProctoringConsentDialog(examId);
        
    } catch (error) {
        console.error('Failed to initialize exam:', error);
        showError('Failed to load exam: ' + error.message);
    }
}

// Add this new function
function showProctoringConsentDialog(examId) {
    const consentDialog = document.createElement('div');
    consentDialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    consentDialog.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; text-align: center;">
            <h3>🔒 Exam Proctoring Required</h3>
            <p>This exam requires enhanced security monitoring including:</p>
            <ul style="text-align: left; margin: 20px 0;">
                <li>Fullscreen mode</li>
                <li>Webcam access</li>
                <li>Screen monitoring</li>
                <li>Activity tracking</li>
            </ul>
            <p>You must allow these permissions to continue with the exam.</p>
            <div style="margin-top: 25px;">
                <button id="startProctoringBtn" class="btn btn-primary" style="margin-right: 10px;">
                    ✅ Start Secure Exam
                </button>
                <button id="cancelExamBtn" class="btn btn-secondary">
                    ❌ Cancel Exam
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(consentDialog);
    
    document.getElementById('startProctoringBtn').addEventListener('click', async () => {
        consentDialog.remove();
        await initializeAllProctoring(examId);
    });
    
    document.getElementById('cancelExamBtn').addEventListener('click', () => {
        consentDialog.remove();
        window.location.href = '/student-dashboard';
    });
}

// Modify initializeAllProctoring to handle user-initiated fullscreen
async function initializeAllProctoring(examId) {
    if (!proctoringEnabled) {
        console.log('Proctoring disabled, skipping initialization');
        return;
    }
    
    try {
        console.log('🔒 Starting comprehensive proctoring initialization...');
        
        // Step 1: Setup basic proctoring listeners FIRST
        setupProctoringListeners();
        proctoringInitialized = true;
        
        // Step 2: Request webcam access
        await ensureWebcamAccess();
        
        // Step 3: AUTO-START Zoom meeting when exam begins
        await autoStartZoomMeeting(examId);
        
        // Step 4: Enter fullscreen mode (now user-initiated)
        await enterFullscreen();
        
        isExamActive = true;
        console.log('✅ All proctoring features initialized successfully');
        showTemporaryMessage('🔒 Enhanced security monitoring is now active', 'success', 3000);
        
        // Step 5: Auto-join Zoom meeting after other features are ready
        if (zoomMeetingConfig && !zoomMeetingJoined) {
            await autoJoinZoomMeeting();
        }
        
    } catch (error) {
        console.error('Proctoring initialization failed:', error);
        showTemporaryMessage('⚠️ Some security features may not be fully active', 'warning', 5000);
    }
}

// Initialize proctoring features
async function initializeProctoring() {
    if (!proctoringEnabled) return;
    
    try {
        isExamActive = true;
        violations = 0;
        
        // Initialize webcam
        await ensureWebcamAccess();
        
        // Setup proctoring event listeners
        setupProctoringListeners();
        
        // Enter fullscreen mode
        await enterFullscreen();
        
        console.log('Exam proctoring initialized successfully');
        
    } catch (error) {
        console.error('Proctoring initialization failed:', error);
        showError('Proctoring features could not be initialized. Please refresh and try again.');
    }
}


async function ensureWebcamAccess() {
    let webcamElement = document.getElementById('webcam');
    
    if (!webcamElement || !webcamElement.srcObject) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'user'
                },
                audio: false 
            });
            
            if (!webcamElement) {
                webcamElement = document.createElement('video');
                webcamElement.id = 'webcam';
                webcamElement.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: 200px;
                    height: 150px;
                    border: 2px solid #007bff;
                    border-radius: 8px;
                    z-index: 9999;
                    background: #000;
                `;
                webcamElement.autoplay = true;
                webcamElement.muted = true;
                webcamElement.playsInline = true; // Important for mobile
                document.body.appendChild(webcamElement);
            }
            
            webcamElement.srcObject = webcamStream;
            webcamElement.addEventListener('loadeddata', () => {
    console.log('✅ Video element ready for MediaPipe processing');
    setTimeout(() => {
        initializeEyeTracking(); // Initialize MediaPipe instead of OpenCV
    }, 1000);
});
            videoElement = webcamElement;
            
            // Better ready detection
            const waitForVideo = () => {
                if (webcamElement.readyState >= 2) { // HAVE_CURRENT_DATA
                    console.log('✅ Video element ready for processing');
                    if (openCvReady) {
                        setTimeout(startEyeTracking, 1000); // Small delay
                    }
                } else {
                    console.log('⏳ Waiting for video to be ready...');
                    setTimeout(waitForVideo, 500);
                }
            };
            webcamElement.addEventListener('loadeddata', waitForVideo);
            webcamElement.addEventListener('canplay', waitForVideo);
            
        } catch (error) {
            console.error('Webcam initialization failed:', error);
            updateEyeTrackingStatus('Webcam Failed');
            recordViolation('Webcam access denied or failed');
        }
    }
}

function startEyeTracking() {
    if (!openCvReady || !faceClassifier || !videoElement) {
        console.warn('Eye tracking not ready');
        return;
    }

    console.log('🎯 Starting eye tracking...');
    updateEyeTrackingStatus('Active');
    
    // Process frames at intervals
    setInterval(() => {
        if (isExamActive && videoElement.readyState === 4) {
            processFrame();
        }
    }, EYE_TRACKING_CONFIG.PROCESSING_INTERVAL);
}

// Replace processFrame with better error handling


function logSuspiciousActivity(activityType, data) {
    console.warn('👁️ Suspicious activity detected:', activityType, data);
    
    // Send to backend
    sendEyeTrackingLog({
        type: activityType,
        data: data,
        examId: new URLSearchParams(window.location.search).get('examId'),
        timestamp: new Date().toISOString()
    });
    
    // Record as violation if severe enough
    if (activityType === 'looking_away_extended' && data.duration > 5000) {
        recordViolation(`Looking away for ${Math.round(data.duration/1000)} seconds`);
    } else if (activityType === 'multiple_faces_detected') {
        recordViolation('Multiple faces detected - possible assistance');
    } else if (activityType === 'no_face_detected') {
        recordViolation('Face not visible in camera');
    }
}

/*async function sendEyeTrackingLog(logData) {
    try {
        const token = getAuthToken();
        await fetch('/api/violations/eye-tracking', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        });
    } catch (error) {
        console.error('Failed to send eye tracking log:', error);
    }
}*/
async function sendEyeTrackingLog(logData) {
    try {
        const token = getAuthToken();
        await fetch('/api/violations/log', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                examId: logData.examId,
                violationType: `Eye Tracking Activity: ${logData.type}`,
                timestamp: logData.timestamp,
                violationCount: 1,
                metadata: {
                    zoomMeetingActive: zoomMeetingJoined,
                    userAgent: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    additionalDetails: JSON.stringify(logData.data),
                    eyeTrackingActivity: logData.type
                },
                severity: 'low' // These are just tracking logs, not violations
            })
        });
    } catch (error) {
        console.error('Failed to send eye tracking log:', error);
    }
}

function updateEyeTrackingStatus(status) {
    const statusElement = document.getElementById('eyeStatus');
    if (statusElement) {
        statusElement.textContent = status;
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
    
    // Window blur detection
    window.addEventListener('blur', handleWindowBlur);
    
    // Keyboard and mouse restrictions
    document.addEventListener('contextmenu', preventRightClick);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    console.log('Proctoring event listeners setup for exam');
}

// Handle fullscreen changes
function handleFullscreenChange() {
    if (!isExamActive) return;
    
    const isFullscreen = document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.mozFullScreenElement || 
                        document.msFullscreenElement;
    
    if (!isFullscreen) {
        recordViolation('Exited fullscreen during exam');
        
        // Try to re-enter fullscreen
        setTimeout(() => {
            if (isExamActive) {
                
                enterFullscreen().catch(console.error);
            }
        }, 1000);
    }
}

// Handle tab switching
function handleVisibilityChange() {
    if (!isExamActive) return;
    
    if (document.hidden) {
        recordViolation('Tab switching detected during exam');
    }
}

// Handle window blur
function handleWindowBlur() {
    if (!isExamActive) return;
    
    recordViolation('Window focus lost during exam');
}

// Handle mouse leaving the exam area
function handleMouseLeave() {
    if (!isExamActive|| isFullscreenTransition) return;
    
    recordViolation('Mouse left exam area');
}

// Prevent right-click
function preventRightClick(e) {
    if (!isExamActive) return;
    
    e.preventDefault();
    recordViolation('Right-click attempted during exam');
    return false;
}

// Prevent keyboard shortcuts
function preventKeyboardShortcuts(e) {
    if (!isExamActive) return;
    
    const blockedKeys = ['F12', 'F5', 'F11'];
    const blockedCombos = [
        { ctrl: true, key: 'c' }, { ctrl: true, key: 'v' }, { ctrl: true, key: 'x' },
        { ctrl: true, key: 'a' }, { ctrl: true, key: 'r' }, { ctrl: true, key: 'u' },
        { ctrl: true, key: 'i' }, { ctrl: true, key: 's' }, { ctrl: true, key: 'p' },
        { ctrl: true, shift: true, key: 'i' }, { ctrl: true, shift: true, key: 'j' },
        { ctrl: true, shift: true, key: 'c' }, { alt: true, key: 'Tab' }
    ];
    
    if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        recordViolation(`Blocked key pressed: ${e.key}`);
        return false;
    }
    
    for (let combo of blockedCombos) {
        if (
            (combo.ctrl ? e.ctrlKey : true) &&
            (combo.shift ? e.shiftKey : !combo.shift) &&
            (combo.alt ? e.altKey : !combo.alt) &&
            e.key.toLowerCase() === combo.key.toLowerCase()
        ) {
            e.preventDefault();
            recordViolation(`Blocked shortcut attempted`);
            return false;
        }
    }
}

// Record violation - FIXED VERSION
function recordViolation(violationType) {
    violations++;
    console.warn(`Exam Violation ${violations}/${maxViolations}: ${violationType}`);
    
    // Show warning
    showViolationWarning(violationType);
    
    // Log to backend
    logViolation(violationType);
    
    // FIXED: Auto-submit if max violations reached
    if (violations >= maxViolations) {
        console.log('Maximum violations reached, triggering auto-submit');
        autoSubmitDueToViolations();
    }
}

// Show violation warning - ENHANCED VERSION
function showViolationWarning(violationType, isAutoSubmit = false) {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${violations >= maxViolations ? '#dc3545' : '#f39c12'};
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        min-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        border: 3px solid white;
    `;
    
    warningDiv.innerHTML = `
        <h4>⚠️ PROCTORING VIOLATION</h4>
        <p><strong>Violation:</strong> ${violationType}</p>
        <p><strong>Count:</strong> ${violations}/${maxViolations}</p>
        ${violations >= maxViolations ? 
            '<p style="color: #ffeb3b; font-weight: bold; font-size: 16px;">🚨 MAXIMUM VIOLATIONS REACHED! 🚨</p><p><strong>Your exam will be submitted automatically in 3 seconds!</strong></p>' : 
            '<p>Please follow exam rules to avoid automatic submission.</p>'
        }
        ${isAutoSubmit ? '<p style="color: #ffeb3b;">Submitting exam now...</p>' : ''}
    `;
    
    document.body.appendChild(warningDiv);
    
    // Keep warning visible longer for auto-submit
    const displayTime = violations >= maxViolations ? 8000 : 5000;
    
    setTimeout(() => {
        if (warningDiv.parentNode) {
            warningDiv.parentNode.removeChild(warningDiv);
        }
    }, displayTime);
}

// Log violation to backend
/*async function logViolation(violationType) {
    try {
        const token = getAuthToken();
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('examId');
        
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
*/
async function logViolation(violationType) {
    try {
        const token = getAuthToken();
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('examId');
        
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
                violationCount: violations,
                metadata: {
                    zoomMeetingActive: zoomMeetingJoined,
                    userAgent: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    additionalDetails: `Total violations: ${violations}/${maxViolations}`
                }
            })
        });
    } catch (error) {
        console.error('Failed to log violation:', error);
    }
}

async function autoSubmitDueToViolations() {
    console.log('Auto-submitting exam due to maximum violations reached');
    
    // Immediately set exam as inactive to prevent further violations
    isExamActive = false;
    
    try {
        // Show final warning with auto-submit message
        showViolationWarning('Maximum violations reached', true);
        
        // Disable all user interactions immediately
        const examContainer = document.getElementById('examQuestions');
        if (examContainer) {
            examContainer.style.pointerEvents = 'none';
            examContainer.style.opacity = '0.5';
        }
        
        // Stop the exam timer
        if (examTimer) {
            clearInterval(examTimer);
            examTimer = null;
        }
        
        // UPDATED: End Zoom meeting before violation submit
        await endZoomMeeting();
        
        // Show alert to user
        alert('⚠️ MAXIMUM VIOLATIONS REACHED!\n\nYour exam will be submitted automatically due to proctoring violations.');
        
        // Clean up proctoring resources
        cleanupProctoring();
        
        // Wait a moment then submit
        setTimeout(async () => {
            try {
                await submitExam(true); // true indicates auto-submit due to violations
            } catch (error) {
                console.error('Auto-submit failed:', error);
                showError('Exam submission failed due to violations. Please contact support immediately.');
            }
        }, 3000);
        
    } catch (error) {
        console.error('Auto-submit due to violations failed:', error);
        showError('Exam submission failed due to violations. Please contact support immediately.');
    }
}
async function endZoomMeeting() {
    if (!zoomMeetingJoined) {
        return;
    }
    
    try {
        console.log('🔵 Ending Zoom meeting...');
        
        // Use Zoom SDK to leave meeting
        if (typeof window.zoomStudent !== 'undefined' && window.zoomStudent) {
            window.zoomStudent.leaveMeeting();
            console.log('✅ Left Zoom meeting successfully');
        }
        
        zoomMeetingJoined = false;
        zoomMeetingConfig = null;
        
    } catch (error) {
        console.error('❌ Error ending Zoom meeting:', error);
    }
}

// NEW: End Zoom meeting on backend
async function endZoomMeetingOnBackend(examId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/zoom/exam/${examId}/end-meeting`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Zoom meeting ended on backend');
        } else {
            console.warn('⚠️ Backend meeting end failed:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Error ending meeting on backend:', error);
    }
}


// Handle auto-submit from violations (when redirected from student.js)
async function handleAutoSubmitFromViolations() {
    try {
        showLoading();
        
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('examId');
        
        // Try to submit with current state
        const submissionData = {
            answers: [],
            userAnswers: {},
            submittedAt: new Date().toISOString(),
            timeTaken: 0,
            isAutoSubmit: true,
            violationSubmit: true,
            totalQuestions: 0,
            answeredQuestions: 0,
            proctoringData: {
                violationCount: maxViolations,
                submittedDueToViolations: true,
                proctoringEnabled: true
            }
        };
        
        const result = await apiCall(`/results/submit/${examId}`, {
            method: 'POST',
            body: JSON.stringify(submissionData)
        });
        
        if (result.success) {
            showError('Exam submitted due to proctoring violations. Your responses have been recorded.');
            setTimeout(() => {
                window.location.href = '/student-dashboard';
            }, 3000);
        }
        
    } catch (error) {
        console.error('Violation auto-submit failed:', error);
        showError('Exam submission failed. Please contact support.');
    }
}

// Enter fullscreen mode

async function enterFullscreen() {
    isFullscreenTransition = true; // ← ADD THIS LINE
    
    return new Promise((resolve, reject) => {
        const elem = document.documentElement;
        
        const requestFullscreen = elem.requestFullscreen || 
                                 elem.webkitRequestFullscreen || 
                                 elem.msRequestFullscreen || 
                                 elem.mozRequestFullScreen;
        
        if (requestFullscreen) {
            requestFullscreen.call(elem)
                .then(() => {
                    // Add a small delay to ensure fullscreen transition is complete
                    setTimeout(() => {
                        isFullscreenTransition = false; // ← RESET AFTER TRANSITION
                        resolve();
                    }, 1000); // 1 second delay
                })
                .catch(error => {
                    isFullscreenTransition = false; // ← RESET ON ERROR TOO
                    reject(error);
                });
        } else {
            isFullscreenTransition = false; // ← RESET IF NO FULLSCREEN SUPPORT
            resolve(); // Continue without fullscreen
        }
    });
}



function cleanupProctoring() {
    isExamActive = false;
    isFullscreenTransition = false;
    
    // UPDATED: End Zoom meeting if still active
    if (zoomMeetingJoined) {
        endZoomMeeting().catch(console.error);
    }
    
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
    // Add this to cleanupProctoring function:
// Stop MediaPipe camera
    if (mediapipeCamera) {
    mediapipeCamera.stop();
    mediapipeCamera = null;
   }

   // Close FaceMesh
   if (faceMesh) {
    faceMesh.close();
    faceMesh = null;
  }
    
    console.log('Proctoring cleanup complete with Zoom meeting end');
}



// UPDATED: Enhanced submit exam function with automatic Zoom meeting end
async function submitExam(isAutoSubmit = false) {
    if (!isAutoSubmit) {
        const unansweredCount = Object.values(userAnswers).filter(answer => 
            answer === null || answer === undefined
        ).length;
        
        if (unansweredCount > 0) {
            const confirmSubmit = confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`);
            if (!confirmSubmit) return;
        }
    }
    
    try {
        showLoading();
        
        // Stop exam timer
        if (examTimer) {
            clearInterval(examTimer);
            examTimer = null;
        }
        
        // UPDATED: End Zoom meeting before cleaning up proctoring
        await endZoomMeeting();
        
        // Clean up proctoring
        cleanupProctoring();
        
        const examDuration = examStartTime ? Math.floor((new Date() - examStartTime) / 1000) : 0;
        const answersArray = convertAnswersToArray();
        
        const answeredQuestions = answersArray.filter(answer => 
            answer.isAnswered && 
            answer.selectedOption !== null && 
            answer.selectedOption !== undefined && 
            answer.selectedOption !== -1
        ).length;
        
        
       

        const submissionData = {
        answers: answersArray,
        userAnswers: userAnswers,
        canvasAnswers: canvasAnswers, // ADD THIS LINE
        submittedAt: new Date().toISOString(),
        timeTaken: examDuration,
        isAutoSubmit: isAutoSubmit,
        totalQuestions: questions.length,
        answeredQuestions: answeredQuestions,
        // Proctoring data
        proctoringData: {
            violationCount: violations,
            submittedDueToViolations: isAutoSubmit && violations >= maxViolations,
            proctoringEnabled: proctoringEnabled,
            zoomMeetingUsed: zoomMeetingJoined,
            eyeTrackingViolationCount: eyeTrackingViolations
        }
    };
        
        console.log('Submitting exam with proctoring data:', submissionData);
        // Add this before the fetch call in submitExam
         console.log('Submitting canvas answers:', {
         canvasAnswersCount: Object.keys(canvasAnswers).length,
         canvasAnswers: canvasAnswers,
         answersArray: answersArray.filter(a => a.answerType === 'canvas')
      });
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('examId');
        
        const result = await apiCall(`/results/submit/${examId}`, {
            method: 'POST',
            body: JSON.stringify(submissionData)
        });
        
        console.log('Submission result:', result);
        
        if (result.success) {
            // UPDATED: End Zoom meeting on backend after successful submission
            await endZoomMeetingOnBackend(examId);
            
            setTimeout(async () => {
                try {
                    await showResultsForSubmittedExam(examId);
                } catch (error) {
                    console.error('Error loading results after submission:', error);
                    showSubmissionSuccess(result.data);
                }
            }, 2000);
        } else {
            throw new Error(result.message || 'Submission failed');
        }
        
    } catch (error) {
        console.error('Submit exam error:', error);
        showError('Failed to submit exam: ' + error.message);
        
        if (!isAutoSubmit && timeRemaining > 0) {
            startTimer();
        }
    } finally {
        hideLoading();
    }
}

// UPDATED: Auto-submit exam when time runs out with Zoom meeting end
async function autoSubmitExam() {
    console.log('Auto-submitting exam due to time expiry');
    
    // Set exam as inactive
    isExamActive = false;
    
    alert('Time has expired! The exam will be submitted automatically.');
    
    try {
        // UPDATED: End Zoom meeting before auto-submit
        await endZoomMeeting();
        
        await submitExam(true);
    } catch (error) {
        console.error('Auto-submit failed:', error);
        showError('Time expired and auto-submit failed. Please try submitting manually.');
    }
}




window.addEventListener('beforeunload', async (event) => {
    if (isExamActive && currentExam && timeRemaining > 0) {
        // End Zoom meeting before page unload
        if (zoomMeetingJoined) {
            await endZoomMeeting();
        }
        
        cleanupProctoring();
        event.preventDefault();
        event.returnValue = 'You have a proctored exam in progress. Are you sure you want to leave?';
        return event.returnValue;
    }
});
// API Base URL
const API_BASE_URL = '/api';

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Helper function to make authenticated API calls
async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return response.json();
}

// Check if exam was already submitted and get results
async function checkExamSubmissionStatus(examId) {
    try {
        const response = await apiCall(`/results/exam/${examId}`);
        if (response.success && response.data) {
            return {
                isSubmitted: true,
                result: response.data
            };
        }
        return { isSubmitted: false };
    } catch (error) {
        console.log('Could not check submission status:', error.message);
        return { isSubmitted: false };
    }
}

// Load exam data from API
async function loadExam(examId) {
    try {
        showLoading();
        
        const data = await apiCall(`/questions/exam/${examId}`);
        
        if (data.success && data.data.questions && data.data.questions.length > 0) {
            currentExam = data.data.exam;
            questions = data.data.questions;
            
            userAnswers = {};
            questions.forEach(question => {
                userAnswers[question._id] = null;
            });
            
            console.log('Loaded exam:', currentExam);
            console.log('Loaded questions:', questions.length);
            console.log('Initialized userAnswers:', userAnswers);
            
            displayExam();
        } else {
            throw new Error('No questions found for this exam');
        }

        if (data.success && data.data.questions && data.data.questions.length > 0) {
       currentExam = data.data.exam;
       questions = data.data.questions;
    
       // DEBUG: Add this line to see what data you're getting
        debugQuestionData(questions);
    
        userAnswers = {};
        questions.forEach(question => {
        userAnswers[question._id] = null;
        });
    
      // ... rest of your existing code
        }
    } catch (error) {
        console.error('Load exam error:', error);
        throw error;
    }
}

// Display exam interface
function displayExam() {
    hideLoading();
    hideError();
    
    const examInfoElement = document.getElementById('examInfo');
    if (examInfoElement) {
        examInfoElement.style.display = 'block';
        
        const examTitleElement = document.getElementById('examTitle');
        const examCategoryElement = document.getElementById('examCategory');
        const examDurationElement = document.getElementById('examDuration');
        const totalQuestionsElement = document.getElementById('totalQuestions');
        
        if (examTitleElement) examTitleElement.textContent = currentExam.title;
        if (examCategoryElement) examCategoryElement.textContent = currentExam.category;
        if (examDurationElement) examDurationElement.textContent = `${currentExam.duration} minutes`;
        if (totalQuestionsElement) totalQuestionsElement.textContent = `${questions.length} questions`;
    }
    
    const examQuestionsElement = document.getElementById('examQuestions');
    if (examQuestionsElement) {
        examQuestionsElement.style.display = 'block';
    }
    
    renderQuestions();
    updateProgress();
    
    timeRemaining = currentExam.duration * 60;
    examStartTime = new Date();
    startTimer();
}

// Render all questions
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) {
        console.error('Questions container not found');
        return;
    }
    
    container.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionElement = createQuestionElement(question, index);
        container.appendChild(questionElement);
    });
}



function createQuestionElement(question, index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-container';
    questionDiv.setAttribute('data-question-id', question._id);
    
    let optionsHTML = '';
    
    // Handle descriptive questions differently
    if (question.type === 'descriptive') {
        const hasCanvasAnswer = canvasAnswers[question._id];
        
        optionsHTML = `
            <div class="descriptive-answer-section">
                ${hasCanvasAnswer ? `
                    <div class="canvas-preview-minimized">
                        <div class="canvas-saved-indicator">
                            <i class="fas fa-check-circle text-success"></i>
                            <span>Answer saved</span>
                            <button type="button" class="btn btn-sm btn-outline-primary ms-2" 
                                    onclick="editCanvasAnswer('${question._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-1" 
                                    onclick="clearCanvasAnswer('${question._id}')">
                                <i class="fas fa-trash"></i> Clear
                            </button>
                        </div>
                        <div class="canvas-preview-thumbnail" onclick="previewCanvasAnswer('${question._id}')">
                            <img src="${hasCanvasAnswer.dataURL}" alt="Written Answer Preview" 
                                 style="max-width: 200px; max-height: 100px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                        </div>
                    </div>
                ` : `
                    <button type="button" class="btn btn-success btn-lg" 
                            onclick="openCanvasModal('${question._id}')">
                        <i class="fas fa-pencil-alt me-2"></i>Write Answer Here
                    </button>
                `}
            </div>
        `;
        
        // Mark as answered if canvas answer exists
        if (hasCanvasAnswer) {
            userAnswers[question._id] = 1; // Mark as answered for progress tracking
        }
    } else {
        // Existing logic for multiple-choice and true-false questions
        question.options.forEach((option, optionIndex) => {
            const isSelected = userAnswers[question._id] === optionIndex;
            optionsHTML += `
                <div class="option-container">
                    <label class="option-label">
                        <input type="radio" 
                               name="question_${question._id}" 
                               value="${optionIndex}"
                               data-question-id="${question._id}"
                               data-option-index="${optionIndex}"
                               ${isSelected ? 'checked' : ''}>
                        <span class="option-text">${option}</span>
                    </label>
                </div>
            `;
        });
    }
    
    // Build question content (existing logic)
    let questionContent = '';
    const questionText = question.text || '';
    
    if (questionText && questionText.trim()) {
        questionContent += `<div class="question-text">${questionText}</div>`;
    }
    
    const imageUrl = question.photoUrl || '';
    if (imageUrl && imageUrl.trim()) {
        let fullImageUrl;
        if (imageUrl.startsWith('/uploads/')) {
            fullImageUrl = imageUrl;
        } else if (imageUrl.startsWith('http')) {
            fullImageUrl = imageUrl;
        } else {
            fullImageUrl = `/uploads/questions/${imageUrl}`;
        }
        
        questionContent += `
            <div class="question-image">
                <img src="${fullImageUrl}" 
                     alt="Question ${index + 1} Image" 
                     style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer;"
                     onclick="openImageModal('${fullImageUrl}', 'Question ${index + 1} Image')"
                     onerror="handleImageError(this, '${imageUrl}')"
                     onload="console.log('Image loaded successfully:', this.src)">
            </div>
        `;
    }
    
    if ((!questionText || !questionText.trim()) && (!imageUrl || !imageUrl.trim())) {
        questionContent = '<div class="question-text" style="color: #dc3545;">Question content not available</div>';
    }
    
    questionDiv.innerHTML = `
        <div class="question-header">
            <h3>Question ${index + 1} 
                ${question.type === 'descriptive' ? '<span class="badge bg-info ms-2">Descriptive</span>' : ''}
            </h3>
            <span class="question-points">${question.points || 1} point(s)</span>
        </div>
        ${questionContent}
        <div class="options-container">
            ${optionsHTML}
        </div>
    `;
    
    return questionDiv;
}











// 3. NEW: Canvas modal functions
function openCanvasModal(questionId) {
    createCanvasModal(questionId);
    const existingData = canvasAnswers[questionId];
    if (existingData) {
        loadCanvasData(existingData.canvasData);
    }
}

function editCanvasAnswer(questionId) {
    openCanvasModal(questionId);
}

function clearCanvasAnswer(questionId) {
    if (confirm('Are you sure you want to clear your written answer?')) {
        delete canvasAnswers[questionId];
        userAnswers[questionId] = null;
        updateProgress();
        renderQuestions(); // Re-render to show "Write Answer Here" button
    }
}

function createCanvasModal(questionId) {
    // Remove existing modal if any
    if (canvasModal) {
        document.body.removeChild(canvasModal);
    }
    
    canvasModal = document.createElement('div');
    canvasModal.className = 'modal fade show';
    canvasModal.style.display = 'block';
    canvasModal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    canvasModal.style.zIndex = '10001';
    
    canvasModal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-pencil-alt me-2"></i>Write Your Answer
                    </h5>
                </div>
                <div class="modal-body p-0">
                    <div class="canvas-toolbar">
                        <div class="toolbar-group">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="setDrawingTool('pen')">
                                <i class="fas fa-pen"></i> Pen
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="setDrawingTool('eraser')">
                                <i class="fas fa-eraser"></i> Eraser
                            </button>
                        </div>
                        <div class="toolbar-group">
                            <label class="me-2">Brush Size:</label>
                            <input type="range" id="brushSize" min="1" max="20" value="3" 
                                   onchange="updateBrushSize(this.value)" class="form-range" style="width: 100px;">
                            <span id="brushSizeValue" class="ms-2">3px</span>
                        </div>
                        <div class="toolbar-group">
                            <button type="button" class="btn btn-warning btn-sm" onclick="clearCanvas()">
                                <i class="fas fa-trash"></i> Clear All
                            </button>
                        </div>
                    </div>
                    <canvas id="writingCanvas" width="900" height="2000" 
                            style="border: 1px solid #ddd; display: block; margin: 0 auto; cursor: crosshair;">
                    </canvas>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeCanvasModal()">
                        <i class="fas fa-times me-2"></i>Cancel
                    </button>
                    <button type="button" class="btn btn-success" onclick="saveCanvasAnswer('${questionId}')">
                        <i class="fas fa-save me-2"></i>Save Answer
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(canvasModal);
    
    // Initialize canvas after modal is added to DOM
    setTimeout(() => {
        initializeCanvas();
    }, 100);
}

// 4. NEW: Canvas drawing functionality
let canvas, ctx, isDrawing = false;
let currentTool = 'pen';
let brushSize = 3;
let canvasHistory = [];
let historyStep = -1;

function initializeCanvas() {
    canvas = document.getElementById('writingCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas background to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save initial state
    saveCanvasState();
    
    // Set up drawing properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = brushSize;
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = brushSize * 2;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveCanvasState();
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function setDrawingTool(tool) {
    currentTool = tool;
    
    // Update button states
    const buttons = document.querySelectorAll('.canvas-toolbar .btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update cursor
    canvas.style.cursor = tool === 'eraser' ? 'grab' : 'crosshair';
}

function updateBrushSize(size) {
    brushSize = parseInt(size);
    document.getElementById('brushSizeValue').textContent = size + 'px';
}

function clearCanvas() {
    if (confirm('Are you sure you want to clear everything?')) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
    }
}

function saveCanvasState() {
    historyStep++;
    if (historyStep < canvasHistory.length) {
        canvasHistory.length = historyStep;
    }
    canvasHistory.push(canvas.toDataURL());
}

function loadCanvasData(dataURL) {
    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        saveCanvasState();
    };
    img.src = dataURL;
}

function saveCanvasAnswer(questionId) {
    const dataURL = canvas.toDataURL('image/png');
    const canvasData = canvas.toDataURL();
    
    canvasAnswers[questionId] = {
        dataURL: dataURL,
        canvasData: canvasData,
        timestamp: new Date().toISOString()
    };
    
    // Mark as answered
    userAnswers[questionId] = 1;
    updateProgress();
    
    closeCanvasModal();
    renderQuestions(); // Re-render to show preview
    
    showTemporaryMessage('Answer saved successfully!', 'success', 2000);
}
function previewCanvasAnswer(questionId) {
    const canvasAnswer = canvasAnswers[questionId];
    if (!canvasAnswer) return;
    
    // Create preview modal
    const previewModal = document.createElement('div');
    previewModal.className = 'modal fade show';
    previewModal.style.display = 'block';
    previewModal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    previewModal.style.zIndex = '10001';
    
    previewModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Answer Preview</h5>
                    <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body text-center">
                    <img src="${canvasAnswer.dataURL}" alt="Written Answer" 
                         style="max-width: 100%; max-height: 70vh; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="editCanvasAnswer('${questionId}'); this.closest('.modal').remove();">
                        <i class="fas fa-edit me-2"></i>Edit Answer
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewModal);
    
    // Remove modal when clicking outside
    previewModal.addEventListener('click', function(e) {
        if (e.target === previewModal) {
            previewModal.remove();
        }
    });
}
function closeCanvasModal() {
    if (canvasModal && canvasModal.parentNode) {
        canvasModal.parentNode.removeChild(canvasModal);
        canvasModal = null;
    }
}


// UPDATED: Modify convertAnswersToArray to include canvas answers properly
function convertAnswersToArray() {
    const answersArray = [];
    
    questions.forEach(question => {
        if (question.type === 'descriptive') {
            const canvasAnswer = canvasAnswers[question._id];
            answersArray.push({
                questionId: question._id,
                selectedOption: canvasAnswer ? 0 : -1,
                isAnswered: !!canvasAnswer,
                canvasData: canvasAnswer ? canvasAnswer.dataURL : null,
                answerType: 'canvas'
            });
        } else {
            const selectedOption = userAnswers[question._id];
            const hasValidAnswer = selectedOption !== null && 
                                 selectedOption !== undefined && 
                                 !isNaN(selectedOption);
            
            answersArray.push({
                questionId: question._id,
                selectedOption: hasValidAnswer ? parseInt(selectedOption) : -1,
                isAnswered: hasValidAnswer,
                answerType: 'multiple_choice'
            });
        }
    });
    
    return answersArray;
}

// 6. NEW: PDF Generation function (call this after successful submission)
async function generateAnswersPDF() {
    const descriptiveAnswers = Object.entries(canvasAnswers);
    
    if (descriptiveAnswers.length === 0) {
        console.log('No descriptive answers to generate PDF');
        return null;
    }
    
    // Load jsPDF dynamically
    if (typeof window.jsPDF === 'undefined') {
        await loadJsPDF();
    }
    
    const { jsPDF } = window;
    const pdf = new jsPDF();
    
    let yPosition = 20;
    
    pdf.setFontSize(16);
    pdf.text('Exam Descriptive Answers', 20, yPosition);
    yPosition += 20;
    
    for (let i = 0; i < descriptiveAnswers.length; i++) {
        const [questionId, answerData] = descriptiveAnswers[i];
        const questionIndex = questions.findIndex(q => q._id === questionId);
        
        if (yPosition > 250) { // Start new page if needed
            pdf.addPage();
            yPosition = 20;
        }
        
        pdf.setFontSize(12);
        pdf.text(`Question ${questionIndex + 1}:`, 20, yPosition);
        yPosition += 20;
        
        // Add canvas image
        try {
            pdf.addImage(answerData.dataURL, 'PNG', 20, yPosition, 160, 120);
            yPosition += 140;
        } catch (error) {
            console.error('Error adding image to PDF:', error);
            pdf.text('Error loading answer image', 20, yPosition);
            yPosition += 20;
        }
        
        yPosition += 10; // Extra spacing between questions
    }
    
    return pdf;
}

async function loadJsPDF() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}




// FIXED: Enhanced image error handling with better debugging
function handleImageError(img, originalUrl) {
    console.error('Failed to load image:', img.src, 'Original URL:', originalUrl);
    
    // If we've already tried alternatives, don't try again
    if (img.dataset.hasTriedAlternatives === 'true') {
        showImagePlaceholder(img, originalUrl);
        return;
    }
    
    // Try multiple URL formats based on your setup
    const alternatives = [
        originalUrl, // Try original first (in case it's already correct)
        `/uploads/questions/${originalUrl}`, // Your configured upload path
        originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`, // Try as relative path
        `/uploads/${originalUrl}`, // Alternative upload path
        `./uploads/questions/${originalUrl}` // Relative to current directory
    ];
    
    let attemptIndex = 0;
    
    function tryNextUrl() {
        if (attemptIndex < alternatives.length) {
            const nextUrl = alternatives[attemptIndex];
            console.log(`Trying alternative URL ${attemptIndex + 1}:`, nextUrl);
            
            // Create a temporary image to test the URL
            const testImg = new Image();
            testImg.onload = function() {
                console.log('Successfully loaded alternative URL:', nextUrl);
                img.src = nextUrl;
                img.dataset.hasTriedAlternatives = 'true';
            };
            testImg.onerror = function() {
                attemptIndex++;
                tryNextUrl();
            };
            testImg.src = nextUrl;
        } else {
            // All attempts failed, show placeholder
            console.error('All image URL attempts failed for:', originalUrl);
            img.dataset.hasTriedAlternatives = 'true';
            showImagePlaceholder(img, originalUrl);
        }
    }
    
    tryNextUrl();
}

// Helper function to show image placeholder
function showImagePlaceholder(img, originalUrl) {
    // Hide the broken image
    img.style.display = 'none';
    
    // Create a placeholder if it doesn't already exist
    if (!img.parentNode.querySelector('.image-placeholder')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.style.cssText = `
            padding: 20px;
            border: 2px dashed #ccc;
            border-radius: 8px;
            text-align: center;
            color: #666;
            margin: 10px 0;
            background-color: #f9f9f9;
        `;
        placeholder.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🖼️</div>
            <div>Image could not be loaded</div>
            <div style="font-size: 12px; margin-top: 5px; color: #999;">
                Original: ${originalUrl}<br>
                Attempted: ${img.src}
            </div>
        `;
        
        // Insert placeholder after the image
        img.parentNode.insertBefore(placeholder, img.nextSibling);
    }
}

// Add image modal functionality
function openImageModal(imageUrl, altText) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    // Create modal content
    modalOverlay.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageUrl}" 
                 alt="${altText}" 
                 style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <button onclick="closeImageModal()" 
                    style="position: absolute; top: -10px; right: -10px; width: 30px; height: 30px; border-radius: 50%; background: white; border: none; font-size: 16px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                ×
            </button>
        </div>
    `;
    
    // Add click to close functionality
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
    
    // Add to body
    document.body.appendChild(modalOverlay);
    
    // Global close function
    window.closeImageModal = function() {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    };
    
    // Close with Escape key
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            window.closeImageModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Enhanced debug function to check question data structure
function debugQuestionData(questions) {
    console.log('=== DEBUGGING QUESTION DATA ===');
    console.log('Total questions:', questions.length);
    
    questions.forEach((question, index) => {
        console.log(`Question ${index + 1}:`, {
            id: question._id,
            text: question.text,
            photoUrl: question.photoUrl, // This is the correct property from your backend
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
            allProperties: Object.keys(question)
        });
        
        const hasImage = !!(question.photoUrl);
        const hasText = !!(question.text);
        
        console.log(`Question ${index + 1} validation:`, {
            hasText: hasText,
            hasImage: hasImage,
            textContent: question.text || 'none',
            textLength: (question.text || '').length,
            photoUrl: question.photoUrl || 'none',
            status: !hasText && !hasImage ? '❌ NO CONTENT' : '✅ OK'
        });
        
        // Test image URL construction
        if (hasImage) {
            const imageUrl = question.photoUrl;
            console.log(`Image URL for Question ${index + 1}:`, {
                original: imageUrl,
                constructed: imageUrl.startsWith('/uploads/') ? imageUrl : `/uploads/questions/${imageUrl}`,
                startsWithSlash: imageUrl.startsWith('/'),
                startsWithUploads: imageUrl.startsWith('/uploads/')
            });
        }
    });
    
    console.log('=== END DEBUG ===');
}

// ADDITIONAL DEBUGGING: Add this function to test image loading
function testImageLoad(imageUrl) {
    console.log('Testing image URL:', imageUrl);
    const testImg = new Image();
    testImg.onload = function() {
        console.log('✅ Image loads successfully:', imageUrl);
    };
    testImg.onerror = function() {
        console.log('❌ Image failed to load:', imageUrl);
    };
    testImg.src = imageUrl;
}




// Create individual question element - UPDATED to support images
// Create individual question element - UPDATED to properly support images

// Handle answer selection
function selectAnswer(questionId, optionIndex) {
    const selectedOption = parseInt(optionIndex);
    userAnswers[questionId] = selectedOption;
    updateProgress();
    
    console.log(`Selected option ${selectedOption} for question ${questionId}`);
    console.log('Current userAnswers:', userAnswers);
}


// Update progress display
function updateProgress() {
    const answeredCount = Object.values(userAnswers).filter(answer => 
        answer !== null && answer !== undefined
    ).length;
    const totalQuestions = questions.length;
    
    const progressElement = document.getElementById('examProgress');
    if (progressElement) {
        progressElement.textContent = `${answeredCount}/${totalQuestions} questions answered`;
    }
    
    const progressTextElement = document.getElementById('progressText');
    if (progressTextElement) {
        progressTextElement.textContent = `Questions Answered: ${answeredCount}/${totalQuestions}`;
    }
    
    const remainingElement = document.getElementById('remainingQuestions');
    if (remainingElement) {
        const remaining = totalQuestions - answeredCount;
        remainingElement.textContent = `${remaining} questions remaining`;
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
    }
}

// Convert answers to array format
function convertAnswersToArray() {
    const answersArray = [];
    
    questions.forEach(question => {
        const selectedOption = userAnswers[question._id];
        
        const hasValidAnswer = selectedOption !== null && 
                             selectedOption !== undefined && 
                             !isNaN(selectedOption);
        
        answersArray.push({
            questionId: question._id,
            selectedOption: hasValidAnswer ? parseInt(selectedOption) : -1,
            isAnswered: hasValidAnswer
        });
    });
    
    console.log('Converted answers array:', answersArray);
    return answersArray;
}


function startTimer() {
    if (examTimer) {
        clearInterval(examTimer);
    }
    
    updateTimerDisplay();
    
    examTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        // NON-INTRUSIVE TIMER WARNINGS (NO VIOLATIONS)
        if (timeRemaining === 600) { // 10 minutes
            showTemporaryMessage('🕙 10 minutes remaining', 'info', 4000);
        }
        else if (timeRemaining === 300) { // 5 minutes
            showTemporaryMessage('⚠️ 5 minutes remaining! Please review your answers', 'warning', 5000);
        }
        else if (timeRemaining === 120) { // 2 minutes
            showTemporaryMessage('⏰ 2 minutes remaining! Finalize your submission', 'warning', 4000);
        }
        else if (timeRemaining === 60) { // 1 minute
            showTemporaryMessage('🚨 1 minute remaining! Submit now!', 'error', 3000);
        }
        else if (timeRemaining === 30) { // 30 seconds
            showTemporaryMessage('⏱️ 30 seconds! Auto-submit imminent!', 'error', 2000);
        }
        
        if (timeRemaining <= 0) {
            clearInterval(examTimer);
            examTimer = null;
            autoSubmitExam();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('examTimer');
    if (timerElement) {
        timerElement.textContent = timeString;
    }
    
    const timerDisplayElement = document.getElementById('timerDisplay');
    if (timerDisplayElement) {
        timerDisplayElement.textContent = `Time Remaining: ${timeString}`;
    }
    
    if (timeRemaining <= 300) {
        if (timerElement) timerElement.style.color = 'red';
        if (timerDisplayElement) timerDisplayElement.style.color = 'red';
    } else if (timeRemaining <= 600) {
        if (timerElement) timerElement.style.color = 'orange';
        if (timerDisplayElement) timerDisplayElement.style.color = 'orange';
    }
}

// Show results for already submitted exam
async function showResultsForSubmittedExam(examId) {
    try {
        showLoading();
        const resultData = await apiCall(`/results/exam/${examId}`);
        
        console.log('Received result data from API:', resultData);
        
        if (resultData.success && resultData.data) {
            showExamResults(resultData.data);
        } else {
            throw new Error('Could not load exam results');
        }
    } catch (error) {
        console.error('Error loading results:', error);
        showAlreadySubmittedMessage();
    }
}

// Display exam results
function showExamResults(resultData) {
    hideLoading();
    hideError();
    
    console.log('Displaying results with data:', resultData);
    
    const examInfoElement = document.getElementById('examInfo');
    const examQuestionsElement = document.getElementById('examQuestions');
    
    if (examInfoElement) examInfoElement.style.display = 'none';
    if (examQuestionsElement) examQuestionsElement.style.display = 'none';
    
    const resultsElement = document.getElementById('examResults') || createResultsElement();
    resultsElement.style.display = 'block';
    // Check if exam contains descriptive questions
    const hasDescriptiveQuestions = questions && questions.some(q => q.type === 'descriptive');
    
    if (hasDescriptiveQuestions) {
        // Show pending results message for descriptive questions
        resultsElement.innerHTML = `
            <div class="results-container">
                <div class="results-header">
                    <h1>📋 Exam Submitted Successfully</h1>
                    <div class="status-badge pending">UNDER REVIEW</div>
                </div>
                
                <div class="pending-message">
                    <div class="success-icon">✅</div>
                    <h3>Your exam has been submitted successfully!</h3>
                    <div class="message-content">
                        <p>Your exam contains descriptive questions that require manual evaluation.</p>
                        <p><strong>Results will be declared soon.</strong></p>
                        <p>You will be notified once the evaluation is complete.</p>
                    </div>
                    
                    <div class="submission-details">
                        <div class="detail-item">
                            <label>Exam:</label>
                            <span>${resultData.examTitle || currentExam.title || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Submitted At:</label>
                            <span>${new Date(resultData.submittedAt || Date.now()).toLocaleString()}</span>
                            </div>
                        <div class="detail-item">
                            <label>Total Questions:</label>
                            <span>${questions.length}</span>
                        </div>
                        <div class="detail-item">
                            <label>Time Taken:</label>
                            <span>${formatDuration(resultData.timeTaken || 0)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button onclick="goToDashboard()" class="btn btn-primary">📋 Back to Dashboard</button>
                    <button onclick="takeAnotherExam()" class="btn btn-outline">📝 Take Another Exam</button>
                </div>
            </div>
        `;
        return;
    }
    
    const score = (resultData.score !== null && 
                  resultData.score !== undefined && 
                  !isNaN(resultData.score)) ? parseInt(resultData.score) : 0;
                  
    const totalQuestions = (resultData.totalQuestions !== null && 
                           resultData.totalQuestions !== undefined && 
                           !isNaN(resultData.totalQuestions)) ? parseInt(resultData.totalQuestions) : 0;
    
    let percentage = 0;
    if (totalQuestions > 0 && score >= 0) {
        percentage = ((score / totalQuestions) * 100).toFixed(2);
    }
    
    const status = parseFloat(percentage) >= 60 ? 'PASSED' : 'FAILED';
    
    let submittedDate = 'Unknown';
    if (resultData.submittedAt) {
        try {
            submittedDate = new Date(resultData.submittedAt).toLocaleString();
        } catch (error) {
            console.error('Date parsing error:', error);
            submittedDate = 'Invalid Date';
        }
    }
    
    const timeTaken = parseInt(resultData.timeTaken) || 0;
    
    // Include proctoring information in results
    const proctoringData = resultData.proctoringData || {};
  
    const wasViolationSubmit = resultData.wasViolationSubmit || proctoringData.submittedDueToViolations;
const violationInfo = proctoringData.violationCount > 0 || wasViolationSubmit ? `
    <div class="alert ${wasViolationSubmit ? 'alert-danger' : 'alert-warning'}">
        <strong>⚠️ Proctoring Notice:</strong> 
        ${proctoringData.violationCount || 0} violation(s) detected during exam.
        ${wasViolationSubmit ? 
            ' <strong>🚨 This exam was automatically submitted due to multiple proctoring violations.</strong>' : 
            ''}
        ${proctoringData.proctoringEnabled ? ' Enhanced monitoring was active.' : ''}
    </div>
` : '';
    
    resultsElement.innerHTML = `
        <div class="results-container">
            <div class="results-header">
                <h1>📊 Exam Results</h1>
                <div class="status-badge ${status.toLowerCase()}">${status}</div>
            </div>
            
            ${violationInfo}
            
            <div class="results-summary">
                <div class="score-display">
                    <div class="score-circle">
                        <span class="score-number">${score}</span>
                        <span class="score-total">/${totalQuestions}</span>
                    </div>
                    <div class="percentage">${percentage}%</div>
                </div>
                
                <div class="result-details">
                    <div class="detail-item">
                        <label>Exam:</label>
                        <span>${resultData.examTitle || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Category:</label>
                        <span>${resultData.examCategory || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Total Questions:</label>
                        <span>${totalQuestions}</span>
                    </div>
                    <div class="detail-item">
                        <label>Correct Answers:</label>
                        <span>${score}</span>
                    </div>
                    <div class="detail-item">
                        <label>Wrong Answers:</label>
                        <span>${Math.max(0, totalQuestions - score)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Submitted At:</label>
                        <span>${submittedDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>Time Taken:</label>
                        <span>${formatDuration(timeTaken)}</span>
                    </div>
                    ${wasViolationSubmit ? `
    <div class="detail-item violation-submit">
        <label>Submission Type:</label>
        <span style="color: #dc3545; font-weight: bold;">
            🚨 Auto-submitted due to violations
        </span>
    </div>
` : `
    <div class="detail-item">
        <label>Submission Type:</label>
        <span>${resultData.isAutoSubmit ? 'Auto-submitted (Time expired)' : 'Manual submission'}</span>
    </div>
`}

                </div>
            </div>
            
            ${resultData.questions && Array.isArray(resultData.questions) && resultData.questions.length > 0 ? `
                <div class="detailed-results">
                    <h3>Question-wise Results</h3>
                    <div class="questions-review">
                        ${resultData.questions.map((q, index) => {
                            const isCorrect = q.isCorrect === true;
                            const selectedOptionText = (q.selectedOption !== null && 
                                                       q.selectedOption !== undefined && 
                                                       q.options && 
                                                       q.options[q.selectedOption]) 
                                                     ? q.options[q.selectedOption] 
                                                     : 'Not answered';
                            const correctOptionText = (q.correctAnswer !== null && 
                                                      q.correctAnswer !== undefined && 
                                                      q.options && 
                                                      q.options[q.correctAnswer]) 
                                                     ? q.options[q.correctAnswer] 
                                                     : 'N/A';
                            
                            return `
                                <div class="question-result ${isCorrect ? 'correct' : 'incorrect'}">
                                    <div class="question-header">
                                        <span class="question-number">Q${index + 1}</span>
                                        <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
                                    </div>
                                    <div class="question-text">${q.question || 'Question text not available'}</div>
                                    <div class="answer-comparison">
                                        <div class="your-answer">
                                            <strong>Your Answer:</strong> ${selectedOptionText}
                                        </div>
                                        <div class="correct-answer">
                                            <strong>Correct Answer:</strong> ${correctOptionText}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="no-details">
                    <p>Detailed question results are not available.</p>
                </div>
            `}
            
            <div class="results-actions">
                <button onclick="printResults()" class="btn btn-secondary">🖨️ Print Results</button>
                <button onclick="goToDashboard()" class="btn btn-primary">📋 Back to Dashboard</button>
                <button onclick="takeAnotherExam()" class="btn btn-outline">📝 Take Another Exam</button>
            </div>
        </div>
    `;
}

// Create results element
function createResultsElement() {
    const resultsElement = document.createElement('div');
    resultsElement.id = 'examResults';
    resultsElement.className = 'exam-results';
    resultsElement.style.display = 'none';
    document.body.appendChild(resultsElement);
    return resultsElement;
}

// Show message for already submitted exam
function showAlreadySubmittedMessage() {
    hideLoading();
    hideError();
    
    const examQuestionsElement = document.getElementById('examQuestions');
    const examInfoElement = document.getElementById('examInfo');
    
    if (examQuestionsElement) examQuestionsElement.style.display = 'none';
    if (examInfoElement) examInfoElement.style.display = 'none';
    
    const messageElement = document.getElementById('alreadySubmittedMessage') || createAlreadySubmittedElement();
    messageElement.style.display = 'block';
    
    messageElement.innerHTML = `
        <div class="already-submitted-container">
            <div class="message-icon">📝</div>
            <h2>Exam Already Submitted</h2>
            <div class="message-content">
                <p>You have already submitted this exam.</p>
                <p>Your results should be available shortly.</p>
            </div>
            <div class="action-buttons">
                <button onclick="retryLoadResults()" class="btn btn-primary">🔄 Try Loading Results</button>
                <button onclick="goToDashboard()" class="btn btn-secondary">📋 Back to Dashboard</button>
                <button onclick="contactSupport()" class="btn btn-outline">📞 Contact Support</button>
            </div>
        </div>
    `;
}

// Create already submitted message element
function createAlreadySubmittedElement() {
    const messageElement = document.createElement('div');
    messageElement.id = 'alreadySubmittedMessage';
    messageElement.className = 'already-submitted-message';
    messageElement.style.display = 'none';
    document.body.appendChild(messageElement);
    return messageElement;
}

// Show submission success
function showSubmissionSuccess(resultData) {
    const examQuestionsElement = document.getElementById('examQuestions');
    const examInfoElement = document.getElementById('examInfo');
    
    if (examQuestionsElement) examQuestionsElement.style.display = 'none';
    if (examInfoElement) examInfoElement.style.display = 'none';
    
    const successElement = document.getElementById('submissionSuccess') || createSuccessElement();
    successElement.style.display = 'block';
    
    successElement.innerHTML = `
        <div class="success-container">
            <h2>✅ Exam Submitted Successfully!</h2>
            <div class="submission-details">
                <p><strong>Submission ID:</strong> ${resultData.submissionId || 'Generated'}</p>
                <p><strong>Total Questions:</strong> ${resultData.totalQuestions || questions.length}</p>
                <p><strong>Questions Answered:</strong> ${resultData.answeredQuestions || Object.values(userAnswers).filter(a => a !== null).length}</p>
                <p><strong>Submitted At:</strong> ${new Date(resultData.submittedAt || Date.now()).toLocaleString()}</p>
                <p><strong>Time Taken:</strong> ${formatDuration(resultData.timeTaken || 0)}</p>
            </div>
            <div class="action-buttons">
                <button onclick="retryLoadResults()" class="btn btn-primary">View Results</button>
                <button onclick="goToDashboard()" class="btn btn-secondary">Back to Dashboard</button>
            </div>
        </div>
    `;
}

// Create success element
function createSuccessElement() {
    const successElement = document.createElement('div');
    successElement.id = 'submissionSuccess';
    successElement.style.display = 'none';
    successElement.className = 'submission-success';
    document.body.appendChild(successElement);
    return successElement;
}

// Retry loading results
async function retryLoadResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('examId');
    
    if (examId) {
        try {
            showLoading();
            await showResultsForSubmittedExam(examId);
        } catch (error) {
            showError('Still unable to load results. Please try again later or contact support.');
        }
    }
}

// Navigation and utility functions
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function printResults() {
    window.print();
}

function goToDashboard() {
    window.location.href = '/student-dashboard';
}

function takeAnotherExam() {
    window.location.href = '/student-dashboard';
}

function contactSupport() {
    window.location.href = '/support.html';
}

function toggleDebugInfo() {
    const debugInfo = document.querySelector('.debug-info');
    if (debugInfo) {
        debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
    }
}

// Utility functions for UI
function showLoading() {
    const loadingElement = document.getElementById('loadingSection');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingSection');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showError(message) {
    const errorElement = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    if (errorElement && errorMessage) {
        errorMessage.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert('Error: ' + message);
    }
}

function hideError() {
    const errorElement = document.getElementById('errorSection');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Event delegation for radio button clicks
function setupEventListeners() {
    document.addEventListener('change', function(event) {
        if (event.target.type === 'radio' && event.target.name.startsWith('question_')) {
            const questionId = event.target.getAttribute('data-question-id');
            const optionIndex = event.target.getAttribute('data-option-index');
            
            if (questionId && optionIndex !== null) {
                selectAnswer(questionId, optionIndex);
            }
        }
    });
    
    const submitButton = document.getElementById('submitExam');
    if (submitButton) {
        submitButton.addEventListener('click', () => submitExam(false));
    }
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => submitExam(false));
    }
}

// Add debug mode
const DEBUG_EYE_TRACKING = true; // Set to false in production

function debugEyeTracking() {
    if (!DEBUG_EYE_TRACKING) return;
    
    // Show vision canvas for debugging
    const canvas = document.getElementById('visionCanvas');
    if (canvas) {
        canvas.style.display = 'block';
        canvas.style.border = '2px solid red';
    }
    
    // Log status every 5 seconds
    setInterval(() => {
        console.log('🔍 Eye Tracking Debug Status:', {
            openCvReady,
            videoElement: !!videoElement,
            faceClassifier: !!faceClassifier,
            eyeClassifier: !!eyeClassifier,
            videoReady: videoElement ? videoElement.readyState : 'N/A',
            canvasSize: visionCanvas ? `${visionCanvas.width}x${visionCanvas.height}` : 'N/A'
        });
    }, 5000);
}

// Call debug function after initialization



// Expose functions to global scope for debugging and external access
window.examDebug = {
    userAnswers,
    questions,
    currentExam,
    timeRemaining,
    updateProgress,
    updateTimerDisplay,
    convertAnswersToArray,
    toggleDebugInfo,
    // Proctoring debug info
    violations,
    maxViolations,
    isExamActive,
    proctoringEnabled,
    cleanupProctoring,
    recordViolation
};


window.examProctoring = {
    violations,
    maxViolations,
    isExamActive,
    proctoringEnabled,
    recordViolation,
    cleanupProctoring,
    autoSubmitDueToViolations,
    initializeProctoring,
    setupProctoringListeners,
    // UPDATED: Add Zoom meeting debug info
    zoomMeetingJoined,
    zoomMeetingConfig,
    endZoomMeeting,
    autoStartZoomMeeting,
    autoJoinZoomMeeting
};
