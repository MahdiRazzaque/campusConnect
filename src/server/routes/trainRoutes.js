const express = require('express');
const router = express.Router();
const trainService = require('../services/trainService');
const { formatErrorResponse } = require('../utils/errorHandler');

/**
 * GET /api/trains/services
 * Get train services based on destination and target arrival time
 */
router.get('/services', async (req, res) => {
    try {
        const { destination, targetTime } = req.query;
        
        if (!destination || !targetTime) {
            return res.status(400).json(formatErrorResponse({
                message: 'Missing required parameters: destination and targetTime',
                errorCode: 'INVALID_PARAMETERS',
                field: !destination ? 'destination' : 'targetTime'
            }));
        }

        // Validate destination
        if (!['CTK', 'BFR'].includes(destination)) {
            return res.status(400).json(formatErrorResponse({
                message: 'Invalid destination. Must be either CTK (City Thameslink) or BFR (London Blackfriars)',
                errorCode: 'INVALID_PARAMETERS',
                field: 'destination'
            }));
        }

        const services = await trainService.getServices(
            destination, 
            new Date(targetTime)
        );

        res.json(services);
    } catch (error) {
        console.error('Error in /services endpoint:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(formatErrorResponse(error));
    }
});

/**
 * GET /api/trains/service/:serviceId
 * Get detailed information about a specific service
 */
router.get('/service/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        
        if (!serviceId) {
            return res.status(400).json(formatErrorResponse({
                message: 'Service ID is required',
                errorCode: 'INVALID_PARAMETERS',
                field: 'serviceId'
            }));
        }

        const serviceDetails = await trainService.getServiceDetails(serviceId);
        res.json(serviceDetails);
    } catch (error) {
        console.error('Error in /service/:serviceId endpoint:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json(formatErrorResponse(error));
    }
});

module.exports = router; 