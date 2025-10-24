# Signed URL Download Endpoint Setup Guide

## Overview

This integration uses controller-based download endpoints with signed URLs to provide secure file access for Bloomreach Engagement imports, eliminating the dependency on expiring WebDAV credentials.

### Problem Solved

Previously, the integration sent WebDAV URLs directly to Bloomreach Engagement for file imports. These URLs had several issues:
- **WebDAV credentials expire**, causing import failures if Bloomreach attempted to download files after credential expiration
- **Security concerns** with embedding authentication in URLs
- **Reliability issues** with long-running imports

### Solution

The new approach uses:
1. **Signed URLs** - Each file download URL includes a cryptographic signature
2. **Controller endpoints** - Custom controllers serve files without requiring WebDAV authentication
3. **Time-limited access** - URLs expire after a configurable period (default: 72 hours)
4. **No credential exposure** - Authentication is handled server-side via signature verification

## Architecture

```
Job Step (customerInfoFeed.js)
    ↓
    Creates CSV file in IMPEX
    ↓
URLSigningHelper.generateSignedURL()
    ↓
    Generates signed URL: https://[host]/on/demandware.store/Sites-[site]-Site/default/BloomreachFileDownload-Serve?path=[path]&exp=[timestamp]&sig=[signature]
    ↓
    Sends URL to Bloomreach Engagement API
    ↓
Bloomreach downloads file via signed URL
    ↓
BloomreachFileDownload Controller
    ↓
URLSigningHelper.verifySignedURL()
    ↓
    Validates signature and expiration
    ↓
    Serves file content
```

## Installation & Configuration

### Step 1: Generate URL Signing Secret

The integration requires a secure secret key for signing URLs. Generate a random 64-character string:

**Option A: Using Node.js**
```javascript
// Run this in Node.js console or create a script
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log(secret);
```

**Option B: Using the Helper Function**
```javascript
// In SFCC Script Debugger or Job Step Script
var URLSigningHelper = require('int_bloomreach_engagement/cartridge/scripts/helpers/URLSigningHelper');
var secret = URLSigningHelper.generateRandomSecret();
Logger.info('Generated secret: ' + secret);
```

**Option C: Using Online Tool**
Generate a 64-character random string from [random.org](https://www.random.org/strings/) or similar service.

### Step 2: Configure Site Preference

1. Log into **Business Manager**
2. Navigate to: **Merchant Tools > Site Preferences > Custom Preferences > Bloomreach Engagement API**
3. Set **URL Signing Secret** to your generated secret
4. **Save** the configuration

**Important Security Notes:**
- Keep this secret secure - anyone with access can generate valid download URLs
- Use different secrets for different environments (sandbox, staging, production)
- Do not commit this value to source control
- Rotate the secret periodically (requires downtime as old URLs become invalid)

### Step 3: Deploy Cartridges

Ensure all three Bloomreach cartridges are deployed:

```bash
npm run uploadCartridge
```

Or individually:
```bash
npx sgmf-scripts --uploadCartridge int_bloomreach_engagement
npx sgmf-scripts --uploadCartridge int_bloomreach_engagement_sfra
npx sgmf-scripts --uploadCartridge int_bloomreach_engagement_controllers
```

### Step 4: Verify Cartridge Path

Ensure the cartridges are in your site's cartridge path:

**For SFRA:**
```
int_bloomreach_engagement_sfra:int_bloomreach_engagement:app_storefront_base
```

**For Controllers (SiteGenesis):**
```
int_bloomreach_engagement_controllers:int_bloomreach_engagement:app_storefront_controllers:app_storefront_core
```

### Step 5: Test the Setup

1. Run a test job (e.g., Customer Feed Export with small dataset)
2. Check the job logs - you should see:
   ```
   Generated signed URL for file: /impex/src/export/customer_feed_20231024.csv, expires: [date]
   ```
3. Verify in Bloomreach Engagement that the import starts successfully
4. Check SFCC logs for successful file downloads:
   ```
   Successfully served file: customer_feed_20231024.csv
   ```

## Configuration Options

### URL Expiration Time

By default, signed URLs expire after **72 hours**. This is configurable when generating the URL:

```javascript
// In job step files (already configured)
webDavFilePath = URLSigningHelper.generateSignedURL(csvFile.fullPath, 72); // 72 hours

// To change expiration time, modify the second parameter
webDavFilePath = URLSigningHelper.generateSignedURL(csvFile.fullPath, 168); // 7 days
```

**Recommended Values:**
- **Development/Testing:** 24 hours (faster detection of expiration issues)
- **Production:** 72 hours (default, balances security and reliability)
- **Large files/slow imports:** 168 hours (7 days, for very large catalogs)

### Controller Endpoint

The controller is accessible at:
```
https://[hostname]/on/demandware.store/Sites-[site-id]-Site/default/BloomreachFileDownload-Serve
```

**Parameters:**
- `path` - URL-encoded full path to file in IMPEX
- `exp` - Unix timestamp (milliseconds) when URL expires
- `sig` - HMAC-SHA256 signature

## Security Features

### 1. Cryptographic Signatures
- Uses HMAC-SHA256 for signature generation
- Secret key never exposed in URLs
- Signatures are unique per file and expiration time

### 2. Time-Limited Access
- URLs automatically expire after configured time
- Expired URLs return 403 Forbidden error
- No way to extend expiration without generating new URL

### 3. Path Validation
- Controller validates file exists before serving
- Only serves files from IMPEX directory
- Prevents directory traversal attacks

### 4. No Credential Exposure
- No WebDAV credentials in URLs
- No authentication headers required from Bloomreach
- Server-side validation only

## Troubleshooting

### Issue: "URL signing secret not configured"

**Cause:** The `brEngURLSigningSecret` site preference is not set.

**Solution:**
1. Follow Step 2 in Installation & Configuration
2. Ensure you save the preference
3. Clear any cached settings

### Issue: "Invalid signature" or "Access denied"

**Cause:** URL signature validation failed.

**Possible reasons:**
- Secret was changed after URL was generated
- URL parameters were modified
- URL was copied incorrectly

**Solution:**
1. Verify the secret hasn't changed
2. Re-run the export job to generate new URLs
3. Check logs for signature generation and verification

### Issue: "URL has expired"

**Cause:** More than 72 hours (or configured time) passed since URL generation.

**Solution:**
1. Re-run the export job to generate fresh URLs
2. If this happens frequently, consider increasing expiration time
3. Check if Bloomreach import delays are normal

### Issue: "File not found"

**Cause:** File was deleted or moved after URL was generated.

**Possible reasons:**
- IMPEX cleanup job removed the file
- Manual deletion
- File rotation in job step

**Solution:**
1. Re-run the export job
2. Check IMPEX cleanup schedules
3. Ensure export directory has sufficient space

### Issue: Controller endpoint returns 404

**Cause:** Controller not deployed or cartridge path incorrect.

**Solution:**
1. Verify cartridge upload succeeded
2. Check cartridge path in Business Manager
3. Restart application servers if needed

## Migration from WebDAV URLs

If you're upgrading from a version that used WebDAV URLs:

### Automatic Migration

The code automatically uses signed URLs - no manual intervention needed. After deployment:

1. Deploy the updated cartridges
2. Configure the URL signing secret
3. Run your next scheduled export job

Old jobs will complete with WebDAV URLs, new jobs will use signed URLs.

### Verification

Check your job logs for the transition:

**Old format:**
```
webDavFilePath: https://[host]/on/demandware.servlet/webdav/Sites/impex/...
```

**New format:**
```
Generated signed URL for file: /impex/src/export/...
webDavFilePath: https://[host]/on/demandware.store/Sites-[site]-Site/default/BloomreachFileDownload-Serve?path=...
```

## Best Practices

### 1. Secret Management
- **Generate strong secrets:** Use cryptographically secure random generators
- **Rotate regularly:** Change secrets every 6-12 months during maintenance windows
- **Environment isolation:** Use different secrets for each environment
- **Backup configuration:** Document secret rotation in change logs

### 2. Monitoring
- **Monitor job logs:** Check for URL generation and verification messages
- **Alert on failures:** Set up alerts for "Invalid signature" or "URL has expired" errors
- **Track download success:** Monitor successful file downloads in controller logs

### 3. Performance
- **URL expiration:** Balance security (shorter) vs. reliability (longer)
- **File cleanup:** Remove old export files to save disk space
- **Job scheduling:** Ensure exports complete before URLs expire

### 4. Testing
- **Test in sandbox first:** Validate configuration before production deployment
- **Simulate failures:** Test with expired URLs and invalid signatures
- **Verify imports:** Confirm Bloomreach successfully imports data

## Advanced Configuration

### Custom Expiration Per Feed Type

Different feeds can have different expiration times:

```javascript
// In customerInfoFeed.js
webDavFilePath = URLSigningHelper.generateSignedURL(csvFile.fullPath, 24); // 24 hours

// In masterProductFeed.js (larger files)
webDavFilePath = URLSigningHelper.generateSignedURL(csvFile.fullPath, 168); // 7 days
```

### Custom Controller Logic

To add custom validation or logging, modify the controllers:

**SFRA:** `int_bloomreach_engagement_sfra/cartridge/controllers/BloomreachFileDownload.js`

**Controllers:** `int_bloomreach_engagement_controllers/cartridge/controllers/BloomreachFileDownload.js`

Example - Add IP whitelisting:
```javascript
// After parameter validation, before verification
var remoteAddress = req.httpRemoteAddress;
var allowedIPs = ['1.2.3.4', '5.6.7.8']; // Bloomreach IPs

if (allowedIPs.indexOf(remoteAddress) === -1) {
    Logger.warn('Download attempt from unauthorized IP: {0}', remoteAddress);
    res.setStatusCode(403);
    res.json({ error: 'Unauthorized IP address' });
    return next();
}
```

## API Reference

### URLSigningHelper.generateSignedURL(filePath, expirationHours)

Generates a signed URL for file download.

**Parameters:**
- `filePath` (String) - Full path to file in IMPEX (e.g., `/impex/src/export/feed.csv`)
- `expirationHours` (Number, optional) - Hours until URL expires (default: 72)

**Returns:** String - Signed URL

**Throws:** Error if signing secret not configured

**Example:**
```javascript
var url = URLSigningHelper.generateSignedURL('/impex/src/export/feed.csv', 48);
// Returns: https://[host]/on/demandware.store/Sites-[site]-Site/default/BloomreachFileDownload-Serve?path=%2Fimpex%2Fsrc%2Fexport%2Ffeed.csv&exp=1698187200000&sig=abc123...
```

### URLSigningHelper.verifySignedURL(filePath, expirationTimestamp, signature)

Verifies a signed URL.

**Parameters:**
- `filePath` (String) - File path from URL parameter
- `expirationTimestamp` (String) - Expiration timestamp from URL parameter
- `signature` (String) - Signature from URL parameter

**Returns:** Object
```javascript
{
    valid: Boolean,      // true if signature is valid and URL not expired
    error: String|null,  // Error message if invalid, null if valid
    filePath: String|null // Original file path if valid, null if invalid
}
```

**Example:**
```javascript
var result = URLSigningHelper.verifySignedURL(path, exp, sig);
if (result.valid) {
    // Serve file from result.filePath
} else {
    // Handle error: result.error
}
```

### URLSigningHelper.generateRandomSecret()

Generates a random 64-character secret for configuration.

**Returns:** String - Random alphanumeric secret

**Example:**
```javascript
var secret = URLSigningHelper.generateRandomSecret();
// Returns: "a3d9f8e2c1b6..."  (64 characters)
```

## Support

For issues or questions:
1. Check SFCC logs for detailed error messages
2. Review this documentation
3. Contact Bloomreach Support with:
   - Job logs showing error
   - Controller logs showing failed download attempts
   - Site configuration (without exposing secret)
   - Timestamp of issue

## Changelog

### Version 1.0.0 (2024-10-24)
- Initial implementation of signed URL download endpoints
- Replaced WebDAV URLs with controller-based downloads
- Added URL signing helper with HMAC-SHA256 signatures
- Implemented SFRA and Controllers controllers
- Added comprehensive tests
- Default 72-hour expiration

