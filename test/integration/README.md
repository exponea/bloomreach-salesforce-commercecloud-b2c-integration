# Integration Tests

This directory contains integration tests that test the actual deployed service on Salesforce Commerce Cloud.

## Overview

Unlike unit tests that use mocks, these integration tests make real HTTP requests to a deployed SFCC instance to verify that the BloomreachFileDownload controller is working correctly in a real environment.

## When to Run

Integration tests should be run:
- After deploying the cartridge to a sandbox or staging environment
- Before promoting to production
- As part of a CI/CD pipeline (if configured)
- When troubleshooting issues in a specific environment

## Prerequisites

Before running integration tests, ensure:

1. **Cartridge is deployed** to the SFCC instance
2. **Credentials are configured** in Business Manager:
   - Navigate to: Merchant Tools > Site Preferences > Custom Preferences
   - Set `brEngDownloadUsername` and `brEngDownloadPassword`
3. **Test file exists** (optional, for file download tests):
   - Upload a test CSV file to IMPEX directory
   - Example path: `IMPEX/src/bloomreach_engagement/test/test-file.csv`

## Running Integration Tests

### Option 1: Using Environment Variables

```bash
INTEGRATION_TEST=true \
SFCC_HOSTNAME=zzra-039.dx.commercecloud.salesforce.com \
SFCC_SITE_ID=RefArch \
DOWNLOAD_USERNAME=your-username \
DOWNLOAD_PASSWORD=your-password \
TEST_FILE_PATH=src/bloomreach_engagement/test/test-file.csv \
npm test test/integration/BloomreachFileDownloadController.integration.test.js
```

### Option 2: Using npm Script

First, export environment variables:

```bash
export INTEGRATION_TEST=true
export SFCC_HOSTNAME=zzra-039.dx.commercecloud.salesforce.com
export SFCC_SITE_ID=RefArch
export DOWNLOAD_USERNAME=your-username
export DOWNLOAD_PASSWORD=your-password
export TEST_FILE_PATH=src/bloomreach_engagement/test/test-file.csv
```

Then run:

```bash
npm run test:integration
```

### Option 3: Create a Local Configuration File

Create a `.env.integration` file (DO NOT commit this file):

```bash
INTEGRATION_TEST=true
SFCC_HOSTNAME=zzra-039.dx.commercecloud.salesforce.com
SFCC_SITE_ID=RefArch
DOWNLOAD_USERNAME=your-username
DOWNLOAD_PASSWORD=your-password
TEST_FILE_PATH=src/bloomreach_engagement/test/test-file.csv
```

Then run:

```bash
source .env.integration && npm run test:integration
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INTEGRATION_TEST` | Yes | `false` | Must be `true` to enable integration tests |
| `SFCC_HOSTNAME` | No | `zzra-039.dx.commercecloud.salesforce.com` | SFCC instance hostname |
| `SFCC_SITE_ID` | No | `RefArch` | Site ID to test |
| `DOWNLOAD_USERNAME` | Yes* | - | Username configured in site preferences |
| `DOWNLOAD_PASSWORD` | Yes* | - | Password configured in site preferences |
| `TEST_FILE_PATH` | No | `src/bloomreach_engagement/CustomerFeed/customers-latest.csv` | Path to test file in IMPEX (must be in whitelisted directory) |

\* Required for most tests to pass

## Whitelisted Directories

The controller implements **directory whitelisting** for security. Only files in these directories can be downloaded:

- `src/bloomreach_engagement/CustomerFeed/`
- `src/bloomreach_engagement/ProductFeed/`
- `src/bloomreach_engagement/VariantFeed/`
- `src/bloomreach_engagement/ProductInventoryFeed/`
- `src/bloomreach_engagement/VariantInventoryFeed/`
- `src/bloomreach_engagement/PreInit/`

Files outside these directories will return **403 Forbidden**, even with valid credentials.

## Test Coverage

The integration tests verify:

### 1. Endpoint Availability
- ✓ Controller endpoint exists and responds

### 2. Authentication
- ✓ Rejects requests without authentication (401)
- ✓ Rejects requests with invalid credentials (401)
- ✓ Accepts requests with valid credentials

### 3. File Download & Security
- ✓ Returns 403 for non-whitelisted paths (security whitelist)
- ✓ Returns 404 for non-existent files in whitelisted directories
- ✓ Blocks path traversal attempts (security)
- ✓ Downloads existing files with correct Content-Type
- ✓ Includes Content-Disposition header

### 4. Error Handling
- ✓ Returns 400 for missing path parameter
- ✓ Returns 400 for empty path parameter

### 5. Performance
- ✓ Responds within acceptable time limits

**Total:** 12 integration tests

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials** to version control
2. **Use environment variables** or secure secrets management
3. **Rotate credentials regularly**
4. **Use different credentials** for different environments
5. **Restrict access** to integration test credentials

## Troubleshooting

### Tests are skipped

**Cause:** `INTEGRATION_TEST` environment variable is not set to `true`

**Solution:** 
```bash
export INTEGRATION_TEST=true
```

### Authentication failures (401)

**Causes:**
- Credentials not configured in environment variables
- Credentials not configured in Business Manager
- Incorrect username or password

**Solution:**
1. Check environment variables are set correctly
2. Verify credentials in Business Manager (Site Preferences > Custom Preferences)
3. Ensure you're using the correct site ID

### Endpoint not accessible

**Causes:**
- Cartridge not deployed
- Wrong hostname or site ID
- Network connectivity issues
- SFCC instance is down

**Solution:**
1. Verify cartridge is uploaded and site cartridge path is correct
2. Check hostname is correct (should include full domain)
3. Test connectivity: `ping zzra-039.dx.commercecloud.salesforce.com`
4. Check SFCC status page

### Test file not found (404)

**Cause:** Test file doesn't exist in IMPEX directory

**Solution:**
1. Upload a test CSV file to IMPEX
2. Set `TEST_FILE_PATH` to match the uploaded file path
3. Or skip file download tests if not needed

### Certificate errors

**Note:** The tests use `rejectUnauthorized: false` to allow self-signed certificates in sandbox environments. In production, ensure proper SSL certificates are configured.

## Example Output

When running successfully, you should see:

```
BloomreachFileDownload Controller Integration Tests
  Endpoint Availability
    ✓ should respond to requests (endpoint is accessible)
  Authentication
    ✓ should reject requests without authentication
    ✓ should reject requests with invalid credentials
    ✓ should accept requests with valid credentials
  File Download
    ✓ should return 404 for non-existent file
    ✓ should reject path traversal attempts
    ✓ should download an existing file with correct content type
    ✓ should include Content-Disposition header for file download
  Error Handling
    ✓ should return 400 for missing path parameter
    ✓ should return 400 for empty path parameter
  Performance
    ✓ should respond within acceptable time limits

11 passing (2s)
```

## CI/CD Integration

To integrate these tests into your CI/CD pipeline:

1. Store credentials as encrypted secrets
2. Set environment variables in your CI configuration
3. Run integration tests after deployment
4. Fail the pipeline if tests fail

Example GitHub Actions:

```yaml
- name: Run Integration Tests
  env:
    INTEGRATION_TEST: true
    SFCC_HOSTNAME: ${{ secrets.SFCC_HOSTNAME }}
    SFCC_SITE_ID: ${{ secrets.SFCC_SITE_ID }}
    DOWNLOAD_USERNAME: ${{ secrets.DOWNLOAD_USERNAME }}
    DOWNLOAD_PASSWORD: ${{ secrets.DOWNLOAD_PASSWORD }}
  run: npm run test:integration
```

## Known Platform Limitations

### WWW-Authenticate Header

**Note:** SFCC does not allow controllers to set the `WWW-Authenticate` HTTP response header. This means:

- 401 responses will **not** include the standard `WWW-Authenticate: Basic realm="..."` header
- This is a platform limitation, not a bug
- Functionality is not affected - clients can still authenticate using the `Authorization` header
- The 401 status code and JSON error message are sufficient to indicate authentication is required

**Why this matters for testing:**
- Integration tests verify the 401 status code, not the presence of `WWW-Authenticate` header
- This behavior is expected and documented

For more details, see the "Platform Limitations" section in `CONTROLLER-DOWNLOAD-ENDPOINT.md`.

---

## Support

For issues with integration tests:
1. Check this README for troubleshooting tips
2. Verify all prerequisites are met
3. Check SFCC logs in Business Manager
4. Review test output for specific error messages


