const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');
const { checkAuth } = require('./authRoutes');

// Apply auth check to all calendar routes
router.use(checkAuth);

/**
 * GET /api/calendar/next-lecture
 * Get the next lecture/lesson event
 */
router.get('/next-lecture', async (req, res) => {
    try {
        const event = await calendarService.getNextLecture();
        if (!event) {
            return res.json({ message: 'No upcoming lectures found' });
        }
        res.json(event);
    } catch (error) {
        console.error('Error getting next lecture:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/events
 * Get events within a date range
 */
router.get('/events', async (req, res) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ 
                error: 'Start and end dates are required (ISO format)' 
            });
        }

        const events = await calendarService.getEventsInRange(
            new Date(start),
            new Date(end)
        );
        res.json(events);
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/list
 * Get list of available calendars
 */
router.get('/list', async (req, res) => {
    try {
        const calendars = await calendarService.listCalendars();
        res.json(calendars);
    } catch (error) {
        console.error('Error listing calendars:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 