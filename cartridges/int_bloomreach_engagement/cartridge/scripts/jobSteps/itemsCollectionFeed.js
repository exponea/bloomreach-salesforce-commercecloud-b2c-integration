/* Items Collection Feed Export Job - Discovery Format */
'use strict';

var Logger = require('dw/system/Logger').getLogger('BloomreachEngagementItemsCollectionFeedExport');
var Status = require('dw/system/Status');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var FileReader = require('dw/io/FileReader');
var ProductMgr = require('dw/catalog/ProductMgr');
var Site = require('dw/system/Site');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');

var currentSites;
var siteLocales;
var siteLocalesSize;
var currentLocale;
var productsIter;
var config;
var fileStorage = [];
var snapshotFileWriter;
var snapshotFileReader = null;
var productSnapshot;
var newProductModel;

/**
 * Validate a product - it's a master product
 * @param {dw.catalog.Product} product - SFCC product object
 * @returns {boolean} returns status of validation
 */
function isMasterProduct(product) {
    return product.master;
}

/**
 * Read Bloomreach product objects from file
 * @param {dw.io.FileReader} fileReader - File Reader
 * @returns {Object} - Localized Bloomreach product objects
 */
function getNextSnapshotProduct(fileReader) {
    if (!fileReader) { return null; }
    var line = fileReader.readLine();
    var result = line ? JSON.parse(line) : null;
    return result;
}

/**
 * Read Bloomreach product objects from product SeekableIterator
 * @param {dw.util.SeekableIterator} iter - product SeekableIterator
 * @returns {Object} - Localized Bloomreach product objects
 */
function getNextLocalizedProductModel(iter) {
    var BloomreachEngagementProduct = require('~/cartridge/scripts/models/BloomreachEngagementProduct');

    while (iter.hasNext()) {
        var product = iter.next();
        if (isMasterProduct(product)) {
            currentSites = Site.getCurrent();
            currentLocale = request.getLocale();
            siteLocales = currentSites.getAllowedLocales();
            siteLocalesSize = siteLocales.size();

            var result = { id: product.ID };

            for (var i = 0; i < siteLocalesSize; i++) {
                var locale = siteLocales[i];
                request.setLocale(locale);
                var blrProduct = new BloomreachEngagementProduct(product, 'add', config);
                if (blrProduct.path) {
                    result[locale] = JSON.stringify(blrProduct);
                }
            }

            request.setLocale(currentLocale);
            return result;
        }
    }
    return null;
}

/**
 * Get Localized Bloomreach object for remove product from feed
 * @param {string} id - product ID
 * @returns {Object} - Localized Bloomreach product objects
 */
function getLocalizedRemoveProduct(id) {
    currentLocale = request.getLocale();
    siteLocales = currentSites.getAllowedLocales();
    siteLocalesSize = siteLocales.size();
    var result = {
        id: id
    };

    var rmData = JSON.stringify({
        op: 'remove',
        path: '/products/' + id
    });

    for (var i = 0; i < siteLocalesSize; i++) {
        result[siteLocales[i]] = rmData;
    }
    return result;
}

/**
 * Mock function to get upload URL from Bloomreach API
 * In production, this would call the actual Bloomreach API
 * @param {string} fileName - Name of file to upload
 * @returns {Object} - Upload URL and metadata
 */
function getUploadUrl(fileName) {
    var currentSite = Site.getCurrent();
    var projectToken = currentSite.getCustomPreferenceValue('brEngProjectToken');
    var catalogId = currentSite.getCustomPreferenceValue('brEngCatalogId') || 'items_collection';
    
    // Mock response - in production this would be a real API call
    Logger.info('Mock: Getting upload URL for file: {0}', fileName);
    Logger.info('Mock: Project Token: {0}', projectToken);
    Logger.info('Mock: Catalog ID: {0}', catalogId);
    
    // Simulated API response
    var mockResponse = {
        uploadUrl: 'https://api.exponea.com/data/v2/projects/' + projectToken + '/catalogs/' + catalogId + '/items',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Authorization': 'Bearer mock-token-' + Date.now()
        },
        expiresAt: Date.now() + (3600 * 1000), // 1 hour from now
        fileName: fileName
    };
    
    Logger.info('Mock: Generated upload URL: {0}', mockResponse.uploadUrl);
    return mockResponse;
}

/**
 * Mock function to upload file to Bloomreach
 * In production, this would perform actual HTTP PUT request
 * @param {dw.io.File} file - File to upload
 * @param {Object} uploadInfo - Upload URL and metadata from getUploadUrl
 * @returns {boolean} - Success status
 */
function uploadFileToBloomreach(file, uploadInfo) {
    if (!file.exists()) {
        Logger.error('Cannot upload file - file does not exist: {0}', file.fullPath);
        return false;
    }
    
    Logger.info('Mock: Uploading file to Bloomreach');
    Logger.info('Mock: File: {0}', file.name);
    Logger.info('Mock: File size: {0} bytes', file.length());
    Logger.info('Mock: Upload URL: {0}', uploadInfo.uploadUrl);
    Logger.info('Mock: Method: {0}', uploadInfo.method);
    Logger.info('Mock: Content-Type: {0}', uploadInfo.headers['Content-Type']);
    
    // In production, you would use HTTPClient or Service Framework here:
    // var HTTPClient = require('dw/net/HTTPClient');
    // var client = new HTTPClient();
    // client.open(uploadInfo.method, uploadInfo.uploadUrl);
    // client.setRequestHeader('Content-Type', uploadInfo.headers['Content-Type']);
    // client.setRequestHeader('Authorization', uploadInfo.headers['Authorization']);
    // var fileReader = new FileReader(file);
    // var content = fileReader.read();
    // fileReader.close();
    // client.send(content);
    // return client.statusCode === 200 || client.statusCode === 201;
    
    Logger.info('Mock: File upload simulated successfully');
    return true;
}

/**
 * Initialization step
 * @param {Object} parameters config parameters for job
 */
function beforeStep(parameters) {
    var enabled = parameters.Enabled;
    if (!enabled) {
        Logger.info('Items Collection Feed Enable Parameter is not true!');
        return;
    }
    
    var ITEMS_FEED_LOCAL_PATH = 'bloomreach_engagement/items_collection';
    var ITEMS_FEED_PREFIX = 'items_collection_feed';
    var ITEMS_SNAPSHOT_PREFIX = 'items_snapshot_';
    
    var isMultiLocale = parameters.MultiLocaleEnabled || false;
    
    // Get product attributes configuration from site preference
    var sitePrefs = Site.getCurrent().getPreferences();
    var configJSON = sitePrefs.getCustom()["brEngItemsCollectionConfig"];
    
    if (!configJSON) {
        // Default configuration based on Discovery format
        config = {
            title: 'name',
            description: 'longDescription.markup',
            price: 'price',
            categories: 'categories',
            url: 'url',
            thumb_image: 'thumb_image',
            brand: 'brand'
        };
        Logger.warn('No brEngItemsCollectionConfig found, using default configuration');
    } else {
        try {
            config = JSON.parse(configJSON);
        } catch (error) {
            Logger.error('Invalid items collection configuration in brEngItemsCollectionConfig custom preference');
            throw new Error('Invalid items collection configuration');
        }
    }

    currentSites = Site.getCurrent();
    currentLocale = request.getLocale();

    if (isMultiLocale) {
        siteLocales = currentSites.getAllowedLocales();
        siteLocalesSize = siteLocales.size();
    } else {
        siteLocales = [currentLocale];
        siteLocalesSize = siteLocales.length;
    }

    productsIter = ProductMgr.queryAllSiteProductsSorted();

    try {
        // create folder at the local storage
        var filepath = [File.IMPEX, 'src', ITEMS_FEED_LOCAL_PATH].join(File.SEPARATOR);
        var filepathFile = new File(filepath);
        filepathFile.mkdirs();

        // remove old product feed files
        var fileregex = new RegExp('^' + ITEMS_FEED_PREFIX + '_' + Site.current.ID + '_\\d{14}.*?\\.jsonl$');
        filepathFile.listFiles(function (f) {
            if (fileregex.test(f.name)) {
                f.remove();
            }
            return false;
        });

        // create file for each locale
        var cal = new Calendar();
        var stamp = StringUtils.formatCalendar(cal, 'yyyyMMddHHmmss');
        var sid = Site.current.ID;

        for (var i = 0; i < siteLocalesSize; i++) {
            var localeName = siteLocales[i];
            var filename = ITEMS_FEED_PREFIX + '_' + sid + '_' + stamp + '_' + localeName + '.jsonl';
            var file = new File(filepathFile, filename);
            var localData = {
                localeName: localeName,
                filename: filename,
                file: file,
                fileWriter: new FileWriter(file, 'UTF-8')
            };
            fileStorage.push(localData);
        }

        // Create new temporary snapshot file for writing
        var snapshotFileName = ITEMS_SNAPSHOT_PREFIX + sid + '.tmp';
        var newSnapshotFile = new File(filepathFile, snapshotFileName);
        snapshotFileWriter = new FileWriter(newSnapshotFile, 'UTF-8');

        // Open existing snapshot file for reading
        snapshotFileName = ITEMS_SNAPSHOT_PREFIX + sid + '.jsonl';
        var snapshotFile = new File(filepathFile, snapshotFileName);
        if (snapshotFile.exists()) {
            if (parameters.FeedType === 'FullFeed') {
                snapshotFile.remove();
            } else {
                snapshotFileReader = new FileReader(snapshotFile, 'UTF-8');
                productSnapshot = getNextSnapshotProduct(snapshotFileReader);
            }
        }
        newProductModel = getNextLocalizedProductModel(productsIter);
    } catch (error) {
        Logger.error('Can\'t create Items Collection Feed file! Error: {0}', error.toString());
        throw new Error('Can\'t create Items Collection Feed file!');
    }
}

/**
 * Get Product from catalog
 * @param {Object} parameters config parameters for job
 * @returns {Object} product object
 */
function read(parameters) {
    if (parameters.Enabled) {
        while (newProductModel || productSnapshot) {
            var productForUpdate = null;

            // Add product to Bloomreach
            if (newProductModel && !productSnapshot) {
                productForUpdate = {
                    snapshot: newProductModel,
                    product: newProductModel
                };
                newProductModel = getNextLocalizedProductModel(productsIter);
            }

            // Remove product from Bloomreach
            if (!newProductModel && productSnapshot) {
                productForUpdate = {
                    product: getLocalizedRemoveProduct(productSnapshot.id)
                };
                productSnapshot = getNextSnapshotProduct(snapshotFileReader);
            }

            if (newProductModel && productSnapshot) {
                if (newProductModel.id === productSnapshot.id) {
                    productForUpdate = {
                        snapshot: newProductModel
                    };
                    // Update product to Bloomreach
                    Object.keys(newProductModel).forEach(function (key) { // eslint-disable-line no-loop-func
                        if (key !== 'id') {
                            if (newProductModel[key] !== productSnapshot[key]) {
                                if (!productForUpdate.product) {
                                    productForUpdate.product = {
                                        id: newProductModel.id
                                    };
                                }
                                productForUpdate.product[key] = newProductModel[key];
                            }
                        }
                    });

                    productSnapshot = getNextSnapshotProduct(snapshotFileReader);
                    newProductModel = getNextLocalizedProductModel(productsIter);
                } else if (newProductModel.id < productSnapshot.id) {
                    // Add product to Bloomreach
                    productForUpdate = {
                        snapshot: newProductModel,
                        product: newProductModel
                    };
                    newProductModel = getNextLocalizedProductModel(productsIter);
                } else {
                    // Remove product from Bloomreach
                    productForUpdate = {
                        product: getLocalizedRemoveProduct(productSnapshot.id)
                    };
                    productSnapshot = getNextSnapshotProduct(snapshotFileReader);
                }
            }

            return productForUpdate;
        }
    }
    return null;
}

/**
 * process product object
 * @param {Object} item - product item
 * @returns {Object} item object
 */
function process(item) {
    return item;
}

/**
 * Write products object to the file
 * @param {Object} items - products to be written to job
 */
function write(items) {
    for (var i = 0; i < items.length; i++) {
        var obj = items[i];
        var line = '';

        // Write product to snapshot file
        if (obj.snapshot) {
            line = JSON.stringify(obj.snapshot);
            snapshotFileWriter.writeLine(line);
        }

        // Write to localized Bloomreach files
        if (obj.product) {
            fileStorage.forEach(function (item) { // eslint-disable-line no-loop-func
                line = obj.product[item.localeName];
                if (line) {
                    item.fileWriter.writeLine(line);
                }
            });
        }
    }
}

/**
 * cleanup and close file
 * @param {boolean} success - success job status
 * @param {Object} parameters config parameters for job
 */
function afterStep(success, parameters) {
    if (parameters.Enabled) {
        request.setLocale(currentLocale);

        var ITEMS_FEED_LOCAL_PATH = 'bloomreach_engagement/items_collection';
        var ITEMS_SNAPSHOT_PREFIX = 'items_snapshot_';

        // Close all file writers and upload files
        fileStorage.forEach(function (item) {
            item.fileWriter.close();
            
            if (item.file.length() === 0) {
                Logger.info('Removing empty file: {0}', item.filename);
                item.file.remove();
            } else {
                Logger.info('File created: {0} ({1} bytes)', item.filename, item.file.length());
                
                // Get upload URL and upload file
                try {
                    var uploadInfo = getUploadUrl(item.filename);
                    var uploadSuccess = uploadFileToBloomreach(item.file, uploadInfo);
                    
                    if (uploadSuccess) {
                        Logger.info('Successfully uploaded file: {0}', item.filename);
                    } else {
                        Logger.error('Failed to upload file: {0}', item.filename);
                    }
                } catch (e) {
                    Logger.error('Error during file upload for {0}: {1}', item.filename, e.toString());
                }
            }
        });

        snapshotFileWriter.close();

        if (snapshotFileReader) {
            snapshotFileReader.close();
        }

        productsIter.close();

        // Rename temporary snapshot to final snapshot
        try {
            var filepath = [File.IMPEX, 'src', ITEMS_FEED_LOCAL_PATH].join(File.SEPARATOR);
            var filepathFile = new File(filepath);
            var sid = Site.current.ID;
            var tempSnapshotFile = new File(filepathFile, ITEMS_SNAPSHOT_PREFIX + sid + '.tmp');
            var finalSnapshotFile = new File(filepathFile, ITEMS_SNAPSHOT_PREFIX + sid + '.jsonl');
            
            if (finalSnapshotFile.exists()) {
                finalSnapshotFile.remove();
            }
            
            if (tempSnapshotFile.exists()) {
                tempSnapshotFile.renameTo(finalSnapshotFile);
                Logger.info('Snapshot file updated successfully');
            }
        } catch (e) {
            Logger.error('Error renaming snapshot file: {0}', e.toString());
        }

        Logger.info('Items Collection Feed export completed');
    }
}

module.exports = {
    beforeStep: beforeStep,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};

