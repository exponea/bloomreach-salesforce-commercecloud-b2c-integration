'use strict';

/**
 * Controller for serving files with signed URLs
 * This decouples file downloads from expiring WebDAV credentials
 */

var server = require('server');
var File = require('dw/io/File');
var URLSigningHelper = require('*/cartridge/scripts/helpers/URLSigningHelper');
var Logger = require('dw/system/Logger').getLogger('BloomreachEngagement', 'FileDownload');

/**
 * Serves a file download using a signed URL
 * Query parameters:
 *   - path: The file path (URL-encoded)
 *   - exp: Expiration timestamp
 *   - sig: Signature
 */
server.get('Serve', function (req, res, next) {
    var params = req.querystring;
    
    // Extract and validate parameters
    var filePath = params.path;
    var expirationTimestamp = params.exp;
    var signature = params.sig;
    
    if (!filePath || !expirationTimestamp || !signature) {
        Logger.error('Missing required parameters for file download');
        res.setStatusCode(400);
        res.json({
            error: 'Missing required parameters',
            message: 'Required parameters: path, exp, sig'
        });
        return next();
    }
    
    // Verify the signed URL
    var verificationResult = URLSigningHelper.verifySignedURL(filePath, expirationTimestamp, signature);
    
    if (!verificationResult.valid) {
        Logger.error('Invalid or expired signed URL: {0}', verificationResult.error);
        res.setStatusCode(403);
        res.json({
            error: 'Access denied',
            message: verificationResult.error
        });
        return next();
    }
    
    // Load the file
    var file = new File(verificationResult.filePath);
    
    if (!file.exists()) {
        Logger.error('File not found: {0}', verificationResult.filePath);
        res.setStatusCode(404);
        res.json({
            error: 'File not found',
            message: 'The requested file does not exist'
        });
        return next();
    }
    
    if (!file.isFile()) {
        Logger.error('Path is not a file: {0}', verificationResult.filePath);
        res.setStatusCode(400);
        res.json({
            error: 'Invalid path',
            message: 'The specified path is not a file'
        });
        return next();
    }
    
    try {
        // Read file content
        var FileReader = require('dw/io/FileReader');
        var reader = new FileReader(file);
        var content = reader.readString();
        reader.close();
        
        // Determine content type based on file extension
        var fileName = file.getName();
        var contentType = 'application/octet-stream';
        if (fileName.endsWith('.csv')) {
            contentType = 'text/csv';
        } else if (fileName.endsWith('.json')) {
            contentType = 'application/json';
        } else if (fileName.endsWith('.xml')) {
            contentType = 'application/xml';
        }
        
        // Set response headers
        res.setContentType(contentType);
        res.setHttpHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
        res.setHttpHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHttpHeader('Pragma', 'no-cache');
        res.setHttpHeader('Expires', '0');
        
        // Send file content
        res.print(content);
        
        Logger.info('Successfully served file: {0}', fileName);
        
    } catch (e) {
        Logger.error('Error reading file {0}: {1}', verificationResult.filePath, e.message);
        res.setStatusCode(500);
        res.json({
            error: 'Internal server error',
            message: 'Failed to read file'
        });
    }
    
    return next();
});

module.exports = server.exports();

