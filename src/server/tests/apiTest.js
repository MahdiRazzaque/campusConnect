require('dotenv').config();
const axios = require('axios');

async function testAPI() {
    const auth = {
        username: process.env.RTT_USERNAME,
        password: process.env.RTT_PASSWORD
    };

    try {
        // Try to get API info
        console.log('Testing API endpoints...');
        
        // Test root endpoint
        try {
            const rootResponse = await axios.get('https://api.rtt.io/api/v1', { auth });
            console.log('Root endpoint:', rootResponse.data);
        } catch (error) {
            console.log('Root endpoint error:', error.response?.status);
        }

        // Test with different endpoint variations
        const endpoints = [
            '/api/v1/json/search',
            '/api/v1/public/search',
            '/api/v1/stations',
            '/api/v1/station/LEA',
            '/api/v1/departures/LEA',
            '/api/v1/arrivals/LEA'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`https://api.rtt.io${endpoint}`, { 
                    auth,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                console.log(`\nEndpoint ${endpoint}:`, response.data);
            } catch (error) {
                console.log(`\nEndpoint ${endpoint} error:`, error.response?.status);
            }
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('API Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }
    }
}

testAPI(); 