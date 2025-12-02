# SFCC Data Generator for Load Testing

This directory contains tools for generating large volumes of test data (customers and orders) to reproduce and diagnose export job failures and test data handling capabilities.

## Problem Statement

Customer is experiencing failures with the "Bloomreach Engagement - Customer Feed (Full Export)" job, suspecting it cannot handle large record counts. This tool generates realistic test data to reproduce the issue.

## Quick Start

### 1. Install Dependencies

```bash
# Make sure you're using Node 16 (per .nvmrc)
nvm use

# Install dependencies (includes @faker-js/faker)
npm install
```

### 2. Generate Test Data

```bash
# Generate 10,000 customer records
npm run generate:customers

# Generate 10,000 order records
npm run generate:orders
```

This will create:
- `customers-import-10k.xml` in this directory (~5-10 MB file)
- `orders-import-10k.xml` in this directory (~20-30 MB file)

**Customer Output Preview:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<customers xmlns="http://www.demandware.com/xml/impex/customer/2006-10-31">
  <customer customer-no="CUST000001">
    <credentials>
      <login>john.doe@testload.com</login>
      <password encrypted="false">Test@123</password>
    </credentials>
    <profile>
      <first-name>John</first-name>
      <last-name>Doe</last-name>
      <email>john.doe@testload.com</email>
    </profile>
  </customer>
  <!-- ... 9,999 more customers ... -->
</customers>
```

**Order Output Preview:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<orders xmlns="http://www.demandware.com/xml/impex/order/2006-10-31">
  <order order-no="ORD00000001">
    <order-date>2024-11-15T10:30:00.000Z</order-date>
    <customer>
      <customer-no>CUST000001</customer-no>
      <customer-email>jane.smith@testload.com</customer-email>
    </customer>
    <product-lineitems>
      <product-lineitem>
        <product-id>PROD001</product-id>
        <quantity>2</quantity>
        <base-price>49.99</base-price>
      </product-lineitem>
    </product-lineitems>
    <totals>
      <order-total>
        <gross-price>107.98</gross-price>
      </order-total>
    </totals>
    <status>
      <order-status>COMPLETED</order-status>
    </status>
  </order>
  <!-- ... 9,999 more orders ... -->
</orders>
```

### 3. Import to SFCC

#### Step-by-Step Import Process:

1. **Access Business Manager**
   - Log in to your SFCC sandbox: `https://zzra-039.dx.commercecloud.salesforce.com`
   - Use credentials from `dw.json`

2. **Navigate to Import & Export**
   - Go to: **Administration > Site Development > Import & Export**

3. **Upload the XML File(s)**
   - Click **Upload** button
   - Select `customers-import-10k.xml` and/or `orders-import-10k.xml` from this directory
   - Wait for upload to complete

4. **Run Import Job(s)**
   
   **For Customers:**
   - In the Import section, find your uploaded customer file
   - Click on the file name
   - Select **"Customer Import"** as the import type
   - Click **Import** button
   - Monitor the job progress
   
   **For Orders:**
   - In the Import section, find your uploaded order file
   - Click on the file name
   - Select **"Order Import"** as the import type
   - Click **Import** button
   - Monitor the job progress

5. **Verify Import Success**
   
   **For Customers:**
   - Navigate to: **Merchant Tools > Customers > Customer List**
   - Search for customers with IDs starting with "CUST" (e.g., CUST000001)
   - Verify count: You should see 10,000+ new customers
   
   **For Orders:**
   - Navigate to: **Merchant Tools > Ordering > Orders**
   - Search for orders with IDs starting with "ORD" (e.g., ORD00000001)
   - Verify count: You should see 10,000+ new orders
   - Check order details, line items, and totals
   
   **Check Import Logs:**
   - Check import logs in **Administration > Operations > Jobs**

### 4. Run the Export Job

Now test the customer export job that's reportedly failing:

1. **Access Job Scheduler**
   - Go to: **Administration > Operations > Jobs**

2. **Find the Export Job**
   - Locate: **"Bloomreach Engagement - Customer Feed (Full Export)"**
   - Job ID: `Bloomreach Engagement - Customer Feed (Full Export)`

3. **Run the Job**
   - Click on the job name
   - Click **Run** button
   - Monitor execution in real-time

4. **Monitor for Failures**
   Watch for these common issues:
   - **Timeout errors** - Job exceeds maximum execution time
   - **Memory errors** - Out of memory exceptions
   - **File write errors** - Cannot write CSV file
   - **Row limit errors** - Hits MaxNumberOfRows limit (currently 1,000,000)

### 5. Check Results

#### If Job Succeeds:
- Navigate to: **Administration > Site Development > Code Deployment > WebDAV**
- Go to: `Sites/IMPEX/src/bloomreach_engagement/CustomerFeed/`
- Download the generated CSV file
- Verify it contains all 10,000+ customers
- Check file size and row count

#### If Job Fails:
- Check job logs: **Administration > Operations > Jobs > [Select Job] > View Log**
- Look for error messages in the execution log
- Note the error type and stack trace
- Check the row count where it failed
- Review SFCC resource usage during execution

## Customization Options

### Modify Record Count

**For Customers** - Edit `generate-customers.js`:

```javascript
const CONFIG = {
    customerCount: 50000,  // Change this number
    // ... rest of config
};
```

Then regenerate:
```bash
npm run generate:customers
```

**For Orders** - Edit `generate-orders.js`:

```javascript
const CONFIG = {
    orderCount: 50000,  // Change this number
    // ... rest of config
};
```

Then regenerate:
```bash
npm run generate:orders
```

### Modify Customer Fields

The generator currently creates basic customer profiles:
- Customer Number (CUST000001 - CUST010000)
- Email (faker-generated)
- First Name (faker-generated)
- Last Name (faker-generated)
- Password (Test@123)

To add more fields (addresses, phone, birthday, gender), edit the `generateCustomer()` function in `generate-customers.js`.

**Example - Add Phone Number:**

```javascript
function generateCustomer(index) {
    // ... existing code ...
    const phone = faker.phone.number();
    
    return `  <customer customer-no="${escapeXml(customerNo)}">
    <credentials>
      <login>${escapeXml(email)}</login>
      <password encrypted="false">${escapeXml(CONFIG.defaultPassword)}</password>
    </credentials>
    <profile>
      <first-name>${escapeXml(firstName)}</first-name>
      <last-name>${escapeXml(lastName)}</last-name>
      <email>${escapeXml(email)}</email>
      <phone-home>${escapeXml(phone)}</phone-home>
    </profile>
  </customer>`;
}
```

### Modify Order Configuration

The order generator creates realistic orders with:
- Order Number (ORD00000001 - ORD00010000)
- Customer references (links to generated customers)
- 1-5 product line items per order
- Random product SKUs from a predefined list
- Shipping and billing addresses
- Order totals with tax calculation
- Payment information
- Order status (NEW, OPEN, COMPLETED, CANCELLED)

To customize orders, edit `generate-orders.js`:

**Change Product SKUs:**
```javascript
const CONFIG = {
    // ... other config ...
    productSkus: [
        'YOUR-SKU-1', 'YOUR-SKU-2', 'YOUR-SKU-3',
        // ... add your actual product SKUs
    ]
};
```

**Change Line Items Per Order:**
```javascript
const CONFIG = {
    // ... other config ...
    minLineItems: 2,  // Minimum products per order
    maxLineItems: 10  // Maximum products per order
};
```

**Change Order Date Range:**
```javascript
function generateOrder(index) {
    // ... existing code ...
    // Change from last 1 year to last 2 years:
    const orderDate = faker.date.past({ years: 2 });
}
```

## Troubleshooting

### Import Fails with "Invalid XML"
- Check the XML file is complete (has closing `</customer-list>` tag)
- Verify file encoding is UTF-8
- Look for special characters that weren't escaped properly

### Import Fails with "Duplicate Customer"
- Customer numbers must be unique
- If re-importing, delete previous test customers first
- Or modify `startCustomerNo` in `generate-customers.js` to use different IDs

### Export Job Times Out
- This confirms the customer's reported issue
- Try reducing `MaxNumberOfRows` in job configuration
- Consider implementing pagination/chunking in the export job
- Check SFCC instance resources (CPU, memory)

### Export Job Fails with Memory Error
- This indicates the job cannot handle the dataset size
- Review `customerInfoFeed.js` for memory-intensive operations
- Check if iterators are being closed properly
- Consider batch processing instead of loading all data at once

### Cannot Find Generated File After Export
- Check WebDAV path: `/on/demandware.servlet/webdav/Sites/IMPEX/src/bloomreach_engagement/CustomerFeed/`
- Verify the `TargetFolder` parameter in job configuration
- Check job logs for file creation errors
- Ensure proper file permissions

## Related Job Configuration

The customer export job is configured in `/metadata/site-template/jobs.xml`:

**Full Export Job (lines 180-201):**
```xml
<job job-id="Bloomreach Engagement - Customer Feed (Full Export)">
  <step step-id="generateCustomerFeed" 
        type="custom.BloomreachEngagement.Generate.CustomerFeed">
    <parameters>
      <parameter name="TargetFolder">src/bloomreach_engagement/CustomerFeed/</parameter>
      <parameter name="FileNamePrefix">customers-FULL-</parameter>
      <parameter name="MaxNumberOfRows">1000000</parameter>
    </parameters>
  </step>
</job>
```

**Implementation:**
- Job step: `cartridges/int_bloomreach_engagement/cartridge/scripts/jobSteps/customerInfoFeed.js`
- Helper: `cartridges/int_bloomreach_engagement/cartridge/scripts/helpers/BloomreachEngagementCustomerInfoFeedHelpers.js`

## Expected Performance

With 10,000 customers:
- **Import time**: 1-3 minutes
- **Export time**: Should complete in < 5 minutes normally
- **CSV size**: ~1-2 MB
- **Memory usage**: Should be minimal with proper streaming

If export fails or takes significantly longer, this indicates the reported performance issue.

## Next Steps After Testing

1. Document exact error messages and failure points
2. Check SFCC logs for detailed stack traces
3. Review job implementation for inefficiencies:
   - Memory leaks
   - Unbounded iterations
   - Inefficient queries
   - Missing pagination
4. Consider optimizations:
   - Implement batch processing
   - Add progress checkpoints
   - Optimize query performance
   - Add resource monitoring
5. Test with larger datasets (50k, 100k) to establish limits

## Support

For SFCC-specific issues:
- [SFCC Documentation](https://documentation.b2c.commercecloud.salesforce.com/)
- Business Manager job logs
- SFCC Support Portal

For Bloomreach integration issues:
- Review `/documentation` folder
- Check cartridge implementation
- Contact Bloomreach support

## File Structure

```
test-data-generator/
├── README.md                          # This file
├── generate-customers.js              # Customer data generator script
├── generate-orders.js                 # Order data generator script
├── customers-import-10k.xml          # Generated customer data (after running script)
└── orders-import-10k.xml             # Generated order data (after running script)
```

## Clean Up

To remove test customers after testing:

1. In Business Manager, go to: **Merchant Tools > Customers > Customer List**
2. Search for customers with IDs starting with "CUST"
3. Select all test customers
4. Delete them (may require multiple operations for large batches)

Or use a cleanup script/job if available in your SFCC instance.
