/**
 * Mock implementation of dw/net/SFTPClient
 * Supports per-instance behavior queuing so tests can control what each
 * constructed instance does — important for retry tests where `uploadFile()`
 * creates a new SFTPClient on every attempt.
 *
 * Usage in tests:
 *
 *   const MockSFTPClient = require('../mocks/dw/net/SFTPClient');
 *
 *   beforeEach(function() {
 *       MockSFTPClient.__reset();
 *   });
 *
 *   // Override the default (all-succeed) behavior for the next constructed instance:
 *   MockSFTPClient.__queueBehavior({
 *       connect: function() { return false; }
 *   });
 *
 *   // For retry tests, queue two behaviors — one per attempt:
 *   MockSFTPClient.__queueBehavior({
 *       connect: function() { throw new Error('connection timeout'); }
 *   });
 *   // Second instance uses default (succeeds):
 */

var _instanceBehaviors = [];
var _lastInstance;

function SFTPClient() {
    var behavior = _instanceBehaviors.length > 0 ? _instanceBehaviors.shift() : {};
    _lastInstance = this;

    this.connect = behavior.connect || function() { return true; };
    this.disconnect = behavior.disconnect || function() {};
    this.putBinary = behavior.putBinary || function() { return true; };
    this.del = behavior.del || function() {};
    this.setIdentity = behavior.setIdentity || function() {};
}

/**
 * Returns the most recently constructed SFTPClient instance.
 * @returns {SFTPClient}
 */
SFTPClient.getInstance = function() {
    return _lastInstance;
};

/**
 * Queues a behavior object for the next SFTPClient instance that gets constructed.
 * Properties not specified fall back to the default (success) implementation.
 * @param {Object} behavior - Partial behavior overrides
 * @param {Function} [behavior.connect]
 * @param {Function} [behavior.disconnect]
 * @param {Function} [behavior.putBinary]
 * @param {Function} [behavior.del]
 * @param {Function} [behavior.setIdentity]
 */
SFTPClient.__queueBehavior = function(behavior) {
    _instanceBehaviors.push(behavior || {});
};

/**
 * Resets all queued behaviors and the stored instance reference.
 * Call in beforeEach to prevent cross-test contamination.
 */
SFTPClient.__reset = function() {
    _instanceBehaviors = [];
    _lastInstance = undefined;
};

module.exports = SFTPClient;
