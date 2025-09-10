const crypto = require('crypto');
const { KJUR } = require('jsrsasign');

class ZoomController {
    constructor() {
        this.sdkKey = process.env.ZOOM_SDK_KEY;
        this.sdkSecret = process.env.ZOOM_SDK_SECRET;
        this.clientId = process.env.ZOOM_CLIENT_ID;
        this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
        this.accountId = process.env.ZOOM_ACCOUNT_ID;
        this.meetingDomain = process.env.ZOOM_MEETING_DOMAIN || 'zoom.us';
    }

    /**
     * Generate Zoom Meeting SDK signature for joining meetings
     */
    generateSignature(meetingNumber, role) {
        try {
            const timestamp = new Date().getTime() - 30000;
            const msg = Buffer.from(this.sdkKey + meetingNumber + timestamp + role).toString('base64');
            const hash = crypto.createHmac('sha256', this.sdkSecret).update(msg).digest('base64');
            const signature = Buffer.from(`${this.sdkKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');
            
            return {
                signature,
                sdkKey: this.sdkKey,
                meetingNumber: meetingNumber.toString(),
                passWord: '', // Will be set when creating the meeting
                userName: '',
                userEmail: '',
                timestamp: timestamp,
                role: role
            };
        } catch (error) {
            console.error('Error generating Zoom signature:', error);
            throw new Error('Failed to generate Zoom signature');
        }
    }

    /**
     * Generate OAuth token for Zoom API calls
     */
    async generateOAuthToken() {
        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            
            const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`OAuth token generation failed: ${data.error}`);
            }

            return data.access_token;
        } catch (error) {
            console.error('Error generating OAuth token:', error);
            throw new Error('Failed to generate OAuth token');
        }
    }

    /**
     * Create a new Zoom meeting for proctoring
     */
    async createProctorMeeting(examId, examTitle, durationMinutes = 120) {
        try {
            const accessToken = await this.generateOAuthToken();
            
            const meetingData = {
                topic: `Proctored Exam: ${examTitle}`,
                type: 2, // Scheduled meeting
                duration: durationMinutes,
                timezone: 'UTC',
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    watermark: false,
                    use_pmi: false,
                    approval_type: 2,
                    audio: 'both',
                    auto_recording: 'cloud', // Record to cloud for review
                    enforce_login: false,
                    waiting_room: false,
                    allow_multiple_devices: false,
                    participant_video_required: true // Force video on
                },
                recurrence: null
            };

            const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meetingData)
            });

            const meeting = await response.json();
            
            if (!response.ok) {
                throw new Error(`Meeting creation failed: ${meeting.message}`);
            }

            // Store meeting details in database (you can extend this)
            const meetingInfo = {
                examId,
                meetingId: meeting.id,
                meetingNumber: meeting.id,
                password: meeting.password,
                joinUrl: meeting.join_url,
                startUrl: meeting.start_url,
                topic: meeting.topic,
                createdAt: new Date(),
                status: 'scheduled'
            };

            console.log('Meeting created successfully:', meetingInfo);
            return meetingInfo;

        } catch (error) {
            console.error('Error creating Zoom meeting:', error);
            throw new Error('Failed to create proctoring meeting');
        }
    }

    /**
     * Get meeting participants (for admin monitoring)
     */
    async getMeetingParticipants(meetingId) {
        try {
            const accessToken = await this.generateOAuthToken();
            
            const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/participants`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Failed to get participants: ${data.message}`);
            }

            return data.participants || [];
        } catch (error) {
            console.error('Error getting meeting participants:', error);
            throw new Error('Failed to get meeting participants');
        }
    }

    /**
     * End a meeting (when exam is complete)
     */
    async endMeeting(meetingId) {
        try {
            const accessToken = await this.generateOAuthToken();
            
            const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'end'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to end meeting: ${error.message}`);
            }

            return { success: true, message: 'Meeting ended successfully' };
        } catch (error) {
            console.error('Error ending meeting:', error);
            throw new Error('Failed to end meeting');
        }
    }
}

module.exports = new ZoomController();
