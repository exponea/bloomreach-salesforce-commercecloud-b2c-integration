# Controller-Based Download Endpoint Configuration Guide

## Overview

This cartridge includes a secure controller-based file download endpoint that **replaces WebDAV credentials** for Bloomreach Engagement imports. This eliminates the issue of expiring user credentials breaking automated data feeds.

### Problem Solved

Previously, Bloomreach import jobs used WebDAV URLs with individual user credentials that:
- Expire every 90 days (password policy)
- Expire annually (API key policy)
- Break when users lose permissions or leave the organization
- Require manual reconfiguration of all 6+ import jobs in Bloomreach

### Solution

The new controller-based endpoint:
- Uses site preference-based credentials (no expiration)
- Provides secure Basic Authentication
- Includes comprehensive security features (path whitelisting, input validation)
- Requires one-time configuration
- Eliminates dependency on individual user accounts

---

## Configuration Steps

### 1. Business Manager Configuration

#### A. Set Download Endpoint Credentials

1. Log into **Business Manager**
2. Navigate to: **Merchant Tools > Site Preferences > Custom Preferences > Bloomreach Engagement API**
3. Configure the new credentials:

   | Field | Value | Notes |
   |-------|-------|-------|
   | **File Download Endpoint Username** | `bloomreach-import-service` | Any username you choose |
   | **File Download Endpoint Password** | *Strong random password* | Min 32 characters recommended |

   **Example strong password**: `xK9mP#vL2$nR8@wQ7zT4&jH6!cF3yB5gD1`

4. Click **Apply** to save

#### B. Security Best Practices

✅ **DO:**
- Use a unique, randomly-generated password (32+ characters)
- Store credentials in your team's password manager
- Use different credentials per environment (DEV/STAGE/PROD)
- Document credentials in secure internal wiki
- Set annual calendar reminder to rotate credentials

❌ **DON'T:**
- Reuse existing user passwords
- Share credentials via email or chat
- Use simple/guessable passwords
- Store credentials in code or version control

### 2. Bloomreach Engagement Configuration

#### A. Update Import Sources

For **each** of the 6 import jobs in Bloomreach Engagement, update the file source:

1. Log into **Bloomreach Engagement**
2. Navigate to: **Data & Assets > Imports**
3. For each import (Customer, Purchase, Purchase Item, Product, Variant, etc.):
   - Edit the import configuration
   - Update the **File Source** settings:

   | Setting | Value |
   |---------|-------|
   | **Authentication Type** | HTTP Basic Auth |
   | **Username** | *(from Business Manager site preference)* |
   | **Password** | *(from Business Manager site preference)* |

4. Test each import to verify credentials work

#### B. URL Format

The controller generates URLs in this format:

```
https://{instance-hostname}/on/demandware.store/Sites-{site-id}-Site/default/BloomreachFileDownload-Download?path={encoded-path}
```

**Example:**
```
https://zzra-039.dx.commercecloud.salesforce.com/on/demandware.store/Sites-RefArch-Site/default/BloomreachFileDownload-Download?path=src%2Fbloomreach_engagement%2FCustomerFeed%2Fcustomers-20231024.csv
```

**Note:** URLs are **automatically generated** by the job steps. You don't need to manually construct them.

---

## Security Features

### Path Whitelisting

The controller only allows access to these directories:
- `src/bloomreach_engagement/CustomerFeed/`
- `src/bloomreach_engagement/PurchaseFeed/`
- `src/bloomreach_engagement/PurchaseItemFeed/`
- `src/bloomreach_engagement/ProductFeed/`
- `src/bloomreach_engagement/VariantFeed/`
- `src/bloomreach_engagement/ProductInventoryFeed/`
- `src/bloomreach_engagement/VariantInventoryFeed/`
- `src/bloomreach_engagement/PreInit/`

**Any other paths are blocked**, preventing unauthorized file access.

### Input Validation

The controller validates:
- ✅ File paths start with allowed prefixes
- ✅ No path traversal attacks (`../`, `..\\`)
- ✅ Only CSV files (`.csv` extension)
- ✅ No null bytes or injection attempts
- ✅ File exists and is not a directory

### Authentication

- Basic Authentication validated against site preferences
- Credentials never logged or exposed in responses
- Failed authentication returns 401 with WWW-Authenticate header

### Logging

All requests are logged for security auditing:
- Successful downloads (filename, size, line count)
- Failed authentication attempts (username only, not password)
- Invalid path requests
- Error conditions

**Log location:** `BloomreachFileDownload` and `bloomreach.filedownload` channels

---

## Testing

### Test the Endpoint Manually

You can test the download endpoint using curl:

```bash
# Replace values with your actual credentials and instance
USERNAME="bloomreach-import-service"
PASSWORD="your-password-here"
INSTANCE="zzra-039.dx.commercecloud.salesforce.com"
SITE_ID="RefArch"
FILE_PATH="src/bloomreach_engagement/CustomerFeed/customers-20231024.csv"

curl -u "$USERNAME:$PASSWORD" \
  "https://$INSTANCE/on/demandware.store/Sites-$SITE_ID-Site/default/BloomreachFileDownload-Download?path=$(echo -n "$FILE_PATH" | jq -sRr @uri)"
```

**Expected result:** The CSV file contents are returned.

### Test from Bloomreach

1. Navigate to your import in Bloomreach Engagement
2. Click **Test Import** or **Run Now**
3. Check the import logs for success
4. Verify data was imported correctly

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Wrong credentials | Verify username/password in site preferences |
| `403 Forbidden` | Invalid path | Ensure file is in allowed Bloomreach directory |
| `404 Not Found` | File doesn't exist | Check job ran and created the CSV file |
| `500 Internal Server Error` | Server error | Check SFCC logs for details |

---

## Migration from WebDAV

### Automatic Migration

**Good news:** Migration happens automatically when you:
1. Deploy the updated cartridge code
2. Configure the site preferences (username/password)

The job steps now generate controller URLs instead of WebDAV URLs.

### Verification Steps

After deployment:

1. **Run a test job** (e.g., Customer Feed Delta Export)
2. **Check the job logs** in Business Manager:
   - Look for the generated URL in job output
   - Should start with `/on/demandware.store/Sites-...`
   - Should NOT contain `/on/demandware.servlet/webdav/...`
3. **Test Bloomreach import** with the new credentials
4. **Monitor for 24-48 hours** to ensure stability

### Rollback Plan

If issues occur, you can temporarily rollback by:
1. Reverting to previous cartridge version
2. Using WebDAV URLs in Bloomreach (old approach)

However, this should not be necessary as the new approach is backward-compatible.

---

## Maintenance

### Credential Rotation

Rotate credentials annually:

1. **Generate new credentials** (strong random password)
2. **Update Business Manager** site preferences:
   - Set new `brEngDownloadPassword`
   - Keep same `brEngDownloadUsername` (optional)
3. **Update Bloomreach Engagement**:
   - Update all 6 import configurations with new password
4. **Test all imports** to verify new credentials work
5. **No downtime** if you update Bloomreach before changing SFCC

**Pro tip:** You can configure new credentials in Bloomreach *before* changing SFCC, then change SFCC preferences for zero-downtime rotation.

### Monitoring

Monitor these metrics:

- **Failed authentication attempts** (potential security issue)
- **403 Forbidden errors** (misconfigured paths)
- **Download success rate** (reliability)
- **File sizes** (detect incomplete exports)

Check logs regularly:
```bash
# In Business Manager > Administration > Site Development > Development Setup > Log Settings
# Enable DEBUG level for: BloomreachFileDownload
```

---

## Architecture Details

### Components

1. **Controller**: `int_bloomreach_engagement_controllers/cartridge/controllers/BloomreachFileDownload.js`
   - Handles HTTP requests
   - Validates authentication
   - Streams CSV files from IMPEX

2. **Helper**: `int_bloomreach_engagement/cartridge/scripts/helpers/BloomreachEngagementFileDownloadHelper.js`
   - Generates download URLs
   - Validates configuration
   - Provides utility functions

3. **Job Steps**: Updated to use new helper
   - `customerInfoFeed.js`
   - `generatePurchaseCSV.js`
   - `generatePurchaseProductCSV.js`
   - `masterProductFeed.js`
   - `variationProductFeed.js`
   - `masterProductInventoryFeed.js`
   - `variationProductInventoryFeed.js`

4. **Site Preferences**: `metadata/site-template/meta/system-objecttype-extensions.xml`
   - `brEngDownloadUsername` (string)
   - `brEngDownloadPassword` (password - encrypted)

### URL Flow

```
SFCC Job Step
  ↓
Generate CSV File → /src/bloomreach_engagement/CustomerFeed/customers-20231024.csv
  ↓
Generate Controller URL → https://.../BloomreachFileDownload-Download?path=...
  ↓
Send URL to Bloomreach API
  ↓
Bloomreach downloads file → HTTP GET with Basic Auth
  ↓
Controller validates auth → Check site preferences
  ↓
Controller validates path → Whitelist check
  ↓
Controller streams file → Send CSV content
  ↓
Bloomreach imports data ✓
```

---

## FAQ

### Q: Do I need to configure anything in Bloomreach before deploying?

**A:** No, but you should coordinate:
1. Deploy the cartridge to SFCC
2. Configure site preferences (username/password)
3. Update Bloomreach import configurations
4. Test all imports

### Q: What happens to existing WebDAV URLs?

**A:** They are replaced automatically. The job steps now generate controller URLs instead of WebDAV URLs. No manual URL changes needed in job configurations.

### Q: Can I use the same credentials for all environments?

**A:** **Not recommended.** Use different credentials for DEV, STAGE, and PROD for security isolation. If DEV credentials leak, PROD is still secure.

### Q: How do I know if the controller is working?

**A:** Check these indicators:
- Job logs show controller URLs (not WebDAV)
- Bloomreach imports succeed
- SFCC logs show successful downloads
- No 401/403 errors in logs

### Q: What if I forget the password?

**A:** Simply generate a new password in Business Manager site preferences, then update Bloomreach with the new password. No downtime if done in correct order.

### Q: Is this approach more secure than WebDAV?

**A:** **Yes**, for several reasons:
- Credentials don't expire automatically
- Limited to specific directories (not full WebDAV access)
- Separate from user accounts (no permission conflicts)
- Comprehensive logging for auditing
- Input validation prevents injection attacks

### Q: Do old CSV files get cleaned up?

**A:** This is unchanged from the previous implementation. SFCC's standard file cleanup policies apply to IMPEX directories. Consider implementing a cleanup job if disk space becomes an issue.

---

## Support

For issues or questions:

1. **Check logs** in Business Manager:
   - `BloomreachFileDownload` logger
   - Job execution logs

2. **Review this documentation** for configuration steps

3. **Contact Bloomreach Support** for import-related issues

4. **Contact your SFCC administrator** for SFCC-related issues

---

## Related Documentation

- [SFCC-SETUP-GUIDE.md](./SFCC-SETUP-GUIDE.md) - Initial cartridge setup
- [README.md](./README.md) - Cartridge overview
- [GitHub Issue #16](https://github.com/exponea/bloomreach-salesforce-commercecloud-b2c-integration/issues/16) - Original feature request

---

## Changelog

### Version 1.0.0 (October 2025)
- ✨ Initial implementation of controller-based download endpoint
- ✨ Added Basic Authentication with site preferences
- ✨ Added comprehensive path validation and security features
- ✨ Updated all 7 job step files to use new endpoint
- 🔧 Added `brEngDownloadUsername` and `brEngDownloadPassword` site preferences
- 📝 Created this documentation

---

**Last Updated:** October 24, 2025  
**Author:** Bloomreach Integration Team  
**Version:** 1.0.0

