/* Feedonomics Product Export Job */
'use strict';

var Logger = require('dw/system/Logger').getLogger('ExponeaVariationProductFeedExport');;
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var Transaction = require('dw/system/Transaction');
var site = dw.system.Site.getCurrent();
var ExponeaProductFeedHelpers = require('~/cartridge/scripts/helpers/ExponeaProductFeedHelpers');
var ExponeaConstants = require('~/cartridge/scripts/util/ExponeaProductFeedConstants');
var FileUtils = require('~/cartridge/scripts/util/fileUtils');
var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomReachEngagementHelper.js');

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
var timeStamp = dateNow + '\t';
var generatePreInitFile = false;


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
        if (columnValue == 'masterProduct') {
            csvProductArray.push(columnValue in product ? product.masterProduct.ID : '');
        } else if (columnValue == 'exported_timestamp') {
            csvProductArray.push(timeStamp || '');
        } else if (columnValue == 'onlineFrom') {
            csvProductArray.push(ExponeaProductFeedHelpers.getTimeStamp(product.onlineFrom) || '');
        } else if (columnValue == 'url') {
            csvProductArray.push(URLUtils.abs('Product-Show', 'pid', product.ID).toString());
        } else if(columnValue == 'primaryCategory') {
            var primaryCategory = ExponeaProductFeedHelpers.getPrimaryCategory(product);
            var primaryCategoryName = primaryCategory ? primaryCategory.displayName : '';

            csvProductArray.push(primaryCategoryName || '');
        } else if(columnValue == 'categoryLevelTwo') {
            var categoryLevelTwo = ExponeaProductFeedHelpers.getCategoryLevel(product, 2);
            var categoryLevelTwoName = categoryLevelTwo ? categoryLevelTwo.displayName : '';

            csvProductArray.push(categoryLevelTwoName || '');
        } else if(columnValue == 'categoryLevelThree') {
            var categoryLevelThree = ExponeaProductFeedHelpers.getCategoryLevel(product, 3);
            var categoryLevelThreeName = categoryLevelThree ? categoryLevelThree.displayName : '';

            csvProductArray.push(categoryLevelThreeName || '');
        } else if(columnValue == 'primaryCategoryURL') {
            var category = ExponeaProductFeedHelpers.getPrimaryCategory(product);
            var categoryURL;

            if (category) {
                categoryURL = URLUtils.abs('Search-Show', 'cgid', category.ID).toString();
            }

            csvProductArray.push(categoryURL || '');
        } else if(columnValue == 'categoryLevelTwoURL') {
            var category = ExponeaProductFeedHelpers.getCategoryLevel(product, 2);
            var categoryURL;

            if (category) {
                categoryURL = URLUtils.abs('Search-Show', 'cgid', category.ID).toString();
            }

            csvProductArray.push(categoryURL || '');
        } else if(columnValue == 'categoryLevelThreeURL') {
            var category = ExponeaProductFeedHelpers.getCategoryLevel(product, 3);
            var categoryURL;

            if (category) {
                categoryURL = URLUtils.abs('Search-Show', 'cgid', category.ID).toString();
            }

            csvProductArray.push(categoryURL || '');
        } else if(columnValue == 'categoryPath') {
            var primaryCategory = ExponeaProductFeedHelpers.getPrimaryCategory(product);
            var primaryCategoryName = primaryCategory ? primaryCategory.displayName : '';
            var categoryLevelTwo = ExponeaProductFeedHelpers.getCategoryLevel(product, 2);
            var categoryLevelTwoName = categoryLevelTwo ? categoryLevelTwo.displayName : '';
            var categoryLevelThree = ExponeaProductFeedHelpers.getCategoryLevel(product, 3);
            var categoryLevelThreeName = categoryLevelThree ? categoryLevelThree.displayName : '';
            var categoryPath = (primaryCategoryName ? primaryCategoryName + '|' : '') + (categoryLevelTwoName ? categoryLevelTwoName + '|' : '') + (categoryLevelThreeName ? categoryLevelThreeName : '');
            csvProductArray.push(categoryPath);
        } else if(columnValue == 'categoriesIDs') {
            csvProductArray.push(ExponeaProductFeedHelpers.getCategoryIdlist(product));
        } else if(columnValue == 'price') {
            csvProductArray.push(ExponeaProductFeedHelpers.calculateSalePrice(product));
        } else if(columnValue == 'priceLocalCurrency') {
            var currentSite = Site.getCurrent();
            csvProductArray.push(currentSite.currencyCode);
        } else if(columnValue == 'color') {
            var variationValue = JSON.parse(ExponeaProductFeedHelpers.getAllVariationAttrs(product));
            csvProductArray.push(variationValue && 'color' in variationValue ? variationValue.color : '');
        } else if(columnValue == 'size') {
            var variationValue = JSON.parse(ExponeaProductFeedHelpers.getAllVariationAttrs(product));
            csvProductArray.push(variationValue && 'size' in variationValue ? variationValue.size : '');
        } else if(columnValue == 'image') {
            csvProductArray.push(ExponeaProductFeedHelpers.getProductImage(product));
        } else if(columnValue == 'active') {
            csvProductArray.push(ExponeaProductFeedHelpers.getActiveStatus(product));
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
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = ExponeaProductFeedHelpers.generateCSVHeader(ExponeaConstants.EXPORT_TYPE.VARIATIONPRODUCT);
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
        if (!product.isMaster()) {
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

function splitFile() {
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
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
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = ExponeaProductFeedHelpers.generateCSVHeader(ExponeaConstants.EXPORT_TYPE.VARIATIONPRODUCT);
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

            Transaction.wrap(function() {
                currentSite.setCustomPreferenceValue("BRVariationExportLastRun", siteCurrentTime);
            });
        }

        Logger.info('Export Product Feed Successful');
        var variationProductFeedImportId = currentSite.getCustomPreferenceValue("bloomreachVariationProductFeed-Import_id");
        try {
            var result = BREngagementAPIHelper.bloomReachEngagementAPIService(variationProductFeedImportId);
        } catch (e) {
            Logger.error('Error while triggering bloomreach import start {0}', e.message);
        }
        return new Status(Status.OK, 'OK', 'Export Product Feed Successful');
    }
    throw new Error('Could not process all the products');
};