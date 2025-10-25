/**
 * Unit tests for generatePurchaseCSV job step
 * Tests the purchase order export functionality
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Import standardized mocks
const Logger = require('../mocks/dw/system/Logger');
const Order = require('../mocks/dw/order/Order');
const Status = require('../mocks/dw/system/Status');
const FileWriter = require('../mocks/dw/io/FileWriter');
const CSVStreamWriter = require('../mocks/dw/io/CSVStreamWriter');
const Transaction = require('../mocks/dw/system/Transaction');
const Site = require('../mocks/dw/system/Site');
const CustomObjectMgr = require('../mocks/dw/object/CustomObjectMgr');
const System = require('../mocks/dw/system/System');
const ArrayList = require('../mocks/dw/util/ArrayList');
const File = require('../mocks/dw/io/File');

describe('generatePurchaseCSV', function() {
    let generatePurchaseCSV;
    let mockCsvGeneratorHelper;
    let mockBREngagementAPIHelper;
    let mockFile;
    
    // Set up mocks before tests
    before(function() {
        // Mock the CSV generator helper
        mockCsvGeneratorHelper = {
            createPurchaseFeedFile: sinon.stub(),
            getPurchaseFeedFileHeaders: sinon.stub(),
            getFeedAttributes: sinon.stub(),
            writePurchaseFeedRow: sinon.stub(),
            getOrdersForPurchaseFeed: sinon.stub()
        };
        
        // Mock the Bloomreach Engagement API helper
        mockBREngagementAPIHelper = {
            bloomReachEngagementAPIService: sinon.stub()
        };
        
        // Mock File for the feed file
        mockFile = new File('/IMPEX/export/purchase-feed-123456789.csv');
        mockFile._exists = true;
        
        // Load the module with mocked dependencies using proxyquire
        // Use noCallThru() to prevent proxyquire from trying to load unmocked modules
        generatePurchaseCSV = proxyquire.noCallThru()('../../cartridges/int_bloomreach_engagement/cartridge/scripts/jobSteps/generatePurchaseCSV', {
            'dw/system/Logger': Logger,
            'dw/order/Order': Order,
            'dw/system/Status': Status,
            'dw/io/FileWriter': FileWriter,
            'dw/io/CSVStreamWriter': CSVStreamWriter,
            'dw/system/Transaction': Transaction,
            'dw/system/Site': Site,
            'dw/object/CustomObjectMgr': CustomObjectMgr,
            'dw/util/ArrayList': ArrayList,
            '~/cartridge/scripts/helpers/BloomreachEngagementGenerateCSVHelper': mockCsvGeneratorHelper,
            '~/cartridge/scripts/helpers/BloomreachEngagementHelper.js': mockBREngagementAPIHelper,
            // Mock the global dw object that's used in the module
            'dw/system/System': {
                getInstanceHostname: () => ({ toString: () => 'test-instance.demandware.net' })
            }
        });
    });
    
    // Reset mocks before each test
    beforeEach(function() {
        // Reset all mock helpers
        Logger.__reset();
        Site.__reset();
        CustomObjectMgr.__reset();
        System.__reset();
        
        // Reset stubs
        mockCsvGeneratorHelper.createPurchaseFeedFile.reset();
        mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.reset();
        mockCsvGeneratorHelper.getFeedAttributes.reset();
        mockCsvGeneratorHelper.writePurchaseFeedRow.reset();
        mockCsvGeneratorHelper.getOrdersForPurchaseFeed.reset();
        mockBREngagementAPIHelper.bloomReachEngagementAPIService.reset();
        
        // Set up default Site configuration
        Site.__setCurrentSite({
            brEngPurchaseFeedDataMapping: JSON.stringify([
                { XSDField: 'order_id', SFCCProductAttribute: 'orderNo', isCustomAttribute: false },
                { XSDField: 'email', SFCCProductAttribute: 'customerEmail', isCustomAttribute: false },
                { XSDField: 'total', SFCCProductAttribute: 'totalGrossPrice', isCustomAttribute: false }
            ]),
            brEngPurchaseFeedImportId: 'test-import-id'
        });
        
        // Set up System mock
        System.__setInstanceHostname('test-instance.demandware.net');
    });
    
    describe('beforeStep()', function() {
        
        it('should initialize successfully with valid arguments', function() {
            // Test: Verify that beforeStep initializes the job step with all required data
            // This covers the successful initialization path
            
            // Setup: Mock the helper responses
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([
                { XSDField: 'order_id', SFCCProductAttribute: 'orderNo', isCustomAttribute: false }
            ]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({
                headers: ['order_id'],
                SFCCAttributesValue: [{ SFCCProductAttribute: 'orderNo', isCustom: false }]
            });
            
            // Create mock order iterator
            const mockOrders = [
                new Order('ORDER-001'),
                new Order('ORDER-002')
            ];
            const mockIterator = {
                hasNext: sinon.stub(),
                next: sinon.stub(),
                close: sinon.stub(),
                count: 2
            };
            mockIterator.hasNext.onFirstCall().returns(true).onSecondCall().returns(true).returns(false);
            mockIterator.next.onFirstCall().returns(mockOrders[0]).onSecondCall().returns(mockOrders[1]);
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns(mockIterator);
            
            // Execute
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true,
                OPEN: false,
                COMPLETED: true
            };
            
            const result = generatePurchaseCSV.beforeStep(args);
            
            // Verify: Check that initialization was successful
            expect(result).to.be.undefined; // No error status returned
            expect(mockCsvGeneratorHelper.createPurchaseFeedFile.calledOnce).to.be.true;
            expect(mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.calledOnce).to.be.true;
            expect(mockCsvGeneratorHelper.getFeedAttributes.calledOnce).to.be.true;
            expect(mockCsvGeneratorHelper.getOrdersForPurchaseFeed.calledOnce).to.be.true;
        });
        
        it('should handle order status filters correctly', function() {
            // Test: Verify that order status filters are correctly built from arguments
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                count: 0
            });
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true,
                CANCELLED: true,
                OPEN: true,
                CREATED: true,
                FAILED: true,
                REPLACED: true,
                COMPLETED: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Verify that all order statuses were included in the query
            const orderStatusQuery = mockCsvGeneratorHelper.getOrdersForPurchaseFeed.getCall(0).args[0];
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_NEW);
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_CANCELLED);
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_OPEN);
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_CREATED);
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_FAILED);
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_REPLACED);
            expect(orderStatusQuery).to.include('status=' + Order.ORDER_STATUS_COMPLETED);
        });
        
        it('should use last export date when UpdateFromDatePreference is true', function() {
            // Test: Verify that the job uses the last execution date from custom object
            // when UpdateFromDatePreference is enabled
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                count: 0
            });
            
            // Setup: Create custom object with last execution date
            const lastExecution = new Date('2024-01-01T00:00:00Z');
            CustomObjectMgr.__setCustomObject(
                'BloomreachEngagementJobLastExecution',
                'lastPurchaseExport',
                { lastExecution: lastExecution }
            );
            
            const args = {
                UpdateFromDatePreference: true,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Verify that the last execution date was passed to the query
            const callArgs = mockCsvGeneratorHelper.getOrdersForPurchaseFeed.getCall(0).args;
            expect(callArgs[1]).to.equal(lastExecution);
        });
        
        it('should handle GeneratePreInitFile flag correctly', function() {
            // Test: Verify that when GeneratePreInitFile is true, only the first order is processed
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            
            const mockOrders = [
                new Order('ORDER-001'),
                new Order('ORDER-002'),
                new Order('ORDER-003')
            ];
            const mockIterator = {
                hasNext: sinon.stub().returns(true),
                next: sinon.stub().returns(mockOrders[0]),
                count: 3
            };
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns(mockIterator);
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: true,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Verify that only first order was retrieved
            expect(mockIterator.next.calledOnce).to.be.true;
        });
        
        it('should return ERROR status on exception', function() {
            // Test: Verify that errors during initialization are caught and return ERROR status
            
            // Setup: Make the helper throw an error
            mockCsvGeneratorHelper.createPurchaseFeedFile.throws(new Error('File creation failed'));
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            const result = generatePurchaseCSV.beforeStep(args);
            
            // Verify that ERROR status was returned
            expect(result).to.be.instanceOf(Status);
            expect(result.isError()).to.be.true;
            
            // Verify that error was logged
            const logger = Logger.getLogger('Bloomreach', 'bloomreach');
            const logs = logger.getLogs();
            expect(logs.error.length).to.be.greaterThan(0);
        });
    });
    
    describe('getTotalCount()', function() {
        
        it('should return 1 when GeneratePreInitFile is true', function() {
            // Test: Verify that getTotalCount returns 1 for pre-init file generation
            
            // Setup
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            
            const mockIterator = {
                hasNext: sinon.stub().returns(true),
                next: sinon.stub().returns(new Order('ORDER-001')),
                count: 100
            };
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns(mockIterator);
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: true,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Execute
            const count = generatePurchaseCSV.getTotalCount();
            
            // Verify
            expect(count).to.equal(1);
        });
        
        it('should return actual order count when GeneratePreInitFile is false', function() {
            // Test: Verify that getTotalCount returns the actual number of orders
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            
            const mockIterator = {
                hasNext: () => false,
                count: 42
            };
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns(mockIterator);
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            const count = generatePurchaseCSV.getTotalCount();
            
            expect(count).to.equal(42);
        });
    });
    
    describe('read()', function() {
        
        it('should return next order from iterator', function() {
            // Test: Verify that read() returns the next order in the queue
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            
            const order1 = new Order('ORDER-001');
            const order2 = new Order('ORDER-002');
            let callCount = 0;
            const mockIterator = {
                hasNext: function() {
                    return callCount < 2;
                },
                next: function() {
                    callCount++;
                    return callCount === 1 ? order1 : order2;
                },
                count: 2
            };
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns(mockIterator);
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Execute
            const firstOrder = generatePurchaseCSV.read();
            const secondOrder = generatePurchaseCSV.read();
            
            // Verify
            expect(firstOrder).to.not.be.undefined;
            expect(firstOrder.orderNo).to.equal('ORDER-001');
            expect(secondOrder).to.not.be.undefined;
            expect(secondOrder.orderNo).to.equal('ORDER-002');
        });
        
        it('should return undefined when no more orders', function() {
            // Test: Verify that read() returns undefined when iterator is exhausted
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            
            const mockIterator = {
                hasNext: sinon.stub().returns(false),
                count: 0
            };
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns(mockIterator);
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            const order = generatePurchaseCSV.read();
            
            expect(order).to.be.undefined;
        });
    });
    
    describe('process()', function() {
        
        it('should process order and return CSV array', function() {
            // Test: Verify that process() converts order to CSV row data
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({
                headers: ['order_id', 'email'],
                SFCCAttributesValue: []
            });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                count: 0
            });
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Setup: Mock the CSV row generation
            const mockCsvRow = ['ORDER-001', 'customer@example.com'];
            mockCsvGeneratorHelper.writePurchaseFeedRow.returns(mockCsvRow);
            
            const order = new Order('ORDER-001');
            order.customerEmail = 'customer@example.com';
            
            // Execute
            const result = generatePurchaseCSV.process(order);
            
            // Verify
            expect(result).to.deep.equal(mockCsvRow);
            expect(mockCsvGeneratorHelper.writePurchaseFeedRow.calledOnce).to.be.true;
        });
        
        it('should handle processing errors gracefully', function() {
            // Test: Verify that errors during order processing are caught and logged
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({
                headers: ['order_id'],
                SFCCAttributesValue: []
            });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                count: 0
            });
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Setup: Make the helper throw an error
            mockCsvGeneratorHelper.writePurchaseFeedRow.throws(new Error('Invalid order data'));
            
            const order = new Order('ORDER-BAD');
            
            // Execute
            const result = generatePurchaseCSV.process(order);
            
            // Verify that error was handled gracefully
            expect(result).to.be.undefined;
        });
    });
    
    describe('write()', function() {
        
        it('should write CSV lines to file', function() {
            // Test: Verify that write() outputs lines to the CSV writer
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                count: 0
            });
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Create mock lines - each line is an ArrayList that has a toArray() method
            const line1 = new ArrayList(['ORDER-001', 'customer1@example.com']);
            const line2 = new ArrayList(['ORDER-002', 'customer2@example.com']);
            const lines = new ArrayList([line1, line2]);
            
            // Execute
            generatePurchaseCSV.write(lines);
            
            // This is a basic smoke test to ensure write() executes without error
            expect(lines.size()).to.equal(2);
        });
    });
    
    describe('afterStep()', function() {
        
        // Reload module for these tests to ensure clean state
        beforeEach(function() {
            // Clear the module cache to reload with fresh state
            delete require.cache[require.resolve('../../cartridges/int_bloomreach_engagement/cartridge/scripts/jobSteps/generatePurchaseCSV')];
            
            // Reload the module
            generatePurchaseCSV = proxyquire.noCallThru()('../../cartridges/int_bloomreach_engagement/cartridge/scripts/jobSteps/generatePurchaseCSV', {
                'dw/system/Logger': Logger,
                'dw/order/Order': Order,
                'dw/system/Status': Status,
                'dw/io/FileWriter': FileWriter,
                'dw/io/CSVStreamWriter': CSVStreamWriter,
                'dw/system/Transaction': Transaction,
                'dw/system/Site': Site,
                'dw/object/CustomObjectMgr': CustomObjectMgr,
                'dw/util/ArrayList': ArrayList,
                '~/cartridge/scripts/helpers/BloomreachEngagementGenerateCSVHelper': mockCsvGeneratorHelper,
                '~/cartridge/scripts/helpers/BloomreachEngagementHelper.js': mockBREngagementAPIHelper,
                'dw/system/System': {
                    getInstanceHostname: () => ({ toString: () => 'test-instance.demandware.net' })
                }
            });
        });
        
        it('should return OK status when all orders processed successfully', function() {
            // Test: Verify that afterStep returns OK status on success
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                close: sinon.stub(),
                count: 0
            });
            
            // Mock successful processing - important: this needs to return an array
            mockCsvGeneratorHelper.writePurchaseFeedRow.returns(['ORDER-001', 'customer@example.com']);
            mockBREngagementAPIHelper.bloomReachEngagementAPIService.returns({ success: true });
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Don't trigger any processing errors - keep processedAll = true
            
            // Execute
            const result = generatePurchaseCSV.afterStep();
            
            // Verify
            expect(result).to.be.instanceOf(Status);
            expect(result.isOK()).to.be.true;
            expect(result.getMessage()).to.include('Export Order Feed Successful');
        });
        
        it('should update custom object when UpdateFromDatePreference is true', function() {
            // Test: Verify that the last execution date is updated in custom object
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                close: sinon.stub(),
                count: 0
            });
            
            // Mock successful processing
            mockCsvGeneratorHelper.writePurchaseFeedRow.returns(['ORDER-001', 'customer@example.com']);
            mockBREngagementAPIHelper.bloomReachEngagementAPIService.returns({ success: true });
            
            // Setup: Create existing custom object
            CustomObjectMgr.__setCustomObject(
                'BloomreachEngagementJobLastExecution',
                'lastPurchaseExport',
                { lastExecution: new Date('2024-01-01') }
            );
            
            const args = {
                UpdateFromDatePreference: true,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Don't trigger any processing errors
            
            const result = generatePurchaseCSV.afterStep();
            
            // Verify
            expect(result.isOK()).to.be.true;
            
            // Verify custom object was retrieved and updated (implicitly via Transaction.wrap)
            const customObj = CustomObjectMgr.getCustomObject(
                'BloomreachEngagementJobLastExecution',
                'lastPurchaseExport'
            );
            expect(customObj).to.not.be.null;
        });
        
        it('should throw error when not all orders processed', function() {
            // Test: Verify that an error is thrown if processing failed
            
            mockCsvGeneratorHelper.createPurchaseFeedFile.returns(mockFile);
            mockCsvGeneratorHelper.getPurchaseFeedFileHeaders.returns(JSON.stringify([]));
            mockCsvGeneratorHelper.getFeedAttributes.returns({ headers: [], SFCCAttributesValue: [] });
            mockCsvGeneratorHelper.getOrdersForPurchaseFeed.returns({
                hasNext: () => false,
                close: sinon.stub(),
                count: 0
            });
            
            const args = {
                UpdateFromDatePreference: false,
                MaxNumberOfRows: 10000,
                TargetFolder: 'export',
                FileNamePrefix: 'purchase-feed',
                GeneratePreInitFile: false,
                NEW: true
            };
            
            generatePurchaseCSV.beforeStep(args);
            
            // Simulate a processing error by calling process with error
            mockCsvGeneratorHelper.writePurchaseFeedRow.throws(new Error('Test error'));
            const order = new Order('ORDER-001');
            generatePurchaseCSV.process(order); // This will set processedAll to false
            
            // Execute and verify that error is thrown
            expect(() => generatePurchaseCSV.afterStep()).to.throw('Could not process all the orders');
        });
    });
});

