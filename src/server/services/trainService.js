const axios = require('axios');
const moment = require('moment');
const { 
    withRetry, 
    handleAPIError, 
    ValidationError, 
    ErrorCodes 
} = require('../utils/errorHandler');

class TrainService {
    constructor() {
        this.baseUrl = 'https://api.rtt.io/api/v1';
        this.auth = {
            username: process.env.RTT_USERNAME,
            password: process.env.RTT_PASSWORD
        };

        if (!this.auth.username || !this.auth.password) {
            throw new ValidationError(
                'RTT API credentials not configured',
                'auth'
            );
        }

        // CRS (Computer Reservation System) codes
        this.stationMap = {
            'LEA': 'LEA',     // Leagrave
            'CTK': 'CTK',     // City Thameslink (for Bush House)
            'BFR': 'BFR'      // London Blackfriars (for Waterloo)
        };

        // Campus location keywords mapping
        this.campusKeywords = {
            bushHouse: [
                'BUSH HOUSE',
                'BH',
                'STRAND',
                'IET',
                'KELVIN',
                'LECTURE THEATRE',
                'KING'
            ],
            waterloo: [
                'WATERLOO',
                'WBW',
                'FRANKLIN-WILKINS',
                'FWB',
                'STAMFORD STREET'
            ]
        };

        // Journey times in minutes
        this.journeyTimes = {
            'CTK': 47, // Leagrave to City Thameslink
            'BFR': 50  // Leagrave to London Blackfriars
        };

        // Target offsets in minutes before event
        this.targetOffsets = [
            82,  // 1 hour 22 minutes before
            66,  // 1 hour 6 minutes before
            52   // 52 minutes before
        ];
    }

    /**
     * Determine which campus a location is on
     * @param {string} location - The location string from the calendar event
     * @returns {'bushHouse' | 'waterloo' | null} The campus name or null if unknown
     */
    determineCampus(location) {
        if (!location) return null;
        const upperLocation = location.toUpperCase();
        
        // Check Bush House keywords
        if (this.campusKeywords.bushHouse.some(keyword => upperLocation.includes(keyword))) {
            return 'bushHouse';
        }
        
        // Check Waterloo keywords
        if (this.campusKeywords.waterloo.some(keyword => upperLocation.includes(keyword))) {
            return 'waterloo';
        }

        return null;
    }

    /**
     * Get the appropriate station code for a campus
     * @param {string} campus - The campus identifier
     * @returns {string} The station code
     */
    getStationForCampus(campus) {
        switch (campus) {
            case 'bushHouse':
                return 'CTK';
            case 'waterloo':
                return 'BFR';
            default:
                return null;
        }
    }

    /**
     * Get train services from Leagrave to specified destination
     * @param {string} destination - 'CTK' for City Thameslink or 'BFR' for London Blackfriars
     * @param {Date} eventTime - The event time
     * @returns {Promise<Object>} Train services and journey details
     */
    async getServices(destination, eventTime) {
        // Input validation
        if (!destination || !this.stationMap[destination]) {
            throw new ValidationError(
                'Invalid destination station code',
                'destination'
            );
        }

        if (!eventTime || !moment(eventTime).isValid()) {
            throw new ValidationError(
                'Invalid event time',
                'eventTime'
            );
        }

        try {
            const eventMoment = moment(eventTime);
            
            // Calculate target departure times in order of preference
            const targetDepartures = [
                moment(eventMoment).subtract(66, 'minutes'),  // 1hr 6min before (first choice)
                moment(eventMoment).subtract(82, 'minutes'),  // 1hr 22min before (second choice)
                moment(eventMoment).subtract(52, 'minutes')   // 52min before (third choice)
            ];

            // Make API request for the event date
            const url = `${this.baseUrl}/json/search/${this.stationMap['LEA']}/to/${this.stationMap[destination]}/${eventMoment.format('YYYY')}/${eventMoment.format('MM')}/${eventMoment.format('DD')}`;
            
            const makeRequest = async () => {
                const response = await axios.get(url, { 
                    auth: this.auth,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                return response.data;
            };

            const data = await withRetry(makeRequest);
            
            if (!data?.services || data.services.length === 0) {
                return {
                    services: [],
                    message: 'No services found for the specified date',
                    reason: 'NO_SERVICES_FOUND'
                };
            }

            // Filter to Brighton and Three Bridges services
            const validServices = data.services
                .filter(service => {
                    const destination = service.locationDetail.destination[0].description;
                    return destination === 'Brighton' || destination === 'Three Bridges';
                })
                .map(service => {
                    // Convert departure time to moment object
                    const departureTime = moment(eventMoment.format('YYYY-MM-DD') + ' ' + service.locationDetail.gbttBookedDeparture, 'YYYY-MM-DD HHmm');
                    
                    // Calculate arrival time based on journey time
                    const arrivalTime = moment(departureTime).add(this.journeyTimes[destination], 'minutes');

                    // Find the closest target time
                    let bestTargetIndex = -1;
                    let bestDiff = Infinity;

                    targetDepartures.forEach((target, index) => {
                        const diff = Math.abs(departureTime.diff(target, 'minutes'));
                        if (diff < bestDiff) {
                            bestDiff = diff;
                            bestTargetIndex = index;
                        }
                    });

                    return {
                        service,
                        departureTime,
                        arrivalTime,
                        targetIndex: bestTargetIndex,
                        diff: bestDiff
                    };
                })
                .filter(item => item.diff <= 5)  // Only include trains within 5 minutes of target times
                .sort((a, b) => {
                    // Sort by target time index first (our preference order)
                    if (a.targetIndex !== b.targetIndex) {
                        return a.targetIndex - b.targetIndex;
                    }
                    // Then by how close they are to the target time
                    return a.diff - b.diff;
                })
                .slice(0, 3)
                .map(({ service, arrivalTime }) => ({
                    serviceId: service.serviceUid,
                    operator: service.atocName,
                    platform: service.locationDetail.platform || 'TBA',
                    scheduledDeparture: service.locationDetail.gbttBookedDeparture,
                    scheduledArrival: arrivalTime.format('HHmm'),
                    status: this._getServiceStatus(service),
                    isCancelled: service.locationDetail.cancelReasonCode !== undefined,
                    delay: service.locationDetail.realtimeActualDeparture 
                        ? this._calculateDelay(
                            service.locationDetail.gbttBookedDeparture,
                            service.locationDetail.realtimeActualDeparture
                          )
                        : 0
                }));

            return {
                services: validServices,
                message: validServices.length > 0 
                    ? `Found ${validServices.length} suitable services`
                    : 'No suitable services found',
                reason: validServices.length > 0 ? 'SERVICES_FOUND' : 'NO_SERVICES_FOUND'
            };

        } catch (error) {
            const handledError = handleAPIError(error);
            console.error('Error fetching train services:', handledError);
            throw handledError;
        }
    }

    /**
     * Calculate delay in minutes between scheduled and actual times
     * @private
     */
    _calculateDelay(scheduled, actual) {
        const scheduledTime = moment(scheduled, 'HHmm');
        const actualTime = moment(actual, 'HHmm');
        return actualTime.diff(scheduledTime, 'minutes');
    }

    /**
     * Determine the current status of a service
     * @private
     */
    _getServiceStatus(service) {
        if (service.locationDetail.cancelReasonCode) {
            return 'CANCELLED';
        }
        if (service.locationDetail.realtimeActualDeparture) {
            return 'DEPARTED';
        }
        if (service.locationDetail.realtimeDepartureActual) {
            return 'ON TIME';
        }
        if (service.locationDetail.realtimeDepartureExpected) {
            return 'DELAYED';
        }
        return 'SCHEDULED';
    }
}

module.exports = new TrainService(); 