'use strict';

/**
 * SFTP Helper Module
 * Handles SFTP file upload operations with support for both password and SSH key authentication.
 * Provides graceful fallback to WebDAV when SFTP is not configured or fails.
 *
 * @module cartridge/scripts/helpers/SFTPHelper
 */

var Site = require('dw/system/Site');
var SFTPClient = require('dw/net/SFTPClient');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var KeyRef = require('dw/crypto/KeyRef');

/**
 * Check if SFTP is properly configured (credentials-based, not flag-based)
 * The system implicitly determines SFTP usage based on credential presence
 * @returns {Object} Result object with {enabled: boolean, error: string}
 */
function isSFTPEnabled() {
    try {
        var currentSite = Site.getCurrent();
        var sitePrefs = currentSite.getPreferences();
        var custom = sitePrefs.getCustom();

        // Validate required fields - implicitly check for SFTP credentials
        var hostname = custom.brEngSFTPHostname;
        var username = custom.brEngSFTPUsername;
        var remoteDir = custom.brEngSFTPRemoteDirectory;

        // If core SFTP credentials are not configured, use WebDAV
        if (!hostname || hostname.trim() === '') {
            return {
                enabled: false,
                error: 'SFTP hostname is not configured - using WebDAV'
            };
        }

        if (!username || username.trim() === '') {
            return {
                enabled: false,
                error: 'SFTP username is not configured - using WebDAV'
            };
        }

        if (!remoteDir || remoteDir.trim() === '') {
            return {
                enabled: false,
                error: 'SFTP remote directory is not configured - using WebDAV'
            };
        }

        // Get the actual value from the enum, not the display name
        var authMethodRaw = custom.brEngSFTPAuthMethod;
        var authMethod = authMethodRaw && authMethodRaw.value ? authMethodRaw.value : (authMethodRaw || 'password');

        // Validate authentication credentials based on method
        if (authMethod === 'ssh-key') {
            var keyAlias = custom.brEngSFTPKeyAlias;
            if (!keyAlias || keyAlias.trim() === '') {
                return {
                    enabled: false,
                    error: 'SFTP SSH key alias is not configured - using WebDAV'
                };
            }
        } else {
            var password = custom.brEngSFTPPassword;
            if (!password || password.trim() === '') {
                return {
                    enabled: false,
                    error: 'SFTP password is not configured - using WebDAV'
                };
            }
        }

        return {
            enabled: true,
            error: null
        };

    } catch (e) {
        return {
            enabled: false,
            error: 'Error checking SFTP configuration: ' + e.message
        };
    }
}

/**
 * Get SFTP configuration from site preferences
 * @returns {Object} Configuration object or null if invalid
 */
function getSFTPConfig() {
    try {
        var currentSite = Site.getCurrent();
        var sitePrefs = currentSite.getPreferences();
        var custom = sitePrefs.getCustom();

        // Get the actual value from the enum, not the display name
        var authMethodRaw = custom.brEngSFTPAuthMethod;
        var authMethod = authMethodRaw && authMethodRaw.value ? authMethodRaw.value : (authMethodRaw || 'password');

        return {
            hostname: custom.brEngSFTPHostname || '',
            port: custom.brEngSFTPPort || 22,
            username: custom.brEngSFTPUsername || '',
            authMethod: authMethod,
            password: custom.brEngSFTPPassword || '',
            keyAlias: custom.brEngSFTPKeyAlias || '',
            remoteDirectory: custom.brEngSFTPRemoteDirectory || '/'
        };
    } catch (e) {
        return null;
    }
}

/**
 * Create and configure SFTP client with authentication
 * @param {Object} config - SFTP configuration object
 * @param {Object} Logger - Logger instance for logging
 * @returns {dw.net.SFTPClient} Configured SFTP client
 */
function createSFTPClient(config, Logger) {
    var sftpClient = new SFTPClient();

    try {
        // Configure authentication based on method
        if (config.authMethod === 'ssh-key') {
            // SSH Key Authentication
            Logger.info('Configuring SFTP client with SSH key authentication (alias: {0})', config.keyAlias);
            var keyRef = new KeyRef(config.keyAlias);
            sftpClient.setIdentity(keyRef);
        } else {
            // Password Authentication - credentials passed to connect() method
            Logger.info('Configuring SFTP client with password authentication');
        }

        return sftpClient;

    } catch (e) {
        Logger.error('Error creating SFTP client: {0}', e.message);
        throw e;
    }
}

/**
 * Upload file to SFTP server with retry logic
 * @param {dw.io.File} localFile - Local file to upload
 * @param {Object} Logger - Logger instance for logging
 * @returns {Object} Result object with {success: boolean, remotePath: string, error: string}
 */
function uploadFile(localFile, Logger) {
    var sftpClient = null;
    var maxRetries = 1;
    var retryCount = 0;

    try {
        // Get SFTP configuration
        var config = getSFTPConfig();
        if (!config) {
            return {
                success: false,
                remotePath: null,
                error: 'SFTP configuration is not available'
            };
        }

        // Validate local file exists
        if (!localFile || !localFile.exists()) {
            return {
                success: false,
                remotePath: null,
                error: 'Local file does not exist: ' + (localFile ? localFile.fullPath : 'null')
            };
        }

        Logger.info('Starting SFTP upload for file: {0} (size: {1} bytes)', localFile.name, localFile.length());

        // Attempt upload with retry logic
        while (retryCount <= maxRetries) {
            try {
                // Create SFTP client
                sftpClient = createSFTPClient(config, Logger);

                // Connect to SFTP server
                Logger.info('Connecting to SFTP server: {0}:{1} as user: {2}', config.hostname, config.port, config.username);
                var connected;
                if (config.authMethod === 'ssh-key') {
                    // SSH key auth - username is required, password is null
                    connected = sftpClient.connect(config.hostname, config.port, config.username, null);
                } else {
                    // Password auth
                    connected = sftpClient.connect(config.hostname, config.port, config.username, config.password);
                }

                if (!connected) {
                    throw new Error('Failed to connect to SFTP server: ' + config.hostname + ':' + config.port);
                }

                Logger.info('Successfully connected to SFTP server');

                // Construct remote file path
                var remoteDir = config.remoteDirectory;
                // Ensure remote directory ends with /
                if (!remoteDir.endsWith('/')) {
                    remoteDir += '/';
                }
                var remoteFilePath = remoteDir + localFile.name;

                // Upload file
                Logger.info('Uploading file to remote path: {0}', remoteFilePath);
                var uploaded = sftpClient.putBinary(remoteFilePath, localFile);

                if (!uploaded) {
                    throw new Error('SFTP putBinary() returned false for file: ' + remoteFilePath);
                }

                Logger.info('File uploaded successfully to: {0}', remoteFilePath);

                // Disconnect
                sftpClient.disconnect();
                Logger.info('SFTP connection closed');

                return {
                    success: true,
                    remotePath: remoteFilePath,
                    error: null
                };

            } catch (e) {
                // Check if this is a transient error that warrants retry
                var isTransient = isTransientError(e);

                if (isTransient && retryCount < maxRetries) {
                    retryCount++;
                    Logger.warn('SFTP upload failed (attempt {0}/{1}), retrying: {2}', retryCount, maxRetries + 1, e.message);
                    // Clean up connection before retry
                    try {
                        if (sftpClient) {
                            sftpClient.disconnect();
                        }
                    } catch (disconnectError) {
                        // Ignore disconnect errors
                    }
                    sftpClient = null;
                } else {
                    // No retry or max retries reached
                    throw e;
                }
            }
        }

        // Should not reach here, but just in case
        return {
            success: false,
            remotePath: null,
            error: 'SFTP upload failed after ' + (maxRetries + 1) + ' attempts'
        };

    } catch (e) {
        Logger.error('SFTP upload error: {0}', e.message);
        return {
            success: false,
            remotePath: null,
            error: e.message
        };
    } finally {
        // Ensure connection is closed
        try {
            if (sftpClient) {
                sftpClient.disconnect();
            }
        } catch (e) {
            // Ignore disconnect errors
        }
    }
}

/**
 * Determine if an error is transient and warrants a retry
 * @param {Error} error - The error to check
 * @returns {boolean} True if error is transient
 */
function isTransientError(error) {
    if (!error || !error.message) {
        return false;
    }

    var message = error.message.toLowerCase();

    // Transient error patterns
    var transientPatterns = [
        'timeout',
        'connection reset',
        'connection refused',
        'network',
        'temporarily unavailable',
        'try again'
    ];

    for (var i = 0; i < transientPatterns.length; i++) {
        if (message.indexOf(transientPatterns[i]) !== -1) {
            return true;
        }
    }

    return false;
}

/**
 * Test SFTP connection and upload capability
 * @param {Object} Logger - Logger instance for logging
 * @returns {Object} Result object with {success: boolean, message: string}
 */
function testSFTPConnection(Logger) {
    var sftpClient = null;
    var testFile = null;

    try {
        Logger.info('Starting SFTP connection test...');

        // Get SFTP configuration
        var config = getSFTPConfig();
        if (!config) {
            return {
                success: false,
                message: 'SFTP configuration is not available'
            };
        }

        // Create SFTP client
        sftpClient = createSFTPClient(config, Logger);

        // Test 1: Connect to SFTP server
        Logger.info('Test 1: Connecting to SFTP server {0}:{1} as user: {2}', config.hostname, config.port, config.username);
        var connected;
        if (config.authMethod === 'ssh-key') {
            // SSH key auth - username is required, password is null
            connected = sftpClient.connect(config.hostname, config.port, config.username, null);
        } else {
            // Password auth
            connected = sftpClient.connect(config.hostname, config.port, config.username, config.password);
        }

        if (!connected) {
            return {
                success: false,
                message: 'Failed to connect to SFTP server: ' + config.hostname + ':' + config.port
            };
        }

        Logger.info('Test 1: PASSED - Successfully connected to SFTP server');

        // Test 2: Create and upload test file
        Logger.info('Test 2: Creating test file for upload');
        var testFileName = 'sftp-test-' + Date.now() + '.txt';
        var tempFolder = new File(File.TEMP);
        testFile = new File(tempFolder, testFileName);

        var fileWriter = new FileWriter(testFile);
        fileWriter.writeLine('SFTP Connection Test File');
        fileWriter.writeLine('Generated: ' + new Date().toISOString());
        fileWriter.writeLine('Test successful!');
        fileWriter.close();

        Logger.info('Test 2: Uploading test file: {0}', testFileName);

        var remoteDir = config.remoteDirectory;
        if (!remoteDir.endsWith('/')) {
            remoteDir += '/';
        }
        var remoteTestPath = remoteDir + testFileName;

        var uploaded = sftpClient.putBinary(remoteTestPath, testFile);

        if (!uploaded) {
            return {
                success: false,
                message: 'Failed to upload test file to: ' + remoteTestPath
            };
        }

        Logger.info('Test 2: PASSED - Test file uploaded successfully');

        // Test 3: Delete test file (cleanup)
        Logger.info('Test 3: Cleaning up test file from SFTP server');
        try {
            sftpClient.del(remoteTestPath);
            Logger.info('Test 3: PASSED - Test file deleted successfully');
        } catch (deleteError) {
            Logger.warn('Test 3: WARNING - Could not delete test file: {0}', deleteError.message);
            // Don't fail the test if cleanup fails
        }

        // All tests passed
        var successMsg = 'All SFTP connection tests passed successfully. ' +
                        'Server: ' + config.hostname + ':' + config.port + ', ' +
                        'Auth: ' + config.authMethod;

        Logger.info(successMsg);

        return {
            success: true,
            message: successMsg
        };

    } catch (e) {
        Logger.error('SFTP connection test failed: {0}', e.message);
        return {
            success: false,
            message: 'SFTP test error: ' + e.message
        };
    } finally {
        // Cleanup: Disconnect and delete temp file
        try {
            if (sftpClient) {
                sftpClient.disconnect();
                Logger.info('SFTP connection closed');
            }
        } catch (e) {
            // Ignore disconnect errors
        }

        try {
            if (testFile && testFile.exists()) {
                testFile.remove();
                Logger.info('Temporary test file deleted');
            }
        } catch (e) {
            Logger.warn('Could not delete temporary test file: {0}', e.message);
        }
    }
}

module.exports = {
    isSFTPEnabled: isSFTPEnabled,
    uploadFile: uploadFile,
    testSFTPConnection: testSFTPConnection
};
