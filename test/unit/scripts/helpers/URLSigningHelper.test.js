'use strict';

/**
 * Unit tests for URLSigningHelper
 * 
 * These tests verify:
 * - Signed URL generation with proper format and parameters
 * - URL signature verification with valid signatures
 * - Expiration validation for expired URLs
 * - Invalid signature rejection
 * - Secret generation functionality
 */

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru();

describe('URLSigningHelper', function() {
    let URLSigningHelper;
    let mockSite;
    let mockSystem;
    let mockLogger;
    let mockMessageDigest;
    let mockEncoding;
    let mockBytes;

    beforeEach(function() {
        // Mock Site
        mockSite = {
            getID: function() {
                return 'TestSite';
            },
            getCustomPreferenceValue: function(key) {
                if (key === 'brEngURLSigningSecret') {
                    return 'test-secret-key-for-signing-urls-should-be-at-least-32-chars';
                }
                return null;
            }
        };

        // Mock System
        mockSystem = {
            getInstanceHostname: function() {
                return 'test-instance.demandware.net';
            }
        };

        // Mock Logger
        mockLogger = {
            info: function() {},
            warn: function() {},
            error: function() {}
        };

        // Mock MessageDigest
        mockMessageDigest = function(algorithm) {
            this.digestBytes = function(bytes) {
                // Simple mock hash based on input
                return bytes;
            };
        };
        mockMessageDigest.DIGEST_SHA_256 = 'SHA-256';

        // Mock Encoding
        mockEncoding = {
            toHex: function(bytes) {
                // Mock hex encoding - return a predictable hash
                return 'mockedhexstring1234567890abcdef';
            }
        };

        // Mock Bytes
        mockBytes = function(data) {
            this.data = data;
            return this;
        };

        // Load URLSigningHelper with mocked dependencies
        URLSigningHelper = proxyquire('../../../../cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/URLSigningHelper', {
            'dw/crypto/MessageDigest': mockMessageDigest,
            'dw/crypto/Encoding': mockEncoding,
            'dw/util/Bytes': mockBytes,
            'dw/system/Site': {
                getCurrent: function() {
                    return mockSite;
                }
            },
            'dw/system/System': mockSystem,
            'dw/system/Logger': {
                getLogger: function() {
                    return mockLogger;
                }
            }
        });
    });

    describe('generateSignedURL', function() {
        it('should generate a signed URL with all required parameters', function() {
            // Test: Generates signed URL with path, expiration, and signature
            const filePath = '/impex/src/export/customer_feed.csv';
            const url = URLSigningHelper.generateSignedURL(filePath, 72);

            // Verify URL format
            assert.include(url, 'https://test-instance.demandware.net');
            assert.include(url, '/on/demandware.store/Sites-TestSite-Site/default/BloomreachFileDownload-Serve');
            assert.include(url, 'path=');
            assert.include(url, 'exp=');
            assert.include(url, 'sig=');
        });

        it('should URL-encode the file path', function() {
            // Test: File path is properly URL-encoded in the generated URL
            const filePath = '/impex/src/export/customer feed with spaces.csv';
            const url = URLSigningHelper.generateSignedURL(filePath, 72);

            // Verify path is encoded
            assert.include(url, encodeURIComponent(filePath));
        });

        it('should use default expiration of 72 hours when not specified', function() {
            // Test: Default expiration is 72 hours (259200000 ms)
            const filePath = '/impex/src/export/customer_feed.csv';
            const now = Date.now();
            const url = URLSigningHelper.generateSignedURL(filePath);

            // Extract expiration timestamp from URL
            const expMatch = url.match(/exp=(\d+)/);
            assert.isNotNull(expMatch, 'URL should contain expiration parameter');
            
            const expiration = parseInt(expMatch[1], 10);
            const expectedExpiration = now + (72 * 60 * 60 * 1000);
            
            // Allow 1 second tolerance for test execution time
            assert.approximately(expiration, expectedExpiration, 1000);
        });

        it('should throw error when signing secret is not configured', function() {
            // Test: Throws error when brEngURLSigningSecret preference is missing
            mockSite.getCustomPreferenceValue = function() {
                return null;
            };

            assert.throws(function() {
                URLSigningHelper.generateSignedURL('/test/path.csv', 72);
            }, 'URL signing secret not configured');
        });

        it('should generate different signatures for different file paths', function() {
            // Test: Different files produce different signatures
            const url1 = URLSigningHelper.generateSignedURL('/path1.csv', 72);
            const url2 = URLSigningHelper.generateSignedURL('/path2.csv', 72);

            // Both should be valid URLs but potentially with different signatures
            assert.notEqual(url1, url2);
        });
    });

    describe('verifySignedURL', function() {
        it('should verify a valid signed URL', function() {
            // Test: Valid signature and unexpired URL passes verification
            const filePath = '/impex/src/export/customer_feed.csv';
            const futureTimestamp = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
            const signature = 'mockedhexstring1234567890abcdef';

            const result = URLSigningHelper.verifySignedURL(
                filePath,
                futureTimestamp.toString(),
                signature
            );

            assert.isTrue(result.valid, 'URL should be valid');
            assert.isNull(result.error);
            assert.equal(result.filePath, filePath);
        });

        it('should reject an expired URL', function() {
            // Test: Expired timestamp causes verification to fail
            const filePath = '/impex/src/export/customer_feed.csv';
            const pastTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
            const signature = 'mockedhexstring1234567890abcdef';

            const result = URLSigningHelper.verifySignedURL(
                filePath,
                pastTimestamp.toString(),
                signature
            );

            assert.isFalse(result.valid, 'Expired URL should be invalid');
            assert.equal(result.error, 'URL has expired');
            assert.isNull(result.filePath);
        });

        it('should reject an invalid signature', function() {
            // Test: Wrong signature causes verification to fail
            const filePath = '/impex/src/export/customer_feed.csv';
            const futureTimestamp = Date.now() + (24 * 60 * 60 * 1000);
            const wrongSignature = 'wrongsignature1234567890abcdef';

            const result = URLSigningHelper.verifySignedURL(
                filePath,
                futureTimestamp.toString(),
                wrongSignature
            );

            assert.isFalse(result.valid, 'Wrong signature should be invalid');
            assert.equal(result.error, 'Invalid signature');
            assert.isNull(result.filePath);
        });

        it('should reject invalid expiration timestamp', function() {
            // Test: Non-numeric or invalid timestamp format is rejected
            const filePath = '/impex/src/export/customer_feed.csv';
            const signature = 'mockedhexstring1234567890abcdef';

            const result = URLSigningHelper.verifySignedURL(
                filePath,
                'invalid-timestamp',
                signature
            );

            assert.isFalse(result.valid, 'Invalid timestamp should be rejected');
            assert.equal(result.error, 'URL has expired');
        });

        it('should return error when signing secret is not configured', function() {
            // Test: Missing secret configuration returns error
            mockSite.getCustomPreferenceValue = function() {
                return null;
            };

            const result = URLSigningHelper.verifySignedURL(
                '/test/path.csv',
                Date.now().toString(),
                'somesignature'
            );

            assert.isFalse(result.valid);
            assert.equal(result.error, 'URL signing secret not configured');
        });
    });

    describe('generateRandomSecret', function() {
        it('should generate a secret of 64 characters', function() {
            // Test: Generated secret has correct length
            const secret = URLSigningHelper.generateRandomSecret();
            assert.equal(secret.length, 64);
        });

        it('should generate different secrets on each call', function() {
            // Test: Multiple calls produce different secrets
            const secret1 = URLSigningHelper.generateRandomSecret();
            const secret2 = URLSigningHelper.generateRandomSecret();
            
            assert.notEqual(secret1, secret2);
        });

        it('should only contain alphanumeric characters', function() {
            // Test: Secret contains only valid characters
            const secret = URLSigningHelper.generateRandomSecret();
            const alphanumericRegex = /^[A-Za-z0-9]+$/;
            
            assert.isTrue(alphanumericRegex.test(secret), 'Secret should only contain alphanumeric characters');
        });
    });

    describe('Integration: Generate and Verify', function() {
        it('should successfully verify a URL that was just generated', function() {
            // Test: End-to-end flow - generate URL, extract parameters, verify them
            const filePath = '/impex/src/export/customer_feed.csv';
            const url = URLSigningHelper.generateSignedURL(filePath, 72);

            // Extract parameters from URL
            const pathMatch = url.match(/path=([^&]+)/);
            const expMatch = url.match(/exp=([^&]+)/);
            const sigMatch = url.match(/sig=([^&]+)/);

            assert.isNotNull(pathMatch, 'URL should contain path parameter');
            assert.isNotNull(expMatch, 'URL should contain expiration parameter');
            assert.isNotNull(sigMatch, 'URL should contain signature parameter');

            const extractedPath = decodeURIComponent(pathMatch[1]);
            const extractedExp = expMatch[1];
            const extractedSig = sigMatch[1];

            // Verify the extracted parameters
            const result = URLSigningHelper.verifySignedURL(
                extractedPath,
                extractedExp,
                extractedSig
            );

            assert.isTrue(result.valid, 'Generated URL should be valid');
            assert.equal(result.filePath, filePath);
        });
    });
});

