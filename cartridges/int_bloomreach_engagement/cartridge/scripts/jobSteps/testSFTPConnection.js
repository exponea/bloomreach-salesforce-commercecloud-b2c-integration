/* Test SFTP Connection Job Step */
'use strict';

var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementSFTPTest');
var Status = require('dw/system/Status');
var SFTPHelper = require('~/cartridge/scripts/helpers/SFTPHelper.js');

/**
 * Execute function to test SFTP connection and authentication
 * @returns {dw.system.Status} Status of the test execution
 */
exports.execute = function () {
    Logger.info('Starting SFTP connection test...');

    try {
        // Check if SFTP is enabled and properly configured
        var sftpCheck = SFTPHelper.isSFTPEnabled();

        if (!sftpCheck.enabled) {
            var errorMsg = 'SFTP is not enabled or not properly configured: ' + (sftpCheck.error || 'Unknown error');
            Logger.error(errorMsg);
            return new Status(Status.ERROR, 'ERROR', errorMsg);
        }

        Logger.info('SFTP configuration found. Testing connection...');

        // Perform the connection test
        var testResult = SFTPHelper.testSFTPConnection(Logger);

        if (testResult.success) {
            var successMsg = 'SFTP connection test PASSED: ' + testResult.message;
            Logger.info(successMsg);
            return new Status(Status.OK, 'OK', successMsg);
        } else {
            var failureMsg = 'SFTP connection test FAILED: ' + testResult.message;
            Logger.error(failureMsg);
            return new Status(Status.ERROR, 'ERROR', failureMsg);
        }

    } catch (e) {
        var exceptionMsg = 'SFTP connection test encountered an exception: ' + e.message;
        Logger.error(exceptionMsg);
        Logger.error('Stack trace: {0}', e.stack || 'Not available');
        return new Status(Status.ERROR, 'ERROR', exceptionMsg);
    }
};
