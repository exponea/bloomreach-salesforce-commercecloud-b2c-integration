'use strict';

/**
 * BloomreachEngagementFileDownloadHelper.js
 * 
 * Helper functions for generating secure file download URLs
 * using the controller-based endpoint instead of WebDAV
 */

var Site = require('dw/system/Site');
var File = require('dw/io/File');
var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementFileDownloadHelper');

/**
 * Generates a controller-based download URL for a CSV file
 * This replaces the WebDAV URL approach with a secure controller endpoint
 * The file must exist before calling this function
 * 
 * The generated URL format:
 * https://{hostname}/on/demandware.store/Sites-{siteId}-Site/default/BloomreachFileDownload-Download?path={relativePath}
 * 
 * @param {dw.io.File} csvFile - The CSV file object in IMPEX directory (must exist)
 * @returns {string} - The controller-based download URL
 * 
 * @example
 * var file = new File(File.getRootDirectory(File.IMPEX), 'src/bloomreach_engagement/CustomerFeed/customers-20231024.csv');
 * var url = generateDownloadUrl(file);
 * // Returns: https://instance.demandware.net/on/demandware.store/Sites-RefArch-Site/default/BloomreachFileDownload-Download?path=src%2Fbloomreach_engagement%2FCustomerFeed%2Fcustomers-20231024.csv
 */
function generateDownloadUrl(csvFile) {
    if (!csvFile || !csvFile.exists()) {
        Logger.error('Cannot generate download URL: File does not exist or is null');
        throw new Error('Cannot generate download URL for non-existent file');
    }
    
    try {
        var currentSite = Site.getCurrent();
        var hostname = dw.system.System.getInstanceHostname();
        var siteId = currentSite.getID();
        
        // Get the relative path from IMPEX root
        var impexRoot = File.getRootDirectory(File.IMPEX).fullPath;
        var filePath = csvFile.fullPath;
        
        // Remove IMPEX root prefix to get relative path
        var relativePath = filePath;
        if (filePath.indexOf(impexRoot) === 0) {
            relativePath = filePath.substring(impexRoot.length);
        }
        
        // Remove leading slash if present
        if (relativePath.indexOf(File.SEPARATOR) === 0) {
            relativePath = relativePath.substring(1);
        }
        
        // Convert Windows-style paths to forward slashes for URL
        relativePath = relativePath.replace(/\\/g, '/');
        
        // URL encode the path parameter
        var encodedPath = encodeURIComponent(relativePath);
        
        // Build the controller URL
        var downloadUrl = 'https://' + hostname + 
                         '/on/demandware.store/Sites-' + siteId + '-Site/default/BloomreachFileDownload-Download' +
                         '?path=' + encodedPath;
        
        Logger.debug('Generated download URL for file: ' + relativePath);
        Logger.debug('Download URL: ' + downloadUrl);
        
        return downloadUrl;
        
    } catch (e) {
        Logger.error('Error generating download URL: ' + e.message + '\n' + e.stack);
        throw new Error('Failed to generate download URL: ' + e.message);
    }
}

/**
 * Validates that download endpoint credentials are configured
 * This should be called during job initialization to fail fast if misconfigured
 * 
 * @returns {boolean} - True if credentials are configured, false otherwise
 */
function validateDownloadCredentialsConfigured() {
    var currentSite = Site.getCurrent();
    var username = currentSite.getCustomPreferenceValue('brEngDownloadUsername');
    var password = currentSite.getCustomPreferenceValue('brEngDownloadPassword');
    
    if (!username || !password) {
        Logger.error('Download endpoint credentials not configured. ' +
                    'Please set brEngDownloadUsername and brEngDownloadPassword in site preferences.');
        return false;
    }
    
    Logger.debug('Download endpoint credentials are configured');
    return true;
}

/**
 * Gets information about the download URL configuration for logging/debugging
 * 
 * @returns {Object} - Configuration information (without sensitive data)
 */
function getDownloadUrlInfo() {
    var currentSite = Site.getCurrent();
    var hostname = dw.system.System.getInstanceHostname();
    var siteId = currentSite.getID();
    var username = currentSite.getCustomPreferenceValue('brEngDownloadUsername');
    var hasPassword = !!currentSite.getCustomPreferenceValue('brEngDownloadPassword');
    
    return {
        hostname: hostname,
        siteId: siteId,
        baseUrl: 'https://' + hostname + '/on/demandware.store/Sites-' + siteId + '-Site/default/BloomreachFileDownload-Download',
        usernameConfigured: !!username,
        passwordConfigured: hasPassword,
        isFullyConfigured: !!username && hasPassword
    };
}

// Export functions
module.exports = {
    generateDownloadUrl: generateDownloadUrl,
    validateDownloadCredentialsConfigured: validateDownloadCredentialsConfigured,
    getDownloadUrlInfo: getDownloadUrlInfo
};

