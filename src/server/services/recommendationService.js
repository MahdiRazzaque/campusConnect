const moment = require('moment');
const calendarService = require('./calendarService');
const trainService = require('./trainService');
const cacheService = require('./cacheService');

class RecommendationService {
    /**
     * Get train recommendations for the next lecture
     * @returns {Promise<Object>} Object containing event and recommended trains
     */
    async getNextLectureRecommendation() {
        try {
            const cacheKey = 'next-lecture';
            return await cacheService.getOrFetch(cacheKey, async () => {
                const nextLecture = await calendarService.getNextLecture();
                if (!nextLecture) {
                    return { message: 'No upcoming lectures found' };
                }

                // Skip exam events
                const isExamEvent = nextLecture.description?.toUpperCase().includes('EXAMINATION') ||
                                  nextLecture.summary?.toUpperCase().includes('EXAM') ||
                                  nextLecture.location?.toUpperCase().includes('EXCEL') ||
                                  nextLecture.location?.toUpperCase().includes('COMPUTER BASED');

                if (isExamEvent) {
                    return { 
                        event: nextLecture,
                        message: 'Next event is an exam - train recommendations not available for exam locations',
                        trains: []
                    };
                }

                // Determine campus from event location
                const campus = trainService.determineCampus(nextLecture.location);
                if (!campus) {
                    return {
                        event: nextLecture,
                        message: 'Could not determine campus location from event details',
                        trains: []
                    };
                }

                // Get the appropriate station
                const destinationStation = trainService.getStationForCampus(campus);
                if (!destinationStation) {
                    return {
                        event: nextLecture,
                        campus,
                        message: 'Could not determine destination station for campus',
                        trains: []
                    };
                }
                
                // Get train services
                const trainResult = await trainService.getServices(
                    destinationStation,
                    new Date(nextLecture.startTime)
                );

                const result = {
                    event: nextLecture,
                    campus,
                    destinationStation,
                    trains: trainResult.services,
                    message: trainResult.message
                };

                // Set TTL based on event date
                const ttl = this._calculateTTL(nextLecture.startTime);
                return result;
            });
        } catch (error) {
            console.error('Error getting recommendations:', error);
            throw new Error('Failed to get recommendations: ' + error.message);
        }
    }

    /**
     * Get train recommendations for all events in a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Array of events with train recommendations
     */
    async getRecommendationsForRange(startDate, endDate) {
        try {
            const cacheKey = `range-${startDate.toISOString()}-${endDate.toISOString()}`;
            return await cacheService.getOrFetch(cacheKey, async () => {
                const events = await calendarService.getEventsInRange(startDate, endDate);
                
                // Get recommendations for each event
                const recommendations = await Promise.all(events.map(async (event) => {
                    // Skip exam events
                    const isExamEvent = event.description?.toUpperCase().includes('EXAMINATION') ||
                                      event.summary?.toUpperCase().includes('EXAM') ||
                                      event.location?.toUpperCase().includes('EXCEL') ||
                                      event.location?.toUpperCase().includes('COMPUTER BASED');

                    if (isExamEvent) {
                        return {
                            event,
                            message: 'Exam event - train recommendations not available',
                            trains: []
                        };
                    }

                    // Determine campus
                    const campus = trainService.determineCampus(event.location);
                    if (!campus) {
                        return {
                            event,
                            message: 'Could not determine campus location',
                            trains: []
                        };
                    }

                    // Get the appropriate station
                    const destinationStation = trainService.getStationForCampus(campus);
                    if (!destinationStation) {
                        return {
                            event,
                            campus,
                            message: 'Could not determine destination station for campus',
                            trains: []
                        };
                    }

                    const trainResult = await trainService.getServices(
                        destinationStation,
                        new Date(event.startTime)
                    );

                    return {
                        event,
                        campus,
                        destinationStation,
                        trains: trainResult.services,
                        message: trainResult.message
                    };
                }));

                // Set TTL based on earliest event date
                const earliestEvent = events.reduce((earliest, event) => {
                    return new Date(event.startTime) < new Date(earliest.startTime) ? event : earliest;
                }, events[0]);

                const ttl = this._calculateTTL(earliestEvent?.startTime);
                return recommendations;
            });
        } catch (error) {
            console.error('Error getting recommendations for range:', error);
            throw new Error('Failed to get recommendations for date range: ' + error.message);
        }
    }

    /**
     * Get train recommendations for the next N lectures
     * @param {number} count - Number of lectures to fetch (default: 5)
     * @returns {Promise<Array>} Array of events with train recommendations
     */
    async getUpcomingLectureRecommendations(count = 5) {
        try {
            const cacheKey = `upcoming-${count}`;
            return await cacheService.getOrFetch(cacheKey, async () => {
                // Get upcoming lectures starting from now
                const now = moment();
                // Look 60 days into the future
                const endTime = moment(now).add(60, 'days').endOf('day');
                
                // Get all events in the next 60 days
                const events = await calendarService.getEventsInRange(
                    now.toDate(),
                    endTime.toDate()
                );

                if (!events || events.length === 0) {
                    return [];
                }

                // Sort events chronologically and filter out exam events
                const lectures = events
                    .filter(event => {
                        // Only filter out events without locations
                        // Note: exam filtering is already done by calendarService.getEventsInRange
                        return event.location;
                    })
                    .sort((a, b) => {
                        // Sort by start time
                        const timeA = moment(a.startTime);
                        const timeB = moment(b.startTime);
                        return timeA.diff(timeB);
                    })
                    .slice(0, count); // Apply count limit after filtering and sorting

                if (lectures.length === 0) {
                    return [];
                }

                // Get recommendations for each lecture
                const recommendations = await Promise.all(
                    lectures.map(async (lecture) => {
                        // Determine campus
                        const campus = trainService.determineCampus(lecture.location);
                        if (!campus) {
                            return {
                                event: lecture,
                                message: 'Could not determine campus location',
                                trains: []
                            };
                        }

                        // Get the appropriate station
                        const destinationStation = trainService.getStationForCampus(campus);
                        if (!destinationStation) {
                            return {
                                event: lecture,
                                campus,
                                message: 'Could not determine destination station for campus',
                                trains: []
                            };
                        }
                        
                        // Get train services
                        const trainResult = await trainService.getServices(
                            destinationStation,
                            new Date(lecture.startTime)
                        );

                        return {
                            event: lecture,
                            campus,
                            destinationStation,
                            trains: trainResult.services,
                            message: trainResult.message
                        };
                    })
                );

                // Set TTL based on earliest lecture date
                const ttl = this._calculateTTL(lectures[0]?.startTime);
                return recommendations;
            });
        } catch (error) {
            console.error('Error getting upcoming recommendations:', error);
            throw new Error('Failed to get upcoming recommendations: ' + error.message);
        }
    }

    /**
     * Calculate TTL for cache based on event date
     * @private
     * @param {string} eventTime - Event start time
     * @returns {number} TTL in seconds
     */
    _calculateTTL(eventTime) {
        if (!eventTime) return 24 * 60 * 60; // Default 24 hours

        const eventDate = new Date(eventTime);
        const today = new Date();

        // If event is today, cache for 1 minute
        if (eventDate.toDateString() === today.toDateString()) {
            return 60;
        }

        // Otherwise cache until midnight UTC
        const midnight = new Date();
        midnight.setUTCHours(24, 0, 0, 0);
        return Math.floor((midnight.getTime() - today.getTime()) / 1000);
    }
}

module.exports = new RecommendationService(); 