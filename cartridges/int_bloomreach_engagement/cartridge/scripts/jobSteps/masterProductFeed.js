/* Feedonomics Product Export Job */
'use strict';

var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementMasterProductFeedExport');;
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var Transaction = require('dw/system/Transaction');
var site = dw.system.Site.getCurrent();
var BloomreachEngagementProductFeedHelpers = require('~/cartridge/scripts/helpers/BloomreachEngagementProductFeedHelpers');
var BloomreachEngagementConstants = require('~/cartridge/scripts/util/productFeedConstants');
var FileUtils = require('~/cartridge/scripts/util/fileUtils');
var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementHelper.js');
var BRFileDownloadHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementFileDownloadHelper.js');
var currentSite = require('dw/system/Site').getCurrent();
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

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
var timeStamp = Date.now().toString();
var generatePreInitFile = false;
var webDavFilePath;

/**
 * Adds the column value to the CSV line Array of Product Feed export CSV file
 * @param {dw.catalog.Product} product - SFCC Product
 * @param {Array} csvProductArray - CSV  Array
 * @param {Object} columnValue - Catalog Feed Column
 */
 function writeProductExportField(product, csvProductArray, columnValue, isCustomAttribute) {
    var URLUtils = require('dw/web/URLUtils');
    var Site = require('dw/system/Site');
    var currentSite = Site.getCurrent();

    if (isCustomAttribute == 'false' || !isCustomAttribute) {
        if (columnValue == 'url') {
            csvProductArray.push(URLUtils.abs('Product-Show', 'pid', product.ID).toString());
        } else if (columnValue == 'exported_timestamp') {
            csvProductArray.push(timeStamp);
        } else if (columnValue == 'onlineFrom') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getTimeStamp(product.onlineFrom) || '');
        } else if (columnValue == 'primaryCategory') { 
            var primaryCategory = BloomreachEngagementProductFeedHelpers.getPrimaryCategory(product);
            var primaryCategoryName = primaryCategory ? primaryCategory.displayName : '';

            csvProductArray.push(primaryCategoryName || '');
        } else if(columnValue == 'categoryLevelTwo') {
            var categoryLevelTwo = BloomreachEngagementProductFeedHelpers.getCategoryLevel(product, 2);
            var categoryLevelTwoName = categoryLevelTwo ? categoryLevelTwo.displayName : '';

            csvProductArray.push(categoryLevelTwoName || '');
        } else if(columnValue == 'categoryLevelThree') {
            var categoryLevelThree = BloomreachEngagementProductFeedHelpers.getCategoryLevel(product, 3);
            var categoryLevelThreeName = categoryLevelThree ? categoryLevelThree.displayName : '';

            csvProductArray.push(categoryLevelThreeName || '');
        } else if(columnValue == 'primaryCategoryURL') {
            var category = BloomreachEngagementProductFeedHelpers.getPrimaryCategory(product);
            var categoryURL;

            if (category) {
                categoryURL = URLUtils.abs('Search-Show', 'cgid', category.ID).toString();
            }

            csvProductArray.push(categoryURL || '');
        } else if(columnValue == 'categoryLevelTwoURL') {
            var category = BloomreachEngagementProductFeedHelpers.getCategoryLevel(product, 2);
            var categoryURL;

            if (category) {
                categoryURL = URLUtils.abs('Search-Show', 'cgid', category.ID).toString();
            }

            csvProductArray.push(categoryURL || '');
        } else if(columnValue == 'categoryLevelThreeURL') {
            var category = BloomreachEngagementProductFeedHelpers.getCategoryLevel(product, 3);
            var categoryURL;

            if (category) {
                categoryURL = URLUtils.abs('Search-Show', 'cgid', category.ID).toString();
            }

            csvProductArray.push(categoryURL || '');
        } else if(columnValue == 'categoryPath') {
            var primaryCategory = BloomreachEngagementProductFeedHelpers.getPrimaryCategory(product);
            var primaryCategoryName = primaryCategory ? primaryCategory.displayName : '';
            var categoryLevelTwo = BloomreachEngagementProductFeedHelpers.getCategoryLevel(product, 2);
            var categoryLevelTwoName = categoryLevelTwo ? categoryLevelTwo.displayName : '';
            var categoryLevelThree = BloomreachEngagementProductFeedHelpers.getCategoryLevel(product, 3);
            var categoryLevelThreeName = categoryLevelThree ? categoryLevelThree.displayName : '';
            var categoryPath = (primaryCategoryName ? primaryCategoryName + '|' : '') + (categoryLevelTwoName ? categoryLevelTwoName + '|' : '') + (categoryLevelThreeName ? categoryLevelThreeName : '');
            csvProductArray.push(categoryPath);
        } else if(columnValue == 'categoriesIDs') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getCategoryIdlist(product));
        } else if(columnValue == 'price') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.calculateSalePrice(product));
        } else if(columnValue == 'priceLocalCurrency') {
            csvProductArray.push(currentSite.currencyCode);
        } else if(columnValue == 'image') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getProductImage(product));
        } else if(columnValue == 'active') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getActiveStatus(product));
        } else if(columnValue == 'online') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getOnlineStatus(product));
        } else if(columnValue == 'categorized') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getCategorizedStatus(product));
        } else if(columnValue == 'searchable') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getSearchableStatus(product));
        } else if(columnValue == 'have_price') {
            csvProductArray.push(BloomreachEngagementProductFeedHelpers.getHasPriceStatus(product));
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

    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    // Generate controller-based download URL (replaces WebDAV)
    webDavFilePath = BRFileDownloadHelper.generateDownloadUrl(csvFile);
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementProductFeedHelpers.generateCSVHeader(BloomreachEngagementConstants.EXPORT_TYPE.MASTERPRODUCT);
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
    // Push Products
    var ProductMgr = require('dw/catalog/ProductMgr');
    productsIter = ProductMgr.queryAllSiteProducts();
    
    if (generatePreInitFile && productsIter.hasNext()) {
    
    	while (productsIter.hasNext()) {
    		var product = productsIter.next();
    		
    		if (product.isMaster()) {
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
 * Executed Before Processing of Chunk and Return total products processed
 * @returns {number} products count
 */
 exports.getTotalCount = function () {
 	if (generatePreInitFile)
 		return 1;
 
    Logger.info('Processed products {0}', productsIter.count);
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
    try {
        if (product.isMaster()) {
            var csvProductArray = [];
            var currentColumn;
            SFCCAttributesValue.forEach(function (columnValue, index) { // eslint-disable-line
                currentColumn = columnValue;
                writeProductExportField(this, csvProductArray, columnValue.SFCCProductAttribute, columnValue.isCustom);
            }, product);
            return csvProductArray;
        }
    } catch (ex) {
        processedAll = false;
        Logger.info('Not able to process product {0} on column {1} having error : {2}', product.ID, currentColumn.SFCCProductAttribute, ex.toString());
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

function triggerFileImport() {
    var masterProductFeedImportId = currentSite.getCustomPreferenceValue("brEngProductFeedImportId");
    try {
        var result = BREngagementAPIHelper.bloomReachEngagementAPIService(masterProductFeedImportId, webDavFilePath);
    } catch (e) {
        Logger.error('Error while triggering bloomreach import start {0}', e.message);
    }
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
    // Generate controller-based download URL (replaces WebDAV)
    webDavFilePath = BRFileDownloadHelper.generateDownloadUrl(csvFile);
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementProductFeedHelpers.generateCSVHeader(BloomreachEngagementConstants.EXPORT_TYPE.MASTERPRODUCT);
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
        var currentSite = require('dw/system/Site').getCurrent();

        if (currentSite) {
            var siteCurrentTime =  currentSite.getCalendar().getTime();

            var lastMasterExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastMasterExport');
    		if (lastMasterExportCO) {
	        	Transaction.wrap(function() {
	            	lastMasterExportCO.custom.lastExecution = siteCurrentTime;
	        	});
        	} else {
        		Transaction.wrap(function() {
        			var newlastMasterExportCO = CustomObjectMgr.createCustomObject('BloomreachEngagementJobLastExecution', 'lastMasterExport');
        			newlastMasterExportCO.custom.lastExecution = siteCurrentTime;
	        	});
        	}
        }

        Logger.info('Export Product Feed Successful');
        triggerFileImport();
        return new Status(Status.OK, 'OK', 'Export Product Feed Successful');
    }
    throw new Error('Could not process all the products');
};
