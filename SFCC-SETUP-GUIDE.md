# SFCC Development Setup Guide

## 1. Configure dw.json

The `dw.json` file has been created in the project root. You need to update it with your SFCC sandbox credentials.

### Required Information:

1. **hostname**: Your SFCC sandbox hostname
   - Format: `your-sandbox-name.demandware.net`
   - Example: `dev01-realm-customer.demandware.net`
   - Find it in: Business Manager URL or Account Manager

2. **username**: Your Business Manager username
   - Usually your email address
   - Example: `developer@company.com`

3. **password**: Your Business Manager password
   - Your account password
   - **Important**: This file is in `.gitignore` - never commit it!

4. **code-version**: The code version on your sandbox
   - Default: `version1`
   - Find it in: Business Manager > Administration > Site Development > Code Deployment
   - You can also create a new version if needed

### How to Find Your Credentials:

#### Option A: From Business Manager
1. Log into Business Manager
2. Look at the URL: `https://[YOUR-HOSTNAME]/on/demandware.store/...`
3. The hostname is the part before `/on/demandware.store`

#### Option B: From Account Manager
1. Go to Account Manager: https://account.demandware.com
2. Navigate to your sandbox instance
3. Copy the hostname from the instance details

### Example Configuration:

```json
{
    "hostname": "dev01-acme-customer.demandware.net",
    "username": "developer@acme.com",
    "password": "YourSecurePassword123!",
    "code-version": "version1",
    "cartridge": [
        "int_bloomreach_engagement",
        "int_bloomreach_engagement_controllers",
        "int_bloomreach_engagement_sfra"
    ]
}
```

## 2. Enable WebDAV Access

Before uploading code, you need to enable WebDAV access:

1. Log into **Business Manager**
2. Navigate to: **Administration > Organization > WebDAV Client Permissions**
3. Add your username to the allowed list
4. Grant permissions:
   - ✅ Read
   - ✅ Write
   - ✅ Create
   - ✅ Delete

## 3. Verify Code Version

1. In Business Manager, go to: **Administration > Site Development > Code Deployment**
2. Check if your `code-version` exists (default: `version1`)
3. If not, create a new code version or use an existing one
4. Update the `code-version` field in `dw.json` accordingly

## 4. Upload Cartridges

Once `dw.json` is configured, upload your cartridges:

```bash
# Upload all Bloomreach cartridges
npm run uploadCartridge
```

Or upload manually using sgmf-scripts:

```bash
# Upload specific cartridge
npx sgmf-scripts --uploadCartridge int_bloomreach_engagement_sfra
```

## 5. Configure Cartridge Path

After uploading, configure the cartridge path in Business Manager:

### For SFRA Sites:
1. Go to: **Administration > Sites > Manage Sites > [Your Site] > Settings**
2. Find the **Cartridges** field
3. Add Bloomreach cartridges in the correct order:

```
int_bloomreach_engagement_sfra:app_storefront_base
```

### For Controllers (SiteGenesis) Sites:
```
int_bloomreach_engagement_controllers:app_storefront_controllers:app_storefront_core
```

### Cartridge Path Rules:
- Cartridges are evaluated **left to right**
- Earlier cartridges override later ones
- Always put custom cartridges before base cartridges

## 6. Development Workflow

### Daily Workflow:
```bash
# 1. Ensure you're using Node 16
nvm use 16

# 2. Make your code changes locally

# 3. Lint your code (optional but recommended)
npm run lint

# 4. Compile assets (if you changed JS/SCSS)
npm run compile:js
npm run compile:scss

# 5. Upload to sandbox
npm run uploadCartridge

# 6. Test on your sandbox
```

### Available npm Scripts:
- `npm run lint` - Check code quality
- `npm run upload` - Upload files (with path)
- `npm run uploadCartridge` - Upload all cartridges
- `npm run compile:js` - Compile JavaScript
- `npm run compile:scss` - Compile SCSS

## 7. Troubleshooting

### "Authentication failed" error:
- ✅ Check username/password in `dw.json`
- ✅ Verify WebDAV permissions are enabled
- ✅ Ensure your account is not locked

### "Code version not found" error:
- ✅ Check the code version exists in Business Manager
- ✅ Update `code-version` in `dw.json`

### "Cartridge not found" error:
- ✅ Verify cartridges were uploaded successfully
- ✅ Check cartridge path in Business Manager
- ✅ Ensure cartridge names are spelled correctly

### Upload is slow:
- ✅ Upload only changed files using `--upload` with specific paths
- ✅ Use a VPN if required by your organization
- ✅ Check your internet connection

## 8. Security Best Practices

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Never commit `dw.json`** - It contains your password!
2. The file is already in `.gitignore` - keep it there
3. Use strong passwords for SFCC accounts
4. Rotate passwords regularly
5. Don't share `dw.json` via email or chat
6. Each developer should have their own credentials

## 9. Alternative: VS Code Prophet Debugger

Instead of using `dw.json`, you can also use the **Prophet Debugger** extension:

1. Install: [Prophet Debugger](https://marketplace.visualstudio.com/items?itemName=SqrTT.prophet)
2. Configure in VS Code settings
3. Provides debugging capabilities
4. Can upload/download code directly from VS Code

## 10. Next Steps

After setup:
1. ✅ Configure Bloomreach Engagement credentials in Business Manager
2. ✅ Set up custom site preferences
3. ✅ Configure job schedules for data feeds
4. ✅ Test integration with your storefront
5. ✅ Review documentation in `/documentation` folder

## Need Help?

- Check SFCC documentation: https://documentation.b2c.commercecloud.salesforce.com/
- Review Bloomreach integration guides in `/documentation`
- Contact your SFCC account manager for sandbox access issues

