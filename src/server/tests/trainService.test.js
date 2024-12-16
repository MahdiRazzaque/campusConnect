require('dotenv').config();
const trainService = require('../services/trainService');

async function testTrainService() {
    try {
        console.log('Testing Train Service Implementation...\n');

        // Test 1: Campus Detection
        console.log('Test 1: Campus Detection');
        const testLocations = [
            'BUSH HOUSE (S) 2.01',
            'IET KELVIN LECTURE THEATRE',
            'WATERLOO WBW 2/19',
            'FWB MEETING ROOM 1',
            'STRAND BUILDING S-3.20',
            'UNKNOWN LOCATION'
        ];

        for (const location of testLocations) {
            const campus = trainService.determineCampus(location);
            console.log(`Location "${location}" -> Campus: ${campus || 'Unknown'}`);
        }
        console.log('\n-------------------\n');

        // Test 2: Get services for a Bush House event
        console.log('Test 2: Services for Bush House event');
        const bushHouseEvent = {
            location: 'BUSH HOUSE (S) 2.01',
            startTime: new Date(new Date().setHours(11, 0, 0, 0)) // 11:00 AM
        };

        const bushHouseServices = await trainService.getServicesForEvent(
            bushHouseEvent.location,
            bushHouseEvent.startTime
        );
        console.log('Journey Details:', {
            campus: bushHouseServices.campus,
            station: bushHouseServices.destinationStation,
            departureTime: bushHouseServices.recommendedDepartureTime,
            walkTime: bushHouseServices.walkToStation,
            message: bushHouseServices.message,
            reason: bushHouseServices.reason
        });
        console.log('\nSearch Parameters:', bushHouseServices.searchParams);
        if (bushHouseServices.services.length > 0) {
            console.log('\nSample service:', JSON.stringify(bushHouseServices.services[0], null, 2));
        }
        console.log('\n-------------------\n');

        // Test 3: Get services for a Waterloo event
        console.log('Test 3: Services for Waterloo event');
        const waterlooEvent = {
            location: 'WATERLOO WBW 2/19',
            startTime: new Date(new Date().setHours(11, 0, 0, 0)) // 11:00 AM
        };

        const waterlooServices = await trainService.getServicesForEvent(
            waterlooEvent.location,
            waterlooEvent.startTime
        );
        console.log('Journey Details:', {
            campus: waterlooServices.campus,
            station: waterlooServices.destinationStation,
            departureTime: waterlooServices.recommendedDepartureTime,
            walkTime: waterlooServices.walkToStation,
            message: waterlooServices.message,
            reason: waterlooServices.reason
        });
        console.log('\nSearch Parameters:', waterlooServices.searchParams);
        if (waterlooServices.services.length > 0) {
            console.log('\nSample service:', JSON.stringify(waterlooServices.services[0], null, 2));
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

// Run the tests
testTrainService(); 