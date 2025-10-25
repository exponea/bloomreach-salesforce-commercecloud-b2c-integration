/**
 * Unit tests for customerInfoFeed job step
 * Tests the customer export functionality with comprehensive coverage
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Import standardized mocks
const Logger = require('../mocks/dw/system/Logger');
const Status = require('../mocks/dw/system/Status');
const Site = require('../mocks/dw/system/Site');
const File = require('../mocks/dw/io/File');
const FileWriter = require('../mocks/dw/io/FileWriter');
const CSVStreamWriter = require('../mocks/dw/io/CSVStreamWriter');
const CustomerMgr = require('../mocks/dw/customer/CustomerMgr');
const Transaction = require('../mocks/dw/system/Transaction');
const System = require('../mocks/dw/system/System');
const CustomObjectMgr = require('../mocks/dw/object/CustomObjectMgr');
const ArrayList = require('../mocks/dw/util/ArrayList');

describe('customerInfoFeed Job Step', function() {
    let customerInfoFeed;
    let mockLogger;
    let mockHelpers;
    let mockBREngagementAPIHelper;
    let mockFileUtils;
    let mockConstants;
    let lastCSVWriter = null;

    before(function() {
        // Create mock logger
        mockLogger = Logger.getLogger('BloomreachEngagementCustomerInfoFeedExport', 'test');

        // Mock BloomreachEngagementCustomerInfoFeedHelpers
        mockHelpers = {
            generateCSVHeader: sinon.stub().returns({
                csvHeaderArray: ['customer_id', 'email', 'first_name', 'last_name'],
                SFCCAttributesValue: [
                    { SFCCProductAttribute: 'customerNo', isCustom: 'false' },
                    { SFCCProductAttribute: 'email', isCustom: 'false' },
                    { SFCCProductAttribute: 'firstName', isCustom: 'false' },
                    { SFCCProductAttribute: 'lastName', isCustom: 'false' }
                ]
            }),
            getTimeStamp: function(date) {
                if (!date) return '';
                return Math.floor(new Date(date).getTime() / 1000).toString();
            }
        };

        // Mock BREngagementAPIHelper
        mockBREngagementAPIHelper = {
            bloomReachEngagementAPIService: sinon.stub().returns({ success: true })
        };

        // Mock FileUtils
        mockFileUtils = {
            createFileName: function(prefix, ext) {
                return `${prefix}_${Date.now()}.${ext}`;
            },
            createLatestFileName: sinon.stub().returns('customers-LATEST.csv'),
            mergeCSVFilesIntoLatest: sinon.stub().returns('/path/to/latest.csv')
        };

        // Mock constants
        mockConstants = {
            FILE_EXTENSTION: {
                CSV: 'csv'
            }
        };

        // Extend CSVStreamWriter to track last instance
        const OriginalCSVStreamWriter = CSVStreamWriter;
        const ExtendedCSVStreamWriter = class extends CSVStreamWriter {
            constructor(fileWriter) {
                super(fileWriter);
                lastCSVWriter = this;
            }
        };

        // Setup global dw object
        global.dw = {
            system: {
                Site: Site,
                System: System,
                Logger: Logger
            }
        };

        // Load the module with mocked dependencies
        customerInfoFeed = proxyquire.noCallThru()('../../cartridges/int_bloomreach_engagement/cartridge/scripts/jobSteps/customerInfoFeed', {
            'dw/system/Logger': Logger,
            'dw/system/Status': Status,
            'dw/io/File': File,
            'dw/io/FileWriter': FileWriter,
            'dw/io/CSVStreamWriter': ExtendedCSVStreamWriter,
            'dw/customer/CustomerMgr': CustomerMgr,
            'dw/system/Transaction': Transaction,
            'dw/object/CustomObjectMgr': CustomObjectMgr,
            'dw/util/ArrayList': ArrayList,
            'dw/io/CSVStreamReader': require('../mocks/dw/io/CSVStreamReader'),
            'dw/io/FileReader': require('../mocks/dw/io/FileReader'),
            '~/cartridge/scripts/helpers/BloomreachEngagementCustomerInfoFeedHelpers.js': mockHelpers,
            '~/cartridge/scripts/helpers/BloomreachEngagementHelper.js': mockBREngagementAPIHelper,
            '~/cartridge/scripts/helpers/BloomreachEngagementFileDownloadHelper.js': {
                generateDownloadUrl: sinon.stub().returns('https://test.com/download?path=test.csv'),
                validateDownloadCredentialsConfigured: sinon.stub().returns(true),
                getDownloadUrlInfo: sinon.stub().returns({})
            },
            '~/cartridge/scripts/util/customerInfoFeedConstants': mockConstants,
            '~/cartridge/scripts/util/fileUtils': mockFileUtils
        });
    });

    beforeEach(function() {
        // Reset all mocks
        mockLogger.clearLogs();
        CustomerMgr.__reset();
        CustomObjectMgr.__reset();
        Site.__reset();
        System.__reset();
        lastCSVWriter = null;

        // Reset stubs and restore default behavior
        mockHelpers.generateCSVHeader.reset();
        mockHelpers.generateCSVHeader.returns({
            csvHeaderArray: ['customer_id', 'email', 'first_name', 'last_name'],
            SFCCAttributesValue: [
                { SFCCProductAttribute: 'customerNo', isCustom: 'false' },
                { SFCCProductAttribute: 'email', isCustom: 'false' },
                { SFCCProductAttribute: 'firstName', isCustom: 'false' },
                { SFCCProductAttribute: 'lastName', isCustom: 'false' }
            ]
        });
        mockBREngagementAPIHelper.bloomReachEngagementAPIService.reset();

        // Setup default site preferences
        Site.__setCurrentSite({
            brEngCustomerFeedImportId: 'test-import-id'
        });

        // Setup default system hostname
        System.__setInstanceHostname('test-instance.demandware.net');
    });

    describe('beforeStep()', function() {
        
        it('should initialize CSV file and headers successfully', function() {
            // Test: Verify that beforeStep correctly initializes the export with proper headers
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                Query: '',
                GeneratePreInitFile: false
            };

            // Create mock customers
            const mockCustomer1 = {
                customerNo: 'CUST-001',
                email: 'customer1@example.com',
                firstName: 'John',
                lastName: 'Doe'
            };
            const mockCustomer2 = {
                customerNo: 'CUST-002',
                email: 'customer2@example.com',
                firstName: 'Jane',
                lastName: 'Smith'
            };

            // Setup CustomerMgr to return mock customers
            CustomerMgr.__setCustomers([mockCustomer1, mockCustomer2]);

            // Execute
            customerInfoFeed.beforeStep(args);

            // Verify: File creation was attempted (createFileName is called internally)

            // Verify: CSV headers were generated
            expect(mockHelpers.generateCSVHeader.called).to.be.true;

            // Verify: CSV writer wrote headers
            expect(lastCSVWriter).to.not.be.null;
            const rows = lastCSVWriter.getRowsWritten();
            expect(rows).to.have.lengthOf(1);
            expect(rows[0]).to.deep.equal(['customer_id', 'email', 'first_name', 'last_name']);
        });

        it('should throw error when mandatory parameters are missing', function() {
            // Test: Verify that missing TargetFolder throws an error
            
            const args = {
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000
                // TargetFolder is missing
            };

            // Execute and verify error
            expect(() => {
                customerInfoFeed.beforeStep(args);
            }).to.throw('One or more mandatory parameters are missing.');
        });

        it('should handle GeneratePreInitFile flag correctly', function() {
            // Test: Verify that when GeneratePreInitFile is true, only first customer is processed
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-PREINIT',
                MaxNumberOfRows: 10000,
                Query: '',
                GeneratePreInitFile: true
            };

            // Create multiple mock customers
            const customers = [];
            for (let i = 1; i <= 5; i++) {
                customers.push({
                    customerNo: `CUST-00${i}`,
                    email: `customer${i}@example.com`,
                    firstName: `First${i}`,
                    lastName: `Last${i}`
                });
            }
            CustomerMgr.__setCustomers(customers);

            // Execute
            customerInfoFeed.beforeStep(args);

            // Verify: getTotalCount should return 1
            const totalCount = customerInfoFeed.getTotalCount();
            expect(totalCount).to.equal(1);

            // Verify: Only one customer should be available to read
            const customer = customerInfoFeed.read();
            expect(customer).to.not.be.undefined;
            expect(customer.customerNo).to.equal('CUST-001');

            // Next read should return undefined
            const nextCustomer = customerInfoFeed.read();
            expect(nextCustomer).to.be.undefined;
        });

        it('should use provided Query parameter', function() {
            // Test: Verify that custom query is used when provided
            
            const customQuery = 'email LIKE "*@example.com"';
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FILTERED',
                MaxNumberOfRows: 10000,
                Query: customQuery,
                GeneratePreInitFile: false
            };

            // Execute
            customerInfoFeed.beforeStep(args);

            // Verify: The query would be used in CustomerMgr.searchProfiles
            // (In actual implementation, this would filter customers)
            expect(() => customerInfoFeed.beforeStep(args)).to.not.throw();
        });
    });

    describe('getTotalCount()', function() {
        
        it('should return 1 when GeneratePreInitFile is true', function() {
            // Test: Verify that pre-init mode returns count of 1
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-PREINIT',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: true
            };

            const customers = [
                { customerNo: 'CUST-001', email: 'test1@example.com' },
                { customerNo: 'CUST-002', email: 'test2@example.com' }
            ];
            CustomerMgr.__setCustomers(customers);

            customerInfoFeed.beforeStep(args);
            const count = customerInfoFeed.getTotalCount();

            expect(count).to.equal(1);
        });

        it('should return actual customer count in normal mode', function() {
            // Test: Verify that normal mode returns the actual count of customers
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customers = [];
            for (let i = 1; i <= 10; i++) {
                customers.push({
                    customerNo: `CUST-${String(i).padStart(3, '0')}`,
                    email: `customer${i}@example.com`
                });
            }
            CustomerMgr.__setCustomers(customers);

            customerInfoFeed.beforeStep(args);
            const count = customerInfoFeed.getTotalCount();

            expect(count).to.equal(10);
        });
    });

    describe('read()', function() {
        
        it('should return customers one by one', function() {
            // Test: Verify that read() returns customers sequentially
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customers = [
                { customerNo: 'CUST-001', email: 'cust1@example.com' },
                { customerNo: 'CUST-002', email: 'cust2@example.com' },
                { customerNo: 'CUST-003', email: 'cust3@example.com' }
            ];
            CustomerMgr.__setCustomers(customers);

            customerInfoFeed.beforeStep(args);

            // Read first customer
            const customer1 = customerInfoFeed.read();
            expect(customer1).to.not.be.undefined;
            expect(customer1.customerNo).to.equal('CUST-001');

            // Read second customer
            const customer2 = customerInfoFeed.read();
            expect(customer2).to.not.be.undefined;
            expect(customer2.customerNo).to.equal('CUST-002');

            // Read third customer
            const customer3 = customerInfoFeed.read();
            expect(customer3).to.not.be.undefined;
            expect(customer3.customerNo).to.equal('CUST-003');

            // No more customers
            const customer4 = customerInfoFeed.read();
            expect(customer4).to.be.undefined;
        });
    });

    describe('process()', function() {
        
        it('should process customer and return CSV array', function() {
            // Test: Verify that process() correctly transforms customer into CSV array
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe'
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process the customer
            const result = customerInfoFeed.process(customer);

            // Verify: Result is an array
            expect(result).to.be.an('array');
            expect(result).to.have.lengthOf(4);
            expect(result[0]).to.equal('CUST-001');
            expect(result[1]).to.equal('john.doe@example.com');
            expect(result[2]).to.equal('John');
            expect(result[3]).to.equal('Doe');
        });

        it('should handle customer with address information', function() {
            // Test: Verify that customer address fields are properly extracted
            
            mockHelpers.generateCSVHeader.returns({
                csvHeaderArray: ['customer_id', 'city', 'stateCode', 'countryCode'],
                SFCCAttributesValue: [
                    { SFCCProductAttribute: 'customerNo', isCustom: 'false' },
                    { SFCCProductAttribute: 'city', isCustom: 'false' },
                    { SFCCProductAttribute: 'stateCode', isCustom: 'false' },
                    { SFCCProductAttribute: 'countryCode', isCustom: 'false' }
                ]
            });

            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'john.doe@example.com',
                addressBook: {
                    preferredAddress: {
                        city: 'San Francisco',
                        stateCode: 'CA',
                        countryCode: {
                            value: 'US',
                            displayValue: 'United States'
                        }
                    }
                }
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process the customer
            const result = customerInfoFeed.process(customer);

            // Verify: Address fields are included
            expect(result).to.be.an('array');
            expect(result[1]).to.equal('San Francisco');
            expect(result[2]).to.equal('CA');
            expect(result[3]).to.equal('United States');
        });

        it('should handle customer with custom attributes', function() {
            // Test: Verify that custom attributes are properly extracted
            
            mockHelpers.generateCSVHeader.returns({
                csvHeaderArray: ['customer_id', 'loyalty_level'],
                SFCCAttributesValue: [
                    { SFCCProductAttribute: 'customerNo', isCustom: 'false' },
                    { SFCCProductAttribute: 'loyaltyLevel', isCustom: 'true' }
                ]
            });

            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'john.doe@example.com',
                custom: {
                    loyaltyLevel: 'Gold'
                }
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process the customer
            const result = customerInfoFeed.process(customer);

            // Verify: Custom attribute is included
            expect(result).to.be.an('array');
            expect(result[1]).to.equal('Gold');
        });

        it('should handle date fields with timestamp conversion', function() {
            // Test: Verify that date fields are converted to timestamps
            
            mockHelpers.generateCSVHeader.returns({
                csvHeaderArray: ['customer_id', 'creation_date'],
                SFCCAttributesValue: [
                    { SFCCProductAttribute: 'customerNo', isCustom: 'false' },
                    { SFCCProductAttribute: 'creationDate', isCustom: 'false' }
                ]
            });

            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const testDate = new Date('2024-01-01T00:00:00Z');
            const customer = {
                customerNo: 'CUST-001',
                creationDate: testDate
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process the customer
            const result = customerInfoFeed.process(customer);

            // Verify: Date was converted to timestamp
            expect(result).to.be.an('array');
            // Result should contain the timestamp (second element in this test setup)
            expect(result[1]).to.be.a('string');
        });
    });

    describe('write()', function() {
        
        it('should write customer data to CSV', function() {
            // Test: Verify that write() correctly writes data to the CSV file
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe'
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process and create lines (wrap in ArrayList since code expects it)
            const processedData = customerInfoFeed.process(customer);
            // processedData is an array, convert it to ArrayList
            const wrappedData = new ArrayList(processedData);
            const lines = new ArrayList();
            lines.push(wrappedData);

            // Write to CSV
            customerInfoFeed.write(lines);

            // Verify: Data was written
            const rows = lastCSVWriter.getRowsWritten();
            expect(rows).to.have.lengthOf(2); // Header + 1 data row
            // rows[1] is the customer data array
            const customerRow = rows[1];
            expect(customerRow[0]).to.equal('CUST-001');
            expect(customerRow[1]).to.equal('john.doe@example.com');
            expect(customerRow[2]).to.equal('John');
            expect(customerRow[3]).to.equal('Doe');
        });
    });

    describe('afterChunk()', function() {
        
        it('should log chunk completion', function() {
            // Test: Verify that afterChunk logs the chunk number
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            CustomerMgr.__setCustomers([{ customerNo: 'CUST-001' }]);
            customerInfoFeed.beforeStep(args);

            // Execute afterChunk multiple times
            customerInfoFeed.afterChunk();
            customerInfoFeed.afterChunk();
            customerInfoFeed.afterChunk();

            // Verify: No errors occurred
            // (afterChunk logs internally but we can't easily access those logs in this setup)
            expect(() => {
                customerInfoFeed.afterChunk();
            }).to.not.throw();
        });
    });

    describe('afterStep()', function() {
        
        it('should return OK status when all customers processed successfully', function() {
            // Test: Verify that successful processing returns OK status
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: false
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User'
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process customer (wrap in ArrayList since code expects it)
            const processedData = customerInfoFeed.process(customer);
            // processedData is an array, convert it to ArrayList
            const wrappedData = new ArrayList(processedData);
            const lines = new ArrayList();
            lines.push(wrappedData);
            customerInfoFeed.write(lines);

            // Execute afterStep
            const result = customerInfoFeed.afterStep();

            // Verify: Returns OK status
            expect(result).to.be.instanceOf(Status);
            expect(result.isOK()).to.be.true;
            expect(result.getMessage()).to.equal('Export Customer Feed Successful');

            // Verify: API was called to trigger import
            expect(mockBREngagementAPIHelper.bloomReachEngagementAPIService.called).to.be.true;
        });

        it('should create custom object for tracking last export when Query provided', function() {
            // Test: Verify that last export timestamp is saved for delta exports
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-DELTA',
                MaxNumberOfRows: 10000,
                Query: 'lastModified > {0}',
                GeneratePreInitFile: false
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'test@example.com'
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process customer (wrap in ArrayList since code expects it)
            const processedData = customerInfoFeed.process(customer);
            // processedData is an array, convert it to ArrayList
            const wrappedData = new ArrayList(processedData);
            const lines = new ArrayList();
            lines.push(wrappedData);
            customerInfoFeed.write(lines);

            // Execute afterStep
            const result = customerInfoFeed.afterStep();

            // Verify: Custom object was created or updated
            const customObject = CustomObjectMgr.getCustomObject(
                'BloomreachEngagementJobLastExecution',
                'lastCustomerExport'
            );
            expect(customObject).to.not.be.null;
            expect(customObject.custom.lastExecution).to.be.instanceOf(Date);
        });

        it('should handle GeneratePreInitFile mode correctly', function() {
            // Test: Verify that pre-init file mode doesn't close iterator
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-PREINIT',
                MaxNumberOfRows: 10000,
                GeneratePreInitFile: true
            };

            const customer = {
                customerNo: 'CUST-001',
                email: 'test@example.com'
            };
            CustomerMgr.__setCustomers([customer]);

            customerInfoFeed.beforeStep(args);

            // Process customer (wrap in ArrayList since code expects it)
            const processedData = customerInfoFeed.process(customer);
            // processedData is an array, convert it to ArrayList
            const wrappedData = new ArrayList(processedData);
            const lines = new ArrayList();
            lines.push(wrappedData);
            customerInfoFeed.write(lines);

            // Execute afterStep
            const result = customerInfoFeed.afterStep();

            // Verify: Should complete successfully
            expect(result).to.be.instanceOf(Status);
            expect(result.isOK()).to.be.true;
        });
    });

    describe('Integration: Full Export Flow', function() {
        
        it('should execute complete export flow successfully', function() {
            // Test: Verify the entire export process from start to finish
            
            const args = {
                TargetFolder: 'customer-feed',
                FileNamePrefix: 'customers-FULL',
                MaxNumberOfRows: 10000,
                Query: '',
                GeneratePreInitFile: false
            };

            // Create test customers
            const customers = [
                {
                    customerNo: 'CUST-001',
                    email: 'john.doe@example.com',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                {
                    customerNo: 'CUST-002',
                    email: 'jane.smith@example.com',
                    firstName: 'Jane',
                    lastName: 'Smith'
                }
            ];
            CustomerMgr.__setCustomers(customers);

            // 1. Initialize
            customerInfoFeed.beforeStep(args);
            const totalCount = customerInfoFeed.getTotalCount();
            expect(totalCount).to.equal(2);

            // 2. Process customers
            const processedCustomers = [];
            let customer;
            while ((customer = customerInfoFeed.read()) !== undefined) {
                const processedData = customerInfoFeed.process(customer);
                processedCustomers.push(processedData);
            }
            expect(processedCustomers).to.have.lengthOf(2);

            // 3. Write to CSV (wrap each customer in ArrayList since code expects it)
            const lines = new ArrayList();
            processedCustomers.forEach(customerData => {
                // customerData is an array, convert it to ArrayList
                const wrappedData = new ArrayList(customerData);
                lines.push(wrappedData);
            });
            customerInfoFeed.write(lines);

            // 4. Complete
            const result = customerInfoFeed.afterStep();

            // Verify: Complete flow executed successfully
            expect(result.isOK()).to.be.true;

            // Verify: CSV contains header + 2 customer rows
            const rows = lastCSVWriter.getRowsWritten();
            expect(rows).to.have.lengthOf(3); // Header + 2 customers
            expect(rows[0]).to.deep.equal(['customer_id', 'email', 'first_name', 'last_name']);
            // Check first customer row
            expect(rows[1][0]).to.equal('CUST-001');
            expect(rows[1][1]).to.equal('john.doe@example.com');
            // Check second customer row
            expect(rows[2][0]).to.equal('CUST-002');
            expect(rows[2][1]).to.equal('jane.smith@example.com');

            // Verify: API was called to trigger import
            expect(mockBREngagementAPIHelper.bloomReachEngagementAPIService.called).to.be.true;
        });
    });
});

