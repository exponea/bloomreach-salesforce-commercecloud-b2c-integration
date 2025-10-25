# SFCC Mocks Summary

This document provides a comprehensive overview of all the mock implementations created for testing the Bloomreach-Salesforce Commerce Cloud B2C integration cartridges.

## Created Files

### Core Mock Structure

```
test/mocks/
├── dw.js                          # Global dw object with all APIs
├── index.js                       # Main entry point with resetAll() helper
├── setup.js                       # Test setup file (Mocha/Jest compatible)
├── README.md                      # Comprehensive documentation
├── MOCKS_SUMMARY.md              # This file
│
├── dw/
│   ├── campaign/
│   │   ├── Promotion.js          # Promotion object with constants
│   │   └── PromotionMgr.js       # Promotion management operations
│   │
│   ├── catalog/
│   │   └── ProductMgr.js         # Product search and management
│   │
│   ├── customer/
│   │   └── CustomerMgr.js        # Customer profile operations
│   │
│   ├── io/
│   │   ├── File.js               # File system operations
│   │   ├── FileWriter.js         # File writing
│   │   ├── FileReader.js         # File reading
│   │   ├── CSVStreamWriter.js    # CSV writing with proper escaping
│   │   └── CSVStreamReader.js    # CSV reading and parsing
│   │
│   ├── object/
│   │   └── CustomObjectMgr.js    # Custom object CRUD operations
│   │
│   ├── order/
│   │   ├── Order.js              # Order object with status constants
│   │   └── OrderMgr.js           # Order search and management
│   │
│   ├── svc/
│   │   ├── Service.js            # HTTP service execution
│   │   └── LocalServiceRegistry.js  # Service registration
│   │
│   ├── system/
│   │   ├── Logger.js             # Logging with parameter substitution
│   │   ├── Status.js             # Job status (OK/ERROR)
│   │   ├── Site.js               # Site preferences (updated)
│   │   ├── System.js             # System utilities
│   │   └── Transaction.js        # Transaction management
│   │
│   ├── util/
│   │   ├── ArrayList.js          # Java-style ArrayList
│   │   ├── HashMap.js            # Java-style HashMap
│   │   └── StringUtils.js        # String utilities (base64, format, etc.)
│   │
│   └── web/
│       ├── URL.js                # URL object
│       └── URLUtils.js           # URL generation utilities
│
├── examples/
│   └── mockUsageExample.test.js  # Comprehensive usage examples
│
└── .mocharc.json                  # Mocha configuration
```

## Mock Coverage by Cartridge Module

### Job Steps
All job step scripts in `cartridges/int_bloomreach_engagement/cartridge/scripts/jobSteps/` are covered:
- ✅ customerInfoFeed.js
- ✅ generatePurchaseCSV.js
- ✅ generatePurchaseProductCSV.js
- ✅ masterProductFeed.js
- ✅ masterProductInventoryFeed.js
- ✅ variationProductFeed.js
- ✅ variationProductInventoryFeed.js

### Helpers
All helper scripts are covered:
- ✅ BloomreachEngagementCustomerInfoFeedHelpers.js
- ✅ BloomreachEngagementGenerateCSVHelper.js
- ✅ BloomreachEngagementHelper.js
- ✅ BloomreachEngagementProductFeedHelpers.js
- ✅ BloomreachEngagementProductInventoryFeedHelpers.js

### Services
- ✅ BloomreachEngagementAPIService.js

### Utilities
- ✅ customerInfoFeedConstants.js
- ✅ fileUtils.js
- ✅ orderInfoFeedConstants.js
- ✅ productFeedConstants.js

## Features

### 1. Complete SFCC API Coverage
All SFCC (dw.*) APIs used in the cartridge are mocked:
- System APIs (Logger, Status, Site, Transaction, System)
- I/O APIs (File, FileWriter, FileReader, CSV readers/writers)
- Order APIs (Order, OrderMgr)
- Object APIs (CustomObjectMgr)
- Utility APIs (ArrayList, HashMap, StringUtils)
- Catalog APIs (ProductMgr)
- Customer APIs (CustomerMgr)
- Web APIs (URL, URLUtils)
- Service APIs (Service, LocalServiceRegistry)
- Campaign APIs (Promotion, PromotionMgr)

### 2. Test Helper Methods
Every mock includes test helper methods (prefixed with `__`):
- `__reset()` - Reset mock state
- `__set*()` - Configure mock data
- `__get*()` - Retrieve all mock data for assertions
- `__add*()` - Add individual items

### 3. SFCC-Compatible Behavior
Mocks implement SFCC-specific patterns:
- Iterator pattern for collections
- Java-style ArrayList and HashMap
- Status objects with OK/ERROR constants
- Order status constants
- Transaction.wrap() for atomic operations
- Logger with parameter substitution using {0}, {1}, etc.
- CSV escaping and formatting

### 4. Test Framework Support
- **Mocha** (primary, configured)
- **Jest** (compatible with setup adjustments)
- Works with **Chai** for assertions
- Works with **Sinon** for spies/stubs
- Works with **Proxyquire** for dependency injection

### 5. Documentation
- Comprehensive README.md with usage examples
- JSDoc comments on all classes and methods
- Example test file with real-world scenarios
- This summary document

## Usage Quick Start

### 1. Install Dependencies (if not already done)
```bash
npm install mocha chai sinon proxyquire --save-dev
```

### 2. Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### 3. Write a Test
```javascript
const { expect } = require('chai');
const Logger = require('./test/mocks/dw/system/Logger');
const OrderMgr = require('./test/mocks/dw/order/OrderMgr');
const Order = require('./test/mocks/dw/order/Order');

describe('My Job Step', function() {
    beforeEach(function() {
        Logger.__reset();
        OrderMgr.__reset();
    });

    it('should process orders', function() {
        // Setup
        const order = new Order('ORDER-001');
        OrderMgr.__addOrder(order);
        
        // Test
        const result = OrderMgr.getOrder('ORDER-001');
        
        // Assert
        expect(result).to.not.be.null;
        expect(result.orderNo).to.equal('ORDER-001');
    });
});
```

## Test Helper Reference

### Reset All Mocks
```javascript
const mocks = require('./test/mocks');
beforeEach(function() {
    mocks.resetAll();
});
```

### Setup Site Preferences
```javascript
const Site = require('./test/mocks/dw/system/Site');
Site.__setCurrentSite({
    brEngApiBaseUrl: 'https://api.example.com',
    brEngProjectToken: 'test-token',
    brEngApiKeyId: 'key-id',
    brEngApiKeySecret: 'secret'
});
```

### Setup Orders
```javascript
const Order = require('./test/mocks/dw/order/Order');
const OrderMgr = require('./test/mocks/dw/order/OrderMgr');

const order = new Order('ORDER-001');
order.customerEmail = 'test@example.com';
order.status = Order.ORDER_STATUS_NEW;
OrderMgr.__addOrder(order);
```

### Setup Custom Objects
```javascript
const CustomObjectMgr = require('./test/mocks/dw/object/CustomObjectMgr');

CustomObjectMgr.__setCustomObject(
    'BloomreachEngagementJobLastExecution',
    'lastPurchaseExport',
    { lastExecution: new Date() }
);
```

### Verify Logger Output
```javascript
const Logger = require('./test/mocks/dw/system/Logger');

const logger = Logger.getLogger('test', 'test');
logger.info('Test message {0}', 'value');

const logs = logger.getLogs();
expect(logs.info[0]).to.equal('Test message value');
```

### Test CSV Operations
```javascript
const File = require('./test/mocks/dw/io/File');
const FileWriter = require('./test/mocks/dw/io/FileWriter');
const CSVStreamWriter = require('./test/mocks/dw/io/CSVStreamWriter');

const file = new File('/export/test.csv');
const fw = new FileWriter(file);
const csw = new CSVStreamWriter(fw);

csw.writeNext(['Header1', 'Header2']);
csw.writeNext(['Value1', 'Value2']);

csw.close();
fw.close();

const rows = csw.getRowsWritten();
expect(rows).to.have.lengthOf(2);
```

## Next Steps

### 1. Write Tests for Job Steps
Create test files for each job step:
- `test/jobSteps/generatePurchaseCSV.test.js`
- `test/jobSteps/customerInfoFeed.test.js`
- etc.

### 2. Write Tests for Helpers
Create test files for helper modules:
- `test/helpers/BloomreachEngagementGenerateCSVHelper.test.js`
- `test/helpers/BloomreachEngagementCustomerInfoFeedHelpers.test.js`
- etc.

### 3. Write Integration Tests
Create end-to-end tests that test multiple modules working together.

### 4. Setup CI/CD
Integrate tests into your CI/CD pipeline:
```yaml
# Example for GitHub Actions
- name: Run tests
  run: npm test
  
- name: Generate coverage report
  run: npm run test:coverage
```

## Maintenance

### Adding New Mocks
If you need additional SFCC APIs:
1. Create the mock file in appropriate `dw/*` directory
2. Follow existing patterns (class structure, test helpers)
3. Add JSDoc comments
4. Export from `dw.js` and `index.js`
5. Update this summary

### Extending Existing Mocks
To add methods to existing mocks:
1. Add the method following SFCC API signature
2. Add test helper if needed for test setup
3. Update JSDoc comments
4. Add usage example to README.md

## Support and Documentation

- **SFCC API Docs**: https://salesforcecommercecloud.github.io/b2c-dev-doc/
- **Mock README**: `test/mocks/README.md`
- **Usage Examples**: `test/examples/mockUsageExample.test.js`
- **Existing Tests**: `test/helpers/BloomreachEngagementCustomerInfoFeedHelpers.test.js`

## Version Information

- **Created**: 2025-10-25
- **SFCC API Version**: Commerce Cloud B2C
- **Node.js**: Compatible with project Node.js version
- **Test Framework**: Mocha 5.2.0, Chai 3.5.0, Sinon 1.17.4

## Summary Statistics

- **Total Mock Files**: 24 JavaScript files
- **API Modules Covered**: 10 SFCC modules (system, io, order, object, util, catalog, customer, web, svc, campaign)
- **Mock Classes**: 20+ classes
- **Test Helpers**: 30+ helper methods
- **Documentation**: 4 documentation files
- **Example Tests**: 1 comprehensive example file

All mocks are ready to use for testing the Bloomreach-Salesforce Commerce Cloud integration cartridges!

