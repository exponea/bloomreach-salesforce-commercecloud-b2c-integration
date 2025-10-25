/**
 * Integration tests for BloomreachFileDownload Controller
 * 
 * These tests make actual HTTP requests to the deployed SFCC instance
 * to verify the file download controller endpoint is working correctly.
 * 
 * IMPORTANT: These tests are SKIPPED by default because they require:
 * 1. A deployed SFCC instance with the cartridge
 * 2. Valid credentials configured
 * 3. Test files uploaded to the IMPEX directory
 * 
 * To run these tests, set environment variables:
 * INTEGRATION_TEST=true npm test test/integration/BloomreachFileDownloadController.integration.test.js
 * 
 * Required environment variables:
 * - INTEGRATION_TEST=true (enables the tests)
 * - SFCC_HOSTNAME=zzra-039.dx.commercecloud.salesforce.com (or your instance)
 * - SFCC_SITE_ID=RefArch (or your site ID)
 * - DOWNLOAD_USERNAME=your-username
 * - DOWNLOAD_PASSWORD=your-password
 * - TEST_FILE_PATH=src/bloomreach_engagement/CustomerFeed/customers-latest.csv (optional, must be in whitelisted directory)
 */

const { expect } = require('chai');
const https = require('https');
const http = require('http');

// Check if integration tests should run
const SHOULD_RUN = process.env.INTEGRATION_TEST === 'true';

// Test configuration from environment variables
const CONFIG = {
    hostname: process.env.SFCC_HOSTNAME || 'zzra-039.dx.commercecloud.salesforce.com',
    siteId: process.env.SFCC_SITE_ID || 'RefArch',
    username: process.env.DOWNLOAD_USERNAME || '',
    password: process.env.DOWNLOAD_PASSWORD || '',
    // Test file path must be in one of the whitelisted directories:
    // CustomerFeed, ProductFeed, VariantFeed, ProductInventoryFeed, VariantInventoryFeed, PreInit
    testFilePath: process.env.TEST_FILE_PATH || 'src/bloomreach_engagement/CustomerFeed/customers-latest.csv'
};

/**
 * Helper function to make HTTPS request
 * @param {Object} options - Request options
 * @param {string} postData - Optional POST data
 * @returns {Promise} - Promise that resolves with response
 */
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const protocol = options.port === 80 ? http : https;
        
        const req = protocol.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        // Set timeout for long-running requests
        req.setTimeout(30000, () => {
            req.abort();
            reject(new Error('Request timeout'));
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

/**
 * Helper to build controller URL
 */
function buildControllerUrl(path) {
    return `/on/demandware.store/Sites-${CONFIG.siteId}-Site/default/BloomreachFileDownload-Download?path=${encodeURIComponent(path)}`;
}

/**
 * Helper to create Basic Auth header
 */
function createAuthHeader(username, password) {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${credentials}`;
}

(SHOULD_RUN ? describe : describe.skip)('BloomreachFileDownload Controller Integration Tests', function() {
    // Increase timeout for integration tests
    this.timeout(30000);
    
    before(function() {
        console.log('\n========================================');
        console.log('INTEGRATION TEST CONFIGURATION:');
        console.log('========================================');
        console.log('Hostname:', CONFIG.hostname);
        console.log('Site ID:', CONFIG.siteId);
        console.log('Username:', CONFIG.username ? '***configured***' : '***NOT SET***');
        console.log('Password:', CONFIG.password ? '***configured***' : '***NOT SET***');
        console.log('Test File Path:', CONFIG.testFilePath);
        console.log('========================================\n');
        
        if (!CONFIG.username || !CONFIG.password) {
            console.warn('WARNING: Credentials not configured. Some tests will fail.');
        }
    });
    
    describe('Endpoint Availability', function() {
        
        it('should respond to requests (endpoint is accessible)', async function() {
            // Test: Verify that the controller endpoint exists and responds
            // This tests basic connectivity without authentication
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl('test.csv'),
                method: 'GET',
                headers: {
                    'User-Agent': 'Integration-Test'
                },
                // Allow self-signed certificates in development
                rejectUnauthorized: false
            };
            
            try {
                const response = await makeRequest(options);
                
                // Should get some response (401 without auth, or 404, or 200)
                expect(response.statusCode).to.be.oneOf([200, 401, 404, 500]);
                console.log(`  ✓ Endpoint responded with status: ${response.statusCode}`);
                
            } catch (error) {
                // Network errors are failures
                throw new Error(`Endpoint not accessible: ${error.message}`);
            }
        });
    });
    
    describe('Authentication', function() {
        
        it('should reject requests without authentication', async function() {
            // Test: Verify that the endpoint requires authentication
            // and returns 401 Unauthorized when credentials are missing
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl('test.csv'),
                method: 'GET',
                headers: {
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            expect(response.statusCode).to.equal(401);
            console.log('  ✓ Correctly rejected unauthenticated request');
        });
        
        it('should reject requests with invalid credentials', async function() {
            // Test: Verify that the endpoint rejects invalid credentials
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl('test.csv'),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader('invalid-user', 'invalid-password'),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            expect(response.statusCode).to.equal(401);
            console.log('  ✓ Correctly rejected invalid credentials');
        });
        
        it('should accept requests with valid credentials', async function() {
            // Test: Verify that valid credentials are accepted
            // (may return 404 if file doesn't exist, but not 401)
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl('test.csv'),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            // Should NOT be 401 with valid credentials
            expect(response.statusCode).to.not.equal(401);
            console.log(`  ✓ Accepted valid credentials (response: ${response.statusCode})`);
        });
    });
    
    describe('File Download', function() {
        
        it('should return 403 for non-whitelisted paths', async function() {
            // Test: Verify that requesting a file outside the whitelist returns 403
            // The controller only allows specific directories for security
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const nonWhitelistedFile = 'src/bloomreach_engagement/nonWhitelisted/file.csv';
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl(nonWhitelistedFile),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            expect(response.statusCode).to.equal(403);
            console.log('  ✓ Correctly returned 403 for non-whitelisted path');
        });
        
        it('should return 404 for non-existent file in whitelisted directory', async function() {
            // Test: Verify that requesting a non-existent file in a whitelisted directory returns 404
            // File must be in a whitelisted path (CustomerFeed, ProductFeed, etc.)
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            // Use a whitelisted directory but non-existent file
            const nonExistentFile = 'src/bloomreach_engagement/CustomerFeed/nonexistent-' + Date.now() + '.csv';
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl(nonExistentFile),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            expect(response.statusCode).to.equal(404);
            console.log('  ✓ Correctly returned 404 for non-existent file in whitelisted directory');
        });
        
        it('should reject path traversal attempts', async function() {
            // Test: Verify that the endpoint blocks directory traversal attacks
            // using paths like "../../../etc/passwd"
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const maliciousPaths = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32',
                'src/../../../etc/passwd',
                'src\\..\\..\\..\\windows\\system32'
            ];
            
            for (const maliciousPath of maliciousPaths) {
                const options = {
                    hostname: CONFIG.hostname,
                    port: 443,
                    path: buildControllerUrl(maliciousPath),
                    method: 'GET',
                    headers: {
                        'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                        'User-Agent': 'Integration-Test'
                    },
                    rejectUnauthorized: false
                };
                
                const response = await makeRequest(options);
                
                // Should return 400 (Bad Request) or 403 (Forbidden) for security
                expect(response.statusCode).to.be.oneOf([400, 403, 404]);
                console.log(`  ✓ Blocked path traversal: ${maliciousPath} (${response.statusCode})`);
            }
        });
        
        it('should download an existing file with correct content type', async function() {
            // Test: Verify that an existing file can be downloaded
            // and has the correct Content-Type header for CSV
            // 
            // NOTE: This test requires TEST_FILE_PATH to point to an actual file
            // in the IMPEX directory on the SFCC instance
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl(CONFIG.testFilePath),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            if (response.statusCode === 404) {
                console.log(`  ⚠ Test file not found: ${CONFIG.testFilePath}`);
                console.log('  ⚠ Upload a test CSV file to IMPEX and set TEST_FILE_PATH environment variable');
                this.skip();
            }
            
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-type']).to.include('text/csv');
            expect(response.body).to.be.a('string');
            expect(response.body.length).to.be.greaterThan(0);
            
            console.log(`  ✓ Successfully downloaded file (${response.body.length} bytes)`);
            console.log(`  ✓ Content-Type: ${response.headers['content-type']}`);
        });
        
        it('should include Content-Disposition header for file download', async function() {
            // Test: Verify that the response includes proper Content-Disposition header
            // for triggering browser download
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl(CONFIG.testFilePath),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            if (response.statusCode === 404) {
                this.skip();
            }
            
            expect(response.statusCode).to.equal(200);
            expect(response.headers['content-disposition']).to.exist;
            expect(response.headers['content-disposition']).to.include('attachment');
            
            console.log(`  ✓ Content-Disposition: ${response.headers['content-disposition']}`);
        });
    });
    
    describe('Error Handling', function() {
        
        it('should return 400 for missing path parameter', async function() {
            // Test: Verify that the endpoint returns 400 Bad Request
            // when the path parameter is missing
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: `/on/demandware.store/Sites-${CONFIG.siteId}-Site/default/BloomreachFileDownload-Download`,
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            expect(response.statusCode).to.equal(400);
            console.log('  ✓ Correctly returned 400 for missing path parameter');
        });
        
        it('should return 400 for empty path parameter', async function() {
            // Test: Verify that the endpoint returns 400 Bad Request
            // when the path parameter is empty
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl(''),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            
            expect(response.statusCode).to.equal(400);
            console.log('  ✓ Correctly returned 400 for empty path parameter');
        });
    });
    
    describe('Performance', function() {
        
        it('should respond within acceptable time limits', async function() {
            // Test: Verify that the endpoint responds quickly
            // even when the file doesn't exist
            
            if (!CONFIG.username || !CONFIG.password) {
                this.skip();
            }
            
            const startTime = Date.now();
            
            const options = {
                hostname: CONFIG.hostname,
                port: 443,
                path: buildControllerUrl('non-existent.csv'),
                method: 'GET',
                headers: {
                    'Authorization': createAuthHeader(CONFIG.username, CONFIG.password),
                    'User-Agent': 'Integration-Test'
                },
                rejectUnauthorized: false
            };
            
            const response = await makeRequest(options);
            const responseTime = Date.now() - startTime;
            
            // Response should be under 5 seconds for 404
            expect(responseTime).to.be.lessThan(5000);
            console.log(`  ✓ Response time: ${responseTime}ms (status: ${response.statusCode})`);
        });
    });
});

// Print instructions if integration tests are skipped
if (!SHOULD_RUN) {
    console.log('\n========================================');
    console.log('INTEGRATION TESTS SKIPPED');
    console.log('========================================');
    console.log('To run integration tests against the deployed service:');
    console.log('');
    console.log('INTEGRATION_TEST=true \\');
    console.log('SFCC_HOSTNAME=zzra-039.dx.commercecloud.salesforce.com \\');
    console.log('SFCC_SITE_ID=RefArch \\');
    console.log('DOWNLOAD_USERNAME=your-username \\');
    console.log('DOWNLOAD_PASSWORD=your-password \\');
    console.log('TEST_FILE_PATH=src/bloomreach_engagement/CustomerFeed/customers-latest.csv \\');
    console.log('npm test test/integration/BloomreachFileDownloadController.integration.test.js');
    console.log('');
    console.log('Note: TEST_FILE_PATH must be in a whitelisted directory:');
    console.log('  - CustomerFeed, ProductFeed, VariantFeed, ProductInventoryFeed, VariantInventoryFeed, or PreInit');
    console.log('========================================\n');
}


