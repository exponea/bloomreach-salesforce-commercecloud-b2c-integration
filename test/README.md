# Local Testing for SFCC Cartridge

Local testing infrastructure using mocks for SFCC `dw/*` modules.

## Quick Start

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## Stack

- **Mocha** + **Chai** - Testing framework
- **Sinon** - Mocking/stubbing
- **Istanbul** - Code coverage

## Structure

```
test/
├── mocks/dw/        # SFCC API mocks
│   └── system/Site.js
└── helpers/         # Test files
    └── *.test.js
```

## Writing Tests

```javascript
const { expect } = require('chai');
const SiteMock = require('../mocks/dw/system/Site');

describe('MyModule', function() {
    before(function() {
        global.dw = { system: { Site: SiteMock } };
    });
    
    beforeEach(function() {
        SiteMock.__setCurrentSite({ myPref: 'value' });
    });
    
    it('should work', function() {
        // Your test
        expect(true).to.be.true;
    });
});
```

## Adding Mocks

Create `test/mocks/dw/[path]/[Module].js`:

```javascript
let mockData = {};

module.exports = {
    getData: function(id) {
        return mockData[id] || null;
    },
    
    __setData: function(data) {
        mockData = data;
    },
    
    __reset: function() {
        mockData = {};
    }
};
```

Then add to `global.dw` in your test setup.

