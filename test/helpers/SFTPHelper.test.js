/**
 * Unit tests for SFTPHelper
 *
 * Tests the credential-based SFTP detection, upload orchestration (including
 * retry logic), and connection test flow — without any real network activity.
 * All SFCC platform APIs are replaced with in-memory mocks via proxyquire.
 */

'use strict';

var expect = require('chai').expect;
var proxyquire = require('proxyquire');

var Site = require('../mocks/dw/system/Site');
var File = require('../mocks/dw/io/File');
var FileWriter = require('../mocks/dw/io/FileWriter');
var MockSFTPClient = require('../mocks/dw/net/SFTPClient');
var MockKeyRef = require('../mocks/dw/crypto/KeyRef');
var LoggerMock = require('../mocks/dw/system/Logger');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

var FULL_PASSWORD_PREFS = {
    brEngSFTPHostname: 'sftp.example.com',
    brEngSFTPUsername: 'merchant',
    brEngSFTPRemoteDirectory: '/bloomreach/feeds',
    brEngSFTPAuthMethod: 'password',
    brEngSFTPPassword: 's3cr3t',
    brEngSFTPPort: 22
};

var FULL_SSHKEY_PREFS = {
    brEngSFTPHostname: 'sftp.example.com',
    brEngSFTPUsername: 'merchant',
    brEngSFTPRemoteDirectory: '/bloomreach/feeds',
    brEngSFTPAuthMethod: { value: 'ssh-key' },
    brEngSFTPKeyAlias: 'my-ssh-key',
    brEngSFTPPort: 22
};

function makeLocalFile(name, exists) {
    var f = new File('/tmp/' + name);
    f._exists = exists !== false; // default true
    f.name = name;
    f._length = 1024;
    return f;
}

function makeLogger() {
    return LoggerMock.getLogger('SFTPHelper', 'test');
}

// ---------------------------------------------------------------------------
// Load the module under test once with all dependencies mocked
// ---------------------------------------------------------------------------

var sftpHelper = proxyquire.noCallThru()(
    '../../cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/SFTPHelper',
    {
        'dw/system/Site': Site,
        'dw/net/SFTPClient': MockSFTPClient,
        'dw/io/File': File,
        'dw/io/FileWriter': FileWriter,
        'dw/crypto/KeyRef': MockKeyRef
    }
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SFTPHelper', function() {

    beforeEach(function() {
        Site.__reset();
        MockSFTPClient.__reset();
    });

    // -------------------------------------------------------------------------
    // isSFTPEnabled()
    // -------------------------------------------------------------------------

    describe('isSFTPEnabled()', function() {

        it('should return enabled:false when hostname is missing', function() {
            Site.__setCurrentSite({
                brEngSFTPUsername: 'user',
                brEngSFTPRemoteDirectory: '/remote',
                brEngSFTPPassword: 'pass'
            });

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(false);
            expect(result.error).to.be.a('string');
        });

        it('should return enabled:false when hostname is whitespace only', function() {
            Site.__setCurrentSite({
                brEngSFTPHostname: '   ',
                brEngSFTPUsername: 'user',
                brEngSFTPRemoteDirectory: '/remote',
                brEngSFTPPassword: 'pass'
            });

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(false);
        });

        it('should return enabled:false when username is missing', function() {
            Site.__setCurrentSite({
                brEngSFTPHostname: 'sftp.example.com',
                brEngSFTPRemoteDirectory: '/remote',
                brEngSFTPPassword: 'pass'
            });

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(false);
        });

        it('should return enabled:false when remote directory is missing', function() {
            Site.__setCurrentSite({
                brEngSFTPHostname: 'sftp.example.com',
                brEngSFTPUsername: 'user',
                brEngSFTPPassword: 'pass'
            });

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(false);
        });

        it('should return enabled:true when all password-auth fields are present', function() {
            Site.__setCurrentSite(FULL_PASSWORD_PREFS);

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(true);
            expect(result.error).to.equal(null);
        });

        it('should return enabled:false when password-auth has no password', function() {
            Site.__setCurrentSite({
                brEngSFTPHostname: 'sftp.example.com',
                brEngSFTPUsername: 'user',
                brEngSFTPRemoteDirectory: '/remote',
                brEngSFTPAuthMethod: 'password',
                brEngSFTPPassword: ''
            });

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(false);
        });

        it('should return enabled:true when all SSH key auth fields are present', function() {
            Site.__setCurrentSite(FULL_SSHKEY_PREFS);

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(true);
            expect(result.error).to.equal(null);
        });

        it('should return enabled:false when SSH key auth has no key alias', function() {
            Site.__setCurrentSite({
                brEngSFTPHostname: 'sftp.example.com',
                brEngSFTPUsername: 'user',
                brEngSFTPRemoteDirectory: '/remote',
                brEngSFTPAuthMethod: { value: 'ssh-key' },
                brEngSFTPKeyAlias: ''
            });

            var result = sftpHelper.isSFTPEnabled();

            expect(result.enabled).to.equal(false);
        });

    });

    // -------------------------------------------------------------------------
    // uploadFile()
    // -------------------------------------------------------------------------

    describe('uploadFile()', function() {

        var logger;

        beforeEach(function() {
            logger = makeLogger();
            logger.clearLogs();
            // Provide valid credentials so getSFTPConfig() returns a usable config
            Site.__setCurrentSite(FULL_PASSWORD_PREFS);
        });

        it('should return success:true and the remote path on happy path (password auth)', function() {
            var localFile = makeLocalFile('customers.csv');

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(true);
            expect(result.remotePath).to.equal('/bloomreach/feeds/customers.csv');
            expect(result.error).to.equal(null);
        });

        it('should return success:false when local file does not exist', function() {
            var localFile = makeLocalFile('missing.csv', false);

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(false);
            expect(result.error).to.be.a('string');
        });

        it('should return success:false when connect() returns false', function() {
            MockSFTPClient.__queueBehavior({
                connect: function() { return false; }
            });
            var localFile = makeLocalFile('customers.csv');

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(false);
            expect(result.error).to.be.a('string');
        });

        it('should return success:false when putBinary() returns false', function() {
            MockSFTPClient.__queueBehavior({
                putBinary: function() { return false; }
            });
            var localFile = makeLocalFile('customers.csv');

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(false);
            expect(result.error).to.be.a('string');
        });

        it('should retry once on a transient error and return success:true on second attempt', function() {
            var connectCallCount = 0;

            // First instance: connect throws a transient error
            MockSFTPClient.__queueBehavior({
                connect: function() {
                    connectCallCount++;
                    throw new Error('connection timeout');
                }
            });
            // Second instance (retry): connect succeeds (default behavior)
            // connectCallCount increments so we can verify two attempts

            var localFile = makeLocalFile('customers.csv');

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(true);
            expect(connectCallCount).to.equal(1); // failed once, retried with a new instance
        });

        it('should NOT retry on a non-transient error and return success:false', function() {
            var connectCallCount = 0;

            MockSFTPClient.__queueBehavior({
                connect: function() {
                    connectCallCount++;
                    throw new Error('permission denied');
                }
            });

            var localFile = makeLocalFile('customers.csv');

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(false);
            expect(connectCallCount).to.equal(1); // called exactly once, no retry
        });

        it('should pass null as password when using SSH key authentication', function() {
            Site.__setCurrentSite(FULL_SSHKEY_PREFS);

            var capturedArgs = null;
            MockSFTPClient.__queueBehavior({
                connect: function(host, port, user, pass) {
                    capturedArgs = [host, port, user, pass];
                    return true;
                }
            });
            var localFile = makeLocalFile('customers.csv');

            var result = sftpHelper.uploadFile(localFile, logger);

            expect(result.success).to.equal(true);
            expect(capturedArgs).to.not.equal(null);
            expect(capturedArgs[3]).to.equal(null); // no password for SSH key auth
            expect(capturedArgs[2]).to.equal('merchant');
        });

    });

    // -------------------------------------------------------------------------
    // testSFTPConnection()
    // -------------------------------------------------------------------------

    describe('testSFTPConnection()', function() {

        var logger;

        beforeEach(function() {
            logger = makeLogger();
            logger.clearLogs();
            Site.__setCurrentSite(FULL_PASSWORD_PREFS);
        });

        it('should return success:true when connect, putBinary, and del all succeed', function() {
            var result = sftpHelper.testSFTPConnection(logger);

            expect(result.success).to.equal(true);
            expect(result.message).to.be.a('string');
            expect(result.message).to.include('passed');
        });

        it('should return success:false when SFTP config is unavailable', function() {
            // Wipe all prefs so getSFTPConfig() encounters an exception or returns null.
            // Force an exception by making getCurrent() throw via a bad Site state.
            Site.__setCurrentSite({}); // valid but empty — getSFTPConfig returns a config with empty hostname
            // Override to simulate a hard failure in getSFTPConfig by corrupting the site mock
            // We simulate this by resetting to a state where Site.getCurrent() throws
            var originalGetCurrent = Site.getCurrent;
            Site.getCurrent = function() { throw new Error('Site not available'); };

            var result = sftpHelper.testSFTPConnection(logger);

            Site.getCurrent = originalGetCurrent; // restore
            expect(result.success).to.equal(false);
            expect(result.message).to.be.a('string');
        });

        it('should return success:false when connect() returns false', function() {
            MockSFTPClient.__queueBehavior({
                connect: function() { return false; }
            });

            var result = sftpHelper.testSFTPConnection(logger);

            expect(result.success).to.equal(false);
            expect(result.message).to.include('Failed to connect');
        });

        it('should return success:false when putBinary() returns false', function() {
            MockSFTPClient.__queueBehavior({
                putBinary: function() { return false; }
            });

            var result = sftpHelper.testSFTPConnection(logger);

            expect(result.success).to.equal(false);
            expect(result.message).to.include('Failed to upload');
        });

        it('should still return success:true when del() throws during cleanup', function() {
            MockSFTPClient.__queueBehavior({
                del: function() { throw new Error('del not permitted'); }
            });

            var result = sftpHelper.testSFTPConnection(logger);

            // del failure is non-fatal — test should still pass
            expect(result.success).to.equal(true);
        });

    });

});
