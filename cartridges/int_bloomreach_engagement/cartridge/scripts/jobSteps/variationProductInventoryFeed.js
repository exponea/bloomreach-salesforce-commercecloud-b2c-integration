/* BloomreachEngagement Variations Product Inventory Export Job */
'use strict';

var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementVariationsInventoryFeedExport');;
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var Transaction = require('dw/system/Transaction');
var site = dw.system.Site.getCurrent();
var BloomreachEngagementProductInventoryFeedHelpers = require('~/cartridge/scripts/helpers/BloomreachEngagementProductInventoryFeedHelpers');
var BloomreachEngagementConstants = require('~/cartridge/scripts/util/productFeedConstants');
var FileUtils = require('~/cartridge/scripts/util/fileUtils');
var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementHelper.js');
var currentSite = require('dw/system/Site').getCurrent();
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var SFTPHelper = require('~/cartridge/scripts/helpers/SFTPHelper.js');

var productsIter;
var fileWriter;
var headerColumn;
var SFCCAttributesValue;
var csvWriter;
var chunks = 0;
var processedAll = true;
var rowsCount = 1;
var targetFolder;
var fileNamePrefix;
var maxNoOfRows;
var dateNow = Date.now();
var generatePreInitFile = false;
var webDavFilePath;
var localCsvFile;
var generatedFilePaths = []; // Track all generated CSV files for merging

/**
 * Adds the column value to the CSV line Array of Product Inventory Feed export CSV file
 * @param {dw.catalog.Product} product - SFCC Product
 * @param {Array} csvProductArray - CSV  Array
 * @param {Object} columnValue - Catalog Feed Column
 */
 function writeProductInventoryExportField(product, csvProductArray, columnValue, isCustomAttribute) {
    var URLUtils = require('dw/web/URLUtils');
    var Site = require('dw/system/Site');
    var currentSite = Site.getCurrent();

    if (isCustomAttribute == 'false' || !isCustomAttribute) {
        if (columnValue == 'preorderbackorderallocation') {
            csvProductArray.push(BloomreachEngagementProductInventoryFeedHelpers.getPreorderBackorderAllocation(product) || 0);
        } else if(columnValue == 'preorderbackorderhandling') {
            csvProductArray.push(BloomreachEngagementProductInventoryFeedHelpers.getPreorderBackorderHandling(product) || 0);
        } else if(columnValue == 'stockLevel') {
            csvProductArray.push(BloomreachEngagementProductInventoryFeedHelpers.getStockLevel(product) || 0);
        } else if(columnValue == 'masterProductID') {
            csvProductArray.push(BloomreachEngagementProductInventoryFeedHelpers.getMasterProductID(product) || '');
        } else {
            csvProductArray.push(columnValue in product ? product[columnValue] : '');
        }
    } else {
        csvProductArray.push(product.custom && columnValue in product.custom ? product.custom[columnValue]: '');
    }
 }

/**
 * Executed Before Processing of Chunk and Validates all required fields
 */
exports.beforeStep = function () {
    var args = arguments[0];

    targetFolder = args.TargetFolder;
    fileNamePrefix = args.FileNamePrefix
    maxNoOfRows = args.MaxNumberOfRows - 1000;
    generatePreInitFile = args.GeneratePreInitFile;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }

    // Initialize array to track all generated files
    generatedFilePaths = [];

    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    localCsvFile = csvFile; // Store for SFTP upload
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();

    // Track the first file
    generatedFilePaths.push(csvFile.fullPath);
    
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementProductInventoryFeedHelpers.generateCSVHeader(BloomreachEngagementConstants.EXPORT_TYPE.VARIATIONPRODUCT);
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
    // Push Products
    var ProductMgr = require('dw/catalog/ProductMgr');
    productsIter = ProductMgr.queryAllSiteProducts();

    if (generatePreInitFile && productsIter.hasNext()) {
    	while (productsIter.hasNext()) {
    		var product = productsIter.next();
    		
    		if (!product.isMaster()) {
    			const ArrayList = require('dw/util/ArrayList');
		    	var arrProducts = new ArrayList();
		    	arrProducts.push(product);
		
		    	productsIter = arrProducts.iterator();
		    	break;
    		}
    	}
    }
};

/**
 * Executed Before Processing of Chunk and Return total products processed for inventory
 * @returns {number} products count
 */
 exports.getTotalCount = function () {
 	if (generatePreInitFile)
 		return 1;

    Logger.info('Processed products inventory {0}', productsIter.count);
    return productsIter.count;
};

/**
 * Returns a single product to processed
 * @returns {dw.catalog.Product} product - Product
 */
 exports.read = function () { // eslint-disable-line consistent-return
    if (productsIter.hasNext()) {
        return productsIter.next();
    }
};

/**
 * Process product and returns required field in array
 * @param {dw.catalog.Product} product - Product
 * @returns {Array} csvProductArray : Product Details
 */
 exports.process = function (product) { // eslint-disable-line consistent-return
    var currentSite = require('dw/system/Site').getCurrent();
    var lastVariationInventoryExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastVariationInventoryExport');
    var VariationInventoryLastRun = lastVariationInventoryExportCO ? lastVariationInventoryExportCO.custom.lastExecution : null;
    var currentColumn;

    try {
        if (!product.isMaster() && BloomreachEngagementProductInventoryFeedHelpers.IsProductInventoryExportValid(product, VariationInventoryLastRun)) {
            var csvProductArray = [];

            SFCCAttributesValue.forEach(function (columnValue, index) { // eslint-disable-line
                currentColumn = columnValue;
                writeProductInventoryExportField(this, csvProductArray, columnValue.SFCCProductAttribute, columnValue.isCustom)

            }, product);

            return csvProductArray;
        }
    } catch (ex) {
        processedAll = false;
        Logger.info('Not able to process product {0} invnetory on column {1} having error : {2}', product.ID, currentColumn ? currentColumn.SFCCProductAttribute : '', ex.toString());
    }
};

/**
 * Executes after processing of every chunk
 */
 exports.afterChunk = function () {
    chunks++;
    Logger.info('Chunk {0} processed successfully', chunks);
};

/**
 * Writes a single product to file
 * @param {dw.util.List} lines to write
 */
exports.write = function (lines) {
    if (rowsCount > maxNoOfRows) {
        splitFile();
    }
    for (var i = 0; i < lines.size(); i++) {
        csvWriter.writeNext(lines.get(i).toArray());
    }
    rowsCount = rowsCount + lines.size();
};

/**
 * Attempt to upload file via SFTP with fallback to WebDAV
 * @param {dw.io.File} csvFile - CSV file to upload
 * @returns {Object} Upload result with success flag and optional error
 */
function attemptSFTPUpload(csvFile) {
    try {
        var sftpCheck = SFTPHelper.isSFTPEnabled();

        if (!sftpCheck.enabled) {
            if (sftpCheck.error) {
                Logger.warn('SFTP not enabled: {0}. Using WebDAV fallback.', sftpCheck.error);
            }
            return {success: false, usedFallback: true};
        }

        Logger.info('Attempting SFTP upload for file: {0}', csvFile.name);
        var uploadResult = SFTPHelper.uploadFile(csvFile, Logger);

        if (uploadResult.success) {
            Logger.info('SFTP upload successful: {0}', uploadResult.remotePath);
            return {success: true, remotePath: uploadResult.remotePath};
        } else {
            Logger.error('SFTP upload failed: {0}. Falling back to WebDAV.', uploadResult.error);
            return {success: false, error: uploadResult.error, usedFallback: true};
        }

    } catch (e) {
        Logger.error('SFTP upload exception: {0}. Falling back to WebDAV.', e.message);
        return {success: false, error: e.message, usedFallback: true};
    }
}

function triggerFileImport() {
    var variationProductFeedImportId = currentSite.getCustomPreferenceValue("brEngVariantInventoryFeedImportId");

    // Attempt SFTP upload if enabled
    var sftpResult = attemptSFTPUpload(localCsvFile);

    // Determine which file path to pass to Bloomreach API
    var filePath = webDavFilePath; // Default to WebDAV
    if (sftpResult.success && sftpResult.remotePath) {
        // SFTP upload succeeded - use SFTP path for Bloomreach to fetch from customer SFTP
        filePath = sftpResult.remotePath;
        Logger.info('Using SFTP path for Bloomreach API: {0}', filePath);
    } else {
        // SFTP failed or not enabled - use WebDAV fallback
        Logger.info('Using WebDAV path for Bloomreach API: {0}', filePath);
    }

    var result = BREngagementAPIHelper.bloomReachEngagementAPIService(variationProductFeedImportId, filePath);
}

function splitFile() {
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
    triggerFileImport();
    rowsCount = 1;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }

    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    localCsvFile = csvFile; // Store for SFTP upload
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();

    // Track the new split file
    generatedFilePaths.push(csvFile.fullPath);
    
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementProductInventoryFeedHelpers.generateCSVHeader(BloomreachEngagementConstants.EXPORT_TYPE.VARIATIONPRODUCT);
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
}

/**
 * Executes after processing all the chunk and returns the status
 * @returns {Object} OK || ERROR
 */
 exports.afterStep = function () {
 	if (!generatePreInitFile) {
    	productsIter.close();
    }
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();

    if (processedAll) {
    	triggerFileImport();

        var currentSite = require('dw/system/Site').getCurrent();

        if (currentSite) {
            var siteCurrentTime =  currentSite.getCalendar().getTime();
            var lastVariationInventoryExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastVariationInventoryExport');
	    	if (lastVariationInventoryExportCO) {
		        Transaction.wrap(function() {
		            lastVariationInventoryExportCO.custom.lastExecution = siteCurrentTime;
		        });
	        } else {
	        	Transaction.wrap(function() {
	        		var newlastVariationInventoryExportCO = CustomObjectMgr.createCustomObject('BloomreachEngagementJobLastExecution', 'lastVariationInventoryExport');
	        		newlastVariationInventoryExportCO.custom.lastExecution = siteCurrentTime;
		        });
	        }
        }

        Logger.info('Export Product Inventory Feed Successful');

        // Merge all generated files into LATEST file
        try {
            if (generatedFilePaths.length > 0) {
                Logger.info('Merging {0} file(s) into LATEST file', generatedFilePaths.length);
                var latestFilePath = FileUtils.mergeCSVFilesIntoLatest(generatedFilePaths, targetFolder, fileNamePrefix, Logger);
                
                // Upload LATEST file to SFTP if enabled
                if (latestFilePath) {
                    var latestFile = new File(latestFilePath);
                    var sftpCheck = SFTPHelper.isSFTPEnabled();
                    
                    if (sftpCheck.enabled) {
                        Logger.info('Uploading LATEST file to SFTP: {0}', latestFile.name);
                        var uploadResult = SFTPHelper.uploadFile(latestFile, Logger);
                        
                        if (uploadResult.success) {
                            Logger.info('LATEST file successfully uploaded to SFTP: {0}', uploadResult.remotePath);
                        } else {
                            Logger.warn('LATEST file upload to SFTP failed: {0}. File remains accessible via WebDAV.', uploadResult.error);
                        }
                    }
                }
            }
        } catch (e) {
            Logger.error('Error while creating LATEST file: {0}', e.message);
            // Don't fail the job if LATEST file creation fails
        }

        return new Status(Status.OK, 'OK', 'Export Product Feed Successful');
    }

    throw new Error('Could not process all the products inventory');
};
