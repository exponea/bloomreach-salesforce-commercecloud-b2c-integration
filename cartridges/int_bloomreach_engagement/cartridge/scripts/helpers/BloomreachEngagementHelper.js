'use strict';

var bloomReachEngagementAPIServices = require('~/cartridge/scripts/services/BloomreachEngagementAPIService.js');
var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');

/**
 * Blocks the current thread for the given number of milliseconds.
 * Uses java.lang.Thread.sleep in the SFCC/Rhino runtime; no-ops in Node.js
 * test environments where the java global is not available.
 * @param {number} ms
 */
function sleep(ms) {
    if (typeof java !== 'undefined') {
        java.lang.Thread.sleep(ms);
    }
}

/**
 * Returns true when the error message indicates a transient network condition
 * that is safe to retry (timeouts, socket errors, temporary unavailability).
 * @param {string} errorMessage
 * @returns {boolean}
 */
function isTransientAPIError(errorMessage) {
    if (!errorMessage) {
        return false;
    }
    var msg = errorMessage.toLowerCase();
    var patterns = ['timeout', 'socket', 'connection reset', 'service_unavailable', 'unavailable'];
    for (var i = 0; i < patterns.length; i++) {
        if (msg.indexOf(patterns[i]) !== -1) {
            return true;
        }
    }
    return false;
}

const bloomReachEngagementAPIService = function(import_Id, webDavFilePath) {
    var BREngagementAPISerivce = bloomReachEngagementAPIServices.getBloomreachEngagementAPIService(import_Id);

    var requestObject = {
        webDavFilePath: webDavFilePath
    };

    Logger.info('Triggering Bloomreach API import. Import ID: ' + import_Id + ' | File path: ' + webDavFilePath);

    var maxRetries = 2;
    var retryCount = 0;

    while (retryCount <= maxRetries) {
        var result = BREngagementAPISerivce.call(requestObject);

        Logger.info('Request Data: ' + BREngagementAPISerivce.getRequestData());
        Logger.info('Response Data: ' + result);

        if (result.status === 'OK') {
            return result.object;
        }

        if (result.status === 'SERVICE_UNAVAILABLE') {
            var cbMsg = 'Bloomreach API service circuit breaker is open for import ID: ' + import_Id
                + '. Check service configuration in Business Manager.';
            Logger.error(cbMsg);
            throw new Error(cbMsg);
        }

        if (isTransientAPIError(result.errorMessage) && retryCount < maxRetries) {
            var delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s
            Logger.warn('Bloomreach API call failed (attempt ' + (retryCount + 1) + '/' + (maxRetries + 1) + '), retrying in ' + delayMs + 'ms: ' + result.errorMessage);
            retryCount++;
            sleep(delayMs);
        } else {
            if (retryCount === maxRetries) {
                Logger.warn('Bloomreach API call failed (attempt ' + (retryCount + 1) + '/' + (maxRetries + 1) + ')');
            }
            var errorDetail = result.errorMessage
                || (result.error ? 'HTTP ' + result.error : null)
                || result.object
                || 'unknown error (check service logs in Business Manager)';
            var errorMsg = 'Bloomreach API import trigger failed for import ID: ' + import_Id
                + '. Error: ' + errorDetail;
            Logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }
}

module.exports = {
    bloomReachEngagementAPIService: bloomReachEngagementAPIService
}
