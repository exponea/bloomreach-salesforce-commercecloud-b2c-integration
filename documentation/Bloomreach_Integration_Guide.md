# Bloomreach Engagement Integration Guide

**Version 26.01.0**

![Bloomreach Logo](./media/image1.png)

This guide covers the integration of Bloomreach Engagement with Salesforce Commerce Cloud (SFCC) for both **SFRA** and **Controllers (SiteGenesis)** storefront architectures.

---

## Table of Contents

1. [Component Overview](#1-component-overview)
   - [Functional Overview](#functional-overview)
   - [Compatibility](#compatibility)
2. [Implementation Guide](#2-implementation-guide)
   - [Setup of Business Manager](#setup-of-business-manager)
   - [Configuration](#configuration)
3. [SFTP Configuration (Recommended for Production)](#3-sftp-configuration-recommended-for-production)
   - [Why SFTP Over WebDAV](#why-sftp-over-webdav)
   - [Prerequisites](#prerequisites)
   - [Configuration Steps](#configuration-steps)
4. [Bloomreach Import Configuration](#4-bloomreach-import-configuration)
   - [Creating One-Time SFTP-Based Imports](#creating-one-time-sftp-based-imports)
   - [Feed Types Reference](#feed-types-reference)
5. [Job Scheduling](#5-job-scheduling)
6. [Cartridge Uninstallation Guide](#6-cartridge-uninstallation-guide)
7. [Known Issues](#7-known-issues)
8. [Release History](#8-release-history)
- [Appendix A: WebDAV Configuration (Development/Testing Alternative)](#appendix-a-webdav-configuration-developmenttesting-alternative)
- [Appendix B: Detailed SSH Key Generation Commands](#appendix-b-detailed-ssh-key-generation-commands)

---

## 1. Component Overview

### Functional Overview

Bloomreach software enables highly personalized digital experiences for retailers, brands, distributors, manufacturers, and a diverse set of businesses and organizations around the world.

### Compatibility

The cartridge is available for installations on storefronts that support both **Controller** and **SFRA** implementations.

| Architecture | Platform Requirement | Storefront Version |
|--------------|---------------------|-------------------|
| **SFRA** | Commerce Cloud Platform Release 16.8+ | SFRA 6.0.0+ (tested on 6.3.0) |
| **Controllers** | Commerce Cloud Platform Release 16.8+ | Site Genesis 105.2.0+ |

---

## 2. Implementation Guide

### Setup of Business Manager

The Bloomreach Engagement LINK Cartridge contains several cartridges that are required for full functionality. Controller and SFRA support is broken out into two separate cartridges, facilitating the installation and use of one or the other model.

#### Step 1: Import Cartridges

Import all three cartridges into UX Studio and associate them with a Server Connection:

- `int_bloomreach_engagement` (core cartridge - required for both)
- `int_bloomreach_engagement_sfra` (SFRA-specific)
- `int_bloomreach_engagement_controllers` (Controllers-specific)

#### Step 2: Site Cartridge Assignment

1. Navigate to **Administration > Sites > Manage Sites**
2. Click on the Site Name for the Storefront Site that will add Bloomreach Engagement functionality
3. Select the **Settings** tab
4. Add the appropriate cartridges to the cartridge path:

**For SFRA:**
```
int_bloomreach_engagement_sfra:int_bloomreach_engagement:app_storefront_base
```

**For Controllers (SiteGenesis):**
```
int_bloomreach_engagement_controllers:int_bloomreach_engagement:app_storefront_controllers:app_storefront_core
```

5. Repeat steps 2-4 for each Storefront Site where Bloomreach Engagement will be implemented

#### Step 3: Metadata Import

1. Navigate to **BM > Administration > Site Development > Import & Export**, upload and import:
   - `link_bloomreach_engagement/metadata/site-templates/meta/system-objecttype-extensions.xml`
   - `link_bloomreach_engagement/metadata/site-templates/meta/custom-objecttype-definitions.xml`

2. Navigate to **BM > Administration > Operations > Import & Export**, upload and import:
   - `link_bloomreach_engagement/metadata/site-templates/jobs.xml`

> **Note:** If there are data errors after import (e.g., "Finished with 11 data errors"), it could be caused by unapplied `jobsteps.json` changes. In such case, activate another code version, then re-activate the current code version and re-import the jobs file.

### Configuration

#### 1. Assign Sites to Bloomreach Jobs

Navigate to **Administration > Operations > Jobs** and assign proper site(s) to each of the Bloomreach jobs (by default they are assigned to RefArch site):

| Job Name | Description |
|----------|-------------|
| Bloomreach - CustomerFeed (Delta Export) | Incremental customer data export |
| Bloomreach - CustomerFeed (Full Export) | Full customer data export |
| Bloomreach - MasterProductFeed (Full Export) | Master product catalog export |
| Bloomreach - MasterProductInventoryFeed | Master product inventory export |
| Bloomreach - VariationProductFeed (Full Export) | Variant product catalog export |
| Bloomreach - VariationProductInventoryFeed | Variant product inventory export |
| Bloomreach - Generate (Pre-Init) CSV Files | Generate sample CSV files for import setup |
| Bloomreach - Purchase Feed (FullExport) | Full purchase history export |
| Bloomreach - Purchase Feed (NewOrders) | New orders export |
| Bloomreach - Purchase Product Feed (FullExport) | Full purchase line items export |
| Bloomreach - Purchase Product Feed (NewOrders) | New order line items export |

#### 2. Generate Pre-Init CSV Files

1. Navigate to **Administration > Operations > Jobs**
2. Execute **"Bloomreach - Generate (Pre-Init) CSV Files"** job
3. This generates CSV files used to define Imports on your Bloomreach account
4. Navigate to **BM > Administration > Site Development > Development Setup > Open WebDAV Access folder: Sites > Impex > src > bloomreach > preinit**

![Pre-Init CSV Files in WebDAV](./media/image2.png)

5. Note the CSV full URL file paths for use in later steps

#### 3. Configure Bloomreach API Credentials

1. Open Bloomreach API settings page: `https://cloud.exponea.com/p/{your-project}/project-settings/api`

![Bloomreach API Settings Page](./media/image3.png)

2. Copy the following values:
   - Project Token
   - API Key ID
   - API Secret

3. Navigate to **BM > Merchant Tools > Custom Preferences > Bloomreach Engagement API**

![SFCC Business Manager Custom Preferences](./media/image4.png)

4. Paste the values into:
   - Bloomreach Project Token
   - Bloomreach API Key ID
   - Bloomreach API Key Secret
5. Save changes

---

## 3. SFTP Configuration (Recommended for Production)

### Why SFTP Over WebDAV

SFTP is the **recommended** method for production environments. Key benefits:

| Benefit | Description |
|---------|-------------|
| **No Credential Expiration** | SSH key authentication eliminates the 90-day WebDAV credential expiration issue |
| **Enhanced Security** | Public key cryptography provides stronger security than password-based WebDAV |
| **Large File Support** | No 10MB file size limitations |
| **Stable Integration** | Bloomreach Engagement requires a stable import method that doesn't switch automatically |
| **Enterprise-Grade** | Industry standard for secure file transfers |
| **Customer Control** | Files stored on your own infrastructure with full audit capabilities |

> **WebDAV Alternative:** WebDAV is available for development/testing environments where the 90-day credential expiration is acceptable. See [Appendix A](#appendix-a-webdav-configuration-developmenttesting-alternative) for WebDAV configuration.

### Prerequisites

Before configuring SFTP, ensure you have:

**1. SFTP Server Access**
- Hostname/IP address of your SFTP server
- Port number (typically 22, or custom port like 1022)
- Valid username with write permissions
- SSH access enabled

**2. SFCC Business Manager Access**
- Site-level administration access
- Ability to modify site preferences
- Access to Administration > Operations > Private Keys

**3. Bloomreach Engagement Access**
- Admin access to Bloomreach Engagement platform
- Ability to create integrations (Data & Assets > Integrations)
- Ability to modify import definitions (Data & Assets > Imports)

### Configuration Steps

The SFTP configuration involves three main components:

1. SSH key pair generation and deployment
2. SFCC Business Manager SFTP configuration
3. Bloomreach Engagement SFTP integration setup

#### Step 1: Generate SSH Key for SFCC

Generate an RSA key pair that SFCC will use to authenticate to your SFTP server.

```bash
ssh-keygen -t rsa -b 4096 -m PEM -C "sfcc-bloomreach-prod" -f ./sfcc_bloomreach_rsa -N ""
```

This creates:
- `sfcc_bloomreach_rsa` - Private key (for SFCC Business Manager)
- `sfcc_bloomreach_rsa.pub` - Public key (for your SFTP server)

> See [Appendix B](#appendix-b-detailed-ssh-key-generation-commands) for detailed commands for different operating systems.

#### Step 2: Generate SSH Key in Bloomreach Engagement

Bloomreach generates its own SSH key pair for downloading files from your SFTP server.

1. Login to Bloomreach Engagement
2. Navigate to **Data & Assets > Integrations**
3. Click **"+ Add new integration"**
4. Select **"SFTP"**
5. Configure Integration:
   - **Integration Name:** Production SFTP (or your preferred name)
   - **Hostname:** Your SFTP server hostname
   - **Port:** Your SFTP port (typically 22)
   - **Username:** Your SFTP username
   - **Use password:** UNCHECK THIS BOX
   - **Host key:** Leave EMPTY
6. Generate SSH Key:
   - **SSH Key dropdown:** Select "Generate new key"
   - **Key name:** Enter "Production SFTP Key"
   - Click **"Generate"**
7. Copy Bloomreach's Public Key:
   - After generating, Bloomreach displays the PUBLIC KEY
   - Starts with: `ssh-rsa AAAAB3NzaC1yc2EAAAADAQA...`
   - **COPY THIS ENTIRE KEY** - you'll need it for Step 3
8. Save the Integration

![Bloomreach SFTP Integration Setup](./media/image5.png)

> **Important:** Bloomreach keeps the private key internally (you never see it). You only get the public key.

#### Step 3: Add BOTH Public Keys to Your SFTP Server

You must authorize BOTH SFCC's and Bloomreach's public keys on your SFTP server.

**Option A: Via cPanel (If Available)**

*Part A: Add SFCC's Public Key*
1. Login to cPanel
2. Navigate to **SSH Access > Manage SSH Keys**
3. Click "Import Key"
4. Name/Label: `SFCC Production`
5. Public Key: Paste content from `sfcc_bloomreach_rsa.pub`
6. Click "Save" or "Import"
7. Click "Authorize" (this adds it to `~/.ssh/authorized_keys`)

*Part B: Add Bloomreach's Public Key*
1. Still in cPanel SSH Keys management
2. Click "Import Key" again
3. Name/Label: `Bloomreach Production`
4. Public Key: Paste the key you copied from Bloomreach (Step 2)
5. Click "Save" or "Import"
6. Click "Authorize"

*Part C: Create Feeds Directory*
1. Go to File Manager
2. Navigate to your home directory
3. Create new folder: `feeds` (or your preferred name)
4. Note the full path (e.g., `/home/username/feeds`)

*Part D: Configure Firewall (Critical!)*
1. Go to Security section in cPanel
2. Look for: IP Blocker, Firewall, or CSF Firewall
3. Bloomreach shows static IP addresses in the integration screen
4. Add these IPs to your server's firewall ALLOW list
5. Without this, Bloomreach cannot connect!

**Option B: Via SSH Command Line**

See [Appendix B](#appendix-b-detailed-ssh-key-generation-commands) for detailed commands.

#### Step 4: Upload SFCC Private Key to Business Manager

1. Create PKCS12 bundle (see [Appendix B](#appendix-b-detailed-ssh-key-generation-commands) for detailed commands):

```bash
openssl req -new -x509 -key ./sfcc_bloomreach_rsa -out ./sfcc_bloomreach_cert.pem -days 3650
openssl pkcs12 -export -in ./sfcc_bloomreach_cert.pem -inkey ./sfcc_bloomreach_rsa -out ./sfcc_bloomreach.p12
```

2. Login to SFCC Business Manager
3. Navigate to **Administration > Operations > Private Keys**
4. Click "New"
5. Upload the Key:
   - **Alias:** `bloomreach-sftp-prod` (use this exact name)
   - **Key:** Choose file `sfcc_bloomreach.p12`
   - **Certificate:** Leave empty
   - **Password:** Leave EMPTY
   - Click "Apply"

#### Step 5: Configure SFCC Site Preferences

1. Navigate to **Merchant Tools > Site Preferences > Custom Preferences**
2. Find section: **BloomreachEngagementSFTP**
3. Enter SFTP Configuration:

| Field | Value | Notes |
|-------|-------|-------|
| SFTP Hostname | Your SFTP server hostname | e.g., sftp.yourcompany.com |
| SFTP Port | Your SFTP port | Typically 22, or custom (e.g., 1022) |
| SFTP Username | Your SFTP username | Must have write access |
| SFTP Authentication Method | SSH Private Key Authentication | Select from dropdown |
| SFTP Password | Leave EMPTY | Not needed for SSH key auth |
| SFTP Key Alias | `bloomreach-sftp-prod` | Must match alias from Step 4 |
| SFTP Remote Directory | Target directory path | e.g., `/home/username/feeds` |

4. Click "Apply" to save

> **Important:** The system implicitly determines whether to use SFTP or WebDAV based on credential presence. If SFTP credentials are configured, the system uses SFTP. If not configured, it falls back to WebDAV automatically.

#### Step 6: Test SFTP Connection

1. Navigate to **Administration > Operations > Jobs**
2. Find job: **Test-SFTP-Connection**
3. Click "Run"
4. Wait for completion
5. Check Results:
   - **SUCCESS:** "SFTP test successful"
   - **ERROR:** Check error message and troubleshoot

**Expected Success Log:**
```
INFO Starting SFTP connection test...
INFO Test 1: Connecting to SFTP server your-server.com:22
INFO Test 1: PASSED - Successfully connected to SFTP server
INFO Test 2: Uploading test file
INFO Test 2: PASSED - Test file uploaded successfully
INFO Test 3: PASSED - Test file deleted successfully
INFO All SFTP connection tests passed successfully
```

#### Step 7: Test Bloomreach Connection

1. Go back to Bloomreach Engagement
2. Navigate to **Data & Assets > Integrations**
3. Find your SFTP integration
4. Click on it to open
5. Click "Test Connection" button
6. Should show: "Connection successful"

![SFTP Connection Test Successful](./media/image6.png)

**If Test Fails:**
- Verify Bloomreach's public key is in `authorized_keys`
- Verify firewall allows Bloomreach IP addresses
- Check hostname, port, username are correct
- Ensure SSH is enabled on your server

---

## 4. Bloomreach Import Configuration

### Creating One-Time SFTP-Based Imports

> **Important:** Imports should use strict file paths, NOT regex-based file discovery. Each import is triggered one time by the SFCC job via the Bloomreach API with the specific file path.

**Overview:**
1. Execute "Bloomreach - Generate (Pre-Init) CSV Files" job to create sample files
2. Create ONE-TIME imports in Bloomreach for each feed type
3. Use these import IDs in SFCC job configuration
4. SFCC jobs will trigger these imports with new file paths each time they run

#### Step 1: Generate Pre-Init Files

1. Navigate to **Administration > Operations > Jobs**
2. Execute **"Bloomreach - Generate (Pre-Init) CSV Files"** job
3. This creates sample CSV files with proper structure

#### Step 2: Create Customer Feed Import (One-Time)

1. Navigate to **Bloomreach Account > Data & Assets > Imports**
2. Click **"+ New Import"**
3. Select Type: **"Customer"**

![Select Import Type](./media/image7.png)

4. Configure Import:
   - **Name:** Customer Feed Import
   - **Data source:** File storage
   - **Integration:** Select your SFTP integration (e.g., Production SFTP)
   - **File path:** Enter the EXACT file path for the pre-init file
     - Example: `/home/username/feeds/customer-info-feed-preinit.csv`
   - **Important:** Use exact file path, NOT regex pattern
   - **Selection rule:** Leave default

5. Map Fields:
   - Map `customer_id` or `email` as the primary identifier
   - Map other fields as needed

![Field Mapping in Import Configuration](./media/image8.png)

6. Click "Save"

7. Copy the `import_id` from the URL:
   - Example URL: `https://cloud.exponea.com/p/sandbox-12/data/imports/[import_id]`

8. Set Import ID in SFCC:
   - Navigate to **BM > Merchant Tools > Custom Preferences > Bloomreach Engagement API**
   - Find: "Customer Feed Import ID"
   - Paste the `import_id` value
   - Click "Save"

![Import IDs in SFCC Custom Preferences](./media/image9.png)

**How It Works:**
- The import definition is created ONCE
- Each time the SFCC job runs, it calls the Bloomreach API with this `import_id` and the NEW file path
- Bloomreach uses the same import definition but fetches the new file from SFTP

#### Step 3: Repeat for All Feed Types

Create one-time imports for each feed type listed in the reference table below.

### Feed Types Reference

| Feed Type | Import Type | Event Name | File Path Example | Import ID Site Preference |
|-----------|-------------|------------|-------------------|---------------------------|
| Customer Feed | Customer | N/A | `/home/username/feeds/customer-info-feed-preinit.csv` | `brEngCustomerFeedImportId` |
| Purchase Feed | Event | `purchase` | `/home/username/feeds/purchase-preinit.csv` | `brEngPurchaseFeedImportId` |
| Purchase Item Feed | Event | `purchase_item` | `/home/username/feeds/purchase-product-feed-preinit.csv` | `brEngPurchaseItemFeedImportId` |
| Master Product Feed | Catalog | N/A (catalog: products) | `/home/username/feeds/master-product-feed-preinit.csv` | `brEngProductFeedImportId` |
| Variant Product Feed | Catalog | N/A (catalog: variants) | `/home/username/feeds/variation-product-feed-preinit.csv` | `brEngVariantProductFeedImportId` |
| Master Inventory Feed | Catalog | N/A (catalog: products) | `/home/username/feeds/master-product-inventory-feed-preinit.csv` | `brEngProductInventoryFeedImportId` |
| Variant Inventory Feed | Catalog | N/A (catalog: variants) | `/home/username/feeds/variation-product-inventory-feed-preinit.csv` | `brEngVariantInventoryFeedImportId` |

**For each feed:**
1. Create import in Bloomreach (one-time)
2. Use EXACT file path (not regex)
3. Copy `import_id` from URL
4. Set `import_id` in SFCC site preferences

### Import Configuration Details

| Feed | Type | Configuration |
|------|------|---------------|
| **Customer Feed** | Customer | Primary identifier: `customer_id` or `email`. Data source: File storage (SFTP) |
| **Purchase Feed** | Event | Event name: `purchase`. Data source: File storage (SFTP) |
| **Purchase Item Feed** | Event | Event name: `purchase_item`. Data source: File storage (SFTP) |
| **Master Product Feed** | Catalog | Catalog name: `products`. Data source: File storage (SFTP) |
| **Variant Product Feed** | Catalog | Catalog name: `variants`. Data source: File storage (SFTP) |
| **Master Inventory Feed** | Catalog | Catalog name: `products` (update mode). Data source: File storage (SFTP) |
| **Variant Inventory Feed** | Catalog | Catalog name: `variants` (update mode). Data source: File storage (SFTP) |

---

## 5. Job Scheduling

Navigate to **Administration > Operations > Jobs** to schedule recurring job execution:

1. Open the job to be scheduled
2. Click on **Schedule and History** tab
3. Select **Trigger** (reoccurring intervals)
4. Configure the **From** and **To** dates if required
5. Set the run time for the job intervals:
   - Set the amount
   - Set the interval (Minutes, Hours, Days, Weeks, or Months)
   - Select the days on which you want to run the job

![Job Scheduling Configuration](./media/image16.png)

**Recommended Schedule:**

| Job Type | Frequency |
|----------|-----------|
| Full Export jobs | Manual execution or weekly |
| Delta/NewOrders jobs | Every 15-60 minutes |
| Inventory feeds | Every 15-30 minutes |

Repeat the above steps to schedule all required jobs.

---

## 6. Cartridge Uninstallation Guide

To uninstall the Bloomreach Engagement cartridge:

1. **Remove the Cartridge from the code base**
   - Delete the cartridge folders from your project

2. **Remove Cartridge name from Cartridges path**
   - Navigate to **Administration > Sites > Manage Sites**
   - Remove `int_bloomreach_engagement_sfra` or `int_bloomreach_engagement_controllers` and `int_bloomreach_engagement` from the cartridge path

3. **Remove configurations from Business Manager**
   - All configurations can be removed manually from Business Manager

4. **Remove CSV files from WebDAV**
   - Navigate to **Administration > Site Development > Development Setup**
   - Open the **Import/Export** folder
   - Open **src** folder
   - Copy WebDAV URL and open in new tab
   - Delete the **"bloomreach"** folder

![WebDAV Folder Deletion](./media/image17.jpeg)

---

## 7. Known Issues

The LINK Cartridge has no known issues.

---

## 8. Release History

| Version | Date | Changes |
|---------|------|---------|
| 26.01.0 | 2026-01-23 | Adds SFTP support |
| 21.10.0 | 2021-10-25 | Initial release |

---

## Appendix A: WebDAV Configuration (Development/Testing Alternative)

### WebDAV Overview

WebDAV is available as an alternative file transfer method for development and testing environments. However, it has significant limitations for production use.

**Limitations:**
- 90-day credential expiration (requires manual renewal)
- 10MB file size limitation
- Less secure than SSH key authentication
- Manual credential management required

**When to Use WebDAV:**
- Development environments
- Testing environments
- Quick proof-of-concept setups
- Environments where SFTP infrastructure is not available

> **Important:** For production environments, SFTP is strongly recommended.

### WebDAV Configuration Steps

#### Step 1: Generate WebDAV Credentials

1. Navigate to **BM > Administration > Site Development > Development Setup**
2. Click "WebDAV Access"
3. Generate new credentials (valid for 90 days)
4. Note the username and password

#### Step 2: Configure Bloomreach Imports for WebDAV

Instead of using SFTP integrations, configure imports with URL data source:

1. Navigate to **Bloomreach Account > Data & Assets > Imports**

![Create New Import](./media/image10.png)

2. Click **"+ New Import"**

3. Select Type: Customer (or other feed type)

![Select Import Type](./media/image11.png)

4. Configure Import:
   - **Name:** Customer Feed Import (WebDAV)
   - **Data source:** URL
   - **URL:** Enter the WebDAV URL to the CSV file
     - Example: `https://your-instance.demandware.net/on/demandware.servlet/webdav/Sites/Impex/src/bloomreach/customer-info-feed-preinit.csv`
   - **Username:** Your WebDAV username
   - **Password:** Your WebDAV password

![WebDAV URL Configuration](./media/image12.png)

5. Complete import configuration

![Import Configuration Complete](./media/image13.png)

6. Copy `import_id` from the URL and set in SFCC site preferences

![Copy Import ID from URL](./media/image14.png)

![Set Import IDs in SFCC](./media/image15.png)

#### Step 3: How Jobs Work with WebDAV

When SFTP credentials are NOT configured in SFCC:

1. Job generates CSV file in IMPEX folder
2. Job constructs WebDAV URL to the file
3. Job calls Bloomreach API with the WebDAV URL
4. Bloomreach fetches file directly from SFCC via WebDAV

**Credential Expiration Management:**
- Set calendar reminder for credential renewal (every 85 days)
- Update credentials in Bloomreach import definitions
- Re-generate WebDAV credentials in SFCC Business Manager

#### Step 4: Leave SFTP Fields Empty

To use WebDAV mode:

1. Navigate to **Merchant Tools > Site Preferences > Custom Preferences**
2. Find section: **BloomreachEngagementSFTP**
3. Leave ALL SFTP fields EMPTY or unconfigured
4. System will automatically use WebDAV

The system implicitly detects that SFTP credentials are not configured and uses WebDAV as the fallback method.

---

## Appendix B: Detailed SSH Key Generation Commands

This appendix provides detailed SSH key generation commands for various operating systems and environments.

> **Important:** Key generation commands vary by user's environment (Windows, Mac, Linux). Choose the appropriate commands for your system.

### Windows (Git Bash or WSL)

1. Open Git Bash or Windows Subsystem for Linux (WSL)

2. Navigate to your working directory:
```bash
mkdir -p ~/ssh
cd ~/ssh
```

3. Generate SSH key pair:
```bash
ssh-keygen -t rsa -b 4096 -m PEM -C "sfcc-bloomreach-prod" -f ./sfcc_bloomreach_rsa -N ""
```

4. Verify the format:
```bash
head -1 ./sfcc_bloomreach_rsa
```
Should show: `-----BEGIN RSA PRIVATE KEY-----`

5. Create self-signed certificate:
```bash
MSYS_NO_PATHCONV=1 openssl req -new -x509 -key ./sfcc_bloomreach_rsa -out ./sfcc_bloomreach_cert.pem -days 3650 -subj "/CN=sfcc-bloomreach-prod/O=Bloomreach/C=US"
```

6. Create PKCS12 bundle:
```bash
MSYS_NO_PATHCONV=1 openssl pkcs12 -export -in ./sfcc_bloomreach_cert.pem -inkey ./sfcc_bloomreach_rsa -out ./sfcc_bloomreach.p12 -name "sfcc-bloomreach-prod" -passout pass:
```

### Mac/Linux

1. Open Terminal

2. Navigate to your working directory:
```bash
mkdir -p ~/ssh
cd ~/ssh
```

3. Generate SSH key pair:
```bash
ssh-keygen -t rsa -b 4096 -m PEM -C "sfcc-bloomreach-prod" -f ./sfcc_bloomreach_rsa -N ""
```

4. Verify the format:
```bash
head -1 ./sfcc_bloomreach_rsa
```
Should show: `-----BEGIN RSA PRIVATE KEY-----`

5. Create self-signed certificate:
```bash
openssl req -new -x509 -key ./sfcc_bloomreach_rsa -out ./sfcc_bloomreach_cert.pem -days 3650 -subj "/CN=sfcc-bloomreach-prod/O=Bloomreach/C=US"
```

6. Create PKCS12 bundle:
```bash
openssl pkcs12 -export -in ./sfcc_bloomreach_cert.pem -inkey ./sfcc_bloomreach_rsa -out ./sfcc_bloomreach.p12 -name "sfcc-bloomreach-prod" -passout pass:
```

### Adding Public Keys to SFTP Server via SSH

Connect to your SFTP server:
```bash
ssh username@your-sftp-server.com -p 22
```

Create `.ssh` directory if it doesn't exist:
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

Add SFCC's public key to `authorized_keys`:
```bash
nano ~/.ssh/authorized_keys
# Paste the entire public key from sfcc_bloomreach_rsa.pub file
# Save and exit (Ctrl+X, then Y, then Enter)
```

Add Bloomreach's public key to `authorized_keys` (on a new line):
```bash
nano ~/.ssh/authorized_keys
# Paste the entire public key from Bloomreach (starts with ssh-rsa)
# Save and exit (Ctrl+X, then Y, then Enter)
```

Set proper permissions:
```bash
chmod 600 ~/.ssh/authorized_keys
```

Create feeds directory:
```bash
mkdir -p ~/feeds
chmod 755 ~/feeds
```

Exit:
```bash
exit
```

### Troubleshooting SSH Key Issues

**If SFCC Business Manager rejects the key:**

**Option 1:** Upload PKCS12 file
- File: `sfcc_bloomreach.p12`
- Password: Leave EMPTY

**Option 2:** Upload key + certificate separately
- Key: `sfcc_bloomreach_rsa`
- Certificate: `sfcc_bloomreach_cert.pem`
- Password: Leave EMPTY

**Option 3:** Create combined PEM file
```bash
cat ./sfcc_bloomreach_rsa ./sfcc_bloomreach_cert.pem > ./sfcc_bloomreach_combined.pem
```
- Key: `sfcc_bloomreach_combined.pem`
- Certificate: Leave empty
- Password: Leave EMPTY

**If none of the above work:**
- Use password authentication for SFCC (fallback option)
- Keep SSH key for Bloomreach (still more secure than WebDAV)
- Contact SFCC support for key format requirements

### Key Format Requirements

SFCC requires:
- RSA key (not ECDSA, not Ed25519)
- PEM format (not OpenSSH format)
- PKCS12 bundle preferred
- No passphrase (empty password)

If you see `BEGIN OPENSSH PRIVATE KEY` in your key file, regenerate with `-m PEM` flag.

---

*Document generated from merged Controllers and SFRA integration guides.*
