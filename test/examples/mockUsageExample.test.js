/**
 * Example test file demonstrating how to use SFCC mocks
 * This file shows best practices for testing with the mock framework
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Import mocks
const Logger = require('../mocks/dw/system/Logger');
const Status = require('../mocks/dw/system/Status');
const Site = require('../mocks/dw/system/Site');
const Order = require('../mocks/dw/order/Order');
const OrderMgr = require('../mocks/dw/order/OrderMgr');
const CustomObjectMgr = require('../mocks/dw/object/CustomObjectMgr');
const ArrayList = require('../mocks/dw/util/ArrayList');
const File = require('../mocks/dw/io/File');
const FileWriter = require('../mocks/dw/io/FileWriter');
const CSVStreamWriter = require('../mocks/dw/io/CSVStreamWriter');

describe('SFCC Mock Usage Examples', function() {
    
    // Reset all mocks before each test to ensure test isolation
    beforeEach(function() {
        Logger.__reset();
        Site.__reset();
        OrderMgr.__reset();
        CustomObjectMgr.__reset();
    });

    describe('Logger Mock', function() {
        it('should log messages with parameter substitution', function() {
            // Get a logger instance
            const logger = Logger.getLogger('test-category', 'test-file');
            
            // Log various messages
            logger.info('Processing order {0}', 'ORDER-123');
            logger.error('Failed to process order {0} with error {1}', 'ORDER-456', 'Connection timeout');
            
            // Verify logged messages
            const logs = logger.getLogs();
            expect(logs.info).to.have.lengthOf(1);
            expect(logs.info[0]).to.equal('Processing order ORDER-123');
            expect(logs.error).to.have.lengthOf(1);
            expect(logs.error[0]).to.equal('Failed to process order ORDER-456 with error Connection timeout');
        });

        it('should support multiple logger instances', function() {
            const logger1 = Logger.getLogger('category1', 'file1');
            const logger2 = Logger.getLogger('category2', 'file2');
            
            logger1.info('Message from logger 1');
            logger2.info('Message from logger 2');
            
            expect(logger1.getLogs().info).to.have.lengthOf(1);
            expect(logger2.getLogs().info).to.have.lengthOf(1);
        });
    });

    describe('Site Mock', function() {
        it('should return custom preference values', function() {
            // Set up site preferences
            Site.__setCurrentSite({
                brEngApiBaseUrl: 'https://api.example.com',
                brEngProjectToken: 'test-token-123',
                brEngApiKeyId: 'api-key-id',
                brEngApiKeySecret: 'api-key-secret'
            });
            
            // Get current site and verify preferences
            const currentSite = Site.getCurrent();
            expect(currentSite.getCustomPreferenceValue('brEngApiBaseUrl')).to.equal('https://api.example.com');
            expect(currentSite.getCustomPreferenceValue('brEngProjectToken')).to.equal('test-token-123');
        });

        it('should allow setting custom preference values', function() {
            const currentSite = Site.getCurrent();
            currentSite.setCustomPreferenceValue('testPref', 'testValue');
            
            expect(currentSite.getCustomPreferenceValue('testPref')).to.equal('testValue');
        });
    });

    describe('OrderMgr Mock', function() {
        it('should search for orders', function() {
            // Create mock orders
            const order1 = new Order('ORDER-001');
            order1.customerEmail = 'customer1@example.com';
            order1.status = Order.ORDER_STATUS_NEW;
            
            const order2 = new Order('ORDER-002');
            order2.customerEmail = 'customer2@example.com';
            order2.status = Order.ORDER_STATUS_COMPLETED;
            
            // Add orders to OrderMgr
            OrderMgr.__setOrders([order1, order2]);
            
            // Search for orders
            const results = OrderMgr.searchOrders('status=1', 'creationDate asc');
            
            expect(results.count).to.equal(2);
            expect(results.hasNext()).to.be.true;
            
            const firstOrder = results.next();
            expect(firstOrder.orderNo).to.equal('ORDER-001');
        });

        it('should retrieve order by order number', function() {
            const order = new Order('ORDER-123');
            OrderMgr.__addOrder(order);
            
            const retrievedOrder = OrderMgr.getOrder('ORDER-123');
            expect(retrievedOrder).to.not.be.null;
            expect(retrievedOrder.orderNo).to.equal('ORDER-123');
        });
    });

    describe('CustomObjectMgr Mock', function() {
        it('should create and retrieve custom objects', function() {
            // Create a custom object
            const customObj = CustomObjectMgr.createCustomObject(
                'BloomreachEngagementJobLastExecution',
                'lastPurchaseExport'
            );
            
            customObj.custom.lastExecution = new Date('2024-01-01');
            
            // Retrieve the custom object
            const retrieved = CustomObjectMgr.getCustomObject(
                'BloomreachEngagementJobLastExecution',
                'lastPurchaseExport'
            );
            
            expect(retrieved).to.not.be.null;
            expect(retrieved.custom.lastExecution).to.be.instanceOf(Date);
        });

        it('should return null for non-existent custom objects', function() {
            const result = CustomObjectMgr.getCustomObject('NonExistent', 'key');
            expect(result).to.be.null;
        });
    });

    describe('ArrayList Mock', function() {
        it('should add and retrieve items', function() {
            const list = new ArrayList();
            
            list.add('item1');
            list.add('item2');
            list.add('item3');
            
            expect(list.size()).to.equal(3);
            expect(list.get(0)).to.equal('item1');
            expect(list.get(2)).to.equal('item3');
        });

        it('should support iteration', function() {
            const list = new ArrayList(['a', 'b', 'c']);
            const iterator = list.iterator();
            const items = [];
            
            while (iterator.hasNext()) {
                items.push(iterator.next());
            }
            
            expect(items).to.deep.equal(['a', 'b', 'c']);
        });

        it('should convert to array', function() {
            const list = new ArrayList([1, 2, 3]);
            const array = list.toArray();
            
            expect(array).to.be.an('array');
            expect(array).to.deep.equal([1, 2, 3]);
        });
    });

    describe('CSV Writing Mock', function() {
        it('should write CSV data correctly', function() {
            // Create file and writers
            const file = new File('/export/test.csv');
            const fw = new FileWriter(file);
            const csw = new CSVStreamWriter(fw);
            
            // Write headers
            csw.writeNext(['OrderNo', 'Email', 'Total']);
            
            // Write data rows
            csw.writeNext(['ORDER-001', 'customer1@example.com', '100.00']);
            csw.writeNext(['ORDER-002', 'customer2@example.com', '200.00']);
            
            // Close writers
            csw.flush();
            csw.close();
            fw.close();
            
            // Verify written content
            const rows = csw.getRowsWritten();
            expect(rows).to.have.lengthOf(3);
            expect(rows[0]).to.deep.equal(['OrderNo', 'Email', 'Total']);
            expect(rows[1]).to.deep.equal(['ORDER-001', 'customer1@example.com', '100.00']);
            
            // Verify file content
            const content = fw.getContent();
            expect(content).to.include('ORDER-001');
            expect(content).to.include('customer1@example.com');
        });

        it('should handle CSV escaping correctly', function() {
            const file = new File('/export/test.csv');
            const fw = new FileWriter(file);
            const csw = new CSVStreamWriter(fw);
            
            // Write row with special characters that need escaping
            csw.writeNext(['Order, with comma', 'Email "with quotes"', 'Normal']);
            
            csw.close();
            fw.close();
            
            const content = fw.getContent();
            // Check that values with special characters are enclosed in quotes
            expect(content).to.include('"Order, with comma"');
            expect(content).to.include('"Email ""with quotes"""'); // Quotes are doubled
        });
    });

    describe('Status Mock', function() {
        it('should create OK status', function() {
            const status = new Status(Status.OK, 'OK', 'Operation successful');
            
            expect(status.isOK()).to.be.true;
            expect(status.isError()).to.be.false;
            expect(status.getMessage()).to.equal('Operation successful');
        });

        it('should create ERROR status', function() {
            const status = new Status(Status.ERROR, 'ERROR', 'Operation failed');
            
            expect(status.isOK()).to.be.false;
            expect(status.isError()).to.be.true;
            expect(status.getMessage()).to.equal('Operation failed');
        });
    });

    describe('Integration Example: Testing a Job Step', function() {
        it('should process orders and generate CSV', function() {
            // Setup: Create mock data
            Site.__setCurrentSite({
                brEngPurchaseFeedDataMapping: JSON.stringify([
                    { XSDField: 'order_id', SFCCProductAttribute: 'orderNo', isCustomAttribute: false },
                    { XSDField: 'email', SFCCProductAttribute: 'customerEmail', isCustomAttribute: false }
                ])
            });
            
            const order1 = new Order('ORDER-001');
            order1.customerEmail = 'test1@example.com';
            order1.status = Order.ORDER_STATUS_NEW;
            
            const order2 = new Order('ORDER-002');
            order2.customerEmail = 'test2@example.com';
            order2.status = Order.ORDER_STATUS_NEW;
            
            OrderMgr.__setOrders([order1, order2]);
            
            // Test: Simulate job step execution
            const orders = OrderMgr.searchOrders('status=1', 'creationDate asc');
            expect(orders.count).to.equal(2);
            
            const file = new File('/export/orders.csv');
            const fw = new FileWriter(file);
            const csw = new CSVStreamWriter(fw);
            
            // Write CSV
            csw.writeNext(['order_id', 'email']);
            
            while (orders.hasNext()) {
                const order = orders.next();
                csw.writeNext([order.orderNo, order.customerEmail]);
            }
            
            csw.close();
            fw.close();
            
            // Verify: Check the results
            const rows = csw.getRowsWritten();
            expect(rows).to.have.lengthOf(3); // Header + 2 data rows
            expect(rows[1][0]).to.equal('ORDER-001');
            expect(rows[2][0]).to.equal('ORDER-002');
        });
    });

    describe('Using Proxyquire for Module Testing', function() {
        it('should test module with mocked dependencies', function() {
            // This example shows how to use proxyquire to test actual cartridge modules
            // with mocked SFCC dependencies
            
            // Example module code (would be in separate file):
            // const moduleToTest = proxyquire('../../cartridges/.../someModule', {
            //     'dw/system/Logger': Logger,
            //     'dw/system/Site': Site,
            //     'dw/order/OrderMgr': OrderMgr
            // });
            
            // Setup mocks
            Site.__setCurrentSite({ testPref: 'testValue' });
            
            // Test the module
            // const result = moduleToTest.someFunction();
            
            // Assert results
            // expect(result).to.equal(expectedValue);
        });
    });
});

