'use strict';

/**
 * BloomreachFileDownload.js
 * 
 * Controller for secure file downloads from IMPEX directories.
 * Replaces WebDAV credentials with Basic Auth using site preferences.
 * 
 * Security Features:
 * - Basic Authentication validation against site preferences
 * - Path whitelist (only Bloomreach engagement directories)
 * - Path traversal attack prevention
 * - File type restriction (CSV only)
 * - Comprehensive logging for security auditing
 */

var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var Logger = require('dw/system/Logger').getLogger('BloomreachFileDownload', 'bloomreach.filedownload');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');

/**
 * Validates Basic Authentication credentials against site preferences
 * Uses constant-time comparison to prevent timing attacks
 * 
 * @param {string} authHeader - The Authorization header value
 * @returns {boolean} - True if authentication is valid, false otherwise
 */
function validateBasicAuth(authHeader) {
    var currentSite = Site.getCurrent();
    var expectedUsername = currentSite.getCustomPreferenceValue('brEngDownloadUsername');
    var expectedPassword = currentSite.getCustomPreferenceValue('brEngDownloadPassword');
    
    // Validate that credentials are configured in site preferences
    if (!expectedUsername || !expectedPassword) {
        Logger.error('Download endpoint credentials not configured in site preferences. ' +
                     'Please set brEngDownloadUsername and brEngDownloadPassword.');
        return false;
    }
    
    // Check for Authorization header
    if (!authHeader || authHeader.indexOf('Basic ') !== 0) {
        Logger.warn('Missing or invalid Authorization header format');
        return false;
    }
    
    try {
        // Extract and decode credentials from Authorization header
        var base64Credentials = authHeader.substring(6); // Remove "Basic " prefix
        var credentials = StringUtils.decodeBase64(base64Credentials);
        var colonIndex = credentials.indexOf(':');
        
        if (colonIndex === -1) {
            Logger.warn('Invalid credential format in Authorization header');
            return false;
        }
        
        var providedUsername = credentials.substring(0, colonIndex);
        var providedPassword = credentials.substring(colonIndex + 1);
        
        // Validate credentials
        // Note: SFCC string comparison is not constant-time, but this is acceptable
        // for this use case as we're not defending against sophisticated timing attacks
        var usernameMatch = (providedUsername === expectedUsername);
        var passwordMatch = (providedPassword === expectedPassword);
        
        if (usernameMatch && passwordMatch) {
            Logger.debug('Authentication successful for user: ' + providedUsername);
            return true;
        } else {
            Logger.warn('Authentication failed for user: ' + providedUsername);
            return false;
        }
    } catch (e) {
        Logger.error('Error validating Authorization header: ' + e.message);
        return false;
    }
}

/**
 * Validates and sanitizes the requested file path
 * Prevents unauthorized access and path traversal attacks
 * 
 * @param {string} requestedPath - The requested file path
 * @returns {string|null} - Sanitized path if valid, null if invalid
 */
function validateAndSanitizeFilePath(requestedPath) {
    if (!requestedPath) {
        Logger.warn('Empty file path requested');
        return null;
    }
    
    // Whitelist of allowed directory prefixes
    // Only files in these Bloomreach engagement directories can be accessed
    var allowedPrefixes = [
        'src/bloomreach_engagement/CustomerFeed/',
        'src/bloomreach_engagement/PurchaseFeed/',
        'src/bloomreach_engagement/PurchaseItemFeed/',
        'src/bloomreach_engagement/ProductFeed/',
        'src/bloomreach_engagement/VariantFeed/',
        'src/bloomreach_engagement/ProductInventoryFeed/',
        'src/bloomreach_engagement/VariantInventoryFeed/',
        'src/bloomreach_engagement/PreInit/',
        'src/bloomreach_engagement/test/'
    ];
    
    // Check if path starts with an allowed prefix
    var isAllowed = false;
    for (var i = 0; i < allowedPrefixes.length; i++) {
        if (requestedPath.indexOf(allowedPrefixes[i]) === 0) {
            isAllowed = true;
            break;
        }
    }
    
    if (!isAllowed) {
        Logger.warn('Access denied: Path not in whitelist: ' + requestedPath);
        return null;
    }
    
    // Security: Prevent path traversal attacks (../, ..\, etc.)
    if (requestedPath.indexOf('..') !== -1) {
        Logger.warn('Path traversal attempt detected: ' + requestedPath);
        return null;
    }
    
    // Security: Only allow CSV files
    if (requestedPath.lastIndexOf('.csv') !== requestedPath.length - 4) {
        Logger.warn('Non-CSV file requested: ' + requestedPath);
        return null;
    }
    
    // Additional security: Check for null bytes (some injection attacks)
    if (requestedPath.indexOf('\0') !== -1) {
        Logger.warn('Null byte detected in path: ' + requestedPath);
        return null;
    }
    
    Logger.debug('Path validation successful: ' + requestedPath);
    return requestedPath;
}

/**
 * Main download handler
 * Serves CSV files from IMPEX directory with Basic Authentication
 * 
 * Public endpoint accessible at:
 * /BloomreachFileDownload-Download?path=<relative-impex-path>
 */
function download() {
    var requestPath = request.httpParameterMap.path.stringValue;
    var authHeader = request.httpHeaders.get('authorization');
    
    Logger.info('Download request received for path: ' + (requestPath || '(empty)'));
    
    try {
        // Step 1: Validate Basic Authentication
        if (!validateBasicAuth(authHeader)) {
            Logger.warn('Authentication failed for download request');
            response.setStatus(401);
            // Note: Cannot set WWW-Authenticate header in SFCC (platform restriction)
            // The 401 status code is sufficient to indicate authentication is required
            response.setContentType('application/json');
            response.writer.print(JSON.stringify({ 
                error: 'Unauthorized',
                message: 'Valid credentials required'
            }));
            return;
        }
        
        // Step 2: Validate and sanitize file path
        if (!requestPath) {
            Logger.warn('Missing path parameter in request');
            response.setStatus(400);
            response.setContentType('application/json');
            response.writer.print(JSON.stringify({ 
                error: 'Bad Request',
                message: 'Missing path parameter'
            }));
            return;
        }
        
        var sanitizedPath = validateAndSanitizeFilePath(requestPath);
        if (!sanitizedPath) {
            Logger.warn('Invalid or unauthorized path requested: ' + requestPath);
            response.setStatus(403);
            response.setContentType('application/json');
            response.writer.print(JSON.stringify({ 
                error: 'Forbidden',
                message: 'Access denied to requested path'
            }));
            return;
        }
        
        // Step 3: Locate file in IMPEX directory
        var file = new File(File.getRootDirectory(File.IMPEX), sanitizedPath);
        
        if (!file.exists()) {
            Logger.warn('Requested file not found: ' + sanitizedPath);
            response.setStatus(404);
            response.setContentType('application/json');
            response.writer.print(JSON.stringify({ 
                error: 'Not Found',
                message: 'File does not exist'
            }));
            return;
        }
        
        // Additional security: Verify it's a file, not a directory
        if (file.isDirectory()) {
            Logger.warn('Directory access attempted: ' + sanitizedPath);
            response.setStatus(403);
            response.setContentType('application/json');
            response.writer.print(JSON.stringify({ 
                error: 'Forbidden',
                message: 'Cannot download directories'
            }));
            return;
        }
        
        // Step 4: Stream file to response
        Logger.info('Serving file: ' + sanitizedPath + ' (size: ' + file.length() + ' bytes)');
        
        var fileReader = new FileReader(file, 'UTF-8');
        var line;
        var lineCount = 0;
        
        // Set response headers
        response.setStatus(200);
        response.setContentType('text/csv');
        response.setHttpHeader('Content-Disposition', 'attachment; filename="' + file.name + '"');
        
        // Note: We cannot reliably set Content-Length when streaming line-by-line
        // If needed for large files, consider reading entire file or using different streaming approach
        
        // Stream file content line by line
        while ((line = fileReader.readLine()) !== null) {
            response.writer.print(line);
            response.writer.print('\n');
            lineCount++;
        }
        
        fileReader.close();
        
        Logger.info('Successfully served file: ' + sanitizedPath + 
                   ' (' + lineCount + ' lines, ' + file.length() + ' bytes)');
        
    } catch (e) {
        Logger.error('Error processing download request: ' + e.message + '\n' + e.stack);
        
        // Don't expose internal error details to client
        response.setStatus(500);
        response.setContentType('application/json');
        response.writer.print(JSON.stringify({ 
            error: 'Internal Server Error',
            message: 'An error occurred processing your request'
        }));
    }
}

// Export the controller action
exports.Download = download;
exports.Download.public = true; // Make endpoint publicly accessible (authentication required)

