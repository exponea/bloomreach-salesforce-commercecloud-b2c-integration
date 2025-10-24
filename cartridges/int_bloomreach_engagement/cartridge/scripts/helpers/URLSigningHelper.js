'use strict';

/**
 * URL Signing Helper for generating and verifying signed download URLs
 * This decouples file downloads from expiring WebDAV credentials
 */

var MessageDigest = require('dw/crypto/MessageDigest');
var Encoding = require('dw/crypto/Encoding');
var Bytes = require('dw/util/Bytes');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger').getLogger('BloomreachEngagement', 'URLSigning');

/**
 * Generates a signed URL for downloading a file
 * @param {string} filePath - The full path to the file in IMPEX
 * @param {number} expirationHours - Hours until the URL expires (default: 72 hours)
 * @returns {string} The signed download URL
 */
function generateSignedURL(filePath, expirationHours) {
    var currentSite = Site.getCurrent();
    var signingSecret = currentSite.getCustomPreferenceValue('brEngURLSigningSecret');
    
    if (!signingSecret) {
        throw new Error('URL signing secret not configured. Please set brEngURLSigningSecret site preference.');
    }
    
    // Default expiration: 72 hours (should be enough for Bloomreach to download the file)
    var expiration = expirationHours || 72;
    var expirationTimestamp = Date.now() + (expiration * 60 * 60 * 1000);
    
    // Generate signature: HMAC-SHA256(secret, filePath + expirationTimestamp)
    var dataToSign = filePath + '|' + expirationTimestamp;
    var signature = generateHMAC(signingSecret, dataToSign);
    
    // Build the controller URL
    var hostname = require('dw/system/System').getInstanceHostname();
    var siteID = currentSite.getID();
    
    // URL-encode the file path
    var encodedPath = encodeURIComponent(filePath);
    
    // Build URL: /on/demandware.store/Sites-[site]-Site/default/BloomreachFileDownload-Serve?path=[path]&exp=[timestamp]&sig=[signature]
    var url = 'https://' + hostname + 
              '/on/demandware.store/Sites-' + siteID + '-Site/default/' +
              'BloomreachFileDownload-Serve' +
              '?path=' + encodedPath +
              '&exp=' + expirationTimestamp +
              '&sig=' + signature;
    
    Logger.info('Generated signed URL for file: {0}, expires: {1}', filePath, new Date(expirationTimestamp));
    
    return url;
}

/**
 * Verifies a signed URL and returns the file path if valid
 * @param {string} filePath - The file path from the request
 * @param {string} expirationTimestamp - The expiration timestamp from the request
 * @param {string} signature - The signature from the request
 * @returns {Object} { valid: boolean, error: string|null, filePath: string|null }
 */
function verifySignedURL(filePath, expirationTimestamp, signature) {
    var currentSite = Site.getCurrent();
    var signingSecret = currentSite.getCustomPreferenceValue('brEngURLSigningSecret');
    
    if (!signingSecret) {
        return {
            valid: false,
            error: 'URL signing secret not configured',
            filePath: null
        };
    }
    
    // Check if URL has expired
    var exp = parseInt(expirationTimestamp, 10);
    if (isNaN(exp) || Date.now() > exp) {
        Logger.warn('Signed URL has expired: {0}', filePath);
        return {
            valid: false,
            error: 'URL has expired',
            filePath: null
        };
    }
    
    // Verify signature
    var dataToSign = filePath + '|' + expirationTimestamp;
    var expectedSignature = generateHMAC(signingSecret, dataToSign);
    
    if (signature !== expectedSignature) {
        Logger.warn('Invalid signature for file: {0}', filePath);
        return {
            valid: false,
            error: 'Invalid signature',
            filePath: null
        };
    }
    
    Logger.info('Successfully verified signed URL for file: {0}', filePath);
    
    return {
        valid: true,
        error: null,
        filePath: filePath
    };
}

/**
 * Generates HMAC-SHA256 signature
 * @param {string} secret - The signing secret
 * @param {string} data - The data to sign
 * @returns {string} The hex-encoded signature
 */
function generateHMAC(secret, data) {
    var messageDigest = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    
    // Create HMAC by combining secret with data
    var hmacData = secret + data;
    var digest = messageDigest.digestBytes(new Bytes(hmacData));
    
    // Convert to hex string
    var signature = Encoding.toHex(digest);
    
    return signature;
}

/**
 * Generates a random signing secret for initial setup
 * @returns {string} A random secret
 */
function generateRandomSecret() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var secret = '';
    for (var i = 0; i < 64; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

module.exports = {
    generateSignedURL: generateSignedURL,
    verifySignedURL: verifySignedURL,
    generateRandomSecret: generateRandomSecret
};

