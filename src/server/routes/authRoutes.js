const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const { formatErrorResponse } = require('../utils/errorHandler');

// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
    // Check if we have tokens in session
    if (req.session?.tokens) {
        calendarService.setCredentials(req.session.tokens);
    }

    if (!calendarService.isAuthenticated()) {
        return res.status(401).json({ 
            error: 'Not authenticated',
            loginUrl: calendarService.getAuthUrl()
        });
    }
    next();
};

// GET /api/auth/status
router.get('/status', (req, res) => {
    // Check if we have tokens in session
    if (req.session?.tokens) {
        calendarService.setCredentials(req.session.tokens);
    }

    const isAuthenticated = calendarService.isAuthenticated();
    if (!isAuthenticated) {
        res.json({ 
            authenticated: false,
            loginUrl: calendarService.getAuthUrl()
        });
    } else {
        res.json({ authenticated: true });
    }
});

// GET /api/auth/google
router.get('/google', (req, res) => {
    try {
        const authUrl = calendarService.getAuthUrl();
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error getting auth URL:', error);
        res.status(500).json(formatErrorResponse(error));
    }
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json(formatErrorResponse({
                message: 'Authorization code is required',
                errorCode: 'INVALID_PARAMETERS'
            }));
        }

        // Exchange code for tokens
        const tokens = await calendarService.getTokens(code);
        
        // Store tokens in session
        req.session.tokens = tokens;
        
        // Set the credentials
        calendarService.setCredentials(tokens);

        // Redirect to frontend
        res.redirect('https://campusconnect.duckdns.org');
    } catch (error) {
        console.error('Error in auth callback:', error);
        res.status(500).json(formatErrorResponse(error));
    }
});

// GET /api/auth/logout
router.get('/logout', (req, res) => {
    try {
        // Clear tokens from session
        req.session.tokens = null;
        
        // Revoke credentials
        calendarService.auth?.revokeCredentials();
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json(formatErrorResponse(error));
    }
});

// Export both the router and the middleware
router.checkAuth = checkAuth;
module.exports = router; 