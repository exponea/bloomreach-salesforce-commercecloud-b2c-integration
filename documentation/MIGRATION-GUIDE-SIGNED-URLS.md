# Migration Guide: WebDAV URLs to Signed URLs

## Quick Summary

**What changed:** File downloads for Bloomreach Engagement imports now use signed controller URLs instead of WebDAV URLs.

**Why:** WebDAV credentials expire, causing import failures. Signed URLs provide secure, credential-free access.

**Impact:** Low - automatic migration with one configuration step required.

## Pre-Migration Checklist

- [ ] Review this migration guide completely
- [ ] Schedule maintenance window (15 minutes recommended)
- [ ] Backup current site preferences
- [ ] Ensure cartridge path is correct
- [ ] Test in sandbox environment first
- [ ] Generate URL signing secret
- [ ] Coordinate with Bloomreach team (optional, for monitoring)

## Migration Steps

### Step 1: Pre-Migration Validation (5 minutes)

1. **Verify current integration is working**
   ```
   - Run a test customer feed export job
   - Confirm job completes successfully
   - Verify data appears in Bloomreach
   ```

2. **Check current cartridge versions**
   ```bash
   # In your local repository
   git branch
   git status
   ```

3. **Document current configuration**
   - Take screenshots of site preferences
   - Note current export job schedules
   - Record any custom modifications

### Step 2: Deploy Updated Cartridges (5 minutes)

1. **Upload cartridges**
   ```bash
   cd bloomreach-salesforce-commercecloud-b2c-integration
   npm run uploadCartridge
   ```

2. **Verify upload succeeded**
   - Check upload logs for errors
   - Confirm timestamp in Business Manager > Administration > Site Development > Code Deployment

3. **Verify cartridge path** (if not already correct)
   ```
   Business Manager > Administration > Sites > Manage Sites > [Your Site] > Settings
   
   For SFRA:
   int_bloomreach_engagement_sfra:int_bloomreach_engagement:app_storefront_base
   
   For Controllers:
   int_bloomreach_engagement_controllers:int_bloomreach_engagement:app_storefront_controllers:app_storefront_core
   ```

### Step 3: Configure URL Signing Secret (3 minutes)

1. **Generate secret** (choose one method):

   **Method A - Node.js:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   **Method B - Using helper function in Script Debugger:**
   ```javascript
   var URLSigningHelper = require('int_bloomreach_engagement/cartridge/scripts/helpers/URLSigningHelper');
   var secret = URLSigningHelper.generateRandomSecret();
   print('Secret: ' + secret);
   ```

2. **Configure in Business Manager:**
   ```
   Navigation: Merchant Tools > Site Preferences > Custom Preferences > Bloomreach Engagement API
   
   Field: URL Signing Secret
   Value: [paste your generated secret]
   
   Click: Save
   ```

3. **Verify configuration saved:**
   - Refresh the page
   - Confirm the field shows dots/asterisks (password field)

### Step 4: Test Migration (2 minutes)

1. **Run a small test export**
   ```
   Business Manager > Administration > Operations > Jobs
   
   Select: Bloomreach Customer Feed Export (or smallest feed)
   Click: Run Now
   ```

2. **Check job logs for new URL format:**
   ```
   Expected log messages:
   ✓ "Generated signed URL for file: [path], expires: [date]"
   ✓ "bloomreach.engagement.service call URL: [bloomreach API URL]"
   ✓ "Export Customer Feed Successful"
   
   Old format (should NOT see):
   ✗ "webdav/Sites/impex/..."
   ```

3. **Verify file download works:**
   ```
   Option A: Check Bloomreach import status
   - Log into Bloomreach
   - Go to Data & Assets > Imports
   - Verify import started and completed
   
   Option B: Test URL directly
   - Copy signed URL from job logs
   - Paste in browser (should download CSV file)
   - Note: URL will work for 72 hours by default
   ```

### Step 5: Monitor First Production Run (Ongoing)

1. **Let scheduled jobs run normally**
   - No need to manually trigger all jobs
   - Each will automatically use signed URLs on next run

2. **Monitor for 24 hours:**
   ```
   Check logs for:
   - Successful URL generation
   - Successful downloads (in custom.log or specific logger)
   - Bloomreach import success
   ```

3. **Success criteria:**
   - All export jobs complete successfully
   - Signed URLs appear in logs
   - Bloomreach receives and imports data
   - No "authentication failed" or "expired credential" errors

## Rollback Plan

If issues occur, you can rollback:

### Option A: Rollback Code (if cartridge issues)

1. **Revert to previous cartridge version**
   ```bash
   git checkout [previous-commit-or-tag]
   npm run uploadCartridge
   ```

2. **Remove URL signing secret**
   ```
   Business Manager > Site Preferences
   Clear: URL Signing Secret
   Save
   ```

### Option B: Quick Fix (if configuration issue)

1. **Check secret is correctly configured**
   - Verify no extra spaces or characters
   - Ensure field is not empty
   - Try regenerating and reconfiguring secret

2. **Check cartridge path**
   - Verify order is correct
   - Restart application servers if needed

3. **Review logs for specific error**
   - "URL signing secret not configured" → Check site preference
   - "Invalid signature" → Regenerate secret, restart jobs
   - "File not found" → Check export directory permissions

## Verification Checklist

After migration, verify:

- [ ] All export jobs complete successfully
- [ ] Job logs show "Generated signed URL" messages
- [ ] Bloomreach imports are successful
- [ ] No WebDAV-related errors in logs
- [ ] No "authentication failed" errors
- [ ] Download URLs work when tested in browser (within expiration time)
- [ ] Multiple job runs work consistently

## Common Migration Issues

### Issue 1: "URL signing secret not configured"

**Symptoms:**
- Job fails immediately
- Error in logs: "Error while triggering bloomreach engagement api: URL signing secret not configured"

**Solution:**
```
1. Go to Business Manager > Site Preferences
2. Find "Bloomreach Engagement API" section
3. Set "URL Signing Secret" field
4. Save configuration
5. Re-run job
```

### Issue 2: URLs still show WebDAV format

**Symptoms:**
- Logs show: `webdav/Sites/impex/...`
- No "Generated signed URL" messages

**Solution:**
```
1. Verify cartridges uploaded successfully
2. Check timestamp in Code Deployment
3. Verify cartridge path includes int_bloomreach_engagement
4. Restart application servers
5. Re-run job
```

### Issue 3: "Invalid signature" errors in Bloomreach downloads

**Symptoms:**
- Job completes successfully
- URLs generated
- Bloomreach cannot download files (403 errors)

**Solution:**
```
1. Check logs for signature verification errors
2. Verify same secret in all application servers
3. Ensure system time is correct (affects expiration)
4. Test download URL directly in browser
5. If needed, regenerate secret and re-run job
```

### Issue 4: Downloads work but imports fail

**Symptoms:**
- URLs work in browser
- Bloomreach can download file
- Import doesn't start or fails

**Solution:**
```
This is likely NOT related to signed URLs migration.
Check:
- File format/content (still CSV?)
- Bloomreach import configuration
- File size limits
- Network connectivity to Bloomreach
```

## Environment-Specific Notes

### Development/Sandbox
- Use shorter expiration (24 hours) for faster testing
- Test secret rotation scenarios
- Validate error handling

### Staging
- Mirror production configuration
- Test full job schedule cycle
- Verify monitoring and alerts work

### Production
- Use default 72-hour expiration
- Schedule migration during low-traffic period
- Have rollback plan ready
- Monitor closely for 24-48 hours

## Post-Migration Recommendations

### Week 1:
- Monitor all job executions daily
- Check Bloomreach import success rates
- Review logs for any signature/expiration errors
- Document any issues and resolutions

### Week 2-4:
- Reduce monitoring to weekly checks
- Verify long-term reliability
- Update runbooks if needed
- Train support team on new troubleshooting steps

### Ongoing:
- Include secret in disaster recovery procedures
- Schedule secret rotation (every 6-12 months)
- Keep documentation updated
- Monitor expiration errors (may indicate need to increase expiration time)

## Testing in Sandbox (Recommended)

Before production migration, test in sandbox:

1. **Deploy to sandbox**
   ```bash
   # Update dw.json to point to sandbox
   npm run uploadCartridge
   ```

2. **Configure sandbox site preferences**
   - Use different secret than production
   - Test with shorter expiration (e.g., 1 hour)

3. **Run all export job types**
   - Customer Feed
   - Product Feed (Master)
   - Product Feed (Variations)
   - Product Inventory Feed
   - Purchase Feed
   - Purchase Item Feed

4. **Test edge cases**
   - Let URL expire, verify error handling
   - Modify URL parameters, verify rejection
   - Test with special characters in filenames

5. **Document results**
   - All jobs succeeded: ✓
   - URLs generated correctly: ✓
   - Downloads work: ✓
   - Bloomreach imports successful: ✓

## Timeline

**Recommended migration timeline:**

| Day | Activity | Duration |
|-----|----------|----------|
| Day 1 | Test in sandbox | 2 hours |
| Day 2-3 | Review results, document issues | 1 hour |
| Day 4 | Deploy to staging | 1 hour |
| Day 5 | Monitor staging | 1 hour |
| Day 6-7 | Deploy to production | 1 hour |
| Day 8-14 | Monitor production closely | 30 min/day |
| Day 15+ | Normal monitoring | As usual |

**Total effort:** ~6-8 hours spread over 2 weeks

## Support Contacts

If you encounter issues during migration:

1. **Check documentation:**
   - SIGNED-URL-SETUP.md
   - This migration guide
   - Troubleshooting section in setup guide

2. **Review logs:**
   - Job execution logs
   - Custom log files
   - Controller logs (for download attempts)

3. **Contact support:**
   - Include: Job logs, controller logs, configuration screenshots
   - Specify: Environment, job type, error messages
   - Attach: Any relevant log excerpts

## FAQ

**Q: Do I need to re-configure Bloomreach?**
A: No. The import configuration in Bloomreach doesn't need to change. The new URLs work the same way.

**Q: What happens to jobs running during deployment?**
A: Running jobs will complete with old WebDAV URLs. New jobs after deployment use signed URLs.

**Q: How long do signed URLs last?**
A: Default 72 hours, configurable per job type if needed.

**Q: Can Bloomreach cache old WebDAV URLs?**
A: No. Each job run generates fresh URLs, and Bloomreach processes them immediately.

**Q: What if I forget to configure the secret?**
A: Jobs will fail immediately with clear error message. Configure secret and re-run.

**Q: Can I use the same secret across environments?**
A: Technically yes, but recommended to use different secrets per environment for security.

**Q: Do I need to change job schedules?**
A: No. Job schedules remain unchanged.

**Q: Will this affect historical data?**
A: No. This only affects new export jobs. Historical data in Bloomreach is unaffected.

## Success Story Template

After successful migration, document for your team:

```
Migration Summary: Bloomreach Signed URLs
Date: [DATE]
Environment: [SANDBOX/STAGING/PRODUCTION]

✓ Cartridges deployed successfully
✓ URL signing secret configured
✓ Test job completed successfully
✓ All scheduled jobs running normally
✓ Bloomreach imports successful
✓ No errors in logs

Issues encountered: [NONE / LIST ANY]
Resolution: [IF APPLICABLE]
Downtime: [NONE / DURATION]

Verified by: [YOUR NAME]
Date verified: [DATE]
```

Share with team and keep for future reference.

