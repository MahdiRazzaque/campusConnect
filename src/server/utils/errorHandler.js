const axios = require('axios');

class APIError extends Error {
    constructor(message, statusCode, errorCode, details = {}) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.isOperational = true; // Used to distinguish operational errors from programming errors
    }
}

class NetworkError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'NetworkError';
        this.originalError = originalError;
        this.isOperational = true;
    }
}

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.isOperational = true;
    }
}

// Error codes mapping
const ErrorCodes = {
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INVALID_PARAMETERS: 'INVALID_PARAMETERS',
    NETWORK_ERROR: 'NETWORK_ERROR',
    DATA_NOT_FOUND: 'DATA_NOT_FOUND'
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Promise that resolves with the function result
 */
async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        factor = 2,
        shouldRetry = (error) => {
            return error.isOperational && 
                   (error.statusCode === 429 || // Rate limit
                    error.statusCode === 503 || // Service unavailable
                    error.name === 'NetworkError');
        }
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (!shouldRetry(error) || attempt === maxRetries) {
                throw error;
            }

            console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * factor, maxDelay);
        }
    }

    throw lastError;
}

/**
 * Handle API errors and transform them into standardized error objects
 * @param {Error} error - The caught error
 * @returns {APIError|NetworkError|ValidationError} - Standardized error object
 */
function handleAPIError(error) {
    if (axios.isAxiosError(error)) {
        if (!error.response) {
            return new NetworkError(
                'Network error occurred while connecting to the service',
                error
            );
        }

        const statusCode = error.response.status;
        const responseData = error.response.data;

        switch (statusCode) {
            case 401:
                return new APIError(
                    'Invalid API credentials',
                    statusCode,
                    ErrorCodes.INVALID_CREDENTIALS,
                    responseData
                );
            case 429:
                return new APIError(
                    'Rate limit exceeded',
                    statusCode,
                    ErrorCodes.RATE_LIMIT_EXCEEDED,
                    responseData
                );
            case 503:
                return new APIError(
                    'Service temporarily unavailable',
                    statusCode,
                    ErrorCodes.SERVICE_UNAVAILABLE,
                    responseData
                );
            default:
                return new APIError(
                    responseData?.error || 'An error occurred with the API request',
                    statusCode,
                    ErrorCodes.SERVICE_UNAVAILABLE,
                    responseData
                );
        }
    }

    if (error instanceof ValidationError || 
        error instanceof APIError || 
        error instanceof NetworkError) {
        return error;
    }

    return new Error('An unexpected error occurred');
}

/**
 * Format error for client response
 * @param {Error} error - The error to format
 * @returns {Object} - Formatted error object
 */
function formatErrorResponse(error) {
    const response = {
        error: error.message,
        code: error.errorCode || 'UNKNOWN_ERROR'
    };

    if (error.details && Object.keys(error.details).length > 0) {
        response.details = error.details;
    }

    if (error.field) {
        response.field = error.field;
    }

    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
    }

    return response;
}

module.exports = {
    APIError,
    NetworkError,
    ValidationError,
    ErrorCodes,
    withRetry,
    handleAPIError,
    formatErrorResponse
}; 