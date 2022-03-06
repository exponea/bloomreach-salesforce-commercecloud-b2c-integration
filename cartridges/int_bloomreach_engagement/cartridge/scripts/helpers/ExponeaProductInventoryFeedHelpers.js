'use strict';

var ExponeaConstants = require('~/cartridge/scripts/util/ExponeaProductFeedConstants');

/**
 * This Function generates header for csv file
 * @param {string} exportType Export Type Master product OR Variation product
 * @returns {Array} Header Values Array for CSV file
 */
function generateCSVHeader(exportType) {
    var sitePrefs : SitePreferences = dw.system.Site.getCurrent().getPreferences();

    var csvHeaderArray = [];
    var SFCCAttributesValue = [];
    var results = {};

    if (exportType === ExponeaConstants.EXPORT_TYPE.MASTERPRODUCT) {
        var masterProductFeedJSON = sitePrefs.getCustom()["bloomreachProductInventoryFeed"];
        var masterProductFeed = JSON.parse(masterProductFeedJSON);

        for (var i = 0; i < masterProductFeed.length; i++) {
            if (csvHeaderArray.indexOf(masterProductFeed[i].XSDField) == -1) {
                csvHeaderArray.push(masterProductFeed[i].XSDField);
                SFCCAttributesValue.push({'SFCCProductAttribute': masterProductFeed[i].SFCCProductAttribute, 'isCustom': masterProductFeed[i].isCustomAttribute});
            }
        }
    } else if (exportType === ExponeaConstants.EXPORT_TYPE.VARIATIONPRODUCT) {
        var variationProductFeedJSON = sitePrefs.getCustom()["bloomreachVariantsInventoryFeed"];
        var variationProductFeed = JSON.parse(variationProductFeedJSON);

        for (let j = 0; j < variationProductFeed.length; j++) {
            if (csvHeaderArray.indexOf(variationProductFeed[j].XSDField) == -1) {
                csvHeaderArray.push(variationProductFeed[j].XSDField);
                SFCCAttributesValue.push({'SFCCProductAttribute': variationProductFeed[j].SFCCProductAttribute, 'isCustom': variationProductFeed[j].isCustomAttribute});
            }
        }
    }

    results.csvHeaderArray = csvHeaderArray;
    results.SFCCAttributesValue = SFCCAttributesValue
    return results;
}

/**
 * Gets Product Availability
 * @param {dw.catalog.Product} product - Product
 * @returns {Boolean}
 */
function getAvailability(product) {
    var isAvailable = false;
    var productAvailability = product.getAvailabilityModel() ? product.getAvailabilityModel().getAvailabilityStatus() : null;
    var isAvailable = productAvailability && productAvailability !== productAvailability.AVAILABILITY_STATUS_NOT_AVAILABLE;

    return isAvailable;
}

/**
 * Gets Product StockLevel
 * @param {dw.catalog.Product} product - Product
 * @returns {number}
 */
function getStockLevel(product) {
    var productAvailabilityModel = product.getAvailabilityModel();
    var stockLevel = 0;

    if (!productAvailabilityModel) {
        return stockLevel;
    }

    var inventoryRecord = productAvailabilityModel.getInventoryRecord();

    if (!inventoryRecord) {
        return stockLevel;
    }

    stockLevel = inventoryRecord.getStockLevel().value;

    return stockLevel;
}

/**
 * Gets Product PreorderBackorderAllocation
 * @param {dw.catalog.Product} product - Product
 * @returns {number}
 */
function getPreorderBackorderAllocation(product) {
    var productAvailabilityModel = product.getAvailabilityModel();
    var allocation = 0;

    if (!productAvailabilityModel) {
        return allocation;
    }

    var inventoryRecord = productAvailabilityModel.getInventoryRecord();

    if (!inventoryRecord) {
        return allocation;
    }

    allocation = inventoryRecord.getPreorderBackorderAllocation().value;

    return allocation;
}

/**
 * Gets Product Pre-Order/Backorder Handling
 * @param {dw.catalog.Product} product - Product
 * @returns {number}
 */
function getPreorderBackorderHandling(product) {
    var handling;
    var productAvailabilityModel = product.getAvailabilityModel();

    if (!productAvailabilityModel) {
        return handling;
    }

    var inventoryRecord = productAvailabilityModel.getInventoryRecord();

    if (!inventoryRecord) {
        return handling;
    }

    if (inventoryRecord.backorderable) {
        handling = ExponeaConstants.PRODUCT_INVENTORY.ORDER_HANDLING.BACK_ORDER;
    } else if (inventoryRecord.preorderable) {
        handling = ExponeaConstants.PRODUCT_INVENTORY.ORDER_HANDLING.PRE_ORDER;
    } else {
        handling = ExponeaConstants.PRODUCT_INVENTORY.ORDER_HANDLING.NONE;
    }

    return handling || '';
}

/**
 * Evaluate if product inventory is valid for export
 * @param {dw.catalog.Product} product - Product
 * @param {Date} lastRun - contain the last run time of the job
 * @returns {Boolean}
 */
function IsProductInventoryExportValid(product, lastRun) {
    var isValid = true;

    if (lastRun) {
        if (product.master) {
            var productVariants = product.getVariants().toArray();

            isValid = productVariants.some(function(variant) {
                var inventoryRecord = variant.getAvailabilityModel() ? variant.getAvailabilityModel().getInventoryRecord() : null;
                return inventoryRecord && lastRun <= inventoryRecord.getLastModified();
            });
        } else if (product.bundle) {
            var bundledProducts = product.getBundledProducts().toArray();

            isValid = bundledProducts.some(function(bundledProduct) {
                var inventoryRecord = bundledProduct.getAvailabilityModel() ? bundledProduct.getAvailabilityModel().getInventoryRecord() : null;
                return inventoryRecord && lastRun <= inventoryRecord.getLastModified();
            });
        } else if (product.productSet) {
            var setProducts = product.getProductSetProducts().toArray();

            isValid = setProducts.some(function(setProduct) {
                var inventoryRecord = setProduct.getAvailabilityModel() ? setProduct.getAvailabilityModel().getInventoryRecord() : null;
                return inventoryRecord && lastRun <= inventoryRecord.getLastModified();
            });
        } else { // handle satndard and variant products
            var inventoryRecord = product.getAvailabilityModel() ? product.getAvailabilityModel().getInventoryRecord() : null;
            isValid = inventoryRecord && lastRun <= inventoryRecord.getLastModified();
        }
    }

    return isValid;
}

module.exports = {
    generateCSVHeader: generateCSVHeader,
    getAvailability: getAvailability,
    getStockLevel: getStockLevel,
    getPreorderBackorderAllocation: getPreorderBackorderAllocation,
    getPreorderBackorderHandling: getPreorderBackorderHandling,
    IsProductInventoryExportValid: IsProductInventoryExportValid
};