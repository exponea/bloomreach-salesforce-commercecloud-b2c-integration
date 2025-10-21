/**
 * Unit tests for BloomreachEngagementCustomerInfoFeedHelpers
 * Tests the customer info feed helper functions
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Import the mock
const SiteMock = require('../mocks/dw/system/Site');

describe('BloomreachEngagementCustomerInfoFeedHelpers', function() {
    let helpers;
    
    // Set up global dw object for the module
    before(function() {
        global.dw = {
            system: {
                Site: SiteMock
            }
        };
    });
    
    // Clean up after all tests
    after(function() {
        delete global.dw;
    });
    
    // Reset mocks before each test
    beforeEach(function() {
        SiteMock.__reset();
        
        // Clear module cache and reload
        const modulePath = require.resolve('../../cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/BloomreachEngagementCustomerInfoFeedHelpers');
        delete require.cache[modulePath];
        
        // Load the module fresh for each test
        helpers = require('../../cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/BloomreachEngagementCustomerInfoFeedHelpers');
    });

    describe('generateCSVHeader()', function() {
        
        it('should generate CSV header from site preferences', function() {
            // Test: Verify that generateCSVHeader correctly parses the JSON mapping
            // and returns both CSV headers and SFCC attribute mappings
            
            const mockFeedMapping = JSON.stringify([
                {
                    XSDField: 'customer_id',
                    SFCCProductAttribute: 'customerNo',
                    isCustomAttribute: false
                },
                {
                    XSDField: 'email',
                    SFCCProductAttribute: 'email',
                    isCustomAttribute: false
                },
                {
                    XSDField: 'first_name',
                    SFCCProductAttribute: 'firstName',
                    isCustomAttribute: false
                }
            ]);
            
            SiteMock.__setCurrentSite({
                brEngCustomerFeedDataMapping: mockFeedMapping
            });
            
            const result = helpers.generateCSVHeader();
            
            expect(result).to.be.an('object');
            expect(result.csvHeaderArray).to.be.an('array');
            expect(result.SFCCAttributesValue).to.be.an('array');
            expect(result.csvHeaderArray).to.have.lengthOf(3);
            expect(result.csvHeaderArray).to.include('customer_id');
            expect(result.csvHeaderArray).to.include('email');
            expect(result.csvHeaderArray).to.include('first_name');
        });

        it('should handle empty feed mapping', function() {
            // Test: Verify that the function handles empty or missing configuration gracefully
            
            SiteMock.__setCurrentSite({
                brEngCustomerFeedDataMapping: JSON.stringify([])
            });
            
            const result = helpers.generateCSVHeader();
            
            expect(result.csvHeaderArray).to.be.an('array').that.is.empty;
            expect(result.SFCCAttributesValue).to.be.an('array').that.is.empty;
        });

        it('should deduplicate duplicate XSDField values', function() {
            // Test: Verify that duplicate field names are filtered out
            
            const mockFeedMapping = JSON.stringify([
                {
                    XSDField: 'customer_id',
                    SFCCProductAttribute: 'customerNo',
                    isCustomAttribute: false
                },
                {
                    XSDField: 'customer_id',
                    SFCCProductAttribute: 'customerNo',
                    isCustomAttribute: false
                }
            ]);
            
            SiteMock.__setCurrentSite({
                brEngCustomerFeedDataMapping: mockFeedMapping
            });
            
            const result = helpers.generateCSVHeader();
            
            expect(result.csvHeaderArray).to.have.lengthOf(1);
            expect(result.csvHeaderArray[0]).to.equal('customer_id');
        });

        it('should include custom attribute flag in SFCCAttributesValue', function() {
            // Test: Verify that custom attribute flags are preserved in the output
            
            const mockFeedMapping = JSON.stringify([
                {
                    XSDField: 'loyalty_points',
                    SFCCProductAttribute: 'loyaltyPoints',
                    isCustomAttribute: true
                }
            ]);
            
            SiteMock.__setCurrentSite({
                brEngCustomerFeedDataMapping: mockFeedMapping
            });
            
            const result = helpers.generateCSVHeader();
            
            expect(result.SFCCAttributesValue[0]).to.deep.equal({
                SFCCProductAttribute: 'loyaltyPoints',
                isCustom: true
            });
        });
    });

    describe('getTimeStamp()', function() {
        
        it('should convert a valid date to Unix timestamp string', function() {
            // Test: Verify that a Date object is correctly converted to Unix timestamp
            
            const testDate = new Date('2024-01-01T00:00:00Z');
            const result = helpers.getTimeStamp(testDate);
            
            expect(result).to.be.a('string');
            expect(result).to.equal('1704067200');
        });

        it('should return empty string for null date', function() {
            // Test: Verify that null input returns empty string
            
            const result = helpers.getTimeStamp(null);
            
            expect(result).to.equal('');
        });

        it('should return empty string for undefined date', function() {
            // Test: Verify that undefined input returns empty string
            
            const result = helpers.getTimeStamp(undefined);
            
            expect(result).to.equal('');
        });

        it('should handle date string input', function() {
            // Test: Verify that date strings are correctly parsed and converted
            
            const result = helpers.getTimeStamp('2024-06-15T12:30:00Z');
            
            expect(result).to.be.a('string');
            expect(parseInt(result)).to.be.a('number');
            expect(parseInt(result)).to.be.greaterThan(0);
        });
    });
});

