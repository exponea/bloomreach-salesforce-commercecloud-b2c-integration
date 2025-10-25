# SFCC (Salesforce Commerce Cloud) Mock Objects

This directory contains mock implementations of Salesforce Commerce Cloud (SFCC) Digital Web (dw) APIs for testing purposes.

## Overview

These mocks allow you to test SFCC cartridge scripts in a Node.js environment without requiring a full SFCC instance. Each mock implements the essential methods and properties of the corresponding SFCC API.

## Structure

The mocks are organized to mirror the SFCC API structure:

```
test/mocks/
├── dw/
│   ├── campaign/          # Promotion and campaign management
│   ├── catalog/           # Product and catalog management
│   ├── customer/          # Customer management
│   ├── io/                # File I/O operations
│   ├── object/            # Custom object management
│   ├── order/             # Order management
│   ├── svc/               # Service framework
│   ├── system/            # System utilities and logging
│   ├── util/              # Utility classes (ArrayList, HashMap, etc.)
│   └── web/               # Web utilities (URLUtils, URL)
├── dw.js                  # Main entry point for global dw object
└── README.md              # This file
```

## Usage

### Basic Setup

In your test files, you can require the mocks in several ways:

**Option 1: Using the global dw object**
```javascript
// Set up the global dw object
global.dw = require('./test/mocks/dw');

// Now you can use dw APIs as in SFCC
const Logger = dw.system.Logger;
const Order = dw.order.Order;
```

**Option 2: Requiring individual modules**
```javascript
const Logger = require('./test/mocks/dw/system/Logger');
const Status = require('./test/mocks/dw/system/Status');
const OrderMgr = require('./test/mocks/dw/order/OrderMgr');
```

### Module Require Mapping

For testing code that uses `require('dw/...')` syntax, you'll need to set up module path mapping in your test framework. For Jest, add this to your `jest.config.js`:

```javascript
module.exports = {
    moduleNameMapper: {
        '^dw/system/(.*)$': '<rootDir>/test/mocks/dw/system/$1',
        '^dw/io/(.*)$': '<rootDir>/test/mocks/dw/io/$1',
        '^dw/order/(.*)$': '<rootDir>/test/mocks/dw/order/$1',
        '^dw/object/(.*)$': '<rootDir>/test/mocks/dw/object/$1',
        '^dw/util/(.*)$': '<rootDir>/test/mocks/dw/util/$1',
        '^dw/catalog/(.*)$': '<rootDir>/test/mocks/dw/catalog/$1',
        '^dw/customer/(.*)$': '<rootDir>/test/mocks/dw/customer/$1',
        '^dw/web/(.*)$': '<rootDir>/test/mocks/dw/web/$1',
        '^dw/svc/(.*)$': '<rootDir>/test/mocks/dw/svc/$1',
        '^dw/campaign/(.*)$': '<rootDir>/test/mocks/dw/campaign/$1'
    }
};
```

## Available Mocks

### System (`dw/system`)

- **Logger**: Logging functionality with debug, info, warn, error methods
- **Status**: Job status representation with OK/ERROR constants
- **Site**: Site configuration and preferences
- **Transaction**: Transaction management for wrapping operations
- **System**: System-level utilities (instance hostname, etc.)

### I/O (`dw/io`)

- **File**: File system operations
- **FileWriter**: Write data to files
- **FileReader**: Read data from files
- **CSVStreamWriter**: Write CSV data
- **CSVStreamReader**: Read CSV data

### Order (`dw/order`)

- **Order**: Order object representation with line items, totals, etc.
- **OrderMgr**: Order management and search operations

### Object (`dw/object`)

- **CustomObjectMgr**: Custom object CRUD operations

### Util (`dw/util`)

- **ArrayList**: Java-style ArrayList implementation
- **HashMap**: Java-style HashMap implementation
- **StringUtils**: String utility functions (base64 encoding, formatting, etc.)

### Catalog (`dw/catalog`)

- **ProductMgr**: Product management and search operations

### Customer (`dw/customer`)

- **CustomerMgr**: Customer management and search operations

### Web (`dw/web`)

- **URLUtils**: URL generation utilities
- **URL**: URL object representation

### Service (`dw/svc`)

- **LocalServiceRegistry**: Service registration and creation
- **Service**: HTTP service execution

### Campaign (`dw/campaign`)

- **Promotion**: Promotion object representation
- **PromotionMgr**: Promotion management operations

## Test Helpers

Most mocks include special test helper methods prefixed with `__` (double underscore). These methods are not part of the official SFCC API but are provided to help with testing:

### Common Test Helpers

```javascript
// Reset mock state (useful in beforeEach/afterEach)
Logger.__reset();
OrderMgr.__reset();
CustomObjectMgr.__reset();

// Set mock data
OrderMgr.__setOrders([mockOrder1, mockOrder2]);
ProductMgr.__setProducts([mockProduct1, mockProduct2]);
Site.__setCurrentSite({ brEngApiBaseUrl: 'https://api.example.com' });

// Add individual items
OrderMgr.__addOrder(mockOrder);
CustomObjectMgr.__setCustomObject('type', 'key', { field: 'value' });

// Get all data (for assertions)
const allOrders = OrderMgr.__getOrders();
const allLoggers = Logger.__getAllLoggers();
```

## Example Test

Here's a complete example of testing a job step:

```javascript
const OrderMgr = require('./test/mocks/dw/order/OrderMgr');
const Order = require('./test/mocks/dw/order/Order');
const Logger = require('./test/mocks/dw/system/Logger');
const Status = require('./test/mocks/dw/system/Status');

describe('Order Export Job', () => {
    let jobStep;

    beforeEach(() => {
        // Reset all mocks
        OrderMgr.__reset();
        Logger.__reset();
        
        // Create mock data
        const order = new Order('ORDER-001');
        order.customerEmail = 'test@example.com';
        order.totalGrossPrice = { value: 100.00 };
        OrderMgr.__addOrder(order);
        
        // Load the job step to test
        jobStep = require('../cartridges/.../jobStep');
    });

    afterEach(() => {
        OrderMgr.__reset();
        Logger.__reset();
    });

    it('should process orders successfully', () => {
        const args = {
            MaxNumberOfRows: 1000,
            TargetFolder: '/export',
            FileNamePrefix: 'orders'
        };

        const result = jobStep.beforeStep(args);
        
        expect(result).toBeInstanceOf(Status);
        expect(result.isOK()).toBe(true);
    });

    it('should log errors for invalid orders', () => {
        // Test error handling
        const logger = Logger.getLogger('test', 'test');
        
        // ... test code ...
        
        const logs = logger.getLogs();
        expect(logs.error.length).toBeGreaterThan(0);
    });
});
```

## Writing Tests with CSV Operations

```javascript
const FileWriter = require('./test/mocks/dw/io/FileWriter');
const CSVStreamWriter = require('./test/mocks/dw/io/CSVStreamWriter');
const File = require('./test/mocks/dw/io/File');

describe('CSV Export', () => {
    it('should write CSV data correctly', () => {
        const file = new File('/export/test.csv');
        const fw = new FileWriter(file);
        const csw = new CSVStreamWriter(fw);

        // Write headers
        csw.writeNext(['ID', 'Name', 'Email']);
        
        // Write data
        csw.writeNext(['1', 'John Doe', 'john@example.com']);
        csw.writeNext(['2', 'Jane Smith', 'jane@example.com']);

        csw.close();
        fw.close();

        // Verify written content
        const rows = csw.getRowsWritten();
        expect(rows.length).toBe(3);
        expect(rows[0]).toEqual(['ID', 'Name', 'Email']);
        
        // Verify file content
        const content = fw.getContent();
        expect(content).toContain('John Doe');
    });
});
```

## Limitations

These mocks provide basic functionality for testing but have some limitations:

1. **Simplified Query Logic**: Search and query methods return all items rather than filtering
2. **No Persistence**: Data is stored in memory and cleared when tests complete
3. **Limited Validation**: Minimal validation of inputs and state
4. **Synchronous Only**: No async operations (SFCC is synchronous anyway)
5. **No Transaction Rollback**: Transaction.wrap() simply executes the function

For complex scenarios, you may need to extend these mocks or add test-specific behavior using the test helper methods.

## Extending Mocks

To add functionality to a mock:

1. Add the method to the appropriate class/module
2. Follow the existing patterns for return types and behavior
3. Add test helpers (prefixed with `__`) if needed
4. Update this README with usage examples

## Best Practices

1. **Reset State**: Always reset mocks between tests using `__reset()` methods
2. **Use Test Helpers**: Leverage `__set*` methods to configure mock data
3. **Test Isolation**: Each test should set up its own data
4. **Mock Only What's Needed**: Don't over-mock; focus on the APIs your code uses
5. **Document Custom Behavior**: If you extend mocks, document the changes

## Contributing

When adding new mocks:

1. Follow the existing code structure and style
2. Include comprehensive JSDoc comments
3. Implement test helper methods (`__reset`, `__set*`, `__get*`)
4. Add usage examples to this README
5. Test the mock with actual cartridge code

## Support

For questions or issues with the mocks, please refer to:
- SFCC B2C Commerce API documentation
- Project-specific test examples
- This README file

