/**
 * Unit tests for BloomreachEngagementFileDownloadHelper
 * Tests the file download URL generation helper functions
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Import the mocks
const SiteMock = require('../mocks/dw/system/Site');
const FileMock = require('../mocks/dw/io/File');
const LoggerMock = require('../mocks/dw/system/Logger');
const SystemMock = require('../mocks/dw/system/System');

describe('BloomreachEngagementFileDownloadHelper', function() {
    let helper;
    let logger;
    
    // Set up mocks and load module
    before(function() {
        // Set up global dw object for the module
        global.dw = {
            system: {
                Site: SiteMock,
                Logger: LoggerMock,
                System: SystemMock
            },
            io: {
                File: FileMock
            }
        };
        
        // Load the module with mocked dependencies using proxyquire
        helper = proxyquire.noCallThru()('../../cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/BloomreachEngagementFileDownloadHelper', {
            'dw/system/Site': SiteMock,
            'dw/io/File': FileMock,
            'dw/system/Logger': LoggerMock
        });
        
        // Get the logger instance that the module uses
        logger = LoggerMock.getLogger('BloomreachEngagementFileDownloadHelper');
    });
    
    // Clean up after all tests
    after(function() {
        delete global.dw;
    });
    
    // Reset mocks before each test
    beforeEach(function() {
        SiteMock.__reset();
        SystemMock.__reset();
        LoggerMock.__reset();
    });

    describe('generateDownloadUrl()', function() {
        
        it('should generate a valid download URL for a CSV file', function() {
            // Test: Verify that generateDownloadUrl creates a properly formatted URL
            // with hostname, site ID, and encoded file path
            
            SiteMock.__setCurrentSite({});
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            SystemMock.__setInstanceHostname('instance.demandware.net');
            
            const csvFile = new FileMock('/root/IMPEX/src/bloomreach_engagement/CustomerFeed/customers-20231024.csv');
            csvFile._exists = true;
            
            const result = helper.generateDownloadUrl(csvFile);
            
            expect(result).to.be.a('string');
            expect(result).to.include('https://instance.demandware.net');
            expect(result).to.include('/on/demandware.store/Sites-RefArch-Site/default/BloomreachFileDownload-Download');
            expect(result).to.include('?path=');
            expect(result).to.include('src%2Fbloomreach_engagement%2FCustomerFeed%2Fcustomers-20231024.csv');
        });

        it('should throw error for non-existent file', function() {
            // Test: Verify that the function throws an error when file does not exist
            
            const csvFile = new FileMock('/root/IMPEX/src/test/nonexistent.csv');
            csvFile._exists = false;
            
            expect(function() {
                helper.generateDownloadUrl(csvFile);
            }).to.throw('Cannot generate download URL for non-existent file');
            
            const logs = logger.getLogs();
            expect(logs.error).to.have.length.greaterThan(0);
            expect(logs.error[0]).to.include('File does not exist');
        });

        it('should throw error for null file', function() {
            // Test: Verify that the function throws an error when file is null
            
            expect(function() {
                helper.generateDownloadUrl(null);
            }).to.throw('Cannot generate download URL for non-existent file');
            
            const logs = logger.getLogs();
            expect(logs.error).to.have.length.greaterThan(0);
        });

        it('should handle file paths with backslashes (Windows-style)', function() {
            // Test: Verify that Windows-style backslash paths are converted to forward slashes
            // for proper URL formatting
            
            SiteMock.__setCurrentSite({});
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            SystemMock.__setInstanceHostname('instance.demandware.net');
            
            // Create a file with backslashes in the path
            const csvFile = new FileMock('/root/IMPEX/src/bloomreach_engagement/CustomerFeed/customers.csv');
            csvFile._exists = true;
            // Simulate Windows path
            csvFile.fullPath = '/root/IMPEX\\src\\bloomreach_engagement\\CustomerFeed\\customers.csv';
            
            const result = helper.generateDownloadUrl(csvFile);
            
            expect(result).to.be.a('string');
            // URL should have forward slashes, not backslashes
            expect(result).to.include('src%2Fbloomreach_engagement%2FCustomerFeed%2Fcustomers.csv');
            expect(result).to.not.include('%5C'); // %5C is encoded backslash
        });

        it('should properly encode special characters in file names', function() {
            // Test: Verify that special characters in file names are properly URL encoded
            
            SiteMock.__setCurrentSite({});
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            SystemMock.__setInstanceHostname('instance.demandware.net');
            
            const csvFile = new FileMock('/root/IMPEX/src/test/file with spaces & special.csv');
            csvFile._exists = true;
            
            const result = helper.generateDownloadUrl(csvFile);
            
            expect(result).to.be.a('string');
            expect(result).to.include('?path=');
            // Spaces and special characters should be encoded
            expect(result).to.include('%20'); // space
            expect(result).to.include('%26'); // ampersand
        });

        it('should handle file path without leading slash', function() {
            // Test: Verify that leading slashes are properly removed from relative paths
            
            SiteMock.__setCurrentSite({});
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            SystemMock.__setInstanceHostname('instance.demandware.net');
            
            const csvFile = new FileMock('/root/IMPEX/src/test.csv');
            csvFile._exists = true;
            
            const result = helper.generateDownloadUrl(csvFile);
            
            expect(result).to.be.a('string');
            // Should not have double slashes in the encoded path
            expect(result).to.not.include('path=%2F%2F');
            expect(result).to.include('path=src%2Ftest.csv');
        });

        it('should log debug messages during URL generation', function() {
            // Test: Verify that debug logging is performed during successful URL generation
            
            SiteMock.__setCurrentSite({});
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            SystemMock.__setInstanceHostname('instance.demandware.net');
            
            const csvFile = new FileMock('/root/IMPEX/src/test.csv');
            csvFile._exists = true;
            
            helper.generateDownloadUrl(csvFile);
            
            const logs = logger.getLogs();
            expect(logs.debug).to.have.length.greaterThan(0);
            expect(logs.debug.some(log => log.includes('Generated download URL'))).to.be.true;
        });

        it('should use correct site ID in URL', function() {
            // Test: Verify that the site ID from the current site is correctly included in URL
            
            SiteMock.__setCurrentSite({});
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('TestSiteID');
            
            SystemMock.__setInstanceHostname('test.demandware.net');
            
            const csvFile = new FileMock('/root/IMPEX/src/test.csv');
            csvFile._exists = true;
            
            const result = helper.generateDownloadUrl(csvFile);
            
            expect(result).to.include('Sites-TestSiteID-Site');
        });
    });

    describe('validateDownloadCredentialsConfigured()', function() {
        
        it('should return true when both username and password are configured', function() {
            // Test: Verify that validation passes when both credentials are set
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: 'testuser',
                brEngDownloadPassword: 'testpass123'
            });
            
            const result = helper.validateDownloadCredentialsConfigured();
            
            expect(result).to.be.true;
            
            const logs = logger.getLogs();
            expect(logs.debug.some(log => log.includes('credentials are configured'))).to.be.true;
        });

        it('should return false when username is missing', function() {
            // Test: Verify that validation fails when username is not configured
            
            SiteMock.__setCurrentSite({
                brEngDownloadPassword: 'testpass123'
            });
            
            const result = helper.validateDownloadCredentialsConfigured();
            
            expect(result).to.be.false;
            
            const logs = logger.getLogs();
            expect(logs.error).to.have.length.greaterThan(0);
            expect(logs.error[0]).to.include('credentials not configured');
        });

        it('should return false when password is missing', function() {
            // Test: Verify that validation fails when password is not configured
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: 'testuser'
            });
            
            const result = helper.validateDownloadCredentialsConfigured();
            
            expect(result).to.be.false;
            
            const logs = logger.getLogs();
            expect(logs.error).to.have.length.greaterThan(0);
            expect(logs.error[0]).to.include('credentials not configured');
        });

        it('should return false when both username and password are missing', function() {
            // Test: Verify that validation fails when no credentials are configured
            
            SiteMock.__setCurrentSite({});
            
            const result = helper.validateDownloadCredentialsConfigured();
            
            expect(result).to.be.false;
            
            const logs = logger.getLogs();
            expect(logs.error).to.have.length.greaterThan(0);
            expect(logs.error[0]).to.include('credentials not configured');
            expect(logs.error[0]).to.include('brEngDownloadUsername');
            expect(logs.error[0]).to.include('brEngDownloadPassword');
        });

        it('should return false when username is empty string', function() {
            // Test: Verify that empty string username is treated as not configured
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: '',
                brEngDownloadPassword: 'testpass123'
            });
            
            const result = helper.validateDownloadCredentialsConfigured();
            
            expect(result).to.be.false;
        });

        it('should return false when password is empty string', function() {
            // Test: Verify that empty string password is treated as not configured
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: 'testuser',
                brEngDownloadPassword: ''
            });
            
            const result = helper.validateDownloadCredentialsConfigured();
            
            expect(result).to.be.false;
        });
    });

    describe('getDownloadUrlInfo()', function() {
        
        it('should return complete configuration info when credentials are configured', function() {
            // Test: Verify that getDownloadUrlInfo returns all expected fields
            // with correct values when credentials are properly configured
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: 'testuser',
                brEngDownloadPassword: 'testpass123'
            });
            
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            SystemMock.__setInstanceHostname('instance.demandware.net');
            
            const result = helper.getDownloadUrlInfo();
            
            expect(result).to.be.an('object');
            expect(result).to.have.property('hostname');
            // Hostname is an object with toString() method in SFCC
            expect(result.hostname.toString()).to.equal('instance.demandware.net');
            expect(result).to.have.property('siteId', 'RefArch');
            expect(result).to.have.property('baseUrl');
            expect(result.baseUrl).to.include('https://instance.demandware.net');
            expect(result.baseUrl).to.include('Sites-RefArch-Site');
            expect(result).to.have.property('usernameConfigured', true);
            expect(result).to.have.property('passwordConfigured', true);
            expect(result).to.have.property('isFullyConfigured', true);
        });

        it('should indicate when username is not configured', function() {
            // Test: Verify that configuration info correctly reflects missing username
            
            SiteMock.__setCurrentSite({
                brEngDownloadPassword: 'testpass123'
            });
            
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            const result = helper.getDownloadUrlInfo();
            
            expect(result.usernameConfigured).to.be.false;
            expect(result.passwordConfigured).to.be.true;
            expect(result.isFullyConfigured).to.be.false;
        });

        it('should indicate when password is not configured', function() {
            // Test: Verify that configuration info correctly reflects missing password
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: 'testuser'
            });
            
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            const result = helper.getDownloadUrlInfo();
            
            expect(result.usernameConfigured).to.be.true;
            expect(result.passwordConfigured).to.be.false;
            expect(result.isFullyConfigured).to.be.false;
        });

        it('should indicate when no credentials are configured', function() {
            // Test: Verify that configuration info correctly reflects when no credentials are set
            
            SiteMock.__setCurrentSite({});
            
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            const result = helper.getDownloadUrlInfo();
            
            expect(result.usernameConfigured).to.be.false;
            expect(result.passwordConfigured).to.be.false;
            expect(result.isFullyConfigured).to.be.false;
        });

        it('should not expose actual password in returned info', function() {
            // Test: Verify that the password value is not exposed in the configuration info
            // for security reasons (only a boolean flag indicating if it's configured)
            
            SiteMock.__setCurrentSite({
                brEngDownloadUsername: 'testuser',
                brEngDownloadPassword: 'secretPassword123'
            });
            
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('RefArch');
            
            const result = helper.getDownloadUrlInfo();
            
            expect(result).to.not.have.property('password');
            expect(result.passwordConfigured).to.be.true;
            // Verify that the actual password is not in the returned object
            const resultString = JSON.stringify(result);
            expect(resultString).to.not.include('secretPassword123');
        });

        it('should build correct base URL with site ID', function() {
            // Test: Verify that the base URL is constructed correctly with the site ID
            
            SiteMock.__setCurrentSite({});
            
            const mockSite = SiteMock.getCurrent();
            mockSite.getID = sinon.stub().returns('MyTestSite');
            
            SystemMock.__setInstanceHostname('myhost.demandware.net');
            
            const result = helper.getDownloadUrlInfo();
            
            expect(result.baseUrl).to.equal(
                'https://myhost.demandware.net/on/demandware.store/Sites-MyTestSite-Site/default/BloomreachFileDownload-Download'
            );
        });
    });
});

