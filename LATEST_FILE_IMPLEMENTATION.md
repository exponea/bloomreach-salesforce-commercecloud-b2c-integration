# CSV LATEST File Implementation

## Overview
This implementation adds functionality to create a static "LATEST" file that combines all timestamped CSV split files for product feed jobs. This enables Bloomreach features that require a known, static URL to access the complete product feed data.

## Problem Statement
- CSV files are generated with dynamic timestamps (e.g., `products-FULL-1234567890.csv`)
- When row limits are reached, files split into multiple timestamped files
- Current implementation works well with Bloomreach API (accepts dynamic file paths as parameters)
- **New requirement**: Some Bloomreach features need product data but can only read from a known/static URL

## Solution
Generate a static `LATEST` file (e.g., `products-FULL-LATEST.csv`) that combines all timestamped splits:
1. First, generate timestamped split files as usual
2. After all products are processed, merge all splits into one LATEST file
3. When merging, skip header rows from all files except the first one

## Implementation Details

### Files Modified

#### 1. `/cartridges/int_bloomreach_engagement/cartridge/scripts/util/fileUtils.js`
**New Functions:**
- `createLatestFileName(fileNamePrefix, fileExtension)` - Creates a static LATEST filename
- `mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, Logger)` - Merges multiple CSV files into one LATEST file

**Key Features:**
- Reads all timestamped CSV files sequentially
- Writes header from first file only
- Skips header rows from subsequent files
- Handles missing files gracefully (logs warning, continues processing)
- Returns full path to created LATEST file
- Comprehensive error handling

#### 2. Product Feed Job Files (4 files modified)

**Modified Files:**
- `masterProductFeed.js` - Master products
- `variationProductFeed.js` - Variation products
- `masterProductInventoryFeed.js` - Master product inventory
- `variationProductInventoryFeed.js` - Variation product inventory

**Changes Made:**
1. Added `generatedFilePaths` array to track all generated CSV files
2. Modified `beforeStep()` - Initialize tracking array, track first file
3. Modified `splitFile()` - Track each new split file
4. Modified `afterStep()` - Merge all tracked files into LATEST file

**Example Flow:**
```javascript
// beforeStep: Initialize and track first file
generatedFilePaths = [];
generatedFilePaths.push(csvFile.fullPath); // Track first file

// splitFile: Track additional split files
generatedFilePaths.push(csvFile.fullPath); // Track new split

// afterStep: Merge all files
FileUtils.mergeCSVFilesIntoLatest(generatedFilePaths, targetFolder, fileNamePrefix, Logger);
```

### 3. Test File (New)
**File:** `/test/util/fileUtils.test.js`

**Test Coverage:**
1. **createFileName()** - Tests timestamp-based filename generation
2. **createLatestFileName()** - Tests static LATEST filename generation
3. **mergeCSVFilesIntoLatest()** - Comprehensive merge tests:
   - Merge multiple CSV files correctly
   - Skip headers from all files except first
   - Handle empty file list gracefully
   - Handle null file list gracefully
   - Warn when CSV file doesn't exist
   - Handle single file merge correctly

**Test Framework:**
- Mocha test runner
- Chai assertions
- Sinon for stubbing
- Comprehensive mocks for SFCC dw/io operations

## Example Usage Scenario

### Before (Timestamped files only):
```
products-FULL-1730000001.csv (5,000 rows + header)
products-FULL-1730000002.csv (5,000 rows + header)
products-FULL-1730000003.csv (3,000 rows + header)
```

### After (Timestamped + LATEST):
```
products-FULL-1730000001.csv (5,000 rows + header)
products-FULL-1730000002.csv (5,000 rows + header)
products-FULL-1730000003.csv (3,000 rows + header)
products-FULL-LATEST.csv     (13,000 rows + 1 header) ← NEW!
```

The LATEST file contains:
- Header row (from first file)
- All data rows from file 1 (5,000 rows)
- All data rows from file 2 (5,000 rows, header skipped)
- All data rows from file 3 (3,000 rows, header skipped)
- **Total: 13,001 rows (1 header + 13,000 data rows)**

## Benefits

1. **Static URL Access**: Bloomreach features can access data via a predictable URL
2. **Backward Compatible**: Existing timestamped files and API calls remain unchanged
3. **Error Resilient**: LATEST file creation failures don't break the job
4. **Comprehensive Logging**: All merge operations are logged for debugging
5. **Memory Efficient**: Files are processed sequentially, not loaded entirely into memory
6. **Product Feeds Only**: Only applies to the 4 product feed jobs as requested

## Configuration
No configuration changes required. The implementation automatically:
- Uses the same `fileNamePrefix` as the timestamped files
- Creates LATEST file in the same folder as timestamped files
- Uses the same CSV format and headers

## Error Handling
- Missing files: Logged as warning, merge continues with available files
- Empty file list: Returns null, logs warning
- Merge failure: Logged as error, job continues successfully (doesn't fail)
- Invalid file paths: Caught and logged

## Testing
Run tests with:
```bash
npm test -- test/util/fileUtils.test.js
```

Or run all tests:
```bash
npm test
```

## Accessing the LATEST File

The LATEST file can be accessed via WebDAV at:
```
https://<instance-hostname>/on/demandware.servlet/webdav/Sites/IMPEX/<target-folder>/<prefix>-LATEST.csv
```

Example:
```
https://dev01-realm-customer.demandware.net/on/demandware.servlet/webdav/Sites/IMPEX/src/feeds/products-FULL-LATEST.csv
```

## Notes

1. **Customer and Purchase Jobs**: Not modified as per requirements
2. **Performance**: Merging happens after job completion, doesn't impact product processing speed
3. **File Size**: LATEST file size equals sum of all split file sizes (minus duplicate headers)
4. **Cleanup**: Old LATEST files are overwritten on each job run

## Future Enhancements (Not Implemented)

Potential future improvements:
1. Configurable LATEST file location
2. Compression support for large LATEST files
3. Incremental LATEST file updates (append-only mode)
4. Automatic cleanup of old timestamped files
5. LATEST file versioning/history

