'use strict';

/**
 * Controller for serving files with signed URLs (Controllers/SiteGenesis version)
 * This decouples file downloads from expiring WebDAV credentials
 */

var File = require('dw/io/File');
var URLSigningHelper = require('int_bloomreach_engagement/cartridge/scripts/helpers/URLSigningHelper');
var Logger = require('dw/system/Logger').getLogger('BloomreachEngagement', 'FileDownload');
var ISML = require('dw/template/ISML');

/**
 * Serves a file download using a signed URL
 * Query parameters:
 *   - path: The file path (URL-encoded)
 *   - exp: Expiration timestamp
 *   - sig: Signature
 */
function serve() {
    var params = request.httpParameterMap;
    
    // Extract and validate parameters
    var filePath = params.path.stringValue;
    var expirationTimestamp = params.exp.stringValue;
    var signature = params.sig.stringValue;
    
    if (!filePath || !expirationTimestamp || !signature) {
        Logger.error('Missing required parameters for file download');
        response.setStatus(400);
        response.setContentType('application/json');
        response.writer.print(JSON.stringify({
            error: 'Missing required parameters',
            message: 'Required parameters: path, exp, sig'
        }));
        return;
    }
    
    // Verify the signed URL
    var verificationResult = URLSigningHelper.verifySignedURL(filePath, expirationTimestamp, signature);
    
    if (!verificationResult.valid) {
        Logger.error('Invalid or expired signed URL: {0}', verificationResult.error);
        response.setStatus(403);
        response.setContentType('application/json');
        response.writer.print(JSON.stringify({
            error: 'Access denied',
            message: verificationResult.error
        }));
        return;
    }
    
    // Load the file
    var file = new File(verificationResult.filePath);
    
    if (!file.exists()) {
        Logger.error('File not found: {0}', verificationResult.filePath);
        response.setStatus(404);
        response.setContentType('application/json');
        response.writer.print(JSON.stringify({
            error: 'File not found',
            message: 'The requested file does not exist'
        }));
        return;
    }
    
    if (!file.isFile()) {
        Logger.error('Path is not a file: {0}', verificationResult.filePath);
        response.setStatus(400);
        response.setContentType('application/json');
        response.writer.print(JSON.stringify({
            error: 'Invalid path',
            message: 'The specified path is not a file'
        }));
        return;
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
        if (fileName.indexOf('.csv') !== -1) {
            contentType = 'text/csv';
        } else if (fileName.indexOf('.json') !== -1) {
            contentType = 'application/json';
        } else if (fileName.indexOf('.xml') !== -1) {
            contentType = 'application/xml';
        }
        
        // Set response headers
        response.setContentType(contentType);
        response.setHttpHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
        response.setHttpHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHttpHeader('Pragma', 'no-cache');
        response.setHttpHeader('Expires', '0');
        
        // Send file content
        response.writer.print(content);
        
        Logger.info('Successfully served file: {0}', fileName);
        
    } catch (e) {
        Logger.error('Error reading file {0}: {1}', verificationResult.filePath, e.message);
        response.setStatus(500);
        response.setContentType('application/json');
        response.writer.print(JSON.stringify({
            error: 'Internal server error',
            message: 'Failed to read file'
        }));
    }
}

// Export the controller functions
exports.Serve = serve;
exports.serve = serve;

