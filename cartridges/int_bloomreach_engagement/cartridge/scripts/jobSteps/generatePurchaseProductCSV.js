'use strict';

var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementPurchaseProductFeedExport');
const Order = require('dw/order/Order');
const Status = require('dw/system/Status');
const FileWriter = require('dw/io/FileWriter');
const HashMap = require('dw/util/HashMap');
const CSVStreamWriter = require('dw/io/CSVStreamWriter');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');

var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementHelper.js');
var currentSite = require('dw/system/Site').getCurrent();
var SFTPHelper = require('~/cartridge/scripts/helpers/SFTPHelper.js');

var fileNum = 0;
var ordersToProcess;
var processedAll = true;
var headers;
var csw;
var fw;
var rowsCount = 1;
var maxNoOfRows;
var targetFolder;
var FileNamePrefix;
var chunks = 0;
var SFCCAttributesValue;
var updateCustomDateExportPreference = false;
var feedFileGenerationDate;
var csvGeneratorHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementGenerateCSVHelper');
var generatePreInitFile = false;
var startImportByAPI = true;
var webDavFilePath;
var localCsvFile;

/**
 * Executed Before Processing of Chunk and Validates all required fields
 */
 exports.beforeStep = function () {
    var args = arguments[0];
    updateCustomDateExportPreference = args.UpdateFromDatePreference;
	maxNoOfRows = args.MaxNumberOfRows - 1000;
	targetFolder = args.TargetFolder;
	FileNamePrefix = args.FileNamePrefix;
	generatePreInitFile = args.GeneratePreInitFile;
    startImportByAPI = (args.StartImportByAPI !== undefined && args.StartImportByAPI !== null)
        ? args.StartImportByAPI
        : true;
    var orderStatusForExport = []; 
    if(args.NEW){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_NEW);
    }
    if(args.CANCELLED){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_CANCELLED);
    }
    if(args.OPEN){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_OPEN);
    }
    if(args.CREATED){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_CREATED);
    }
    if(args.FAILED){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_FAILED);
    }
    if(args.REPLACED){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_REPLACED);
    }
    if(args.COMPLETED){
    	orderStatusForExport.push('status=' + Order.ORDER_STATUS_COMPLETED);
    }
    try {	
    	feedFileGenerationDate = new Date();
    	var feedFile = csvGeneratorHelper.createPurchaseFeedFile(FileNamePrefix,targetFolder,fileNum);
        localCsvFile = feedFile; // Store for SFTP upload
        webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + feedFile.fullPath.toString();
    	fw = new FileWriter(feedFile);
    	csw = new CSVStreamWriter(fw);
    	var getAttrSitePref = csvGeneratorHelper.getPurchaseProductFeedFileHeaders();
    	var results = csvGeneratorHelper.getFeedAttributes(getAttrSitePref);
    	headers = results.headers;
    	SFCCAttributesValue = results.SFCCAttributesValue;
    	csw.writeNext(headers);	
    	
    	var PurchaseItemLastRun = null;
    	if (updateCustomDateExportPreference) {
    		var lastPurchaseItemExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastPurchaseItemExport');
    		PurchaseItemLastRun = lastPurchaseItemExportCO ? lastPurchaseItemExportCO.custom.lastExecution : null;
    	}
    	
    	ordersToProcess = csvGeneratorHelper.getOrdersForPurchaseFeed(orderStatusForExport,PurchaseItemLastRun);
    	
    	if (generatePreInitFile && ordersToProcess.hasNext()) {
	    	var firstOrder = ordersToProcess.next();
	    	
	    	const ArrayList = require('dw/util/ArrayList');
	    	var arrOrders = new ArrayList();
	    	arrOrders.push(firstOrder);
	
	    	ordersToProcess = arrOrders.iterator();
	    }
    } catch (e) {    	
        Logger.error('Error: {0}', e.message);
        return new Status(Status.ERROR);
    }
};

/**
 * Executed Before Processing of Chunk and Return total order processed
 * @returns {number} order count
 */
 exports.getTotalCount = function () {
  	if (generatePreInitFile)
 		return 1;

    Logger.info('Processed orders {0}', ordersToProcess.count);
    return ordersToProcess.count;
};

/**
 * Returns a single order to processed
 * @returns order - order
 */
 exports.read = function () { // eslint-disable-line consistent-return
    
    while (ordersToProcess.hasNext()) {
            return ordersToProcess.next();            
        }
};

/**
 * Process order and returns required field in array
 * @param order - Product
 * @returns {Array} csvOrderArray : Order Details
 */
 exports.process = function (bloomreachOrderObject) { // eslint-disable-line consistent-return
    try {
    	var order = csvGeneratorHelper.writePurchaseProductFeedRow(csw,headers,SFCCAttributesValue,bloomreachOrderObject);
        return order;
    } catch (ex) {
        processedAll = false;
        Logger.error('Not able to process order {0} having error {1}', bloomreachOrderObject.orderNo, ex.toString());
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
 * Writes a single order product to file
 * @param {dw.util.HashMap} lines to write
 */
 exports.write = function (lines) {
    if (rowsCount > maxNoOfRows) {
        splitFile();
    }
    for (var i = 0; i < lines.size(); i++) {
    	var productItemsRows = lines.get(i).toArray();
    	for (var j = 0; j < productItemsRows.length; ++j) {
			csw.writeNext(productItemsRows[j].toArray());
		}
    }
     
    rowsCount = rowsCount + lines.size();
};

function triggerFileImport(skipAPICall, startImportByAPI) {
    // Check if SFTP is configured (credentials-based, not failure-based)
    var sftpCheck = SFTPHelper.isSFTPEnabled();
    var filePath;

    if (sftpCheck.enabled) {
        // SFTP credentials are configured - use SFTP
        Logger.info('SFTP credentials detected. Uploading file via SFTP: {0}', localCsvFile.name);
        var uploadResult = SFTPHelper.uploadFile(localCsvFile, Logger);

        if (uploadResult.success) {
            filePath = uploadResult.remotePath;
            Logger.info('SFTP upload successful. File available at: {0}', filePath);
        } else {
            Logger.error('SFTP upload failed: {0}', uploadResult.error);
            throw new Error('SFTP upload failed: ' + uploadResult.error);
        }
    } else {
        // SFTP credentials not configured - use WebDAV
        if (sftpCheck.error) {
            Logger.info('SFTP not configured: {0}. Using WebDAV.', sftpCheck.error);
        }
        filePath = webDavFilePath;
        Logger.info('File available at WebDAV path: {0}', filePath);
    }

    if (skipAPICall) {
        Logger.info('Pre-init mode: skipping Bloomreach API import trigger. Use the generated CSV to configure an import in Bloomreach.');
        return;
    }

    if (!startImportByAPI) {
        Logger.info('StartImportByAPI=false: skipping Bloomreach API import trigger.');
        return;
    }

    var purchaseProductFeedImportId = currentSite.getCustomPreferenceValue("brEngPurchaseItemFeedImportId");

    if (!purchaseProductFeedImportId) {
        throw new Error('Missing Feed Import ID: brEngPurchaseItemFeedImportId. Configure in Business Manager Site Preferences.');
    }

    // Call Bloomreach API with appropriate file path
    try {
        var result = BREngagementAPIHelper.bloomReachEngagementAPIService(purchaseProductFeedImportId, filePath);
    } catch (e) {
        Logger.error('Error while triggering bloomreach import start {0}', e.message);
    }
}

function splitFile() {
    fw.flush();
    csw.close();
    fw.close();
    triggerFileImport(false, startImportByAPI);
    fileNum = fileNum + 1;
    rowsCount = 1;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }
	var feedFile = csvGeneratorHelper.createPurchaseFeedFile(FileNamePrefix,targetFolder,fileNum);
    localCsvFile = feedFile; // Update for SFTP uploads
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + feedFile.fullPath.toString();
    fw = new FileWriter(feedFile);
    csw = new CSVStreamWriter(fw);
    headers = JSON.parse(csvGeneratorHelper.getPurchaseProductFeedFileHeaders());
    csw.writeNext(Object.keys(headers));
}

/**
 * Executes after processing all the chunk and returns the status
 * @returns {Object} OK || ERROR
 */
 exports.afterStep = function () {
 	if (!generatePreInitFile) {
    	ordersToProcess.close();
    }
    fw.flush();
    csw.close();
    fw.close();
    if (processedAll) {
        triggerFileImport(generatePreInitFile, startImportByAPI);

        if(updateCustomDateExportPreference){
    		var currentSite = require('dw/system/Site').getCurrent();
    		if (currentSite) {
	            var siteCurrentTime = currentSite.getCalendar().getTime();
	            var lastPurchaseItemExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastPurchaseItemExport');
		    	if (lastPurchaseItemExportCO) {
			        Transaction.wrap(function() {
			            lastPurchaseItemExportCO.custom.lastExecution = siteCurrentTime;
			        });
		        } else {
		        	Transaction.wrap(function() {
		        		var newPurchaseItemExportCO = CustomObjectMgr.createCustomObject('BloomreachEngagementJobLastExecution', 'lastPurchaseItemExport');
		        		newPurchaseItemExportCO.custom.lastExecution = siteCurrentTime;
			        });
		        }
	        }
    	}
        Logger.info('Export Order Product Feed Successful');

        return new Status(Status.OK, 'OK', 'Export Order product Feed Successful');
    }
    throw new Error('Could not process all the orders');
};
