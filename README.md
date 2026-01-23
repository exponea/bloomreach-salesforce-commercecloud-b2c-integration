# Bloomreach Engagement LINK cartridge for Salesforce Commerce Cloud B2C #

This is a LINK cartridge for integration with [Bloomreach Engagement](https://www.bloomreach.com/en/products/engagement).

## Installation

Installation and configuration guides for Controllers integration and SFRA integration can be found in the [documentation folder](https://github.com/exponea/bloomreach-salesforce-commercecloud-b2c-integration/tree/main/documentation).

Installation of cartridge is performed on a client side by a developer who has access to Salesforce Commerce Cloud store, or client's Salesforce agency. Client should be ready that the installation and configuration process may take few hours. Configuration of the cartridge can be then done by an admin, to save time, close cooperation with Engagement consultant is strongly advised. Both systems must be configured by their admins for the data exchange to work properly.

Note

The cartridge can be installed on these SFCC versions: the older SiteGenesis (also known as Demandware) since the Commerce Cloud Platform Release 16.8 and Site Genesis 105.2.0, and the newer Storefront Reference Architecture (SFRA) since the Commerce Cloud Platform Release 16.8 and SFRA 6.0.0+ (tested on SFRA 6.3).

## Features

### Feeds

Cartridge provides full initial data export and incremental updates in near real-time (~10 minutes). Frequency of all jobs can be configured.

- Customers Feed
  - initial full dump
  - delta updates every 10 minutes
  - Contents:
    - customer_id, email_id, update_timestamp
    - additional customer attributes
- Purchase Feed
  - initial full dump
  - delta updates every 10 minutes
  - registered orders identified by customer_id
  - guest orders identified by email
- Purchase Item Feed
  - initial full dump
  - delta updates every 10 minutes
  - registered orders identified by customer_id
  - guest orders identified by email
- Product Catalog Feed
  - full dumps daily from STAGING
  - simple and "master" products (bundles, sets, variation groups, etc)
  - product_id, title, categories, absolute path urls,...
- Variants Catalog Feed
  - full dumps daily from STAGING
  - simple products
  - product_id, variant_id, title, categories, absolute path urls,...
- Product Inventory Feed
  - full dumps every 4 hours from PRODUCTION
  - product_id, stock level
  - As a partial import for Products catalog (to update stock)
- Variants Inventory Feed
  - full dumps every 4 hours from PRODUCTION
  - variant_id, stock level
  - As a partial import for Variants Catalog (to update stock)

### SFTP File Transfer Support

The cartridge supports secure SFTP file transfer (recommended):

- **Secure file transfer** to your own SFTP server
- **Customer-managed file storage** with full control over feed data
- **Job failure notifications** when SFTP upload fails (triggers SFCC email alerts)
- **SSH key authentication** for both SFCC and Bloomreach (most secure)
- **Seamless integration** with existing feed jobs - no code changes required

#### How It Works

**When SFTP configured:**
1. Feed job generates CSV file in IMPEX directory (file always remains in IMPEX)
2. System uploads file to your SFTP server
3. If SFTP upload succeeds:
   - Bloomreach API is triggered with SFTP file path
   - Bloomreach fetches file from your SFTP server
4. If SFTP upload fails:
   - Job throws an error and fails
   - SFCC sends email notification (if configured)
   - File remains in IMPEX for troubleshooting

**When SFTP is NOT configured:**
1. Feed job generates CSV file in IMPEX directory
2. Bloomreach API is triggered with WebDAV file URL
3. Bloomreach fetches file from SFCC via WebDAV
