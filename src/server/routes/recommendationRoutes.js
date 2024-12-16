const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const { formatErrorResponse } = require('../utils/errorHandler');

// GET /api/recommendations/upcoming
router.get('/upcoming', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 5;
        const recommendations = await recommendationService.getUpcomingLectureRecommendations(count);
        res.json(recommendations);
    } catch (error) {
        console.error('Error getting upcoming recommendations:', error);
        res.status(500).json(formatErrorResponse(error));
    }
});

// GET /api/recommendations/next-lecture
router.get('/next-lecture', async (req, res) => {
    try {
        const recommendation = await recommendationService.getNextLectureRecommendation();
        res.json(recommendation);
    } catch (error) {
        console.error('Error getting next lecture recommendation:', error);
        res.status(500).json(formatErrorResponse(error));
    }
});

// GET /api/recommendations/range
router.get('/range', async (req, res) => {
    try {
        const { start, end } = req.query;
        
        if (!start || !end) {
            return res.status(400).json(formatErrorResponse({
                message: 'Missing required parameters: start and end dates',
                errorCode: 'INVALID_PARAMETERS'
            }));
        }

        const recommendations = await recommendationService.getRecommendationsForRange(
            new Date(start),
            new Date(end)
        );
        res.json(recommendations);
    } catch (error) {
        console.error('Error getting recommendations for range:', error);
        res.status(500).json(formatErrorResponse(error));
    }
});

module.exports = router; 