'use strict';

var ExponeaConstants = require('~/cartridge/scripts/util/ExponeaProductFeedConstants');

var newArrivals = null;
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
        var masterProductFeedJSON = sitePrefs.getCustom()["bloomreachProductFeed"];
        var masterProductFeed = JSON.parse(masterProductFeedJSON);

        for (var i = 0; i < masterProductFeed.length; i++) {
            if (csvHeaderArray.indexOf(masterProductFeed[i].XSDField) == -1) {
                csvHeaderArray.push(masterProductFeed[i].XSDField);
                SFCCAttributesValue.push({'SFCCProductAttribute': masterProductFeed[i].SFCCProductAttribute, 'isCustom': masterProductFeed[i].isCustomAttribute});
            }
        }
    } else if (exportType === ExponeaConstants.EXPORT_TYPE.VARIATIONPRODUCT) {
        var variationProductFeedJSON = sitePrefs.getCustom()["bloomreachVariantsFeed"];
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
 * Gets Product Primary Category
 * @param {dw.catalog.Product} product - Product
 * @returns {string} Product's Primary Category Display Name
 */
 function getPrimaryCategory(product) {
    var primaryCat = product.primaryCategory ? product.primaryCategory : product.classificationCategory;
    if (primaryCat) {
        return primaryCat.displayName;
    } else if (product.isVariant()) {
        var pvm = product.variationModel;
        if (pvm) {
            var masterProduct = pvm.getMaster();
            var masterPrimaryCat = masterProduct.primaryCategory;
            return masterPrimaryCat ? masterPrimaryCat.displayName : '';
        }
    }
    return '';
}

/**
 * Gets Product Primary Category
 * @param {dw.catalog.Product} product - Product
 * @returns {dw.catalog.Category} Product's Primary Category Display Name
 */
 function getPrimaryCategory(product) {
    var primaryCat = product.primaryCategory ? product.primaryCategory : product.classificationCategory;

    if (!primaryCat && product.isVariant()) {
        var pvm = product.variationModel;
        if (pvm) {
            var masterProduct = pvm.getMaster();
            primaryCat = masterProduct.primaryCategory;
        }
    }

    return primaryCat;
}

/**
 * Calculate Sale Price
 * @param {dw.catalog.Product} product - Product
 * @returns {number|string} N/A or Price
 */
 function calculateSalePrice(product) {
    var PromotionMgr = require('dw/campaign/PromotionMgr');
    var salePrice = product.priceModel.price;
    var PROMOTION_CLASS_PRODUCT = require('dw/campaign/Promotion').PROMOTION_CLASS_PRODUCT;
    var promotions = PromotionMgr.getActivePromotions().getProductPromotions(product);
    if (promotions && promotions.length > 0) {
        var promotionsItr = promotions.iterator();
        while (promotionsItr.hasNext()) {
            var promo = promotionsItr.next();
            if (promo.getPromotionClass() != null && promo.getPromotionClass().equals(PROMOTION_CLASS_PRODUCT) &&
                (promo.isBasedOnCustomerGroups() && !promo.basedOnCoupons && !promo.basedOnSourceCodes)) {
                    var customerGroups = promo.getCustomerGroups().toArray();
                    customerGroups.forEach(function(customerGroup) {
                        if (customerGroup.ID == ExponeaConstants.CUSTOMER_GROUP.EVERYONE) {
                            var tempPrice = 0;
                            if (product.optionProduct) {
                                tempPrice = promo.getPromotionalPrice(product, product.getOptionModel());
                            } else {
                                tempPrice = promo.getPromotionalPrice(product);
                            }
                            salePrice = tempPrice > 0 && tempPrice < salePrice ? tempPrice : salePrice;
                        }
                    });
            }
        }
    }
    return salePrice;
}

/**
 * get Category Id list
 *
 * @param Product
 * @returns {string} List of Category Id
 */
 function getCategoryIdlist(product) {
    var allCategoryAssignments = product.allCategoryAssignments;
    if(allCategoryAssignments.length == 0){
		if (product.variationModel) {
             var masterProduct = product.variationModel.getMaster();
             allCategoryAssignments = masterProduct.allCategoryAssignments;
		}
    }
    var categories = [];
    if(allCategoryAssignments){
        allCategoryAssignments.toArray().forEach(function (category) {
            if (category && category.category) {
                categories.push(category.category.ID);
            }
        });
    }

    return JSON.stringify(categories);
}


/**
 * get Category Level 2 OR 3
 *
 * @param Product
 * @returns {dw.catalog.Category} Category Level 2 OR 3
 */
 function getCategoryLevel(product, level) {
    var primaryCat = product.primaryCategory ? product.primaryCategory : product.classificationCategory;
    var category;
    var parentCategory;

    if (primaryCat) {
        parentCategory = primaryCat.parent;
    } else if (product.isVariant()) {
        var pvm = product.variationModel;
        if (pvm) {
            var masterProduct = pvm.getMaster();
            parentCategory = masterProduct.primaryCategory ? masterProduct.primaryCategory.parent : null;
        }
    }

    if (parentCategory && level === 2) {
        category = parentCategory;
    } else if (primaryCat && parentCategory && parentCategory.getParent() && level === 3) {
        category = parentCategory.getParent();
    }

    return category;
}

/**
 * Returns All Variation Attributes
 * @param {dw.catalog.Product} product - Product
 * @returns {JSON} JSON of all the variation attributes and values of product
 */
 function getAllVariationAttrs(product) {
    var customJSON = {};
    var pvm = product.getVariationModel();
    var variationAttrs = pvm ? pvm.productVariationAttributes : null;
    if (variationAttrs && (product.isVariant() || product.isVariationGroup())) {
        Object.keys(variationAttrs).forEach(function (key) {
            var varValue = this.getVariationValue(product, variationAttrs[key]);
            customJSON[variationAttrs[key].attributeID] = varValue ? varValue.displayValue : '';
        }, pvm);
        return JSON.stringify(customJSON);
    } 
    return null;
}

/**
 * Gets time Stamp
 * @param {Date} date - Date
 * @returns {String} time stamp
 */
function getTimeStamp(date) {
    var timeStamp;
    if (date) {
        var date = new Date(date);
        timeStamp = date.getTime();
        return timeStamp.toString();
    } else {
        return "";
    }
}

/**
 * Gets Product Image
 * @param {dw.catalog.Product} product - Product
 * @returns {String} Product Image URL
 */
 function getProductImage(product) {
    var image = product.getImage('large', 0);
    var imageURL = '';

    if (image) {
        imageURL = image.absURL.toString();
    }

    return imageURL;
}


/**
 * Gets Product Active
 * @param {dw.catalog.Product} product - Product
 * @returns {boolean} True/False
 */
function getActiveStatus(product) {
    var isActive = false;

    if (product.isMaster()) {
        var productAvailability = product.getAvailabilityModel() ? product.getAvailabilityModel().getAvailabilityStatus() : null;
        var isAvailable = productAvailability && productAvailability !== productAvailability.AVAILABILITY_STATUS_NOT_AVAILABLE,
            isOnline = product.isOnline();
            isActive = isOnline && isAvailable
    } else {
        var isOnline = product.isOnline(),
        isCategorized = product.isCategorized(),
        isSearchable = product.isSearchable(),
        hasPrice = product.getPriceModel() ? product.getPriceModel().getPrice() : false;
        isActive = isOnline && isCategorized && isSearchable && hasPrice;
    }

    return isActive;
}

module.exports = {
    generateCSVHeader: generateCSVHeader,
    getPrimaryCategory: getPrimaryCategory,
    getCategoryLevel: getCategoryLevel,
    calculateSalePrice: calculateSalePrice,
    getCategoryIdlist: getCategoryIdlist,
    getAllVariationAttrs: getAllVariationAttrs,
    getProductImage: getProductImage,
    getActiveStatus: getActiveStatus,
    getTimeStamp: getTimeStamp
};
