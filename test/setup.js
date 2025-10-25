/**
 * Test setup file
 * This file sets up the global environment for tests
 * 
 * To use this in Jest, add to jest.config.js:
 * {
 *   setupFilesAfterEnv: ['<rootDir>/test/setup.js']
 * }
 * 
 * To use this in Mocha, add to test command:
 * mocha --require test/setup.js
 */

// Set up global dw object
global.dw = require('./mocks/dw');

// Set up global empty function (used in SFCC for checking empty values)
global.empty = function(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        // For objects with size() method (like ArrayList, HashMap)
        if (typeof value.size === 'function') {
            return value.size() === 0;
        }
        // For plain objects
        return Object.keys(value).length === 0;
    }
    return false;
};

// Set up console logging for tests (optional - uncomment if needed)
// global.console.log = jest.fn();
// global.console.error = jest.fn();
// global.console.warn = jest.fn();

// Export for use in tests
module.exports = {
    dw: global.dw,
    empty: global.empty
};

