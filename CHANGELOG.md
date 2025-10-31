## Changelog Highlights (since `ec43840e`)

### Controller-Based File Downloads
- Introduced a secure download flow that replaces WebDAV URLs:
  - New controller `cartridges/int_bloomreach_engagement_controllers/cartridge/controllers/BloomreachFileDownload.js`.
  - Helper `BloomreachEngagementFileDownloadHelper` creates URLs only after files exist, validates credentials, and enforces a whitelist of safe IMPEX subdirectories.
  - Site preferences now expose `brEngDownloadUsername` / `brEngDownloadPassword` (see updated `metadata/site-template/meta/system-objecttype-extensions.xml` and `.vscode/system-objecttype-extensions.d.ts`).

### Feed Generation Improvements
- All job steps now flush/close CSV writers before starting Bloomreach imports, eliminating race conditions on chunk boundaries (`customerInfoFeed`, `generatePurchaseCSV`, `generatePurchaseProductCSV`, `masterProductFeed`, `masterProductInventoryFeed`, `variationProductFeed`, `variationProductInventoryFeed`).
- Added per-job tracking of the “current” CSV so download links are generated only after successful writes.
- Product feeds can publish a static `*-LATEST.csv` that concatenates split files—handled by new helpers in `fileUtils.js`.
- Inventory feeds include the master product ID (`BloomreachEngagementProductInventoryFeedHelpers` + metadata defaults).

### Code Quality & Compatibility Fixes
- `steptypes.json` now expresses default values as strings and fixes description typos for better validation.
- Replaced Script API `for each` loops with iterator-based `while` loops for SFCC compatibility.
- Removed SFRA-style type annotations that were causing compilation issues (`SitePreferences` variables).
- Timestamp helpers now return seconds (fixes Bloomreach import expectations).

### Testing & Tooling
- Built a full SFCC mocking framework under `test/mocks/`, plus a test harness (`test/setup.js`).
- Added unit tests for helpers and job steps (`test/helpers/`, `test/jobSteps/`, `test/util/fileUtils.test.js`), all with descriptive comments per user preference.
- Integration test suite (`test/integration/`) validates the new download controller end-to-end; the tests are opt-in via `INTEGRATION_TEST=true`.

### Follow-Up Recommendations
- Configure the new download endpoint credentials in Business Manager before deploying.