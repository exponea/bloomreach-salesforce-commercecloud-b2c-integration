# Bloomreach Engagement - Items Collection Feed

## Quick Start

This implementation brings Discovery cartridge's advanced JSON format to Bloomreach Engagement, enabling richer product data exports with master-variant relationships, full category hierarchies, and incremental updates.

## What's New

### Traditional Engagement Export (CSV)
- ❌ Flat CSV files (separate for masters and variants)
- ❌ Limited to 3 category levels
- ❌ Full export every time
- ❌ Single currency, single locale

### New Items Collection Export (JSON)
- ✅ Hierarchical JSON with nested variants
- ✅ Full category hierarchy (unlimited depth)
- ✅ Incremental updates (snapshot-based)
- ✅ Multi-currency and multi-locale support

## Installation

### 1. Upload Cartridge
Upload the `int_bloomreach_engagement` cartridge to your SFCC instance.

### 2. Configure Site Preferences

In **Business Manager → Merchant Tools → Site Preferences → Custom Preferences**:

#### Required:
- **`brEngProjectToken`**: Your Bloomreach Engagement project token
- **`brEngCatalogId`**: Catalog ID (default: `"items_collection"`)

#### Optional:
- **`brEngMultiCurrency`**: Enable multi-currency price export (true/false)
- **`brEngItemsCollectionConfig`**: JSON configuration for attribute mapping

Example configuration:
```json
{
  "title": "name",
  "description": "longDescription.markup",
  "price": "price",
  "categories": "categories",
  "url": "url",
  "thumb_image": "thumb_image",
  "brand": "brand",
  "availability": "availability"
}
```

### 3. Import Job Configuration

1. Go to **Administration → Operations → Import & Export**
2. Upload `job-config-example.xml`
3. Import the job configuration
4. Navigate to **Administration → Operations → Jobs**
5. Find job: `BloomreachEngagement-ItemsCollectionFeed`

### 4. Configure Job Parameters

Edit the job and set parameters:
- **Enabled**: `true`
- **FeedType**: `IncrementalFeed` (or `FullFeed` for first run)
- **MultiLocaleEnabled**: `true` (if you need multi-locale)

### 5. Run the Job

Execute the job manually or schedule it.

## Output

### File Location
```
IMPEX/src/bloomreach_engagement/items_collection/
```

### Generated Files

For single locale:
```
items_collection_feed_RefArch_20231024103045_en_US.jsonl
items_snapshot_RefArch.jsonl
```

For multi-locale:
```
items_collection_feed_RefArch_20231024103045_en_US.jsonl
items_collection_feed_RefArch_20231024103045_de_DE.jsonl
items_collection_feed_RefArch_20231024103045_fr_FR.jsonl
items_snapshot_RefArch.jsonl
```

## File Format Example

Each line in the .jsonl file is a JSON object representing a product operation:

```json
{
  "op": "add",
  "path": "/products/master-product-001",
  "value": {
    "attributes": {
      "title": "Classic Cotton T-Shirt",
      "description": "Comfortable 100% cotton t-shirt in various colors",
      "price": 29.99,
      "price_usd": 29.99,
      "price_eur": 27.50,
      "categories": [
        [
          {"id": "root", "name": "Root"},
          {"id": "mens", "name": "Men's Apparel"},
          {"id": "shirts", "name": "Shirts"}
        ]
      ],
      "url": "https://example.com/Product-Show?pid=master-product-001",
      "thumb_image": "https://example.com/images/tshirt.jpg",
      "brand": "ExampleBrand",
      "availability": true
    },
    "variants": {
      "variant-001-red-s": {
        "attributes": {
          "color": "Red",
          "size": "S",
          "price": 29.99
        }
      },
      "variant-001-red-m": {
        "attributes": {
          "color": "Red",
          "size": "M",
          "price": 29.99
        }
      },
      "variant-001-blue-m": {
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

## Documentation

- **[FIELD_COMPARISON.md](FIELD_COMPARISON.md)**: Detailed comparison of Discovery vs Engagement fields
- **[ITEMS_COLLECTION_FEED.md](ITEMS_COLLECTION_FEED.md)**: Complete technical documentation
- **[job-config-example.xml](job-config-example.xml)**: Job configuration template

## Architecture

```
itemsCollectionFeed.js (Job Step)
  ├── BloomreachEngagementProduct.js (Product Model)
  │     └── BloomreachEngagementProductAttributes.js (Attributes Handler)
  └── Mock API Integration
        ├── getUploadUrl() - Get upload URL from Bloomreach
        └── uploadFileToBloomreach() - Upload via HTTP PUT
```

## Key Features

### 1. Master-Variant Nesting
Single JSON object contains master product with all variants nested inside.

### 2. Full Category Hierarchy
Complete category tree with both IDs and names at any depth.

### 3. Incremental Updates
Only exports changed products (add/update/remove operations).

### 4. Multi-Currency Support
Exports `price_usd`, `price_eur`, `price_gbp`, etc. automatically.

### 5. Multi-Locale Support
Generates separate files per locale in single job run.

### 6. Snapshot Tracking
Maintains state to detect changes between runs.

## Comparison with Traditional CSV Export

| Feature | CSV Export | Items Collection |
|---------|------------|------------------|
| Format | Flat CSV | Hierarchical JSON |
| Master-Variant | Separate files | Nested in one object |
| Categories | 3 levels max | Unlimited depth |
| Updates | Full export | Incremental |
| Currencies | Single | Multiple |
| Locales | Single per run | Multiple per run |

## Migration from CSV

If you currently use `masterProductFeed.js` and `variationProductFeed.js`:

1. ✅ Keep existing CSV jobs running
2. ✅ Configure Items Collection job
3. ✅ Run both in parallel for 1-2 weeks
4. ✅ Verify data in Bloomreach
5. ✅ Disable CSV jobs once validated

## API Integration Status

### Currently Mocked
The following functions are currently mocked for testing:
- `getUploadUrl()`: Returns mock upload URL
- `uploadFileToBloomreach()`: Simulates file upload

### Production Implementation
To implement production upload, update the `uploadFileToBloomreach()` function in `itemsCollectionFeed.js` to use SFCC's HTTPClient:

```javascript
var HTTPClient = require('dw/net/HTTPClient');
var client = new HTTPClient();
client.open('PUT', uploadInfo.uploadUrl);
client.setRequestHeader('Content-Type', 'application/x-ndjson');
client.setRequestHeader('Authorization', uploadInfo.headers.Authorization);
// ... send file content
```

Or use the Service Framework for better resilience.

## Troubleshooting

### Empty Files
- Verify master products exist in catalog
- Check `brEngItemsCollectionConfig` is valid JSON
- Review logs for errors

### Missing Variants
- Ensure products have defined variations
- Check variants are online/active

### Upload Failures (when implemented)
- Verify `brEngProjectToken` is correct
- Check `brEngCatalogId` matches your catalog
- Review API authentication

### Force Full Export
Delete snapshot file:
```
IMPEX/src/bloomreach_engagement/items_collection/items_snapshot_{siteId}.jsonl
```

Or set job parameter `FeedType` to `FullFeed`.

## Logging

View logs in Business Manager:
- **Administration → Site Development → Development Setup → Log Settings**
- Filter by: `BloomreachEngagementItemsCollectionFeedExport`

## Support

For questions:
1. Review documentation in this directory
2. Check log files in Business Manager
3. Consult Bloomreach Engagement API documentation
4. Contact Bloomreach Support with job execution logs

## Files

| File | Purpose |
|------|---------|
| `itemsCollectionFeed.js` | Main job step script |
| `BloomreachEngagementProduct.js` | Product model |
| `BloomreachEngagementProductAttributes.js` | Attribute handlers |
| `ITEMS_COLLECTION_FEED.md` | Technical documentation |
| `FIELD_COMPARISON.md` | Field comparison analysis |
| `job-config-example.xml` | Job configuration template |
| `README_ITEMS_COLLECTION.md` | This file |

## License

Copyright © 2024 Bloomreach. All rights reserved.

