/**
 * Zoom Meeting SDK Integration for Student Exam Interface
 * This handles the student-side video proctoring functionality
 */

class ZoomStudentSDK {
    constructor() {
        this.zoomSDKInitialized = false;
        this.meetingJoined = false;
        this.meetingClient = null;
        this.mediaStream = null;
        this.currentMeetingConfig = null;
        this.proctorVideoContainer = null;
        
        // Bind methods to maintain context
        this.initializeSDK = this.initializeSDK.bind(this);
        this.joinMeeting = this.joinMeeting.bind(this);
        this.setupVideoContainer = this.setupVideoContainer.bind(this);
    }

    /**
     * Initialize the Zoom Meeting SDK
     */
    async initializeSDK() {
        try {
            console.log('Initializing Zoom Meeting SDK for Student...');
            
            // Import Zoom SDK
            const { ZoomMtg } = await import('https://source.zoom.us/2.18.0/lib/vendor/react/index.js');
            this.ZoomMtg = ZoomMtg;
            
            // Set Zoom SDK dependencies path
            ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
            
            // Preload Zoom SDK
            ZoomMtg.preLoadWasm();
            ZoomMtg.prepareJssdk();

            this.zoomSDKInitialized = true;
            console.log('Zoom SDK initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Zoom SDK:', error);
            throw new Error('Failed to initialize video proctoring system');
        }
    }

    /**
     * Setup video container in the exam interface
     */
    setupVideoContainer() {
        // Create proctoring video container if it doesn't exist
        if (!this.proctorVideoContainer) {
            this.proctorVideoContainer = document.createElement('div');
            this.proctorVideoContainer.id = 'zoom-proctor-container';
            this.proctorVideoContainer.className = 'zoom-proctor-container';
            this.proctorVideoContainer.innerHTML = `
                <div class="proctor-header">
                    <span class="proctor-title">
                        <i class="fas fa-video"></i> 
                        Exam Proctoring Active
                    </span>
                    <span class="proctor-status" id="proctor-status">Connecting...</span>
                </div>
                <div class="video-container" id="zoom-meeting-container">
                    <!-- Zoom meeting will be embedded here -->
                </div>
            `;
            
            // Insert at the top of the exam container
            const examContainer = document.querySelector('.exam-container') || document.body;
            examContainer.insertBefore(this.proctorVideoContainer, examContainer.firstChild);
        }
        
        return this.proctorVideoContainer;
    }

    /**
     * Get meeting signature from backend
     */
    async getMeetingSignature(meetingNumber, userName, userEmail) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch('/api/zoom/student-signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    meetingNumber,
                    userName,
                    userEmail
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;
        } catch (error) {
            console.error('Error getting meeting signature:', error);
            throw error;
        }
    }

    /**
     * Join the proctoring meeting
     */
    async joinMeeting(meetingConfig) {
        try {
            if (!this.zoomSDKInitialized) {
                await this.initializeSDK();
            }

            console.log('Joining proctoring meeting...', meetingConfig);
            
            // Setup video container
            this.setupVideoContainer();
            
            // Get meeting signature from backend
            const signatureData = await this.getMeetingSignature(
                meetingConfig.meetingNumber,
                meetingConfig.userName,
                meetingConfig.userEmail
            );

            // Update meeting config with signature data
            this.currentMeetingConfig = {
                ...meetingConfig,
                ...signatureData
            };

            // Initialize Zoom meeting
            this.ZoomMtg.init({
                leaveUrl: window.location.origin + '/student-dashboard',
                success: (success) => {
                    console.log('Zoom SDK init success:', success);
                    this.startMeeting();
                },
                error: (error) => {
                    console.error('Zoom SDK init error:', error);
                    this.handleMeetingError('Failed to initialize meeting');
                }
            });

        } catch (error) {
            console.error('Error joining meeting:', error);
            this.handleMeetingError(error.message);
        }
    }

    /**
     * Start the meeting with configured settings
     */
    startMeeting() {
        try {
            const config = this.currentMeetingConfig;
            
            this.ZoomMtg.join({
                signature: config.signature,
                sdkKey: config.sdkKey,
                meetingNumber: config.meetingNumber,
                passWord: config.passWord,
                userName: config.userName,
                userEmail: config.userEmail,
                tk: '', // Tracking field
                zak: '', // Zoom Access Key
                
                // Meeting settings for students
                success: (success) => {
                    console.log('Successfully joined proctoring meeting:', success);
                    this.onMeetingJoined();
                },
                error: (error) => {
                    console.error('Failed to join meeting:', error);
                    this.handleMeetingError('Failed to join proctoring session');
                },
                
                // Participant settings
                meetingInfo: [
                    'topic',
                    'host',
                    'mn',
                    'pwd',
                    'telPwd',
                    'invite',
                    'participant',
                    'dc'
                ],
                
                // UI customization for exam environment
                customize: {
                    video: {
                        isResizable: false,
                        viewSizes: {
                            default: {
                                width: 300,
                                height: 200
                            }
                        }
                    },
                    toolbar: {
                        buttons: [
                            // Minimal toolbar - hide most controls from students
                            // Only essential functions remain
                        ]
                    },
                    meetingInfo: {
                        isVisible: false // Hide meeting info to reduce distractions
                    }
                }
            });
            
        } catch (error) {
            console.error('Error starting meeting:', error);
            this.handleMeetingError('Failed to start proctoring session');
        }
    }

    /**
     * Handle successful meeting join
     */
    onMeetingJoined() {
        this.meetingJoined = true;
        
        // Update status
        const statusElement = document.getElementById('proctor-status');
        if (statusElement) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'proctor-status connected';
        }
        
        // Minimize the video container to be unobtrusive
        this.minimizeVideoContainer();
        
        // Set up meeting event listeners
        this.setupMeetingEventListeners();
        
        console.log('Proctoring session is now active');
        
        // Optional: Show brief confirmation to student
        this.showTemporaryMessage('Video proctoring is now active', 'success', 3000);
    }

    /**
     * Setup event listeners for meeting events
     */
    setupMeetingEventListeners() {
        // Listen for meeting events if SDK provides them
        // This would be expanded based on actual Zoom SDK event system
        
        // Monitor for connection issues
        this.checkConnectionStatus();
        
        // Set up periodic connection checks
        setInterval(() => {
            if (this.meetingJoined) {
                this.checkConnectionStatus();
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Check connection status
     */
    checkConnectionStatus() {
        // Implementation would depend on Zoom SDK capabilities
        // For now, we'll assume connection is good if we haven't received errors
        const statusElement = document.getElementById('proctor-status');
        if (statusElement && this.meetingJoined) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'proctor-status connected';
        }
    }

    /**
     * Minimize video container to be less intrusive during exam
     */
    minimizeVideoContainer() {
        if (this.proctorVideoContainer) {
            this.proctorVideoContainer.classList.add('minimized');
        }
    }

    /**
     * Handle meeting errors
     */
    handleMeetingError(errorMessage) {
        console.error('Meeting error:', errorMessage);
        
        const statusElement = document.getElementById('proctor-status');
        if (statusElement) {
            statusElement.textContent = 'Connection Error';
            statusElement.className = 'proctor-status error';
        }
        
        this.showTemporaryMessage(errorMessage, 'error', 5000);
    }

    /**
     * Show temporary message to user
     */
    showTemporaryMessage(message, type = 'info', duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `proctor-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove message after duration
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, duration);
    }

    /**
     * Leave the meeting (when exam ends)
     */
    leaveMeeting() {
        try {
            if (this.meetingJoined && this.ZoomMtg) {
                this.ZoomMtg.leave({
                    success: () => {
                        console.log('Successfully left proctoring meeting');
                        this.meetingJoined = false;
                    },
                    error: (error) => {
                        console.error('Error leaving meeting:', error);
                    }
                });
            }
            
            // Clean up video container
            if (this.proctorVideoContainer && this.proctorVideoContainer.parentNode) {
                this.proctorVideoContainer.parentNode.removeChild(this.proctorVideoContainer);
                this.proctorVideoContainer = null;
            }
            
        } catch (error) {
            console.error('Error during meeting cleanup:', error);
        }
    }

    /**
     * Get current meeting status
     */
    getMeetingStatus() {
        return {
            initialized: this.zoomSDKInitialized,
            joined: this.meetingJoined,
            meetingConfig: this.currentMeetingConfig
        };
    }
}

// Global instance for student proctoring
window.zoomStudent = new ZoomStudentSDK();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZoomStudentSDK;
}
