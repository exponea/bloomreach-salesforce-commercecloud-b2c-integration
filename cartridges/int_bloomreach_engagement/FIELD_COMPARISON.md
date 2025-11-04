# Product Field Comparison: Discovery vs Engagement

## Executive Summary

This document compares the product data structures between the **Discovery cartridge** (`blrProductExport.js`) and **Engagement cartridge** (traditional `masterProductFeed.js` and `variationProductFeed.js`), identifying fields and capabilities missing in the Engagement output.

## Data Format Comparison

### Discovery Cartridge
- **Format**: JSON Lines (.jsonl) with patch operations
- **Structure**: Hierarchical (master with nested variants)
- **Operations**: add, update, remove
- **Localization**: Multi-locale support (separate files)
- **Currency**: Multi-currency support (multiple price fields)
- **Change Tracking**: Snapshot-based delta exports

### Engagement Cartridge (Traditional)
- **Format**: CSV (flat table structure)
- **Structure**: Separate files for masters and variants
- **Operations**: Full replacement each time
- **Localization**: Single locale per export
- **Currency**: Single currency field
- **Change Tracking**: Full export every time

## Missing Fields in Engagement Output

### 1. Hierarchical Product-Variant Relationship

**Discovery**: Single JSON object contains master product and all variants nested together
```json
{
  "path": "/products/master-123",
  "value": {
    "attributes": {...},
    "variants": {
      "variant-123-red": {"attributes": {...}},
      "variant-123-blue": {"attributes": {...}}
    }
  }
}
```

**Engagement**: Separate CSV files - no direct master-variant linkage in same record
- Master CSV: One row per master product
- Variant CSV: One row per variant (with `masterProduct` column reference)

**Impact**: 
- Discovery format preserves master-variant relationship in single atomic update
- Engagement requires coordinating two separate files
- Discovery format better for variant-aware search/recommendations

---

### 2. Full Category Hierarchy with IDs and Names

**Discovery**: Complete category tree with both ID and display name
```json
"categories": [
  [
    {"id": "root", "name": "Root"},
    {"id": "mens", "name": "Men's Clothing"},
    {"id": "apparel", "name": "Apparel"},
    {"id": "shirts", "name": "Shirts"}
  ],
  [
    {"id": "root", "name": "Root"},
    {"id": "sale", "name": "Sale Items"}
  ]
]
```

**Engagement**: Only 3 fixed category levels (flat structure)
- `primaryCategory`: Display name only
- `categoryLevelTwo`: Display name only  
- `categoryLevelThree`: Display name only
- `primaryCategoryURL`: URL to category
- `categoryLevelTwoURL`: URL to category
- `categoryLevelThreeURL`: URL to category
- `categoryPath`: Pipe-delimited string "Level1|Level2|Level3"
- `categoriesIDs`: JSON array of category IDs (no names, no hierarchy)

**Impact**:
- Discovery supports unlimited category depth
- Discovery preserves category IDs and names together
- Engagement limited to 3 levels maximum
- Engagement separates IDs from names (harder to use)

---

### 3. Multi-Currency Price Attributes

**Discovery**: Exports separate price fields for each allowed currency
```json
"attributes": {
  "price": 99.99,
  "price_usd": 99.99,
  "price_eur": 89.50,
  "price_gbp": 79.99,
  "price_cad": 129.99
}
```

**Engagement**: Single currency only
- `price`: Numeric value
- `priceLocalCurrency`: Currency code (e.g., "USD")

**Impact**:
- Discovery enables currency-specific recommendations/search
- Engagement requires separate exports or API calls for multi-currency
- Discovery format better for global storefronts

---

### 4. Multi-Locale Localized Exports

**Discovery**: Generates separate .jsonl file per locale automatically
- `productfeed_RefArch_20231024103045_en_US.jsonl`
- `productfeed_RefArch_20231024103045_de_DE.jsonl`
- `productfeed_RefArch_20231024103045_fr_FR.jsonl`

Each file contains locale-specific attributes (title, description, URLs, etc.)

**Engagement**: Single locale per job execution
- Must schedule separate job runs for each locale
- Or maintain separate site preference configurations per site

**Impact**:
- Discovery automatically handles all locales in single job run
- Engagement requires manual orchestration of multiple job runs
- Discovery format more efficient for multi-locale catalogs

---

### 5. Incremental/Delta Update Support

**Discovery**: Snapshot-based change detection
```json
{"op": "add", "path": "/products/new-product-123", ...}
{"op": "update", "path": "/products/existing-product-456", ...}
{"op": "remove", "path": "/products/deleted-product-789"}
```

Maintains `product-snapshot_{siteId}.jsonl` to track state and only export changes.

**Engagement**: Full export every time
- Always exports all products
- No change tracking
- No operation type field

**Impact**:
- Discovery significantly faster for large catalogs (only exports deltas)
- Discovery reduces API processing time (only changed products)
- Discovery maintains historical change log
- Engagement requires full catalog processing each time

---

### 6. Structured Categories vs Flat String

**Discovery**: Array of category objects
```json
"categories": [
  [
    {"id": "cat-001", "name": "Electronics"},
    {"id": "cat-002", "name": "Computers"},
    {"id": "cat-003", "name": "Laptops"}
  ]
]
```

**Engagement**: Pipe-delimited string
```csv
categoryPath: "Electronics|Computers|Laptops"
```

**Impact**:
- Discovery format structured, easily parseable
- Discovery preserves category IDs
- Engagement requires string parsing
- Engagement loses category ID information in path

---

### 7. Product Availability Model

**Discovery**: Uses SFCC's built-in availability model
```json
"availability": true  // From product.availabilityModel.inStock
```

**Engagement**: Composite calculated flags
- `active`: Combined status (online && categorized && searchable && have_price)
- `online`: Product.isOnline()
- `categorized`: Product.isCategorized() (master or variant)
- `searchable`: Product.isSearchable()
- `have_price`: Product.priceModel.price.available

**Impact**:
- Discovery uses single authoritative field
- Engagement uses multiple derived fields
- Different semantics may cause synchronization issues

---

### 8. Variation Attributes (color, size)

**Discovery**: Direct extraction from variation model
```json
"color": "Red",
"size": "Large"
```

**Engagement Master**: Not included (master products don't have variations)

**Engagement Variant**: Included, but extracted via JSON parsing
```javascript
var variationValue = JSON.parse(getAllVariationAttrs(product));
color = variationValue && 'color' in variationValue ? variationValue.color : '';
```

**Impact**:
- Discovery format cleaner (direct attributes)
- Discovery includes color/size for both master and variants
- Engagement only includes for variants, requires JSON parsing

---

### 9. URL Generation

**Discovery**: HTTPS URLs
```json
"url": "https://store.example.com/Product-Show?pid=12345"
```

**Engagement**: Absolute URLs (protocol not specified in code, depends on URLUtils.abs)
```csv
url: "https://store.example.com/Product-Show?pid=12345"
```

**Impact**: Similar, but Discovery explicitly uses URLUtils.https() for security

---

### 10. Brand Attribute

**Discovery**: Direct attribute
```json
"brand": "Nike"
```

**Engagement**: Via product field or custom attribute
- If standard field: `product.brand`
- If custom: Must be configured in mapping

**Impact**: Discovery has explicit brand support in default configuration

---

### 11. Timestamp Fields

**Discovery**: Not included in product data

**Engagement**: Includes timestamps
- `exported_timestamp`: Export job run time
- `onlineFrom`: Product online date (Unix timestamp)

**Impact**: Engagement provides better audit trail

---

### 12. Custom Attributes Handling

**Discovery**: Via configuration in `blr_ProductFields` site preference
```json
{
  "custom_field_1": "custom.myCustomAttribute",
  "custom_field_2": "custom.anotherAttribute"
}
```

**Engagement**: Via `brEngProductsFeedDataMapping` site preference
```json
[
  {
    "XSDField": "custom_field_1",
    "SFCCProductAttribute": "myCustomAttribute",
    "isCustomAttribute": "true"
  }
]
```

**Impact**: Both support custom attributes, different configuration approaches

---

## Field Mapping Table

| Feature/Field | Discovery | Engagement Master | Engagement Variant |
|---------------|-----------|-------------------|-------------------|
| **Product ID** | ✅ path | ✅ ID | ✅ ID |
| **Title/Name** | ✅ title | ✅ name | ✅ name |
| **Description** | ✅ description | ✅ longDescription | ✅ longDescription |
| **Price** | ✅ price | ✅ price | ✅ price |
| **Multi-currency Prices** | ✅ price_{currency} | ❌ | ❌ |
| **URL** | ✅ url | ✅ url | ✅ url |
| **Image** | ✅ thumb_image | ✅ image | ✅ image |
| **Brand** | ✅ brand | ✅ brand | ✅ brand |
| **Availability** | ✅ availability | ❌ (uses active instead) | ❌ (uses active instead) |
| **Active Status** | ❌ | ✅ active | ✅ active |
| **Online Status** | ❌ | ✅ online | ✅ online |
| **Categorized Status** | ❌ | ✅ categorized | ✅ categorized |
| **Searchable Status** | ❌ | ✅ searchable | ✅ searchable |
| **Has Price Status** | ❌ | ✅ have_price | ✅ have_price |
| **Categories (Structured)** | ✅ categories (array of objects) | ❌ | ❌ |
| **Primary Category** | ✅ (in categories) | ✅ primaryCategory | ✅ primaryCategory |
| **Category Level 2** | ✅ (in categories) | ✅ categoryLevelTwo | ✅ categoryLevelTwo |
| **Category Level 3** | ✅ (in categories) | ✅ categoryLevelThree | ✅ categoryLevelThree |
| **Category Path** | ❌ | ✅ categoryPath (pipe-delimited) | ✅ categoryPath |
| **Category URLs** | ❌ | ✅ primaryCategoryURL, etc. | ✅ categoryURLs |
| **Categories IDs** | ✅ (in categories) | ✅ categoriesIDs (array) | ✅ categoriesIDs |
| **Color** | ✅ color | ❌ | ✅ color |
| **Size** | ✅ size | ❌ | ✅ size |
| **Master Product ID** | N/A | N/A | ✅ masterProduct |
| **Variants (Nested)** | ✅ variants{} | ❌ | ❌ |
| **Operation Type** | ✅ op (add/update/remove) | ❌ | ❌ |
| **Export Timestamp** | ❌ | ✅ exported_timestamp | ✅ exported_timestamp |
| **Online From** | ❌ | ✅ onlineFrom | ✅ onlineFrom |
| **Custom Attributes** | ✅ Configurable | ✅ Configurable | ✅ Configurable |

---

## Summary: What's Missing in Engagement

### Critical Missing Features

1. ❌ **Hierarchical master-variant nesting** - Forces separate file management
2. ❌ **Full category hierarchy** - Limited to 3 levels, no IDs with names
3. ❌ **Multi-currency support** - Only single currency per export
4. ❌ **Multi-locale automation** - Requires multiple job runs
5. ❌ **Incremental/delta updates** - Always full export
6. ❌ **Operation types** - No add/update/remove tracking
7. ❌ **Snapshot-based change tracking** - No historical state

### Nice-to-Have Missing Features

8. ❌ **Structured category objects** - Uses flat strings instead
9. ❌ **Direct availability field** - Uses composite "active" calculation
10. ❌ **Color/size on masters** - Only on variants

### Features Engagement Has That Discovery Doesn't

1. ✅ **Active/online/categorized/searchable flags** - Explicit status fields
2. ✅ **Export timestamp** - When was data exported
3. ✅ **Online from timestamp** - Product availability date
4. ✅ **Category URLs** - Direct links to category pages
5. ✅ **Category path string** - Human-readable full path

---

## Recommendations

### For New Implementations

Use the **Items Collection Feed** (`itemsCollectionFeed.js`) which combines the best of both:
- ✅ Discovery's hierarchical format
- ✅ Discovery's multi-currency/locale support
- ✅ Discovery's incremental updates
- ✅ Engagement's additional status fields (optional)
- ✅ Engagement's timestamp tracking (optional)

### For Existing Engagement Deployments

Consider migrating to Items Collection format if you:
- Have master products with many variants
- Support multiple currencies
- Support multiple locales
- Have large catalogs (>10,000 products) where incremental is beneficial
- Need better category hierarchy representation
- Want variant-aware recommendations/search

### When to Keep Traditional Engagement CSV

- Small catalogs (<5,000 products)
- Single currency, single locale
- Simple product relationships
- Existing integrations depend on CSV format
- Don't need incremental updates

---

## Conclusion

The Discovery cartridge's JSON format provides a more robust, scalable, and feature-rich product export compared to the traditional Engagement CSV format. The new `itemsCollectionFeed.js` job brings these benefits to Engagement customers while maintaining compatibility with existing Bloomreach systems.

**Key Benefits**:
- **Better data structure**: Hierarchical, not flat
- **Better performance**: Incremental, not full export
- **Better scalability**: Multi-currency, multi-locale
- **Better insights**: Category trees, not strings
- **Better operations**: Add/update/remove tracking

The investment in migrating to the Items Collection format pays off through improved performance, richer data, and easier maintenance as your catalog grows.

