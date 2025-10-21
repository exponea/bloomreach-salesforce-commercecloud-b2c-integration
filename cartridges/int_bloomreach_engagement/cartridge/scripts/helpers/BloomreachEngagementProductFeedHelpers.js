'use strict';

var BloomreachEngagementConstants = require('~/cartridge/scripts/util/productFeedConstants');

var newArrivals = null;
/**
 * This Function generates header for csv file
 * @param {string} exportType Export Type Master product OR Variation product
 * @returns {Array} Header Values Array for CSV file
 */
function generateCSVHeader(exportType) {
    var sitePrefs = dw.system.Site.getCurrent().getPreferences();

    var csvHeaderArray = [];
    var SFCCAttributesValue = [];
    var results = {};

    if (exportType === BloomreachEngagementConstants.EXPORT_TYPE.MASTERPRODUCT) {
        var masterProductFeedJSON = sitePrefs.getCustom()["brEngProductsFeedDataMapping"];
        var masterProductFeed = JSON.parse(masterProductFeedJSON);

        for (var i = 0; i < masterProductFeed.length; i++) {
            if (csvHeaderArray.indexOf(masterProductFeed[i].XSDField) == -1) {
                csvHeaderArray.push(masterProductFeed[i].XSDField);
                SFCCAttributesValue.push({'SFCCProductAttribute': masterProductFeed[i].SFCCProductAttribute, 'isCustom': masterProductFeed[i].isCustomAttribute});
            }
        }
    } else if (exportType === BloomreachEngagementConstants.EXPORT_TYPE.VARIATIONPRODUCT) {
        var variationProductFeedJSON = sitePrefs.getCustom()["brEngVariantsFeedDataMapping"];
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
                        if (customerGroup.ID == BloomreachEngagementConstants.CUSTOMER_GROUP.EVERYONE) {
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
 * Gets Product Online Active Status
 * @param {dw.catalog.Product} product - Product
 * @returns {boolean} True/False
 */
function getOnlineStatus(product) {
	return product.isOnline();
}

/**
 * Gets Product Categorized Status
 * @param {dw.catalog.Product} product - Product
 * @returns {boolean} True/False
 */
function getCategorizedStatus(product) {
	var isMasterCategorized = false;
	var isVariantCategorized = false;
	
	if (product.isMaster()) {
		var variationModel = product.getVariationModel();
		
		if (variationModel) {
			var defaultVariant = variationModel.getDefaultVariant();
			
			if (defaultVariant) {
				isVariantCategorized = product.isCategorized();
			}
		}
	}
	
	if (product.isVariant()) {
		var masterProduct = product.masterProduct;
		isMasterCategorized = masterProduct ? masterProduct.isCategorized() : false;
	}

	return isVariantCategorized || isMasterCategorized || product.isCategorized();
}

/**
 * Gets Product Searchable Status
 * @param {dw.catalog.Product} product - Product
 * @returns {boolean} True/False
 */
function getSearchableStatus(product) {
    return product.isSearchable();
}

/**
 * Gets Product Has Price Status
 * @param {dw.catalog.Product} product - Product
 * @returns {boolean} True/False
 */
function getHasPriceStatus(product) {
	var masterHasPrice = false;
	var variantHasPrice = false;
	var productHasPrice = false;
	
	if (product.isMaster()) {
		var variationModel = product.getVariationModel();
		
		if (variationModel) {
			var defaultVariant = variationModel.getDefaultVariant();
			
			if (defaultVariant) {
				var variantPriceModel = defaultVariant.getPriceModel();
				
				if (variantPriceModel) {
					variantHasPrice = variantPriceModel.getPrice() ? variantPriceModel.getPrice().available : false;
				}
			}
		}
	}
	
	if (product.isVariant()) {
		var masterProduct = product.masterProduct;
		if (masterProduct) {
			var masterPriceModel = masterProduct.getPriceModel();
			
			if (masterPriceModel) {
				masterHasPrice = masterPriceModel.getPrice() ? masterPriceModel.getPrice().available : false;
			}
		}
	}

	var priceModel = product.getPriceModel();
	if (priceModel) {
		var price = priceModel.getPrice();
		
		productHasPrice = price ? price.available : false;
	} 
	
	return masterHasPrice || variantHasPrice || productHasPrice;
}

/**
 * Gets Product Active
 * @param {dw.catalog.Product} product - Product
 * @returns {boolean} True/False
 */
function getActiveStatus(product) {
	return getOnlineStatus(product)
			&& getCategorizedStatus(product)
			&& getSearchableStatus(product)
			&& getHasPriceStatus(product);
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
    getTimeStamp: getTimeStamp,
    getOnlineStatus: getOnlineStatus,
    getCategorizedStatus: getCategorizedStatus,
    getSearchableStatus: getSearchableStatus,
    getHasPriceStatus: getHasPriceStatus
};
