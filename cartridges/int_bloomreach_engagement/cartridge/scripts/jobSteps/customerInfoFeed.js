/* BloomreachEngagement Customer Info Export Job */
'use strict';

var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementCustomerInfoFeedExport');
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var BloomreachEngagementCustomerInfoFeedHelpers = require('~/cartridge/scripts/helpers/BloomreachEngagementCustomerInfoFeedHelpers.js');
var BREngagementAPIHelper = require('~/cartridge/scripts/helpers/BloomreachEngagementHelper.js');
var BloomreachEngagementConstants = require('~/cartridge/scripts/util/customerInfoFeedConstants');
var FileUtils = require('~/cartridge/scripts/util/fileUtils');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');
var sitePrefs = dw.system.Site.getCurrent().getPreferences();
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var SFTPHelper = require('~/cartridge/scripts/helpers/SFTPHelper.js');

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
var localCsvFile;

/**
 * Fetches all customer profiles using CustomerMgr.processProfiles()
 * This method has NO LIMIT on the number of profiles returned, unlike searchProfiles() which is limited to 1000
 * Uses chunked array storage to respect SFCC's 20,000 JavaScript array size limit per array
 * @param {String} searchQuery - The search query string
 * @param {String} sortString - The sort string (e.g., 'customerNo DESC') - Note: processProfiles doesn't support sorting, so we sort in memory
 * @param {Date} lastModifiedDate - Optional date parameter for delta exports
 * @returns {Object} Custom iterator for customer profiles
 */
function getAllCustomerProfiles(searchQuery, sortString, lastModifiedDate) {
    var customerChunks = []; // Array of arrays, each chunk max 19,000 elements
    var currentChunk = [];
    var finalQuery = searchQuery || '';
    var searchParameters = [];
    var chunkSize = 19000; // Stay under SFCC's 20,000 array limit per chunk
    var totalProcessed = 0;

    // Build query with date filter if provided
    if (lastModifiedDate) {
        if (finalQuery && finalQuery.trim() !== '') {
            finalQuery = '(' + finalQuery + ') AND lastModified > {0}';
        } else {
            finalQuery = 'lastModified > {0}';
        }
        searchParameters.push(lastModifiedDate);
    }

    // Callback function to collect customer profiles into chunks
    var collectProfileCallback = function(profile) {
        // If current chunk is full, start a new chunk
        if (currentChunk.length >= chunkSize) {
            customerChunks.push(currentChunk);
            Logger.info('Chunk {0} filled with {1} profiles', customerChunks.length, currentChunk.length);
            currentChunk = [];
        }
        currentChunk.push(profile);
        totalProcessed++;
    };

    // Use CustomerMgr.processProfiles() - NO record limit, designed for batch processing
    Logger.info('Starting customer profile collection...');
    if (searchParameters.length > 0) {
        CustomerMgr.processProfiles(collectProfileCallback, finalQuery, searchParameters[0]);
    } else {
        CustomerMgr.processProfiles(collectProfileCallback, finalQuery);
    }

    // Add the last chunk if it has any profiles
    if (currentChunk.length > 0) {
        customerChunks.push(currentChunk);
        Logger.info('Final chunk {0} has {1} profiles', customerChunks.length, currentChunk.length);
    }

    Logger.info('Total customer profiles collected: {0} across {1} chunks', totalProcessed, customerChunks.length);

    // Sort customers in memory since processProfiles doesn't support sorting
    // Parse sortString to determine sort field and direction
    if (sortString) {
        var sortParts = sortString.split(' ');
        var sortField = sortParts[0];
        var sortDesc = sortParts.length > 1 && sortParts[1].toUpperCase() === 'DESC';

        // Sort each chunk individually
        for (var i = 0; i < customerChunks.length; i++) {
            customerChunks[i].sort(function(a, b) {
                var aVal = a[sortField];
                var bVal = b[sortField];

                // Handle string comparison
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                    return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
                }

                // Handle numeric/date comparison
                if (sortDesc) {
                    return bVal > aVal ? 1 : (bVal < aVal ? -1 : 0);
                } else {
                    return aVal > bVal ? 1 : (aVal < bVal ? -1 : 0);
                }
            });
        }
    }

    // Return a custom iterator that traverses all chunks
    var customIterator = (function() {
        var chunkIndex = 0;
        var itemIndex = 0;
        var totalCount = totalProcessed;

        return {
            hasNext: function() {
                return chunkIndex < customerChunks.length &&
                       itemIndex < customerChunks[chunkIndex].length;
            },
            next: function() {
                if (!this.hasNext()) {
                    return null;
                }
                var item = customerChunks[chunkIndex][itemIndex];
                itemIndex++;
                // Move to next chunk if current chunk is exhausted
                if (itemIndex >= customerChunks[chunkIndex].length) {
                    chunkIndex++;
                    itemIndex = 0;
                }
                return item;
            },
            count: totalCount,
            close: function() {
                // No resources to clean up
            }
        };
    })();

    return customIterator;
}


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
            var creationDate = BloomreachEngagementCustomerInfoFeedHelpers.getTimeStamp(customer[columnValue]);
            csvCustomerArray.push(creationDate);
        } else if (columnValue === 'lastModified') {
            var lastModified = BloomreachEngagementCustomerInfoFeedHelpers.getTimeStamp(customer[columnValue]);
            csvCustomerArray.push(lastModified);
        } else if (columnValue == 'birthday') {
            var birthday = BloomreachEngagementCustomerInfoFeedHelpers.getTimeStamp(customer[columnValue]);
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
    var fileName = FileUtils.createFileName(fileNamePrefix, BloomreachEngagementConstants.FILE_EXTENSTION.CSV);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    localCsvFile = csvFile; // Store for SFTP upload
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementCustomerInfoFeedHelpers.generateCSVHeader();
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
    // Push Customer
    customerProfilesItr = getAllCustomerProfiles(query, 'customerNo DESC', null);

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
    var fileName = FileUtils.createFileName(fileNamePrefix, BloomreachEngagementConstants.FILE_EXTENSTION.CSV);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    localCsvFile = csvFile; // Store for SFTP upload
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementCustomerInfoFeedHelpers.generateCSVHeader();
    headerColumn = results.csvHeaderArray;
    SFCCAttributesValue = results.SFCCAttributesValue;
    csvWriter.writeNext(headerColumn);
    // Push Customer
    if (lastCustomerExport) {
        customerProfilesItr = getAllCustomerProfiles(query, 'customerNo DESC', new Date(lastCustomerExport));
    } else {
        customerProfilesItr = getAllCustomerProfiles('', 'customerNo DESC', null);
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

function triggerFileImport(skipAPICall) {
    var customerFeedImportId = sitePrefs.getCustom()["brEngCustomerFeedImportId"];

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
        Logger.info('Pre-init mode: skipping Bloomreach API import trigger. Use the generated CSV to create the import in Bloomreach Engagement and configure brEngCustomerFeedImportId.');
        return;
    }

    // Call Bloomreach API with appropriate file path
    try {
        var result = BREngagementAPIHelper.bloomReachEngagementAPIService(customerFeedImportId, filePath);
    } catch (e) {
        Logger.error('Error while triggering bloomreach import start {0}', e.message);
    }
}

function splitFile() {
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
    triggerFileImport(false);
    rowsCount = 1;

    if (!targetFolder) {
        throw new Error('One or more mandatory parameters are missing.');
    }

    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName(fileNamePrefix, BloomreachEngagementConstants.FILE_EXTENSTION.CSV);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.info('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + targetFolder));
        throw new Error('Cannot create IMPEX folders.');
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    localCsvFile = csvFile; // Store for SFTP upload
    webDavFilePath = 'https://' + dw.system.System.getInstanceHostname().toString() + '/on/demandware.servlet/webdav/Sites' + csvFile.fullPath.toString();
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    // Push Header
    var results = BloomreachEngagementCustomerInfoFeedHelpers.generateCSVHeader();
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
        triggerFileImport(generatePreInitFile);

		if (query) {
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
        }
        
        Logger.info('Export Customer Feed Successful');

        return new Status(Status.OK, 'OK', 'Export Customer Feed Successful');
    }
    throw new Error('Could not process all the customers');
};
