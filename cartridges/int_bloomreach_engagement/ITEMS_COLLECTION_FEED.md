# Items Collection Feed - Discovery Format for Engagement

## Overview

The `itemsCollectionFeed.js` job exports Salesforce Commerce Cloud product data in the same structured JSON Lines format used by the Discovery cartridge, but designed for Bloomreach Engagement's Items Collection API.

This job bridges the gap between the flat CSV exports traditionally used in Engagement and the hierarchical, variant-aware format used in Discovery.

## Product Data Structure Comparison

### Discovery Cartridge vs Engagement Cartridge

| Feature | Discovery (Original) | Engagement (Traditional CSV) | Engagement (New Items Collection) |
|---------|---------------------|------------------------------|-----------------------------------|
| **Format** | JSON Lines (.jsonl) | CSV | JSON Lines (.jsonl) |
| **Master-Variant Structure** | Nested in single object | Separate flat files | Nested in single object ✓ |
| **Categories** | Full hierarchy with IDs/names | Flat levels 1-3 | Full hierarchy with IDs/names ✓ |
| **Multi-currency** | Yes (price_usd, price_eur) | Single currency only | Yes (configurable) ✓ |
| **Multi-locale** | Yes (separate files) | Single locale | Yes (separate files) ✓ |
| **Change Tracking** | Snapshot-based delta | Full export each time | Snapshot-based delta ✓ |
| **Operations** | add/update/remove | N/A | add/update/remove ✓ |
| **Upload Method** | SFTP to Discovery | WebDAV + Import API | PUT to Upload URL API ✓ |

### JSON Structure Example

```json
{
  "op": "add",
  "path": "/products/master-product-123",
  "value": {
    "attributes": {
      "title": "Classic Cotton T-Shirt",
      "description": "Comfortable 100% cotton t-shirt",
      "price": 29.99,
      "price_usd": 29.99,
      "price_eur": 27.50,
      "categories": [
        [
          {"id": "root", "name": "Root"},
          {"id": "mens", "name": "Men's Clothing"},
          {"id": "shirts", "name": "Shirts"}
        ]
      ],
      "url": "https://store.com/products/classic-tshirt",
      "thumb_image": "https://store.com/images/tshirt-large.jpg",
      "brand": "BrandName",
      "availability": true
    },
    "variants": {
      "variant-123-red-m": {
        "attributes": {
          "color": "Red",
          "size": "M",
          "price": 29.99
        }
      },
      "variant-123-red-l": {
        "attributes": {
          "color": "Red",
          "size": "L",
          "price": 29.99
        }
      },
      "variant-123-blue-m": {
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

## Missing Fields Analysis - Engagement Traditional vs Discovery Format

### Fields Only Available in Discovery/Items Collection Format:

1. **Hierarchical Product-Variant Structure**
   - Traditional: Separate master and variant CSV files
   - New: Single JSON with nested variants

2. **Full Category Tree**
   - Traditional: Only 3 levels (primaryCategory, categoryLevelTwo, categoryLevelThree)
   - New: Complete category hierarchy with IDs and names

3. **Multi-currency as Attributes**
   - Traditional: Single `price` + `priceLocalCurrency` field
   - New: `price_usd`, `price_eur`, `price_gbp`, etc.

4. **Multi-locale Files**
   - Traditional: Single locale per export
   - New: Separate .jsonl file per locale

5. **Delta/Incremental Updates**
   - Traditional: Always full export
   - New: Snapshot-based change detection (add/update/remove operations)

6. **Structured Category Paths**
   - Traditional: Pipe-delimited string "Category1|Category2|Category3"
   - New: Array of objects with ID and name

7. **Product Availability**
   - Traditional: Multiple boolean flags (active, online, categorized, searchable, have_price)
   - New: Single `availability` field from availabilityModel.inStock

## Configuration

### Site Preferences

The job requires the following site preferences in Business Manager:

#### Required Preferences:

1. **`brEngProjectToken`** (String)
   - Bloomreach Engagement project token
   - Used for API authentication

2. **`brEngCatalogId`** (String)
   - Catalog/collection ID in Bloomreach Engagement
   - Default: `"items_collection"`

#### Optional Preferences:

3. **`brEngMultiCurrency`** (Boolean)
   - Enable multi-currency price export
   - Default: `false`
   - When true, exports `price_usd`, `price_eur`, etc.

4. **`brEngItemsCollectionConfig`** (JSON String)
   - Product attributes mapping configuration
   - Defines which SFCC attributes map to export fields

#### Example Configuration JSON for `brEngItemsCollectionConfig`:

```json
{
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

When configuring the job in Business Manager → Administration → Operations → Jobs:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| **Enabled** | Boolean | Yes | Enable/disable the job |
| **FeedType** | String | No | `"FullFeed"` or `"IncrementalFeed"` (default) |
| **MultiLocaleEnabled** | Boolean | No | Export separate files per locale (default: false) |

## Job Step Configuration

### Job Flow

1. **beforeStep**
   - Initialize configuration
   - Create output directories
   - Load existing snapshot (if incremental)
   - Query all master products

2. **read**
   - Compare current products with snapshot
   - Determine operation (add/update/remove)
   - Return product data

3. **process**
   - Pass-through (no transformation needed)

4. **write**
   - Write to locale-specific .jsonl files
   - Update snapshot

5. **afterStep**
   - Close all file writers
   - Get upload URLs from Bloomreach API
   - Upload files via HTTP PUT
   - Update snapshot files

## File Output

### File Naming Convention

```
items_collection_feed_{siteId}_{timestamp}_{locale}.jsonl
```

Example:
```
items_collection_feed_RefArch_20231024103045_en_US.jsonl
items_collection_feed_RefArch_20231024103045_de_DE.jsonl
```

### Storage Location

```
IMPEX/src/bloomreach_engagement/items_collection/
```

### Snapshot Files

The job maintains snapshot files for incremental exports:

```
items_snapshot_{siteId}.jsonl
```

These are used to detect changes between runs and generate minimal delta updates.

## API Integration

### Upload URL API (Mocked)

The job implements a mock of the Bloomreach Items Collection upload URL API:

```javascript
function getUploadUrl(fileName) {
    // Returns:
    {
        uploadUrl: "https://api.exponea.com/data/v2/projects/{token}/catalogs/{catalogId}/items",
        method: "PUT",
        headers: {
            "Content-Type": "application/x-ndjson",
            "Authorization": "Bearer {token}"
        },
        expiresAt: 1698154845000,
        fileName: "items_collection_feed_RefArch_20231024103045_en_US.jsonl"
    }
}
```

### File Upload (Mocked)

The `uploadFileToBloomreach()` function is currently mocked. To implement production upload:

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
        return true;
    } else {
        Logger.error('Upload failed. Status: {0}, Response: {1}', client.statusCode, client.text);
        return false;
    }
}
```

## Comparison: Discovery vs Engagement Items Collection

### Similarities

Both implementations:
- Export master products with nested variants
- Support multi-locale exports
- Use JSON Lines format with patch operations
- Implement snapshot-based change tracking
- Support hierarchical category structures
- Can handle multi-currency pricing

### Key Differences

| Aspect | Discovery | Engagement Items Collection |
|--------|-----------|----------------------------|
| **Target API** | Discovery Data Connect (SFTP) | Engagement Items Collection (HTTP PUT) |
| **Product Filter** | Master + Simple products | Master products only |
| **Upload Trigger** | SFTP upload + API call | Direct HTTP PUT to upload URL |
| **Configuration** | `blr_ProductFields` preference | `brEngItemsCollectionConfig` preference |
| **Logger Name** | "Bloomreach" | "BloomreachEngagementItemsCollectionFeedExport" |
| **Default Attributes** | From Discovery constants | Configurable with fallback |

## Benefits of Items Collection Format

1. **Unified Data Model**: Single JSON object contains master + all variants
2. **Better Performance**: Only export changed products (incremental)
3. **Richer Category Data**: Full category hierarchy instead of fixed 3 levels
4. **Multi-currency Ready**: Export all currency prices as separate attributes
5. **Locale Support**: Easy to maintain separate catalogs per locale
6. **API-First**: Direct upload to Bloomreach without SFTP dependencies
7. **Discovery Compatibility**: Same format makes cross-product integration easier

## Migration Guide

### From Traditional Engagement CSV Feeds

If you currently use `masterProductFeed.js` and `variationProductFeed.js`:

1. **Keep existing jobs running** during transition
2. **Configure** `brEngItemsCollectionConfig` site preference
3. **Test** `itemsCollectionFeed.js` in staging environment
4. **Verify** data in Bloomreach Engagement UI
5. **Schedule** new job to run alongside old jobs
6. **Monitor** for 1-2 weeks
7. **Disable** old CSV-based jobs once verified

### Product Attribute Mapping

Map your current CSV columns to JSON attributes:

| CSV Column (Old) | JSON Attribute (New) | Configuration |
|------------------|----------------------|---------------|
| ID | path (/products/{ID}) | Automatic |
| name | attributes.title | `"title": "name"` |
| longDescription | attributes.description | `"description": "longDescription.markup"` |
| price | attributes.price | `"price": "price"` |
| image | attributes.thumb_image | `"thumb_image": "thumb_image"` |
| categoryPath | attributes.categories | `"categories": "categories"` |
| url | attributes.url | `"url": "url"` |

## Troubleshooting

### Common Issues

1. **Empty Files Generated**
   - Check that master products exist in catalog
   - Verify `brEngItemsCollectionConfig` is valid JSON
   - Check logger for parsing errors

2. **Missing Variants**
   - Ensure products have defined variations
   - Check that variants are online/active

3. **Upload Failures**
   - Verify `brEngProjectToken` and `brEngCatalogId` are correct
   - Check API endpoint URL formation
   - Review authorization headers

4. **Snapshot Issues**
   - Delete snapshot file to force full export: `items_snapshot_{siteId}.jsonl`
   - Set `FeedType` parameter to `"FullFeed"`

### Logging

All log messages use the logger:
```javascript
Logger = require('dw/system/Logger').getLogger('BloomreachEngagementItemsCollectionFeedExport');
```

View logs in Business Manager:
- Administration → Site Development → Development Setup → Log Settings
- Filter by "BloomreachEngagementItemsCollectionFeedExport"

## Future Enhancements

### Planned Improvements

1. **Real API Integration**
   - Implement actual HTTP client for getUploadUrl
   - Add authentication service
   - Handle API rate limits

2. **Service Framework Integration**
   - Create OCAPI service definition
   - Add circuit breaker for resilience
   - Implement retry logic

3. **Advanced Filtering**
   - Product type filters (exclude bundles, sets, etc.)
   - Category filters (only specific categories)
   - Custom attribute filters

4. **Performance Optimization**
   - Batch processing for large catalogs
   - Parallel file generation per locale
   - Compression support

5. **Monitoring & Alerts**
   - Export success/failure metrics
   - File size tracking
   - Upload duration monitoring
   - Email notifications on errors

## Related Files

- **Job Script**: `cartridge/scripts/jobSteps/itemsCollectionFeed.js`
- **Product Model**: `cartridge/scripts/models/BloomreachEngagementProduct.js`
- **Attributes Model**: `cartridge/scripts/models/BloomreachEngagementProductAttributes.js`
- **Documentation**: `ITEMS_COLLECTION_FEED.md` (this file)

## Support

For questions or issues:
- Review log files in Business Manager
- Check Bloomreach Engagement API documentation
- Contact Bloomreach Support with job execution logs

