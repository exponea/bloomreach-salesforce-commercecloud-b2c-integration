/* Exponea Customer Info Export Job */
'use strict';

var Logger = require('dw/system/Logger').getLogger('ExponeaCustomerInfoFeedExport');
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var ExponeaCustomerInfoFeedHelpers = require('~/cartridge/scripts/helpers/ExponeaCustomerInfoFeedHelpers.js');
var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomReachEngagementHelper.js');
var ExponeaConstants = require('~/cartridge/scripts/util/ExponeaCustomerInfoFeedConstants');
var FileUtils = require('~/cartridge/scripts/util/fileUtils');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');
var sitePrefs = dw.system.Site.getCurrent().getPreferences();
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

var customerProfilesItr;
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
var query;
var generatePreInitFile = false;
var webDavFilePath;


/**
 * Adds the column value to the CSV line Array of Customer Feed export CSV file
 * @param customer - SFCC customer
 * @param {Array} csvCustomerArray - CSV  Array
 * @param {Object} columnValue - Customer Feed Column
 */
 function writeCustomerExportField(customer, csvCustomerArray, columnValue, isCustomAttribute) {
    var customerAddress;

    if (isCustomAttribute == 'false' || !isCustomAttribute) {
        if (customer.addressBook && customer.addressBook.preferredAddress) {
            customerAddress = customer.addressBook.preferredAddress;
        } else if(customer.addressBook && customer.addressBook.addresses.length > 0) {
            customerAddress = customer.addressBook.addresses[0];
        }
        if (columnValue === 'city') {
            csvCustomerArray.push(customerAddress && columnValue in customerAddress ? customerAddress[columnValue] : '');
        } else if (columnValue ==='stateCode') {
            csvCustomerArray.push(customerAddress && columnValue in customerAddress ? customerAddress[columnValue] : '');
        } else if (columnValue === 'countryCode') {
            csvCustomerArray.push(customerAddress && columnValue in customerAddress ? customerAddress[columnValue].displayValue : '');
        } else if (columnValue === 'gender') {
            csvCustomerArray.push(columnValue in customer && customer[columnValue].value ? customer[columnValue].displayValue : '');
        } else if (columnValue === 'creationDate') {
            var creationDate = ExponeaCustomerInfoFeedHelpers.getTimeStamp(customer[columnValue]);
            csvCustomerArray.push(creationDate);
        } else if (columnValue === 'lastModified') {
            var lastModified = ExponeaCustomerInfoFeedHelpers.getTimeStamp(customer[columnValue]);
            csvCustomerArray.push(lastModified);
        } else if (columnValue == 'birthday') {
            var birthday = ExponeaCustomerInfoFeedHelpers.getTimeStamp(customer[columnValue]);
            csvCustomerArray.push(birthday);
        } else {
            csvCustomerArray.push(columnValue in customer ? customer[columnValue] : '');
        }
    } else {
        csvCustomerArray.push(customer.custom && columnValue in customer.custom ? customer.custom[columnValue]: '');
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
    query = args.Query || '';
    generatePreInitFile = args.GeneratePreInitFile;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }
    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix, ExponeaConstants.FILE_EXTENSTION.CSV);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = ExponeaCustomerInfoFeedHelpers.generateCSVHeader();
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
    // Push Customer
    customerProfilesItr = CustomerMgr.searchProfiles(query, 'customerNo DESC');
    
    if (generatePreInitFile && customerProfilesItr.hasNext()) {
    	var firstCustomer = customerProfilesItr.next();
    	
    	const ArrayList = require('dw/util/ArrayList');
    	var arrCustomers = new ArrayList();
    	arrCustomers.push(firstCustomer);

    	customerProfilesItr = arrCustomers.iterator();
    }
};

/**
 * Executed Before Processing of Chunk and Validates all required fields
 */
 exports.beforeStepDelta = function () {
    var args = arguments[0];

    targetFolder = args.TargetFolder;
    fileNamePrefix = args.FileNamePrefix
    maxNoOfRows = args.MaxNumberOfRows - 1000;
    query = args.Query || 'lastModified > {0}';
    
    var lastCustomerExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastCustomerExport');
    var lastCustomerExport = lastCustomerExportCO ? lastCustomerExportCO.custom.lastExecution : null;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }

    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix, ExponeaConstants.FILE_EXTENSTION.CSV);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = ExponeaCustomerInfoFeedHelpers.generateCSVHeader();
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
    // Push Customer
    if (lastCustomerExport) {
        customerProfilesItr = CustomerMgr.searchProfiles(query, 'customerNo DESC', new Date(lastCustomerExport));
    } else {
        customerProfilesItr = CustomerMgr.searchProfiles('', 'customerNo DESC');
    }
};

/**
 * Executed Before Processing of Chunk and Return total customer processed
 * @returns {number} customer count
 */
 exports.getTotalCount = function () {
 	if (generatePreInitFile)
 		return 1;

    Logger.info('Processed customer {0}', customerProfilesItr.count);
    return customerProfilesItr.count;
};

/**
 * Returns a single customer to processed
 * @returns customer - customer
 */
 exports.read = function () { // eslint-disable-line consistent-return
    if (customerProfilesItr.hasNext()) {
        return customerProfilesItr.next();
    }
};

/**
 * Process customer and returns required field in array
 * @param customer - Product
 * @returns {Array} csvCustomerArray : Customer Details
 */
 exports.process = function (customer) { // eslint-disable-line consistent-return
    try {
        var csvCustomerArray = [];
        var currentColumn;
        SFCCAttributesValue.forEach(function (columnValue, index) { // eslint-disable-line
            currentColumn = columnValue;
            writeCustomerExportField(this, csvCustomerArray, columnValue.SFCCProductAttribute, columnValue.isCustom);
        }, customer);
        return csvCustomerArray;
    } catch (ex) {
        processedAll = false;
        Logger.info('Not able to process customer {0} on column {1} having error : {2}', customer.customerNo, currentColumn.SFCCProductAttribute, ex.toString());
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
 * Writes a single customer to file
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
    var customerFeedImportId = sitePrefs.getCustom()["bloomreachCustomerFeed-Import_id"];
    try {
        var result = BREngagementAPIHelper.bloomReachEngagementAPIService(customerFeedImportId, webDavFilePath);
    } catch (e) {
        Logger.error('Error while triggering bloomreach import start {0}', e.message);
    }
}

function splitFile() {
    triggerFileImport();
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
    rowsCount = 1;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }

    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix, ExponeaConstants.FILE_EXTENSTION.CSV);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = ExponeaCustomerInfoFeedHelpers.generateCSVHeader();
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
    	customerProfilesItr.close();
    }
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
    if (processedAll) {
    	var lastCustomerExportCO = CustomObjectMgr.getCustomObject('BloomreachEngagementJobLastExecution', 'lastCustomerExport');
    	if (lastCustomerExportCO) {
	        Transaction.wrap(function() {
	            lastCustomerExportCO.custom.lastExecution = new Date();
	        });
        } else {
        	Transaction.wrap(function() {
        		var newlastCustomerExportCO = CustomObjectMgr.createCustomObject('BloomreachEngagementJobLastExecution', 'lastCustomerExport');
        		newlastCustomerExportCO.custom.lastExecution = new Date();
	        });
        }
        
        Logger.info('Export Customer Feed Successful');
        triggerFileImport();
        return new Status(Status.OK, 'OK', 'Export Customer Feed Successful');
    }
    throw new Error('Could not process all the customers');
};