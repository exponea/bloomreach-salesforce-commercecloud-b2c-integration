# Bloomreach Engagement LINK cartridge for Salesforce Commerce Cloud B2C #

This is a LINK cartridge for integration with [Bloomreach Engagement](https://www.bloomreach.com/en/products/engagement).

## Installation

Installation and configuration guides for Controllers integration and SFRA integration can be found in the [documentation folder](https://github.com/exponea/bloomreach-salesforce-commercecloud-b2c-integration/tree/main/documentation).

Installation of cartridge is performed on a client side by a developer who has access to Salesforce Commerce Cloud store, or client's Salesforce agency. Client should be ready that the installation and configuration process may take few hours. Configuration of the cartridge can be then done by an admin, to save time, close cooperation with Engagement consultant is strongly advised. Both systems must be configured by their admins for the data exchange to work properly.

Note

The cartridge can be installed on these SFCC versions: the older SiteGenesis (also known as Demandware) since the Commerce Cloud Platform Release 16.8 and Site Genesis 105.2.0, and the newer Storefront Reference Architecture (SFRA) since the Commerce Cloud Platform Release 16.8 and SFRA 6.0.0.

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

The cartridge now supports secure SFTP file transfer as an alternative to WebDAV for all feed exports. This feature enables:

- **Secure file transfer** to your own SFTP server
- **Customer-managed file storage** with full control over feed data
- **Automatic fallback** to WebDAV if SFTP is unavailable (no job failures)
- **SSH key authentication** for both SFCC and Bloomreach (most secure)
- **Seamless integration** with existing feed jobs - no code changes required

> **Secure Setup**: Both SFCC and Bloomreach use SSH key authentication. SFCC uses a local SSH key you generate. Bloomreach generates its own SSH key. Both public keys go to your SFTP server. This is the most secure approach!

#### Key Benefits

- **Maximum Security**: Both SFCC and Bloomreach use SSH key authentication
- **Control**: Store feed files on your own infrastructure
- **Separate Keys**: Each system has its own SSH key pair for isolation
- **Flexibility**: Optional feature - disable anytime without affecting existing functionality
- **Reliability**: Automatic WebDAV fallback ensures jobs never fail due to SFTP issues
- **Compatibility**: Works with all 7 feed types (Customer, Purchase, Purchase Item, Product, Variant, Inventory)
- **Industry Standard**: Uses standard SSH public key cryptography

#### How It Works

When SFTP is enabled and configured:
1. Feed job generates CSV file in IMPEX directory (as usual)
2. System attempts to upload file to your SFTP server
3. If SFTP upload succeeds:
   - Bloomreach fetches file from your SFTP server
   - File path passed to Bloomreach API is the SFTP path
4. If SFTP upload fails:
   - System automatically falls back to WebDAV (no job failure)
   - Bloomreach fetches file from SFCC via WebDAV
   - Error logged for troubleshooting

#### Configuration

SFTP is configured through Business Manager site preferences.

**Quick Setup:**
1. Generate SSH key for SFCC locally (`ssh-keygen` command)
2. In Bloomreach Engagement: Generate SSH key and copy the public key
3. Add BOTH public keys to your SFTP server's authorized_keys
4. Upload SFCC private key to Business Manager (Administration > Operations > Private Keys)
5. In SFCC: **Merchant Tools > Site Preferences > Custom Preferences > BloomreachEngagementSFTP**
6. Enable SFTP, enter server details, select "SSH Private Key Authentication"
7. Test connection using the Test SFTP Connection job
8. Configure Bloomreach imports to use "File storage" with SFTP integration
9. Run feed jobs - SFTP upload happens automatically

**Note:** If SFCC key upload fails, password authentication is available as fallback

