var bloomReachEngagementAPIServices = require('~/cartridge/scripts/services/BloomreachEngagementAPIService.js');
var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');
var Site = require('dw/system/Site');

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
    var currentSite = Site.getCurrent();
    var bloomreachServiceURL = currentSite.getCustomPreferenceValue('brEngApiBaseUrl')
        + '/data/v2/projects/projectToken/imports/import_id/start';
    var bloomreachProjectToken = currentSite.getCustomPreferenceValue('brEngProjectToken');

    var BREngagementAPISerivce = bloomReachEngagementAPIServices.getBloomreachEngagementAPIService(import_Id);

    var requestObject = {
        webDavFilePath: webDavFilePath
    };

    var serviceURL = bloomreachServiceURL.replace('projectToken', bloomreachProjectToken).replace('import_id', import_Id);
    Logger.info('Triggering Bloomreach API import. URL: ' + serviceURL + ' | File path: ' + webDavFilePath);

    var maxRetries = 2;
    var retryCount = 0;

    while (retryCount <= maxRetries) {
        var result = BREngagementAPISerivce.call(requestObject);

        Logger.info('bloomreach.engagement.service call URL: ' + serviceURL);
        Logger.info('Request Data: ' + BREngagementAPISerivce.getRequestData());
        Logger.info('Response Data: ' + result);

        if (result.status === 'OK') {
            return result.object;
        }

        if (isTransientAPIError(result.errorMessage) && retryCount < maxRetries) {
            retryCount++;
            var delayMs = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s
            Logger.warn('Bloomreach API call failed (attempt ' + retryCount + '/' + (maxRetries + 1) + '), retrying in ' + delayMs + 'ms: ' + result.errorMessage);
            sleep(delayMs);
        } else {
            var errorMsg = 'Bloomreach API import trigger failed for import ID: ' + import_Id
                + '. Error: ' + result.errorMessage;
            Logger.error(errorMsg);
            throw new Error(errorMsg);
        }
    }
}

module.exports = {
    bloomReachEngagementAPIService: bloomReachEngagementAPIService
}
