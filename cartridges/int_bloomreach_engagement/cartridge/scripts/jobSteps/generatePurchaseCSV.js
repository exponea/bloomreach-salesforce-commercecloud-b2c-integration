'use strict';

const Logger = require('dw/system/Logger');
const Order = require('dw/order/Order');
const Status = require('dw/system/Status');
const FileWriter = require('dw/io/FileWriter');
const CSVStreamWriter = require('dw/io/CSVStreamWriter');
var Transaction = require('dw/system/Transaction');

const bloomreachLogger = Logger.getLogger('bloomreach_purchase_job', 'bloomreach');
const logger = Logger.getLogger('Bloomreach', 'bloomreach');
var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementHelper.js');
var currentSite = require('dw/system/Site').getCurrent();
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

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
var headers;
var SFCCAttributesValue;
var updateCustomDateExportPreference = false;
var feedFileGenerationDate;
var csvGeneratorHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementGenerateCSVHelper');
var generatePreInitFile = false;
var webDavFilePath;

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
        webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + feedFile.fullPath.toString();
    	fw = new FileWriter(feedFile);
    	csw = new CSVStreamWriter(fw);
    	var getAttrSitePref = csvGeneratorHelper.getPurchaseFeedFileHeaders();
    	var results = csvGeneratorHelper.getFeedAttributes(getAttrSitePref);
    	headers = results.headers;
    	SFCCAttributesValue = results.SFCCAttributesValue;
    	csw.writeNext(headers);
    	
    	var PurchaseLastRun = null;
    	if (updateCustomDateExportPreference) {
    		var lastPurchaseExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastPurchaseExport');
    		PurchaseLastRun = lastPurchaseExportCO ? lastPurchaseExportCO.custom.lastExecution : null;
    	}
 
    	ordersToProcess = csvGeneratorHelper.getOrdersForPurchaseFeed(orderStatusForExport,PurchaseLastRun);
    	
    	if (generatePreInitFile && ordersToProcess.hasNext()) {
	    	var firstOrder = ordersToProcess.next();
	    	
	    	const ArrayList = require('dw/util/ArrayList');
	    	var arrOrders = new ArrayList();
	    	arrOrders.push(firstOrder);
	
	    	ordersToProcess = arrOrders.iterator();
	    }
    	
    } catch (e) {    	
        logger.error('Error: {0}', e.message);
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
    	var csvOrderArray = csvGeneratorHelper.writePurchaseFeedRow(csw,headers,SFCCAttributesValue,bloomreachOrderObject);
        return csvOrderArray;
    } catch (ex) {
        processedAll = false;
        Logger.info('Not able to process order {0} having error {1}', bloomreachOrderObject.orderNo, ex.toString());
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
 * Writes a single order to file
 * @param {dw.util.List} lines to write
 */
 exports.write = function (lines) {
    if (rowsCount > maxNoOfRows) {
        splitFile();
    }
    for (var i = 0; i < lines.size(); i++) {
        csw.writeNext(lines.get(i).toArray());
    }
    rowsCount = rowsCount + lines.size();
};

function triggerFileImport() {
    var purchaseFeedImportId = currentSite.getCustomPreferenceValue("brEngPurchaseFeedImportId");
    var result = BREngagementAPIHelper.bloomReachEngagementAPIService(purchaseFeedImportId, webDavFilePath);
}

function splitFile() {
    fw.flush();
    csw.close();
    fw.close();
    triggerFileImport();
    fileNum = fileNum + 1;
    rowsCount = 1;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }
	var feedFile = csvGeneratorHelper.createPurchaseFeedFile(FileNamePrefix,targetFolder,fileNum);
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + feedFile.fullPath.toString();
    fw = new FileWriter(feedFile);
    csw = new CSVStreamWriter(fw);
    headers = JSON.parse(csvGeneratorHelper.getPurchaseFeedFileHeaders());
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
        triggerFileImport();
        
        if(updateCustomDateExportPreference) {
    		if (currentSite) {
	            var siteCurrentTime = currentSite.getCalendar().getTime();
	            var lastPurchaseExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastPurchaseExport');
		    	if (lastPurchaseExportCO) {
			        Transaction.wrap(function() {
			            lastPurchaseExportCO.custom.lastExecution = siteCurrentTime;
			        });
		        } else {
		        	Transaction.wrap(function() {
		        		var newPurchaseExportCO = CustomObjectMgr.createCustomObject('BloomreachEngagementJobLastExecution', 'lastPurchaseExport');
		        		newPurchaseExportCO.custom.lastExecution = siteCurrentTime;
			        });
		        }
	        }
    	}

    	Logger.info('Export Order Feed Successful');

        return new Status(Status.OK, 'OK', 'Export Order Feed Successful');
    }
    throw new Error('Could not process all the orders');
};
