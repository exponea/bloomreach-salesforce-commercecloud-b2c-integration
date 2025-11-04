'use strict';

var Site = require('dw/system/Site');
var Currency = require('dw/util/Currency');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var URLUtils = require('dw/web/URLUtils');
var StringUtils = require('dw/util/StringUtils');

/**
 * Function to get value of product property by attribute full name.
 * An attribute name can be complex and consist of several levels.
 * Attribute names must be separated by dots.
 * Example: primaryCategory.ID
 * @param {dw.catalog.Product} product - product
 * @param {string} productAttributeName - product attribute full name
 * @returns {string|boolean|number|null} - value
 */
function getAttributeValue(product, productAttributeName) {
    var properties = productAttributeName.split('.');
    var result = properties.reduce(function (previousValue, currentProperty) {
        return previousValue ? previousValue[currentProperty] : null;
    }, product);

    return result;
}

/**
 * Create category tree of Product
 * @param {dw.catalog.Category} category - category
 * @returns {Array} - category tree
 */
function getCategoryFlatTree(category) {
    if (empty(category)) return [];

    var categoryTree = [];
    var currentCategory = category;
    categoryTree.push({
        id: currentCategory.ID,
        name: getAttributeValue(currentCategory, 'displayName')
    });

    while (!currentCategory.topLevel && !currentCategory.root) {
        currentCategory = currentCategory.parent;
        categoryTree.push({
            id: currentCategory.ID,
            name: getAttributeValue(currentCategory, 'displayName')
        });
    }

    // Add root category to the top of the category tree
    if (!currentCategory.root) {
        var rootCategory = CatalogMgr.siteCatalog.root;
        categoryTree.push({
            id: rootCategory ? rootCategory.ID : 'root',
            name: rootCategory ? rootCategory.displayName : 'Root category'
        });
    }

    return categoryTree.reverse();
}

/**
 * Handler for complex and calculated Product attributes
 * These handlers provide Discovery-compatible data structures
 */
var aggregatedValueHandlers = {
    /**
     * Returns hierarchical category structure
     * @param {dw.catalog.Product} product - Product
     * @returns {Array} Array of category paths
     */
    categories: function (product) {
        var productCategories = product.getOnlineCategories();
        productCategories = empty(productCategories) ? [] : productCategories.toArray();

        if (product.isVariant()) {
            var masterProductCategories = product.masterProduct.getOnlineCategories();
            masterProductCategories = empty(masterProductCategories) ? [] : masterProductCategories.toArray();
            productCategories = productCategories.concat(masterProductCategories);
        }

        return productCategories
            .map(function (category) {
                return getCategoryFlatTree(category);
            });
    },
    
    /**
     * Returns color variation attribute
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Color value
     */
    color: function (product) {
        var variationModel = product.getVariationModel();
        var colorAttribute = variationModel.getProductVariationAttribute('color');
        return (colorAttribute && variationModel.getSelectedValue(colorAttribute))
            ? variationModel.getSelectedValue(colorAttribute).displayValue
            : null;
    },
    
    /**
     * Returns size variation attribute
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Size value
     */
    size: function (product) {
        var variationModel = product.getVariationModel();
        var sizeAttribute = variationModel.getProductVariationAttribute('size');
        return (sizeAttribute && variationModel.getSelectedValue(sizeAttribute))
            ? variationModel.getSelectedValue(sizeAttribute).displayValue
            : null;
    },
    
    /**
     * Returns product price
     * @param {dw.catalog.Product} product - Product
     * @returns {number|null} Price value
     */
    price: function (product) {
        var price = product.productSet ? product.priceModel.minPrice : product.priceModel.price;
        return price.available && price.value ? price.value : null;
    },
    
    /**
     * Returns product URL
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Product URL
     */
    url: function (product) {
        var productPageUrl = URLUtils.https('Product-Show', 'pid', product.ID);
        return productPageUrl ? productPageUrl.toString() : null;
    },
    
    /**
     * Returns product thumbnail image URL
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Image URL
     */
    thumb_image: function (product) {
        var imageItem = product.getImage('large');
        return imageItem ? StringUtils.trim(imageItem.absURL.toString()) : null;
    },
    
    /**
     * Returns product title (name)
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Product name
     */
    title: function (product) {
        return product.name ? product.name : null;
    },
    
    /**
     * Returns product description
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Product description
     */
    description: function (product) {
        return product.longDescription ? product.longDescription.markup : null;
    },
    
    /**
     * Returns product brand
     * @param {dw.catalog.Product} product - Product
     * @returns {string|null} Brand name
     */
    brand: function (product) {
        return product.brand || null;
    },
    
    /**
     * Returns product availability status
     * @param {dw.catalog.Product} product - Product
     * @returns {boolean} Availability status
     */
    availability: function (product) {
        if (product.availabilityModel) {
            return product.availabilityModel.inStock;
        }
        return false;
    }
};

/**
 * Decorator, add localized price to the Object
 * Supports multiple currencies similar to Discovery cartridge
 * @param {Object} target - target Object
 * @param {dw.catalog.Product} product - SFCC Product
 */
function addMultiCurrencyPrice(target, product) {
    var that = target;
    var currentSession = request.getSession();
    var siteCurrencies = Site.getCurrent().getAllowedCurrencies();
    var siteCurrenciesSize = siteCurrencies.size();
    var currentCurrency = currentSession.getCurrency();

    for (var i = 0; i < siteCurrenciesSize; i += 1) {
        var currency = Currency.getCurrency(siteCurrencies[i]);
        currentSession.setCurrency(currency);
        var price = product.productSet ? product.priceModel.minPrice : product.priceModel.price;
        if (price.available) {
            that['price_' + price.currencyCode.toLowerCase()] = price.value;
        }
    }
    currentSession.setCurrency(currentCurrency);
}

/**
 * Compare attributes value
 * @param {Object} mProdAttr - Bloomreach master product attributes
 * @param {string} attr - Bloomreach product attribute name
 * @param {any} value - Bloomreach variant product attribute
 * @returns {boolean} - comparison result
 */
function isAttrEqual(mProdAttr, attr, value) {
    if (empty(mProdAttr)) return false;

    if (empty(mProdAttr[attr]) && empty(value)) return true;

    if (!mProdAttr || !Object.hasOwnProperty.call(mProdAttr, attr)) return false;

    if ((mProdAttr[attr] instanceof Object) && (value instanceof Object)) {
        try {
            return JSON.stringify(mProdAttr[attr]) === JSON.stringify(value);
        } catch (error) {
            return false;
        }
    }

    return mProdAttr[attr] === value;
}

/**
 * ProductAttributes class that represents Product Attributes for Bloomreach Engagement
 * This follows the Discovery cartridge format for compatibility
 * @param {dw.catalog.Product} product - SFCC Product
 * @param {Object} productAttributes - config of Bloomreach Product Object
 * @param {boolean} isMultiCurrency - add multicurrency price
 * @param {Object} mProdAttr - Bloomreach Master Product Attributes Object
 * @constructor
 */
function ProductAttributes(product, productAttributes, isMultiCurrency, mProdAttr) {
    var that = this;
    
    // Process each configured attribute
    Object.keys(productAttributes).forEach(function (attr) {
        var attrVal = productAttributes[attr];
        
        // Handle multi-currency price separately
        if (attr === 'price' && isMultiCurrency) {
            addMultiCurrencyPrice(that, product);
        } else {
            // Use aggregated handler if available, otherwise get direct attribute value
            var result = aggregatedValueHandlers[attrVal]
                ? aggregatedValueHandlers[attrVal](product)
                : getAttributeValue(product, attrVal);
                
            // Only add attribute if it has a value and is different from master (for variants)
            if (result !== null && result !== undefined && !isAttrEqual(mProdAttr, attr, result)) {
                that[attr] = result;
            }
        }
    });
}

module.exports = ProductAttributes;

