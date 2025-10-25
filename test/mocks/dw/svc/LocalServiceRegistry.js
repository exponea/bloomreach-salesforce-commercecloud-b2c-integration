/**
 * Mock implementation of dw/svc/LocalServiceRegistry
 * Manages service registrations for testing purposes
 */

const Service = require('./Service');

const services = new Map();

module.exports = {
    /**
     * Creates a service
     * @param {string} serviceId - The service ID
     * @param {Object} serviceConfig - The service configuration
     * @returns {Service} The created service
     */
    createService: function(serviceId, serviceConfig) {
        const service = new Service(serviceId, serviceConfig);
        services.set(serviceId, service);
        return service;
    },

    /**
     * Gets a service by ID
     * @param {string} serviceId - The service ID
     * @returns {Service|null} The service or null if not found
     */
    getService: function(serviceId) {
        return services.get(serviceId) || null;
    },

    // Test helpers
    __reset: function() {
        services.clear();
    },

    __getServices: function() {
        return services;
    }
};

