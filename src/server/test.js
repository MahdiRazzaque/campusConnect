require('dotenv').config();
const moment = require('moment');
const trainService = require('./services/trainService');

async function test() {
    try {
        console.log('Testing train service with future lecture...');
        
        // Test with the lecture time (January 13, 2025, 12:00 UTC)
        const eventTime = moment('2025-01-13T12:00:00Z');
        const result = await trainService.getServices('CTK', eventTime.toDate());
        
        console.log('\nTest Results:');
        console.log('Event time:', eventTime.format('YYYY-MM-DD HH:mm'));
        console.log('Target departure times:');
        console.log('- 1hr 22min before:', eventTime.clone().subtract(82, 'minutes').format('HH:mm'));
        console.log('- 1hr 6min before:', eventTime.clone().subtract(66, 'minutes').format('HH:mm'));
        console.log('- 52min before:', eventTime.clone().subtract(52, 'minutes').format('HH:mm'));
        console.log('\nMessage:', result.message);
        console.log('Number of services found:', result.services.length);
        
        if (result.services.length > 0) {
            console.log('\nRecommended services:');
            result.services.forEach((service, index) => {
                console.log(`\nService ${index + 1}:`);
                console.log('Departure:', service.scheduledDeparture);
                console.log('Arrival:', service.scheduledArrival);
                console.log('Platform:', service.platform);
                console.log('Status:', service.status);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }
    }
}

test(); 