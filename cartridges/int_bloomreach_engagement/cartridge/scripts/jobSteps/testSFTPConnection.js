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
            var errorMsg = 'SFTP is not enabled or not properly configured: {0}';
            Logger.error(errorMsg, sftpCheck.error || 'Unknown error');
            return new Status(Status.ERROR, 'ERROR', 'SFTP is not enabled or not properly configured: ' + (sftpCheck.error || 'Unknown error'));
        }

        Logger.info('SFTP configuration found. Testing connection...');

        // Perform the connection test
        var testResult = SFTPHelper.testSFTPConnection(Logger);

        if (testResult.success) {
            Logger.info('SFTP connection test passed: {0}', testResult.message);
            return new Status(Status.OK, 'OK', 'SFTP connection test passed: ' + testResult.message);
        } else {
            Logger.error('SFTP connection test failed: {0}', testResult.message);
            return new Status(Status.ERROR, 'ERROR', 'SFTP connection test failed: ' + testResult.message);
        }

    } catch (e) {
        Logger.error('SFTP connection test encountered an exception: {0}', e.message);
        Logger.error('Stack trace: {0}', e.stack || 'Not available');
        return new Status(Status.ERROR, 'ERROR', 'SFTP connection test encountered an exception: ' + e.message);
    }
};
