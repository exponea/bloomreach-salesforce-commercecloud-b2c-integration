/**
 * Mock implementation of dw/system/Transaction
 * Provides transaction support for testing purposes
 */

module.exports = {
    /**
     * Wraps a function in a transaction
     * In the mock, we just execute the function synchronously
     * @param {Function} callback - The function to execute in a transaction
     * @returns {*} The return value of the callback
     */
    wrap: function(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Transaction.wrap requires a function argument');
        }
        try {
            return callback();
        } catch (e) {
            // In a real SFCC environment, this would rollback the transaction
            throw e;
        }
    },

    /**
     * Begins a transaction
     * Mock implementation for testing
     */
    begin: function() {
        // No-op in mock
    },

    /**
     * Commits a transaction
     * Mock implementation for testing
     */
    commit: function() {
        // No-op in mock
    },

    /**
     * Rolls back a transaction
     * Mock implementation for testing
     */
    rollback: function() {
        // No-op in mock
    }
};

