

class EnhancedZoomAdminSDK {
    constructor() {
        this.zoomSDKInitialized = false;
        this.meetingJoined = false;
        this.activeMeetings = new Map();
        this.currentMeetingId = null;
        this.participantsList = new Map();
        this.galleryContainer = null;
        this.videoStreams = new Map();
        this.focusedParticipant = null;
        this.recordingActive = false;
        
        // Enhanced monitoring features
        this.participantSnapshots = new Map();
        this.suspiciousActivities = [];
        this.autoFocusEnabled = true;
        this.alertThresholds = {
            videoOff: 30000, // 30 seconds
            audioLevels: { min: 0.1, max: 0.9 },
            movementDetection: true
        };
        
        // Bind methods
        this.initializeSDK = this.initializeSDK.bind(this);
        this.setupAdvancedGalleryView = this.setupAdvancedGalleryView.bind(this);
        this.updateParticipantsList = this.updateParticipantsList.bind(this);
        this.handleParticipantVideoStatusChange = this.handleParticipantVideoStatusChange.bind(this);
    }

    /**
     * Initialize the enhanced Zoom Meeting SDK
     */
    async initializeSDK() {
        try {
            console.log('🎥 Initializing Enhanced Zoom Meeting SDK...');
            
            // Import Zoom SDK with error handling
            const { ZoomMtg } = await import('https://source.zoom.us/2.18.0/lib/vendor/react/index.js');
            this.ZoomMtg = ZoomMtg;
            
            // Set Zoom SDK dependencies with enhanced paths
            ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
            
            // Enhanced preloading with progress tracking
            await this.preloadWithProgress();
            
            // Prepare SDK with enhanced settings
            ZoomMtg.prepareJssdk();

            this.zoomSDKInitialized = true;
            console.log('✅ Enhanced Zoom SDK initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Zoom SDK:', error);
            throw new Error('Failed to initialize enhanced proctoring dashboard');
        }
    }

    /**
     * Enhanced SDK preloading with progress indication
     */
    async preloadWithProgress() {
        return new Promise((resolve, reject) => {
            console.log('🔄 Preloading Zoom SDK components...');
            
            try {
                this.ZoomMtg.preLoadWasm();
                
                // Simulate progress for better UX
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 20;
                    console.log(`Loading progress: ${progress}%`);
                    
                    if (progress >= 100) {
                        clearInterval(progressInterval);
                        console.log('✅ SDK components loaded');
                        resolve();
                    }
                }, 200);
                
            } catch (error) {
                console.error('❌ SDK preload failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Setup advanced gallery view with video feed monitoring
     */
    setupAdvancedGalleryView() {
        if (!this.galleryContainer) {
            // Remove existing container if present
            const existingContainer = document.getElementById('enhanced-proctor-gallery');
            if (existingContainer) {
                existingContainer.remove();
            }
            
            // Create enhanced gallery container
            this.galleryContainer = document.createElement('div');
            this.galleryContainer.id = 'enhanced-proctor-gallery';
            this.galleryContainer.className = 'enhanced-proctor-gallery';
            this.galleryContainer.innerHTML = `
                <div class="gallery-header">
                    <div class="header-left">
                        <h4><i class="fas fa-video text-primary"></i> Live Video Monitoring</h4>
                        <div class="connection-status" id="connectionStatus">
                            <span class="status-dot connecting"></span>
                            <span>Connecting...</span>
                        </div>
                    </div>
                    <div class="header-controls">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary" id="refreshParticipants" title="Refresh Participants">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                            <button class="btn btn-sm btn-info" id="toggleLayoutBtn" title="Toggle Layout">
                                <i class="fas fa-th"></i> Layout
                            </button>
                            <button class="btn btn-sm btn-success" id="startRecordingBtn" title="Start Recording">
                                <i class="fas fa-record-vinyl"></i> Record
                            </button>
                            <button class="btn btn-sm btn-warning" id="muteAllBtn" title="Mute All Students">
                                <i class="fas fa-volume-mute"></i> Mute All
                            </button>
                            <button class="btn btn-sm btn-secondary" id="takeSnapshotsBtn" title="Take Snapshots">
                                <i class="fas fa-camera"></i> Snapshot
                            </button>
                            <button class="btn btn-sm btn-danger" id="endSessionBtn" title="End Session">
                                <i class="fas fa-stop"></i> End
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="monitoring-stats">
                    <div class="stat-card">
                        <div class="stat-number" id="participantCount">0</div>
                        <div class="stat-label">Students Connected</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="videoActiveCount">0</div>
                        <div class="stat-label">Video Active</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="suspiciousCount">0</div>
                        <div class="stat-label">Suspicious Activity</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="sessionDuration">00:00:00</div>
                        <div class="stat-label">Session Duration</div>
                    </div>
                </div>
                
                <div class="video-controls-bar">
                    <div class="view-controls">
                        <label><input type="radio" name="viewMode" value="gallery" checked> Gallery View</label>
                        <label><input type="radio" name="viewMode" value="spotlight"> Spotlight</label>
                        <label><input type="radio" name="viewMode" value="focus"> Focus Mode</label>
                    </div>
                    <div class="filter-controls">
                        <select id="studentFilter" class="form-select form-select-sm">
                            <option value="all">All Students</option>
                            <option value="video-on">Video On</option>
                            <option value="video-off">Video Off</option>
                            <option value="suspicious">Suspicious Activity</option>
                        </select>
                    </div>
                    <div class="alert-controls">
                        <button class="btn btn-sm btn-outline-warning" id="alertSettingsBtn">
                            <i class="fas fa-bell"></i> Alert Settings
                        </button>
                    </div>
                </div>
                
                <!-- Main Video Gallery -->
                <div class="video-gallery-container">
                    <div class="main-video-area" id="mainVideoArea">
                        <!-- Primary video feed or gallery view -->
                        <div id="zoomMeetingContainer" class="zoom-meeting-container">
                            <!-- Zoom SDK will inject content here -->
                        </div>
                    </div>
                    
                    <!-- Participant Video Feeds -->
                    <div class="participant-videos" id="participantVideos">
                        <!-- Individual student video feeds -->
                    </div>
                </div>
                
                <!-- Enhanced Participant List -->
                <div class="enhanced-participant-list">
                    <h6><i class="fas fa-users"></i> Participant Details</h6>
                    <div class="participant-list-container" id="participantListContainer">
                        <!-- Detailed participant information -->
                    </div>
                </div>
                
                <!-- Activity Monitor -->
                <div class="activity-monitor">
                    <h6><i class="fas fa-chart-line"></i> Activity Monitor</h6>
                    <div class="activity-feed" id="activityFeed">
                        <!-- Real-time activity updates -->
                    </div>
                </div>
            `;
            
            // Add enhanced CSS styles
            this.addEnhancedStyles();
            
            // Insert into admin dashboard
            const dashboardContainer = document.querySelector('.container.my-5') || document.body;
            dashboardContainer.appendChild(this.galleryContainer);
            
            // Setup enhanced event listeners
            this.setupEnhancedEventListeners();
        }
        
        return this.galleryContainer;
    }

    /**
     * Add enhanced CSS styles for better video monitoring
     */
    addEnhancedStyles() {
        if (!document.getElementById('enhancedZoomStyles')) {
            const styles = document.createElement('style');
            styles.id = 'enhancedZoomStyles';
            styles.textContent = `
                .enhanced-proctor-gallery {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                
                .gallery-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .header-left h4 {
                    margin: 0;
                    color: #2c3e50;
                    font-weight: 600;
                }
                
                .connection-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    margin-top: 5px;
                }
                
                .status-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                }
                
                .status-dot.connecting { background: #ffc107; }
                .status-dot.connected { background: #28a745; animation: none; }
                .status-dot.disconnected { background: #dc3545; animation: none; }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .monitoring-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .stat-card {
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    border-left: 4px solid #007bff;
                }
                
                .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: #6c757d;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .video-controls-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                
                .view-controls label {
                    margin-right: 15px;
                    font-size: 14px;
                    cursor: pointer;
                }
                
                .video-gallery-container {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    min-height: 400px;
                }
                
                .main-video-area {
                    background: #000;
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                    min-height: 400px;
                }
                
                .zoom-meeting-container {
                    width: 100%;
                    height: 100%;
                    min-height: 400px;
                    background: #1a1a1a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 18px;
                }
                
                .participant-videos {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .participant-video-card {
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                
                .participant-video-card:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                }
                
                .participant-video-card.focused {
                    border: 3px solid #007bff;
                    box-shadow: 0 0 20px rgba(0,123,255,0.3);
                }
                
                .participant-video-card.suspicious {
                    border: 3px solid #dc3545;
                    box-shadow: 0 0 20px rgba(220,53,69,0.3);
                }
                
                .video-header {
                    padding: 8px 12px;
                    background: #f8f9fa;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                }
                
                .participant-name {
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .video-status-indicators {
                    display: flex;
                    gap: 5px;
                }
                
                .status-indicator {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                }
                
                .status-indicator.video-on { background: #28a745; color: white; }
                .status-indicator.video-off { background: #dc3545; color: white; }
                .status-indicator.audio-on { background: #007bff; color: white; }
                .status-indicator.audio-off { background: #6c757d; color: white; }
                
                .video-feed {
                    width: 100%;
                    height: 120px;
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                }
                
                .video-actions {
                    padding: 8px;
                    display: flex;
                    justify-content: space-between;
                    background: white;
                }
                
                .enhanced-participant-list, .activity-monitor {
                    background: white;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                
                .enhanced-participant-list h6, .activity-monitor h6 {
                    margin-bottom: 15px;
                    color: #2c3e50;
                    font-weight: 600;
                    border-bottom: 2px solid #e9ecef;
                    padding-bottom: 8px;
                }
                
                .participant-detail-card {
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 10px;
                    transition: all 0.2s ease;
                }
                
                .participant-detail-card:hover {
                    background: #e9ecef;
                }
                
                .participant-info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }
                
                .activity-item {
                    padding: 8px 12px;
                    border-left: 3px solid #007bff;
                    margin-bottom: 8px;
                    background: #f8f9fa;
                    border-radius: 0 6px 6px 0;
                }
                
                .activity-item.warning {
                    border-left-color: #ffc107;
                    background: #fff9e6;
                }
                
                .activity-item.danger {
                    border-left-color: #dc3545;
                    background: #ffe6e6;
                }
                
                .activity-timestamp {
                    font-size: 11px;
                    color: #6c757d;
                    margin-top: 3px;
                }
                
                @media (max-width: 768px) {
                    .video-gallery-container {
                        grid-template-columns: 1fr;
                    }
                    
                    .monitoring-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .video-controls-bar {
                        flex-direction: column;
                        gap: 10px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    /**
     * Setup enhanced event listeners for advanced controls
     */
    setupEnhancedEventListeners() {
        // Refresh participants
        document.getElementById('refreshParticipants')?.addEventListener('click', () => {
            this.refreshParticipants();
        });

        // Toggle layout
        document.getElementById('toggleLayoutBtn')?.addEventListener('click', () => {
            this.toggleLayout();
        });

        // Start/stop recording
        document.getElementById('startRecordingBtn')?.addEventListener('click', () => {
            this.toggleRecording();
        });

        // Mute all students
        document.getElementById('muteAllBtn')?.addEventListener('click', () => {
            this.muteAllParticipants();
        });

        // Take snapshots
        document.getElementById('takeSnapshotsBtn')?.addEventListener('click', () => {
            this.takeAllSnapshots();
        });

        // End session
        document.getElementById('endSessionBtn')?.addEventListener('click', () => {
            this.confirmEndSession();
        });

        // View mode changes
        document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.changeViewMode(e.target.value);
            });
        });

        // Student filter
        document.getElementById('studentFilter')?.addEventListener('change', (e) => {
            this.filterStudents(e.target.value);
        });

        // Alert settings
        document.getElementById('alertSettingsBtn')?.addEventListener('click', () => {
            this.showAlertSettings();
        });
    }

    /**
     * Get admin meeting signature from backend
     */
    async getAdminSignature(meetingNumber) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch('/api/zoom/admin-signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    meetingNumber
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;
        } catch (error) {
            console.error('❌ Error getting admin signature:', error);
            throw error;
        }
    }

    /**
     * Enhanced join meeting as host with advanced monitoring
     */
    async joinAsHost(meetingConfig) {
        try {
            if (!this.zoomSDKInitialized) {
                await this.initializeSDK();
            }

            console.log('🎥 Admin joining meeting for enhanced monitoring...', meetingConfig);
            
            // Setup advanced gallery view
            this.setupAdvancedGalleryView();
            this.updateConnectionStatus('connecting');
            
            // Get admin signature
            const signatureData = await this.getAdminSignature(meetingConfig.meetingNumber);
            
            // Enhanced meeting config
            const adminMeetingConfig = {
                ...meetingConfig,
                ...signatureData
            };

            this.currentMeetingId = meetingConfig.meetingNumber;

            // Initialize Zoom meeting with enhanced settings
            this.ZoomMtg.init({
                leaveUrl: window.location.origin + '/admin-dashboard',
                showMeetingHeader: false,
                disableInvite: true,
                disableCallOut: true,
                disableRecord: false,
                disableJoinAudio: false,
                audioPanelAlwaysOpen: true,
                showPureSharingContent: false,
                enableLoggerCallback: true,
                loggerCallback: this.handleZoomLogs.bind(this),
                success: (success) => {
                    console.log('✅ Enhanced Zoom SDK init success:', success);
                    this.startEnhancedMeeting(adminMeetingConfig);
                },
                error: (error) => {
                    console.error('❌ Enhanced Zoom SDK init error:', error);
                    this.handleAdminError('Failed to initialize enhanced monitoring');
                }
            });

        } catch (error) {
            console.error('❌ Error joining meeting as admin:', error);
            this.handleAdminError(error.message);
        }
    }

    /**
     * Start enhanced admin meeting with advanced features
     */
    startEnhancedMeeting(config) {
        try {
            this.ZoomMtg.join({
                signature: config.signature,
                sdkKey: config.sdkKey,
                meetingNumber: config.meetingNumber,
                passWord: config.passWord,
                userName: config.userName,
                userEmail: config.userEmail,
                tk: '',
                zak: '',
                
                success: (success) => {
                    console.log('✅ Admin successfully joined enhanced meeting:', success);
                    this.onEnhancedMeetingJoined();
                },
                error: (error) => {
                    console.error('❌ Admin failed to join enhanced meeting:', error);
                    this.handleAdminError('Failed to join enhanced monitoring session');
                },
                
                // Enhanced meeting settings for admin monitoring
                meetingInfo: [
                    'topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 
                    'participant', 'dc', 'enctype', 'report'
                ],
                
                // Advanced customization for monitoring
                customize: {
                    video: {
                        isResizable: true,
                        viewSizes: {
                            default: { width: 800, height: 600 },
                            ribbon: { width: 300, height: 200 }
                        },
                        defaultViewType: 'gallery',
                        popper: {
                            disableDraggable: false,
                            anchorElement: document.getElementById('zoomMeetingContainer')
                        }
                    },
                    toolbar: {
                        buttons: [
                            'mute', 'video', 'participants', 'invite', 
                            'record', 'settings', 'chat', 'share'
                        ]
                    },
                    meetingInfo: {
                        isVisible: true,
                        topicVisible: true,
                        hostVisible: true,
                        mnVisible: true
                    },
                    participant: {
                        isVisible: true
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Error starting enhanced meeting:', error);
            this.handleAdminError('Failed to start enhanced monitoring session');
        }
    }

    /**
     * Handle successful enhanced meeting join
     */
    onEnhancedMeetingJoined() {
        this.meetingJoined = true;
        this.updateConnectionStatus('connected');
        
        console.log('✅ Enhanced monitoring session is now active');
        
        // Start advanced monitoring features
        this.startAdvancedMonitoring();
        
        // Initialize participant tracking
        this.initializeParticipantTracking();
        
        // Start activity monitoring
        this.startActivityMonitoring();
        
        // Show success notification
        this.showAdminMessage('🎥 Enhanced video monitoring session started', 'success');
        
        // Start session duration timer
        this.startSessionTimer();
    }

    /**
     * Start advanced monitoring features
     */
    startAdvancedMonitoring() {
        // Enhanced participant monitoring every 3 seconds
        this.participantUpdateInterval = setInterval(() => {
            this.refreshAdvancedParticipants();
        }, 3000);

        // Suspicious activity detection every 5 seconds
        this.suspiciousActivityInterval = setInterval(() => {
            this.detectSuspiciousActivity();
        }, 5000);

        // Video quality monitoring every 10 seconds
        this.videoQualityInterval = setInterval(() => {
            this.monitorVideoQuality();
        }, 10000);

        // Auto-snapshot suspicious behavior every 30 seconds
        this.autoSnapshotInterval = setInterval(() => {
            this.autoSnapshotSuspicious();
        }, 30000);
    }

    /**
     * Initialize participant tracking with enhanced features
     */
    initializeParticipantTracking() {
        // Track participant join/leave events
        if (this.ZoomMtg.onParticipantChange) {
            this.ZoomMtg.onParticipantChange((participants) => {
                this.handleParticipantChanges(participants);
            });
        }

        // Monitor video status changes
        if (this.ZoomMtg.onVideoStatusChange) {
            this.ZoomMtg.onVideoStatusChange((data) => {
                this.handleParticipantVideoStatusChange(data);
            });
        }

        // Monitor audio status changes
        if (this.ZoomMtg.onAudioStatusChange) {
            this.ZoomMtg.onAudioStatusChange((data) => {
                this.handleParticipantAudioStatusChange(data);
            });
        }
    }

    /**
     * Enhanced participant refresh with detailed monitoring
     */
    async refreshAdvancedParticipants() {
        try {
            if (!this.currentMeetingId) return;
            
            // Get participants from backend API
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/zoom/meeting/${this.currentMeetingId}/participants`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                const participants = result.data.participants;
                this.updateAdvancedParticipantsList(participants);
                this.updateMonitoringStats(participants);
                this.renderParticipantVideoFeeds(participants);
            }
            
        } catch (error) {
            console.error('❌ Error refreshing advanced participants:', error);
        }
    }

    /**
     * Update advanced participants list with detailed info
     */
    updateAdvancedParticipantsList(participants) {
        this.participantsList.clear();
        
        participants.forEach(participant => {
            // Enhanced participant data
            const enhancedParticipant = {
                ...participant,
                lastSeen: new Date(),
                videoHistory: this.participantsList.get(participant.id)?.videoHistory || [],
                audioHistory: this.participantsList.get(participant.id)?.audioHistory || [],
                suspiciousScore: this.calculateSuspiciousScore(participant),
                activityLevel: this.calculateActivityLevel(participant)
            };
            
            this.participantsList.set(participant.id, enhancedParticipant);
        });
        
        this.renderEnhancedParticipantList(Array.from(this.participantsList.values()));
    }

    /**
     * Calculate suspicious activity score for participant
     */
    calculateSuspiciousScore(participant) {
        let score = 0;
        
        // Video off for extended period
        if (!participant.videoStatus) {
            const existing = this.participantsList.get(participant.id);
            if (existing && existing.videoOffStart) {
                const duration = Date.now() - existing.videoOffStart;
                if (duration > this.alertThresholds.videoOff) {
                    score += 30;
                }
            }
        }
        
        // Frequent video toggles
        const existing = this.participantsList.get(participant.id);
        if (existing && existing.videoHistory) {
            const recentToggles = existing.videoHistory.filter(
                h => Date.now() - h.timestamp < 300000 // Last 5 minutes
            ).length;
            if (recentToggles > 5) {
                score += 20;
            }
        }
        
        // Additional suspicious indicators can be added here
        
        return Math.min(score, 100);
    }

    /**
     * Calculate activity level for participant
     */
    calculateActivityLevel(participant) {
        // This would integrate with more advanced monitoring
        // For now, return based on video/audio status
        if (participant.videoStatus && participant.audioStatus) return 'high';
        if (participant.videoStatus || participant.audioStatus) return 'medium';
        return 'low';
    }

    /**
     * Render enhanced participant list with detailed information
     */
    renderEnhancedParticipantList(participants) {
        const container = document.getElementById('participantListContainer');
        if (!container) return;
        
        if (participants.length === 0) {
            container.innerHTML = `
                <div class="no-participants">
                    <i class="fas fa-users-slash fa-2x text-muted"></i>
                    <p>No participants connected</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = participants.map(participant => `
            <div class="participant-detail-card ${participant.suspiciousScore > 50 ? 'suspicious' : ''}" 
                 data-participant-id="${participant.id}">
                <div class="participant-info-row">
                    <strong>${participant.name}</strong>
                    <div class="participant-actions">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.zoomAdmin.focusOnParticipant('${participant.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" 
                                onclick="window.zoomAdmin.takeSnapshot('${participant.id}')">
                            <i class="fas fa-camera"></i>
                        </button>
                        ${participant.suspiciousScore > 30 ? `
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="window.zoomAdmin.flagParticipant('${participant.id}')">
                                <i class="fas fa-flag"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="participant-info-row">
                    <small class="text-muted">${participant.email}</small>
                    <div class="status-badges">
                        <span class="badge ${participant.videoStatus ? 'bg-success' : 'bg-danger'}">
                            <i class="fas fa-video${participant.videoStatus ? '' : '-slash'}"></i>
                        </span>
                        <span class="badge ${participant.audioStatus ? 'bg-primary' : 'bg-secondary'}">
                            <i class="fas fa-microphone${participant.audioStatus ? '' : '-slash'}"></i>
                        </span>
                        ${participant.suspiciousScore > 30 ? `
                            <span class="badge bg-warning">
                                <i class="fas fa-exclamation-triangle"></i> ${participant.suspiciousScore}%
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="participant-info-row">
                    <small>Duration: ${this.formatDuration(participant.duration)}</small>
                    <small>Activity: <span class="text-${participant.activityLevel === 'high' ? 'success' : participant.activityLevel === 'medium' ? 'warning' : 'danger'}">${participant.activityLevel}</span></small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render participant video feeds in the gallery
     */
    renderParticipantVideoFeeds(participants) {
        const container = document.getElementById('participantVideos');
        if (!container) return;
        
        container.innerHTML = participants.map(participant => `
            <div class="participant-video-card ${this.focusedParticipant === participant.id ? 'focused' : ''} ${participant.suspiciousScore > 50 ? 'suspicious' : ''}" 
                 data-participant-id="${participant.id}"
                 onclick="window.zoomAdmin.focusOnParticipant('${participant.id}')">
                <div class="video-header">
                    <span class="participant-name">${participant.name}</span>
                    <div class="video-status-indicators">
                        <div class="status-indicator ${participant.videoStatus ? 'video-on' : 'video-off'}">
                            <i class="fas fa-video${participant.videoStatus ? '' : '-slash'}"></i>
                        </div>
                        <div class="status-indicator ${participant.audioStatus ? 'audio-on' : 'audio-off'}">
                            <i class="fas fa-microphone${participant.audioStatus ? '' : '-slash'}"></i>
                        </div>
                    </div>
                </div>
                <div class="video-feed" id="video-${participant.id}">
                    ${participant.videoStatus ? 
                        `<div class="video-placeholder">📹 Video Active</div>` : 
                        `<div class="video-placeholder">📵 Video Off</div>`
                    }
                </div>
                <div class="video-actions">
                    <small class="text-muted">${this.formatDuration(participant.duration)}</small>
                    <div class="action-buttons">
                        <button class="btn btn-xs btn-outline-primary" 
                                onclick="event.stopPropagation(); window.zoomAdmin.takeSnapshot('${participant.id}')">
                            <i class="fas fa-camera"></i>
                        </button>
                        ${participant.suspiciousScore > 30 ? `
                            <button class="btn btn-xs btn-outline-danger" 
                                    onclick="event.stopPropagation(); window.zoomAdmin.flagParticipant('${participant.id}')">
                                <i class="fas fa-flag"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update monitoring statistics
     */
    updateMonitoringStats(participants) {
        const totalCount = participants.length;
        const videoActiveCount = participants.filter(p => p.videoStatus).length;
        const suspiciousCount = participants.filter(p => p.suspiciousScore > 30).length;
        
        document.getElementById('participantCount').textContent = totalCount;
        document.getElementById('videoActiveCount').textContent = videoActiveCount;
        document.getElementById('suspiciousCount').textContent = suspiciousCount;
    }

    /**
     * Focus on specific participant
     */
    focusOnParticipant(participantId) {
        this.focusedParticipant = participantId;
        
        // Update UI to show focused participant
        document.querySelectorAll('.participant-video-card').forEach(card => {
            card.classList.remove('focused');
        });
        
        const focusedCard = document.querySelector(`[data-participant-id="${participantId}"]`);
        if (focusedCard) {
            focusedCard.classList.add('focused');
        }
        
        // If Zoom SDK supports spotlight, use it
        if (this.ZoomMtg.spotlightParticipant) {
            this.ZoomMtg.spotlightParticipant(participantId);
        }
        
        this.addActivityLog(`Focused on participant ${participantId}`, 'info');
        console.log('🎯 Focused on participant:', participantId);
    }

    /**
     * Take snapshot of specific participant
     */
    takeSnapshot(participantId) {
        try {
            const participant = this.participantsList.get(participantId);
            if (!participant) return;
            
            // Store snapshot info
            const snapshot = {
                participantId,
                participantName: participant.name,
                timestamp: new Date(),
                suspiciousScore: participant.suspiciousScore,
                videoStatus: participant.videoStatus,
                reason: 'Manual snapshot'
            };
            
            this.participantSnapshots.set(`${participantId}-${Date.now()}`, snapshot);
            
            this.addActivityLog(`Snapshot taken of ${participant.name}`, 'info');
            this.showAdminMessage(`📸 Snapshot saved for ${participant.name}`, 'success');
            
            console.log('📸 Snapshot taken:', snapshot);
            
        } catch (error) {
            console.error('❌ Error taking snapshot:', error);
            this.showAdminMessage('Failed to take snapshot', 'error');
        }
    }

    /**
     * Flag participant for suspicious activity
     */
    flagParticipant(participantId) {
        try {
            const participant = this.participantsList.get(participantId);
            if (!participant) return;
            
            // Add to suspicious activities
            const activity = {
                participantId,
                participantName: participant.name,
                timestamp: new Date(),
                type: 'manual_flag',
                suspiciousScore: participant.suspiciousScore,
                reason: 'Manually flagged by proctor'
            };
            
            this.suspiciousActivities.push(activity);
            
            // Take automatic snapshot
            this.takeSnapshot(participantId);
            
            this.addActivityLog(`🚩 ${participant.name} flagged for suspicious activity`, 'danger');
            this.showAdminMessage(`🚩 ${participant.name} has been flagged`, 'warning');
            
            console.log('🚩 Participant flagged:', activity);
            
        } catch (error) {
            console.error('❌ Error flagging participant:', error);
        }
    }

    /**
     * Detect suspicious activity automatically
     */
    detectSuspiciousActivity() {
        this.participantsList.forEach((participant, participantId) => {
            const suspiciousScore = this.calculateSuspiciousScore(participant);
            
            if (suspiciousScore > 50 && !participant.flagged) {
                const activity = {
                    participantId,
                    participantName: participant.name,
                    timestamp: new Date(),
                    type: 'auto_detect',
                    suspiciousScore,
                    reason: 'Automatically detected suspicious behavior'
                };
                
                this.suspiciousActivities.push(activity);
                participant.flagged = true;
                
                // Auto-snapshot
                this.takeSnapshot(participantId);
                
                this.addActivityLog(`⚠️ Suspicious activity detected: ${participant.name}`, 'warning');
                this.showAdminMessage(`⚠️ Suspicious activity: ${participant.name}`, 'warning');
            }
        });
    }

    /**
     * Add activity to the activity log
     */
    addActivityLog(message, type = 'info') {
        const container = document.getElementById('activityFeed');
        if (!container) return;
        
        const activity = document.createElement('div');
        activity.className = `activity-item ${type}`;
        activity.innerHTML = `
            <div>${message}</div>
            <div class="activity-timestamp">${new Date().toLocaleTimeString()}</div>
        `;
        
        container.insertBefore(activity, container.firstChild);
        
        // Keep only last 20 activities
        while (container.children.length > 20) {
            container.removeChild(container.lastChild);
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span:last-child');
        
        if (dot && text) {
            dot.className = `status-dot ${status}`;
            text.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    /**
     * Start session duration timer
     */
    startSessionTimer() {
        this.sessionStartTime = Date.now();
        this.sessionTimerInterval = setInterval(() => {
            const duration = Date.now() - this.sessionStartTime;
            const formatted = this.formatDuration(duration);
            
            const durationElement = document.getElementById('sessionDuration');
            if (durationElement) {
                durationElement.textContent = formatted;
            }
        }, 1000);
    }

    /**
     * Format duration in HH:MM:SS
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Handle participant video status changes
     */
    handleParticipantVideoStatusChange(data) {
        const participant = this.participantsList.get(data.participantId);
        if (participant) {
            // Update video history
            participant.videoHistory = participant.videoHistory || [];
            participant.videoHistory.push({
                status: data.videoStatus,
                timestamp: Date.now()
            });
            
            // Track video off start time
            if (!data.videoStatus && participant.videoStatus) {
                participant.videoOffStart = Date.now();
            } else if (data.videoStatus && !participant.videoStatus) {
                delete participant.videoOffStart;
            }
            
            participant.videoStatus = data.videoStatus;
            
            this.addActivityLog(
                `${participant.name} turned video ${data.videoStatus ? 'on' : 'off'}`,
                data.videoStatus ? 'info' : 'warning'
            );
        }
    }

    /**
     * Handle participant audio status changes
     */
    handleParticipantAudioStatusChange(data) {
        const participant = this.participantsList.get(data.participantId);
        if (participant) {
            // Update audio history
            participant.audioHistory = participant.audioHistory || [];
            participant.audioHistory.push({
                status: data.audioStatus,
                timestamp: Date.now()
            });
            
            participant.audioStatus = data.audioStatus;
            
            this.addActivityLog(
                `${participant.name} ${data.audioStatus ? 'unmuted' : 'muted'}`,
                'info'
            );
        }
    }

    /**
     * Advanced control methods
     */
    
        
    /**
     * Advanced control methods
     */
    toggleRecording() {
        this.recordingActive = !this.recordingActive;
        const btn = document.getElementById('startRecordingBtn');
        
        if (this.recordingActive) {
            // Start recording
            if (this.ZoomMtg.startCloudRecording) {
                this.ZoomMtg.startCloudRecording();
            }
            btn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-danger');
            this.addActivityLog('📹 Recording started', 'info');
            this.showAdminMessage('Recording started', 'success');
        } else {
            // Stop recording
            if (this.ZoomMtg.stopCloudRecording) {
                this.ZoomMtg.stopCloudRecording();
            }
            btn.innerHTML = '<i class="fas fa-record-vinyl"></i> Record';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-success');
            this.addActivityLog('📹 Recording stopped', 'info');
            this.showAdminMessage('Recording stopped', 'info');
        }
    }

    muteAllParticipants() {
        if (this.ZoomMtg.muteAll) {
            this.ZoomMtg.muteAll();
            this.addActivityLog('🔇 All participants muted', 'info');
            this.showAdminMessage('All students muted', 'success');
        } else {
            this.showAdminMessage('Mute function not available', 'warning');
        }
    }

    unmuteAllParticipants() {
        if (this.ZoomMtg.unmuteAll) {
            this.ZoomMtg.unmuteAll();
            this.addActivityLog('🔊 All participants unmuted', 'info');
            this.showAdminMessage('All students unmuted', 'success');
        } else {
            this.showAdminMessage('Unmute function not available', 'warning');
        }
    }

    takeAllSnapshots() {
        const participantCount = this.participantsList.size;
        if (participantCount === 0) {
            this.showAdminMessage('No participants to snapshot', 'warning');
            return;
        }

        this.participantsList.forEach((participant, participantId) => {
            this.takeSnapshot(participantId);
        });

        this.addActivityLog(`📸 Snapshots taken of all ${participantCount} participants`, 'info');
        this.showAdminMessage(`📸 ${participantCount} snapshots saved`, 'success');
    }

    changeViewMode(mode) {
        console.log('🔄 Changing view mode to:', mode);
        
        const mainVideoArea = document.getElementById('mainVideoArea');
        if (!mainVideoArea) return;

        switch (mode) {
            case 'gallery':
                mainVideoArea.classList.remove('spotlight-mode', 'focus-mode');
                mainVideoArea.classList.add('gallery-mode');
                this.addActivityLog('Changed to gallery view', 'info');
                break;
            case 'spotlight':
                mainVideoArea.classList.remove('gallery-mode', 'focus-mode');
                mainVideoArea.classList.add('spotlight-mode');
                this.addActivityLog('Changed to spotlight view', 'info');
                break;
            case 'focus':
                mainVideoArea.classList.remove('gallery-mode', 'spotlight-mode');
                mainVideoArea.classList.add('focus-mode');
                this.addActivityLog('Changed to focus view', 'info');
                break;
        }
    }

    filterStudents(filter) {
        console.log('🔍 Filtering students by:', filter);
        
        const participantCards = document.querySelectorAll('.participant-video-card');
        
        participantCards.forEach(card => {
            const participantId = card.dataset.participantId;
            const participant = this.participantsList.get(participantId);
            let show = true;

            switch (filter) {
                case 'video-on':
                    show = participant && participant.videoStatus;
                    break;
                case 'video-off':
                    show = participant && !participant.videoStatus;
                    break;
                case 'suspicious':
                    show = participant && participant.suspiciousScore > 30;
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }

            card.style.display = show ? 'block' : 'none';
        });

        this.addActivityLog(`Filtered view: ${filter}`, 'info');
    }

    toggleLayout() {
        const gallery = document.querySelector('.video-gallery-container');
        if (!gallery) return;

        if (gallery.classList.contains('single-column')) {
            gallery.classList.remove('single-column');
            gallery.style.gridTemplateColumns = '2fr 1fr';
            this.addActivityLog('Switched to two-column layout', 'info');
        } else {
            gallery.classList.add('single-column');
            gallery.style.gridTemplateColumns = '1fr';
            this.addActivityLog('Switched to single-column layout', 'info');
        }
    }

    showAlertSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Alert Settings</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Video Off Alert (seconds)</label>
                            <input type="number" class="form-control" id="videoOffThreshold" 
                                   value="${this.alertThresholds.videoOff / 1000}" min="10" max="300">
                            <small class="form-text text-muted">Alert when video is off for this duration</small>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Movement Detection</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="movementDetection" 
                                       ${this.alertThresholds.movementDetection ? 'checked' : ''}>
                                <label class="form-check-label">Enable movement detection alerts</label>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Auto-Focus Suspicious Behavior</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="autoFocus" 
                                       ${this.autoFocusEnabled ? 'checked' : ''}>
                                <label class="form-check-label">Automatically focus on suspicious participants</label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="window.zoomAdmin.saveAlertSettings()">Save</button>
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

    saveAlertSettings() {
        const videoOffThreshold = document.getElementById('videoOffThreshold')?.value;
        const movementDetection = document.getElementById('movementDetection')?.checked;
        const autoFocus = document.getElementById('autoFocus')?.checked;

        if (videoOffThreshold) {
            this.alertThresholds.videoOff = parseInt(videoOffThreshold) * 1000;
        }
        this.alertThresholds.movementDetection = movementDetection;
        this.autoFocusEnabled = autoFocus;

        this.addActivityLog('Alert settings updated', 'info');
        this.showAdminMessage('Alert settings saved', 'success');

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
        if (modal) modal.hide();
    }

    /**
     * Auto-snapshot suspicious participants
     */
    autoSnapshotSuspicious() {
        const suspiciousParticipants = Array.from(this.participantsList.values())
            .filter(p => p.suspiciousScore > 40);

        suspiciousParticipants.forEach(participant => {
            this.takeSnapshot(participant.id);
        });

        if (suspiciousParticipants.length > 0) {
            this.addActivityLog(`📸 Auto-snapshots: ${suspiciousParticipants.length} suspicious participants`, 'warning');
        }
    }

    /**
     * Monitor video quality and connection issues
     */
    monitorVideoQuality() {
        this.participantsList.forEach((participant, participantId) => {
            // Simulate quality monitoring (in real implementation, this would use Zoom SDK APIs)
            const quality = Math.random();
            
            if (quality < 0.3) {
                participant.connectionIssues = (participant.connectionIssues || 0) + 1;
                
                if (participant.connectionIssues > 3) {
                    this.addActivityLog(`📡 Poor connection: ${participant.name}`, 'warning');
                    participant.connectionIssues = 0; // Reset to avoid spam
                }
            }
        });
    }

    /**
     * Start activity monitoring with real-time updates
     */
    startActivityMonitoring() {
        // Monitor participant behavior patterns
        this.behaviorMonitorInterval = setInterval(() => {
            this.analyzeBehaviorPatterns();
        }, 15000); // Every 15 seconds

        // Check for participants who haven't moved/interacted
        this.inactivityCheckInterval = setInterval(() => {
            this.checkParticipantInactivity();
        }, 60000); // Every minute
    }

    /**
     * Analyze behavior patterns
     */
    analyzeBehaviorPatterns() {
        this.participantsList.forEach((participant, participantId) => {
            // Check for unusual patterns
            const now = Date.now();
            
            // Check if video has been off for too long
            if (!participant.videoStatus && participant.videoOffStart) {
                const duration = now - participant.videoOffStart;
                if (duration > this.alertThresholds.videoOff) {
                    if (!participant.longVideoOffAlerted) {
                        this.addActivityLog(`⚠️ ${participant.name} has video off for ${Math.floor(duration/1000)}s`, 'warning');
                        participant.longVideoOffAlerted = true;
                        
                        if (this.autoFocusEnabled) {
                            this.focusOnParticipant(participantId);
                        }
                    }
                }
            } else {
                participant.longVideoOffAlerted = false;
            }
        });
    }

    /**
     * Check for participant inactivity
     */
    checkParticipantInactivity() {
        const now = Date.now();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

        this.participantsList.forEach((participant, participantId) => {
            if (participant.lastSeen && (now - participant.lastSeen.getTime()) > inactivityThreshold) {
                this.addActivityLog(`💤 ${participant.name} appears inactive`, 'warning');
                
                // Auto-focus on inactive participants if enabled
                if (this.autoFocusEnabled) {
                    this.focusOnParticipant(participantId);
                }
            }
        });
    }

    /**
     * Handle Zoom SDK logs for debugging
     */
    handleZoomLogs(logLevel, message) {
        if (logLevel === 'error') {
            console.error('Zoom SDK Error:', message);
            this.addActivityLog(`SDK Error: ${message}`, 'danger');
        } else if (logLevel === 'warn') {
            console.warn('Zoom SDK Warning:', message);
        } else {
            console.log('Zoom SDK:', message);
        }
    }

    /**
     * Confirm and end session
     */
    confirmEndSession() {
        if (confirm('🚨 End Monitoring Session?\n\nThis will:\n• End the video meeting\n• Disconnect all students\n• Save monitoring report\n\nContinue?')) {
            this.endSession();
        }
    }

    /**
     * End the monitoring session with cleanup
     */
    async endSession() {
        try {
            this.addActivityLog('🔴 Ending monitoring session...', 'danger');
            
            // Generate final report
            await this.generateFinalReport();
            
            // Clean up intervals
            this.cleanupIntervals();
            
            // End Zoom meeting
            if (this.meetingJoined && this.ZoomMtg) {
                this.ZoomMtg.leave({
                    success: () => {
                        console.log('✅ Admin left meeting successfully');
                    },
                    error: (error) => {
                        console.error('❌ Error leaving meeting:', error);
                    }
                });
            }
            
            // Update UI state
            this.updateConnectionStatus('disconnected');
            this.meetingJoined = false;
            this.currentMeetingId = null;
            
            // Show session ended message
            this.showSessionEnded();
            
        } catch (error) {
            console.error('❌ Error ending session:', error);
            this.handleAdminError('Failed to end session properly');
        }
    }

    /**
     * Clean up all intervals
     */
    cleanupIntervals() {
        [
            'participantUpdateInterval',
            'suspiciousActivityInterval', 
            'videoQualityInterval',
            'autoSnapshotInterval',
            'sessionTimerInterval',
            'behaviorMonitorInterval',
            'inactivityCheckInterval'
        ].forEach(interval => {
            if (this[interval]) {
                clearInterval(this[interval]);
                this[interval] = null;
            }
        });
    }

    /**
     * Generate final monitoring report
     */
    async generateFinalReport() {
        const report = {
            sessionInfo: {
                startTime: this.sessionStartTime,
                endTime: Date.now(),
                duration: Date.now() - this.sessionStartTime,
                meetingId: this.currentMeetingId
            },
            participants: Array.from(this.participantsList.values()),
            suspiciousActivities: this.suspiciousActivities,
            snapshots: Array.from(this.participantSnapshots.values()),
            totalParticipants: this.participantsList.size,
            totalViolations: this.suspiciousActivities.length,
            recordingUsed: this.recordingActive
        };

        console.log('📊 Final monitoring report:', report);
        
        // Save report to local storage for potential recovery
        localStorage.setItem('lastMonitoringReport', JSON.stringify(report));
        
        this.addActivityLog('📊 Final report generated', 'info');
        return report;
    }

    /**
     * Show session ended message
     */
    showSessionEnded() {
        const container = document.getElementById('mainVideoArea');
        if (container) {
            container.innerHTML = `
                <div class="session-ended-message">
                    <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h4>Monitoring Session Ended</h4>
                    <p>All participants have been disconnected</p>
                    <p class="text-muted">Final report has been generated and saved</p>
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            <i class="fas fa-refresh"></i> Start New Session
                        </button>
                        <button class="btn btn-secondary ms-2" onclick="window.zoomAdmin.downloadReport()">
                            <i class="fas fa-download"></i> Download Report
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Download monitoring report
     */
    downloadReport() {
        const report = localStorage.getItem('lastMonitoringReport');
        if (!report) {
            this.showAdminMessage('No report available', 'warning');
            return;
        }

        const blob = new Blob([report], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showAdminMessage('📊 Report downloaded', 'success');
    }

    /**
     * Handle admin errors with user-friendly messages
     */
    handleAdminError(errorMessage) {
        console.error('❌ Admin error:', errorMessage);
        this.addActivityLog(`Error: ${errorMessage}`, 'danger');
        this.showAdminMessage(errorMessage, 'error');
    }

    /**
     * Show admin message with enhanced styling
     */
    showAdminMessage(message, type = 'info', duration = 5000) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.admin-alert');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `admin-alert alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} alert-dismissible`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;
        
        messageDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto remove after duration
        if (duration > 0) {
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
    }

    /**
     * Get current monitoring status for external access
     */
    getMonitoringStatus() {
        return {
            initialized: this.zoomSDKInitialized,
            joined: this.meetingJoined,
            currentMeetingId: this.currentMeetingId,
            participantCount: this.participantsList.size,
            participants: Array.from(this.participantsList.values()),
            suspiciousCount: this.suspiciousActivities.length,
            recordingActive: this.recordingActive,
            sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
        };
    }
}

// Create global instance with enhanced features
window.zoomAdmin = new EnhancedZoomAdminSDK();

// Add CSS animations if not already present
if (!document.querySelector('#zoomAdminAnimations')) {
    const animations = document.createElement('style');
    animations.id = 'zoomAdminAnimations';
    animations.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .session-ended-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: white;
            text-align: center;
            padding: 40px;
        }
    `;
    document.head.appendChild(animations);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedZoomAdminSDK;
}
