const { google } = require('googleapis');
const moment = require('moment');

class CalendarService {
    constructor() {
        this.auth = null;
        this.calendar = null;
        this.initialized = false;
    }

    /**
     * Initialize the Google Calendar API client
     * @throws {Error} If required environment variables are missing
     */
    initialize() {
        if (this.initialized) return;

        const credentials = {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI
        };

        // Validate required credentials
        Object.entries(credentials).forEach(([key, value]) => {
            if (!value) {
                throw new Error(`Missing required Google credential: ${key}`);
            }
        });

        // Create OAuth2 client
        this.auth = new google.auth.OAuth2(
            credentials.client_id,
            credentials.client_secret,
            credentials.redirect_uri
        );

        // Initialize calendar API client
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
        this.initialized = true;
    }

    /**
     * Get the Google OAuth2 authorization URL
     * @returns {string} The authorization URL
     */
    getAuthUrl() {
        if (!this.initialized) this.initialize();

        const scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly'
        ];

        return this.auth.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force consent screen to ensure we get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - The authorization code from Google
     * @returns {Promise<Object>} The tokens object containing access and refresh tokens
     */
    async getTokens(code) {
        if (!this.initialized) this.initialize();

        try {
            const { tokens } = await this.auth.getToken(code);
            this.auth.setCredentials(tokens);
            return tokens;
        } catch (error) {
            console.error('Error getting tokens:', error);
            throw new Error('Failed to exchange authorization code for tokens');
        }
    }

    /**
     * Set OAuth2 credentials for authenticated requests
     * @param {Object} tokens - The tokens object containing access and refresh tokens
     */
    setCredentials(tokens) {
        if (!this.initialized) this.initialize();

        // Set up token refresh callback
        this.auth.on('tokens', (newTokens) => {
            console.log('New tokens received:', newTokens);
            // Merge with existing tokens
            const updatedTokens = {
                ...tokens,
                ...newTokens,
                expiry_date: newTokens.expiry_date
            };
            // Update the credentials
            this.auth.setCredentials(updatedTokens);
            // Store the updated tokens
            if (global.sessionStore) {
                global.sessionStore.set('tokens', updatedTokens);
            }
        });

        this.auth.setCredentials(tokens);
    }

    /**
     * Check if the service is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    isAuthenticated() {
        if (!this.auth?.credentials?.access_token) {
            return false;
        }

        // Check if token is expired
        const expiryDate = this.auth.credentials.expiry_date;
        if (!expiryDate) {
            return false;
        }

        const now = Date.now();
        // If token is expired or about to expire in the next 5 minutes
        if (expiryDate <= now + 5 * 60 * 1000) {
            // Try to refresh the token
            try {
                this.refreshAccessToken();
            } catch (error) {
                console.error('Error refreshing token:', error);
                return false;
            }
        }

        return true;
    }

    /**
     * Refresh the access token using the refresh token
     * @returns {Promise<Object>} The new tokens
     * @throws {Error} If refresh token is not available or refresh fails
     */
    async refreshAccessToken() {
        if (!this.auth?.credentials?.refresh_token) {
            throw new Error('No refresh token available');
        }

        try {
            const { credentials } = await this.auth.refreshAccessToken();
            this.auth.setCredentials(credentials);
            return credentials;
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new Error('Failed to refresh access token');
        }
    }

    /**
     * Check if an event is an exam
     * @private
     * @param {Object} event - The event to check
     * @returns {boolean} True if the event is an exam
     */
    _isExamEvent(event) {
        const upperDesc = event.description?.toUpperCase() || '';
        const upperSummary = event.summary?.toUpperCase() || '';
        const upperLocation = event.location?.toUpperCase() || '';

        // More precise exam keywords that won't match module codes
        const examKeywords = [
            ' EXAM ',
            'EXAMINATION',
            'COMPUTER BASED',
            'EXCEL TEST'
        ];

        return examKeywords.some(keyword => 
            upperDesc.includes(keyword) ||
            upperSummary.includes(keyword) ||
            upperLocation.includes(keyword)
        );
    }

    /**
     * Get the next lecture/lesson event from now (excluding exams)
     * @returns {Promise<Object|null>} The next event or null if none found
     */
    async getNextLecture() {
        if (!this.initialized) this.initialize();
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            // Look for events in the next 30 days
            const now = moment();
            const timeMin = now.toISOString();
            const timeMax = moment().add(30, 'days').endOf('day').toISOString();

            // Get events from the KCL calendar (using the calendar ID from your list)
            const response = await this.calendar.events.list({
                calendarId: 'b2d4vfk426vna4nvpcmji0h0looll6t0@import.calendar.google.com', // KCL calendar ID
                timeMin: timeMin,
                timeMax: timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 50 // Increased to ensure we find non-exam events
            });

            if (!response.data.items || response.data.items.length === 0) {
                return null;
            }

            // Map and filter events
            const events = response.data.items
                .map(event => ({
                    id: event.id,
                    summary: event.summary,
                    location: event.location,
                    description: event.description,
                    startTime: event.start.dateTime || event.start.date,
                    endTime: event.end.dateTime || event.end.date,
                    htmlLink: event.htmlLink
                }))
                .filter(event => {
                    // Only include events that:
                    // 1. Have a location (needed for campus detection)
                    // 2. Start in the future
                    // 3. Are not exams
                    return event.location && 
                           moment(event.startTime).isAfter(now) &&
                           !this._isExamEvent(event);
                });

            // Return the first non-exam event (earliest) or null if none found
            return events.length > 0 ? events[0] : null;

        } catch (error) {
            console.error('Error fetching next lecture:', error);
            throw new Error('Failed to fetch next lecture');
        }
    }

    /**
     * Get events within a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Array of events
     */
    async getEventsInRange(startDate, endDate) {
        if (!this.initialized) this.initialize();
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            // Get events from the KCL calendar
            const response = await this.calendar.events.list({
                calendarId: 'b2d4vfk426vna4nvpcmji0h0looll6t0@import.calendar.google.com',
                timeMin: moment(startDate).toISOString(),
                timeMax: moment(endDate).toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 250 // Increased to ensure we get all events
            });

            if (!response.data.items || response.data.items.length === 0) {
                console.log('No events found in calendar');
                return [];
            }

            console.log(`Found ${response.data.items.length} raw events from calendar`);

            // Map events to our format and filter
            const filteredEvents = response.data.items
                .map(event => ({
                    id: event.id,
                    summary: event.summary,
                    location: event.location,
                    description: event.description,
                    startTime: event.start.dateTime || event.start.date,
                    endTime: event.end.dateTime || event.end.date,
                    htmlLink: event.htmlLink
                }))
                .filter(event => {
                    const hasLocation = !!event.location;
                    const isExam = this._isExamEvent(event);
                    return hasLocation && !isExam;
                });

            console.log(`Returning ${filteredEvents.length} filtered events`);
            return filteredEvents;

        } catch (error) {
            console.error('Error fetching events:', error);
            throw new Error('Failed to fetch events');
        }
    }

    /**
     * Get all calendars accessible to the user
     * @returns {Promise<Array>} Array of calendar metadata
     */
    async listCalendars() {
        if (!this.initialized) this.initialize();
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await this.calendar.calendarList.list();
            return response.data.items.map(calendar => ({
                id: calendar.id,
                summary: calendar.summary,
                description: calendar.description,
                primary: calendar.primary || false
            }));
        } catch (error) {
            console.error('Error listing calendars:', error);
            throw new Error('Failed to list calendars');
        }
    }

    /**
     * Get events from a specific calendar
     * @param {string} calendarId - The ID of the calendar to fetch events from
     * @param {Date} startDate - Start date for events
     * @param {Date} endDate - End date for events
     * @returns {Promise<Array>} Array of calendar events
     */
    async getCalendarEvents(calendarId, startDate, endDate) {
        if (!this.initialized) this.initialize();
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await this.calendar.events.list({
                calendarId: calendarId,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });

            return response.data.items.map(event => ({
                id: event.id,
                summary: event.summary,
                location: event.location,
                description: event.description,
                startTime: event.start.dateTime || event.start.date,
                endTime: event.end.dateTime || event.end.date,
                htmlLink: event.htmlLink
            }));
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            throw new Error('Failed to fetch calendar events');
        }
    }
}

// Export a singleton instance
const calendarService = new CalendarService();
module.exports = calendarService; 