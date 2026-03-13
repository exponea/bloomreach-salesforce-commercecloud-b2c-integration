/**
 * Unit tests for BloomreachEngagementHelper
 *
 * Covers the bloomReachEngagementAPIService() function including the retry
 * mechanism with exponential backoff for transient network errors.
 * All SFCC platform APIs are replaced with in-memory mocks via proxyquire.
 */

'use strict';

var expect = require('chai').expect;
var proxyquire = require('proxyquire');

var Site = require('../mocks/dw/system/Site');
var LoggerMock = require('../mocks/dw/system/Logger');

// ---------------------------------------------------------------------------
// Controllable factory for the API service mock.
// Set currentMockFactory before each test to control service behaviour.
// ---------------------------------------------------------------------------

var currentMockFactory = null;

var mockAPIServices = {
    getBloomreachEngagementAPIService: function(importId) {
        return currentMockFactory(importId);
    }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fake service whose call() returns responses from the queue in
 * order. Once the queue is exhausted the last response is repeated.
 */
function makeService(responses) {
    var callIndex = 0;
    return {
        call: function() {
            var response = responses[Math.min(callIndex, responses.length - 1)];
            callIndex++;
            return response;
        },
        getCallCount: function() { return callIndex; },
        getRequestData: function() { return '{}'; }
    };
}

function okResponse(object) {
    return { status: 'OK', object: object || '{"success":true}', errorMessage: null };
}

function errorResponse(errorMessage) {
    return { status: 'ERROR', object: null, errorMessage: errorMessage };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BloomreachEngagementHelper', function() {

    var brHelper;

    before(function() {
        // Set up global dw before loading the module so that the module-level
        // var Logger = dw.system.Logger.getLogger(...) resolves correctly.
        global.dw = {
            system: {
                Logger: LoggerMock,
                Site: Site
            }
        };

        brHelper = proxyquire.noCallThru()(
            '../../cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/BloomreachEngagementHelper',
            {
                '~/cartridge/scripts/services/BloomreachEngagementAPIService.js': mockAPIServices,
                'dw/system/Site': Site
            }
        );
    });

    after(function() {
        delete global.dw;
    });

    beforeEach(function() {
        Site.__reset();
        Site.__setCurrentSite({
            brEngApiBaseUrl: 'https://api.example.com',
            brEngProjectToken: 'test-token'
        });
        LoggerMock.__reset();
        // Default factory: returns a service that succeeds immediately
        currentMockFactory = function() {
            return makeService([okResponse()]);
        };
    });

    // -------------------------------------------------------------------------
    // bloomReachEngagementAPIService()
    // -------------------------------------------------------------------------

    describe('bloomReachEngagementAPIService()', function() {

        it('should return the result object when the API call succeeds on the first attempt', function() {
            currentMockFactory = function() {
                return makeService([okResponse('{"imported":true}')]);
            };

            var result = brHelper.bloomReachEngagementAPIService('import-123', '/path/to/file.csv');

            expect(result).to.equal('{"imported":true}');
        });

        it('should not log any warnings when the first attempt succeeds', function() {
            currentMockFactory = function() {
                return makeService([okResponse()]);
            };

            brHelper.bloomReachEngagementAPIService('import-123', '/path/to/file.csv');

            var logger = LoggerMock.getLogger('BloomreachEngagementAPI');
            expect(logger.getLogs().warn).to.have.lengthOf(0);
        });

        it('should retry on a transient timeout error and return the result on the second attempt', function() {
            currentMockFactory = function() {
                return makeService([
                    errorResponse('SocketTimeoutException:Read timed out'),
                    okResponse('{"imported":true}')
                ]);
            };

            var result = brHelper.bloomReachEngagementAPIService('import-123', '/path/to/file.csv');

            expect(result).to.equal('{"imported":true}');
        });

        it('should log a warning for each retry attempt', function() {
            currentMockFactory = function() {
                return makeService([
                    errorResponse('SocketTimeoutException:Read timed out'),
                    okResponse()
                ]);
            };

            brHelper.bloomReachEngagementAPIService('import-123', '/path/to/file.csv');

            var logger = LoggerMock.getLogger('BloomreachEngagementAPI');
            expect(logger.getLogs().warn).to.have.lengthOf(1);
            expect(logger.getLogs().warn[0]).to.include('retrying');
        });

        it('should retry up to maxRetries times on transient errors then throw after all attempts are exhausted', function() {
            currentMockFactory = function() {
                return makeService([
                    errorResponse('SocketTimeoutException:Read timed out'),
                    errorResponse('SocketTimeoutException:Read timed out'),
                    errorResponse('SocketTimeoutException:Read timed out')
                ]);
            };

            expect(function() {
                brHelper.bloomReachEngagementAPIService('import-456', '/path/to/file.csv');
            }).to.throw(Error, 'import-456');
        });

        it('should log two warnings when all three attempts fail', function() {
            currentMockFactory = function() {
                return makeService([
                    errorResponse('SocketTimeoutException:Read timed out'),
                    errorResponse('SocketTimeoutException:Read timed out'),
                    errorResponse('SocketTimeoutException:Read timed out')
                ]);
            };

            try {
                brHelper.bloomReachEngagementAPIService('import-456', '/path/to/file.csv');
            } catch (e) { /* expected */ }

            var logger = LoggerMock.getLogger('BloomreachEngagementAPI');
            expect(logger.getLogs().warn).to.have.lengthOf(2);
            expect(logger.getLogs().error).to.have.lengthOf(1);
        });

        it('should NOT retry on a non-transient error and should throw after exactly one attempt', function() {
            var callCount = 0;
            currentMockFactory = function() {
                return {
                    call: function() {
                        callCount++;
                        return errorResponse('401 Unauthorized');
                    },
                    getRequestData: function() { return '{}'; }
                };
            };

            expect(function() {
                brHelper.bloomReachEngagementAPIService('import-789', '/path/to/file.csv');
            }).to.throw(Error, 'import-789');

            expect(callCount).to.equal(1);
        });

        it('should not log any warnings when a non-transient error fails immediately', function() {
            currentMockFactory = function() {
                return makeService([errorResponse('401 Unauthorized')]);
            };

            try {
                brHelper.bloomReachEngagementAPIService('import-789', '/path/to/file.csv');
            } catch (e) { /* expected */ }

            var logger = LoggerMock.getLogger('BloomreachEngagementAPI');
            expect(logger.getLogs().warn).to.have.lengthOf(0);
        });

        it('should include the import ID in the thrown error message', function() {
            currentMockFactory = function() {
                return makeService([errorResponse('SocketTimeoutException:Read timed out')]);
            };

            var thrownError = null;
            try {
                brHelper.bloomReachEngagementAPIService('import-special-id', '/path/to/file.csv');
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).to.not.equal(null);
            expect(thrownError.message).to.include('import-special-id');
        });

        it('should use result.object as error detail when errorMessage is null (HTTP 4xx/5xx)', function() {
            currentMockFactory = function() {
                return makeService([{ status: 'ERROR', object: '{"error":"Unauthorized","status":401}', errorMessage: null }]);
            };

            var thrownError = null;
            try {
                brHelper.bloomReachEngagementAPIService('import-401', '/path/to/file.csv');
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).to.not.equal(null);
            expect(thrownError.message).to.include('import-401');
            expect(thrownError.message).to.not.include('null');
            expect(thrownError.message).to.include('Unauthorized');
        });

        it('should propagate errors thrown by getBloomreachEngagementAPIService (e.g. missing credentials)', function() {
            currentMockFactory = function() {
                throw new Error('Error while triggering bloomreach engagement api: credentials not provided');
            };

            expect(function() {
                brHelper.bloomReachEngagementAPIService('import-999', '/path/to/file.csv');
            }).to.throw(Error, 'credentials');
        });

    });
});
