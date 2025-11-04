# Implementation Summary: Items Collection Feed

## Overview

This document summarizes the implementation of the **Items Collection Feed** for Bloomreach Engagement, which exports product data in the same structured JSON format used by the Discovery cartridge.

## Files Created

### 1. Job Step Implementation
**File**: `cartridge/scripts/jobSteps/itemsCollectionFeed.js`
- Main job step file with beforeStep, read, process, write, afterStep functions
- Implements snapshot-based incremental exports (add/update/remove operations)
- Multi-locale support (separate .jsonl files per locale)
- Mock implementation of getUploadUrl() and uploadFileToBloomreach()
- Pattern matches Discovery cartridge's `blrProductExport.js`

**Key Features**:
- ✅ JSON Lines format (.jsonl)
- ✅ Patch operations (op: add/update/remove)
- ✅ Snapshot-based change tracking
- ✅ Multi-locale file generation
- ✅ Master product export with nested variants
- ✅ Mocked Bloomreach upload API integration

### 2. Product Model
**File**: `cartridge/scripts/models/BloomreachEngagementProduct.js`
- Represents Bloomreach product in Discovery-compatible format
- Constructs hierarchical structure: master with nested variants
- Handles multi-currency pricing (when enabled)
- Output format matches Discovery cartridge exactly

**Structure**:
```javascript
{
  op: "add",
  path: "/products/{productId}",
  value: {
    attributes: {...},
    variants: {
      variantId: {attributes: {...}}
    }
  }
}
```

### 3. Product Attributes Model
**File**: `cartridge/scripts/models/BloomreachEngagementProductAttributes.js`
- Extracts and formats product attributes
- Aggregated value handlers for complex fields (categories, price, url, etc.)
- Multi-currency price support
- Category hierarchy with IDs and names
- Variant attribute handling (color, size)
- Matches Discovery's `productAttributes.js` logic

**Attribute Handlers**:
- `categories`: Full category tree (not just 3 levels)
- `price`: Standard price calculation
- `color`, `size`: Variation attributes
- `url`: Product page URL (HTTPS)
- `thumb_image`: Product image URL
- `title`, `description`: Product content
- `brand`: Brand attribute
- `availability`: Stock availability

### 4. Documentation Files

#### a. `ITEMS_COLLECTION_FEED.md`
Comprehensive documentation covering:
- Data structure comparison (Discovery vs Engagement)
- Configuration guide (site preferences, job parameters)
- File output specifications
- API integration details
- Migration guide from CSV feeds
- Troubleshooting section

#### b. `FIELD_COMPARISON.md`
Detailed field-by-field comparison:
- Discovery cartridge fields
- Engagement cartridge fields (master and variant)
- Missing fields analysis
- Impact assessment for each difference
- Field mapping table
- Recommendations

#### c. `README_ITEMS_COLLECTION.md`
Quick start guide with:
- 5-minute setup instructions
- Configuration examples
- Sample output
- Testing checklist
- Common issues and solutions

#### d. `job-config-example.xml`
Business Manager job configuration template:
- Job definition XML
- Parameter specifications
- Chunk size recommendations
- Ready to import

## Comparison: Discovery vs Traditional Engagement

### Missing Fields in Traditional Engagement (Now Available in Items Collection)

| Feature | Traditional Engagement | Items Collection (New) |
|---------|----------------------|----------------------|
| Master-Variant Structure | ❌ Separate CSV files | ✅ Nested JSON |
| Full Category Hierarchy | ❌ 3 levels max | ✅ Unlimited depth |
| Multi-Currency | ❌ Single currency | ✅ Multiple currencies |
| Multi-Locale | ❌ Manual per locale | ✅ Automatic per locale |
| Incremental Updates | ❌ Full export | ✅ Delta tracking |
| Operation Types | ❌ None | ✅ add/update/remove |
| Category IDs + Names | ❌ Separated | ✅ Together in objects |
| Snapshot Tracking | ❌ None | ✅ Change detection |

## Configuration Requirements

### Site Preferences to Create

In Business Manager → Merchant Tools → Site Preferences → Custom Preferences:

```javascript
// Required
brEngProjectToken: "your-project-token-here"
brEngCatalogId: "items_collection"

// Optional
brEngMultiCurrency: false
brEngItemsCollectionConfig: {
  "title": "name",
  "description": "longDescription.markup",
  "price": "price",
  "categories": "categories",
  "url": "url",
  "thumb_image": "thumb_image",
  "brand": "brand",
  "color": "color",
  "size": "size",
  "availability": "availability"
}
```

### Job Parameters

```xml
<parameter name="Enabled">true</parameter>
<parameter name="FeedType">IncrementalFeed</parameter>  <!-- or FullFeed -->
<parameter name="MultiLocaleEnabled">false</parameter>  <!-- or true -->
```

## Output Files

### File Naming
```
items_collection_feed_{siteId}_{timestamp}_{locale}.jsonl
```

Examples:
```
items_collection_feed_RefArch_20231024103045_en_US.jsonl
items_collection_feed_RefArch_20231024103045_de_DE.jsonl
items_collection_feed_RefArch_20231024103045_fr_FR.jsonl
```

### Storage Location
```
IMPEX/src/bloomreach_engagement/items_collection/
```

### Snapshot Files
```
items_snapshot_RefArch.jsonl
items_snapshot_RefArch.tmp
```

## Sample Output

### Add Operation (New Product)
```json
{
  "op": "add",
  "path": "/products/master-tshirt-001",
  "value": {
    "attributes": {
      "title": "Classic Cotton T-Shirt",
      "description": "Comfortable 100% cotton t-shirt for everyday wear",
      "price": 29.99,
      "price_usd": 29.99,
      "price_eur": 27.50,
      "categories": [
        [
          {"id": "root", "name": "Root"},
          {"id": "mens", "name": "Men's Clothing"},
          {"id": "apparel", "name": "Apparel"},
          {"id": "shirts", "name": "Shirts"},
          {"id": "tshirts", "name": "T-Shirts"}
        ],
        [
          {"id": "root", "name": "Root"},
          {"id": "bestsellers", "name": "Best Sellers"}
        ]
      ],
      "url": "https://store.example.com/Product-Show?pid=master-tshirt-001",
      "thumb_image": "https://store.example.com/images/tshirt-large.jpg",
      "brand": "Premium Basics",
      "availability": true
    },
    "variants": {
      "variant-tshirt-001-red-s": {
        "attributes": {
          "color": "Red",
          "size": "S",
          "price": 29.99
        }
      },
      "variant-tshirt-001-red-m": {
        "attributes": {
          "color": "Red",
          "size": "M",
          "price": 29.99
        }
      },
      "variant-tshirt-001-blue-m": {
        "attributes": {
          "color": "Blue",
          "size": "M",
          "price": 31.99
        }
      }
    }
  }
}
```

### Update Operation (Price Change)
```json
{
  "op": "add",
  "path": "/products/master-tshirt-001",
  "value": {
    "attributes": {
      "price": 24.99,
      "price_usd": 24.99,
      "price_eur": 22.50
    },
    "variants": {
      "variant-tshirt-001-red-s": {
        "attributes": {
          "price": 24.99
        }
      },
      "variant-tshirt-001-red-m": {
        "attributes": {
          "price": 24.99
        }
      }
    }
  }
}
```

### Remove Operation (Discontinued Product)
```json
{
  "op": "remove",
  "path": "/products/master-tshirt-old-001"
}
```

## Mock API Implementation

The job includes mocked versions of two API functions:

### 1. getUploadUrl(fileName)
**Purpose**: Get pre-signed URL for file upload

**Mock Implementation**:
```javascript
function getUploadUrl(fileName) {
    var currentSite = Site.getCurrent();
    var projectToken = currentSite.getCustomPreferenceValue('brEngProjectToken');
    var catalogId = currentSite.getCustomPreferenceValue('brEngCatalogId') || 'items_collection';
    
    // Mock response
    return {
        uploadUrl: 'https://api.exponea.com/data/v2/projects/' + projectToken + '/catalogs/' + catalogId + '/items',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Authorization': 'Bearer mock-token-' + Date.now()
        },
        expiresAt: Date.now() + (3600 * 1000),
        fileName: fileName
    };
}
```

**Production Implementation** (TODO):
- Create service definition in Business Manager
- Call Bloomreach API to get real upload URL
- Handle authentication
- Add error handling and retries

### 2. uploadFileToBloomreach(file, uploadInfo)
**Purpose**: Upload file to Bloomreach via HTTP PUT

**Mock Implementation**:
```javascript
function uploadFileToBloomreach(file, uploadInfo) {
    Logger.info('Mock: Uploading file to Bloomreach');
    Logger.info('Mock: File: {0}', file.name);
    Logger.info('Mock: Upload URL: {0}', uploadInfo.uploadUrl);
    return true; // Simulated success
}
```

**Production Implementation** (TODO):
```javascript
function uploadFileToBloomreach(file, uploadInfo) {
    var HTTPClient = require('dw/net/HTTPClient');
    var FileReader = require('dw/io/FileReader');
    
    var client = new HTTPClient();
    client.open(uploadInfo.method, uploadInfo.uploadUrl);
    client.setRequestHeader('Content-Type', uploadInfo.headers['Content-Type']);
    client.setRequestHeader('Authorization', uploadInfo.headers['Authorization']);
    
    var fileReader = new FileReader(file, 'UTF-8');
    var content = '';
    var line;
    while ((line = fileReader.readLine()) != null) {
        content += line + '\n';
    }
    fileReader.close();
    
    client.send(content);
    
    if (client.statusCode === 200 || client.statusCode === 201) {
        Logger.info('Upload successful. Status: {0}', client.statusCode);
        return true;
    } else {
        Logger.error('Upload failed. Status: {0}, Response: {1}', client.statusCode, client.text);
        return false;
    }
}
```

## Testing Checklist

### Pre-Deployment Testing

- [ ] Code review completed
- [ ] Linting passes (no errors)
- [ ] Site preferences configured
- [ ] Job imported in Business Manager
- [ ] Test with small product set (10-20 products)
- [ ] Verify .jsonl files created
- [ ] Validate JSON structure
- [ ] Check snapshot file creation
- [ ] Test incremental export (change a product, re-run)
- [ ] Test full export mode
- [ ] Test multi-locale (if enabled)
- [ ] Review log files for errors
- [ ] Verify file sizes are reasonable
- [ ] Test with master products containing variants
- [ ] Test with simple products (no variants)

### Post-Deployment Validation

- [ ] Monitor first production run
- [ ] Verify file upload (when API is real)
- [ ] Check Bloomreach UI for imported data
- [ ] Compare record counts (SFCC vs Bloomreach)
- [ ] Spot-check product details match
- [ ] Verify variants are nested correctly
- [ ] Check category hierarchies
- [ ] Validate multi-currency prices (if enabled)
- [ ] Test search/recommendations with new data
- [ ] Monitor job execution time
- [ ] Set up job schedule (daily/hourly)
- [ ] Configure alerts for job failures

## Migration Path from CSV Feeds

### Phase 1: Parallel Run (Week 1-2)
1. Keep existing `masterProductFeed.js` and `variationProductFeed.js` running
2. Deploy new `itemsCollectionFeed.js`
3. Schedule both to run (different times)
4. Compare outputs manually

### Phase 2: Validation (Week 3-4)
1. Verify data completeness
2. Check performance metrics
3. Validate Bloomreach integration
4. Address any issues found

### Phase 3: Cutover (Week 5)
1. Disable old CSV jobs
2. Make Items Collection job primary
3. Monitor closely for 1 week
4. Document any differences

### Phase 4: Cleanup (Week 6+)
1. Remove old CSV job configurations
2. Archive old files
3. Update documentation
4. Train team on new format

## Performance Considerations

### Small Catalogs (<5,000 products)
- Full export each time is fine
- Minimal performance difference
- Simpler to maintain

### Medium Catalogs (5,000 - 50,000 products)
- Incremental export recommended
- Significant time savings (50-80% reduction)
- Snapshot overhead minimal

### Large Catalogs (>50,000 products)
- Incremental export essential
- Consider chunk size tuning (500-1000)
- Monitor snapshot file size
- May need multiple scheduled runs

### Multi-Locale Considerations
- Each locale = separate file
- Memory usage scales with locale count
- Consider staggered exports for many locales

## Known Limitations

1. **API Integration**: Currently mocked, requires production implementation
2. **Error Recovery**: Basic error handling, may need enhancement
3. **Large Files**: No automatic splitting (unlike CSV feeds with maxNoOfRows)
4. **Product Types**: Only exports master products (not simple/bundle/set)
5. **Custom Attributes**: Requires configuration, not auto-discovered
6. **Retry Logic**: No automatic retry on upload failure
7. **Progress Reporting**: Limited progress visibility during long runs

## Future Enhancements

### Short Term (Next Sprint)
- Implement real API integration for getUploadUrl
- Add HTTP client for file upload
- Enhanced error handling and logging
- Progress reporting

### Medium Term (Next Quarter)
- Service Framework integration
- Retry logic with exponential backoff
- File splitting for large exports
- Email notifications on success/failure
- Custom metrics/monitoring

### Long Term (Next Release)
- Support for all product types (simple, bundle, set)
- Automatic custom attribute discovery
- Parallel processing for multi-locale
- Compression support (gzip)
- Delta compression (only changed attributes)
- Scheduled cleanup of old files

## Support and Troubleshooting

### Log Files
Check logs in Business Manager:
```
Administration → Site Development → Development Setup → Log Settings
```

Filter by: `BloomreachEngagementItemsCollectionFeedExport`

### Common Issues

**Issue**: Empty files generated
- **Cause**: No master products found
- **Solution**: Check product catalog, verify products are masters

**Issue**: "Cannot create file" error
- **Cause**: IMPEX folder permissions
- **Solution**: Verify IMPEX directory is writable

**Issue**: JSON parsing error
- **Cause**: Invalid `brEngItemsCollectionConfig` JSON
- **Solution**: Validate JSON syntax, check for trailing commas

**Issue**: Missing variants
- **Cause**: Variants not online/active
- **Solution**: Check variant status in Business Manager

**Issue**: Snapshot not updating
- **Cause**: Snapshot file locked or corrupted
- **Solution**: Delete snapshot file, re-run with FullFeed

### Getting Help

1. Review log files for specific errors
2. Check this documentation
3. Review code comments in job files
4. Contact Bloomreach Support with:
   - Job execution ID
   - Log file excerpts
   - Sample output files
   - Site preferences configuration

## Summary

This implementation successfully brings Discovery cartridge's powerful hierarchical product export format to Bloomreach Engagement customers. Key benefits:

✅ **Better Data Structure**: Master + variants in single object
✅ **Better Performance**: Incremental exports save time
✅ **Better Scalability**: Multi-currency, multi-locale support
✅ **Better Categories**: Full hierarchy, not just 3 levels
✅ **Better Operations**: Add/update/remove tracking
✅ **Discovery Compatible**: Same format for cross-product consistency

The mocked API functions provide a clear path for production implementation while allowing immediate testing of the data export functionality.

## Next Steps

1. **Testing**: Run through testing checklist
2. **API Integration**: Implement real Bloomreach API calls
3. **Documentation**: Share with team
4. **Training**: Train operations team on new job
5. **Deployment**: Follow migration path
6. **Monitoring**: Set up alerts and dashboards

---

**Implementation Date**: November 4, 2025  
**Version**: 1.0.0  
**Status**: Ready for Testing  
**API Status**: Mocked (Production Implementation Pending)

