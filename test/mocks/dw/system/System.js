/**
 * Mock implementation of dw/system/System
 * Provides system-level functionality for testing purposes
 */

let mockInstanceHostname = 'test-instance.demandware.net';

module.exports = {
    /**
     * Gets the instance hostname
     * @returns {Object} Object with toString() method returning hostname
     */
    getInstanceHostname: function() {
        return {
            toString: function() {
                return mockInstanceHostname;
            }
        };
    },

    /**
     * Gets the instance type
     * @returns {number} Instance type constant
     */
    getInstanceType: function() {
        return this.PRODUCTION_SYSTEM;
    },

    /**
     * Gets calendar for the site
     * @returns {Object} Calendar object
     */
    getCalendar: function() {
        return {
            getTime: function() {
                return new Date();
            }
        };
    },

    // Instance type constants
    PRODUCTION_SYSTEM: 0,
    DEVELOPMENT_SYSTEM: 1,
    STAGING_SYSTEM: 2,

    // Test helpers
    __setInstanceHostname: function(hostname) {
        mockInstanceHostname = hostname;
    },

    __reset: function() {
        mockInstanceHostname = 'test-instance.demandware.net';
    }
};

