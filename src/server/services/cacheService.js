const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        // Cache with default TTL of 24 hours
        this.cache = new NodeCache({
            stdTTL: 24 * 60 * 60,
            checkperiod: 60 * 60 // Check for expired keys every hour
        });

        // Start the midnight refresh timer
        this.startMidnightRefresh();
    }

    /**
     * Get data from cache
     * @param {string} key - Cache key
     * @returns {any} Cached data or undefined
     */
    get(key) {
        return this.cache.get(key);
    }

    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {any} value - Data to cache
     * @param {number} [ttl] - Time to live in seconds
     */
    set(key, value, ttl = undefined) {
        this.cache.set(key, value, ttl);
    }

    /**
     * Delete data from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.del(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.flushAll();
    }

    /**
     * Get cached data or fetch it if not cached
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Function to fetch data if not cached
     * @param {number} [ttl] - Time to live in seconds
     * @returns {Promise<any>} Data from cache or fetch function
     */
    async getOrFetch(key, fetchFn, ttl = undefined) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const data = await fetchFn();
        this.set(key, data, ttl);
        return data;
    }

    /**
     * Start the midnight refresh timer
     * Clears calendar data cache at midnight UTC
     */
    startMidnightRefresh() {
        const refreshAtMidnight = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setUTCHours(24, 0, 0, 0);
            const timeUntilMidnight = midnight.getTime() - now.getTime();

            setTimeout(() => {
                // Clear calendar data but keep train data
                const keys = this.cache.keys();
                keys.forEach(key => {
                    if (key.includes('calendar')) {
                        this.delete(key);
                    }
                });

                // Set up next midnight refresh
                refreshAtMidnight();
            }, timeUntilMidnight);
        };

        refreshAtMidnight();
    }

    /**
     * Check if data needs refresh based on event date
     * @param {string} key - Cache key
     * @param {Object} data - Cached data
     * @returns {boolean} True if data needs refresh
     */
    needsRefresh(key, data) {
        // Always refresh train data for today's events
        if (key.includes('train')) {
            const today = new Date().toDateString();
            if (Array.isArray(data)) {
                return data.some(item => 
                    new Date(item.event.startTime).toDateString() === today
                );
            }
            return new Date(data.event.startTime).toDateString() === today;
        }

        // Calendar data refreshes at midnight UTC
        return false;
    }
}

// Export singleton instance
const cacheService = new CacheService();
module.exports = cacheService; 