'use strict';

var ProductAttributes = require('~/cartridge/scripts/models/BloomreachEngagementProductAttributes');

/**
 * Product class that represents the Bloomreach Engagement Product in Discovery format
 * @param {dw.catalog.Product} product - product
 * @param {string} operation - Bloomreach operation type (add, update, remove)
 * @param {Object} productAttributes - list of Bloomreach product attributes
 * @constructor
 */
function BloomreachEngagementProduct(product, operation, productAttributes) {
    var Site = require('dw/system/Site');
    var currentSite = Site.getCurrent();
    
    // Check for multi-currency support
    var multiCurrency = currentSite.getCustomPreferenceValue('brEngMultiCurrency') || false;
    var MULTI_CURRENCY_ATTR = multiCurrency;

    this.op = operation;
    
    if (empty(product) || empty(productAttributes)) {
        this.path = null;
    } else {
        this.path = '/products/' + product.ID;
        this.value = {};

        // Master product attributes
        var mpAttr = new ProductAttributes(product, productAttributes, MULTI_CURRENCY_ATTR, null);
        this.value.attributes = mpAttr;
        
        // Variant product attributes
        var variants = product.getVariants();
        if (variants.length !== 0) {
            var variantsIter = variants.iterator();
            this.value.variants = {};
            while (variantsIter.hasNext()) {
                var variantProduct = variantsIter.next();
                var variantProductId = variantProduct.ID;
                var vpAttr = new ProductAttributes(variantProduct, productAttributes, MULTI_CURRENCY_ATTR, mpAttr);
                this.value.variants[variantProductId] = {
                    attributes: vpAttr
                };
            }
        } else {
            // If no variants, create a single variant with the master's ID
            this.value.variants = {};
            this.value.variants[product.ID] = {
                attributes: {}
            };
        }
    }
}

module.exports = BloomreachEngagementProduct;

