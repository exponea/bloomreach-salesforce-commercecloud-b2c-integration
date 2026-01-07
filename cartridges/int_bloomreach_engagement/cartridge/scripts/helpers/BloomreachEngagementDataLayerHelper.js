'use strict';

var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();
var sitePrefs = currentSite.getPreferences();
var Logger = require('dw/system/Logger');
var ProductMgr = require('dw/catalog/ProductMgr');
var Locale = require('dw/util/Locale');
var PromotionMgr = require('dw/campaign/PromotionMgr');
var URLUtils = require('dw/web/URLUtils');
var PagingModel = require('dw/web/PagingModel');
var domain = require('dw/system/System').getInstanceHostname();

/**
 * Get language from request locale
 * @returns {string} language code or empty string if request is not available
 */
function getLanguage() {
    try {
        return Locale.getLocale(request.getLocale()).getLanguage();
    } catch (e) {
        return '';
    }
}

/**
 * Check if brSdkIntegrationSnippet is exist and configured in BM
 * @returns {boolean} True/False
 */
function isBrSdkIntegrationSnippet() {
    return ('brSdkIntegrationSnippet' in sitePrefs.getCustom() && !empty(sitePrefs.getCustom()['brSdkIntegrationSnippet'])) ? true : false;
}

/**
 * Get brSdkIntegrationSnippet configured in BM
 * @returns {string} brSdkIntegrationSnippet
 */
 function getBrSdkIntegrationSnippet() {
    var brSdkIntegrationSnippet = sitePrefs.getCustom()['brSdkIntegrationSnippet'];
    var brEngApiBaseUrl = sitePrefs.getCustom()['brEngApiBaseUrl'];
    var brEngProjectToken = sitePrefs.getCustom()['brEngProjectToken'];

    if (!empty(brSdkIntegrationSnippet)) {

        //replace "target" value in brSdkIntegrationSnippet to brEngApiBaseUrl value from configured in BM
        if (!empty(brEngApiBaseUrl)) {
            brSdkIntegrationSnippet = brSdkIntegrationSnippet.replace(/(?:target:)(.*?)(?=",)/gmi, 'target: "' + brEngApiBaseUrl);
        }

        //replace "token" value in brSdkIntegrationSnippet to brEngApiBaseUrl value from configured in BM
        if (!empty(brEngProjectToken)) {
            brSdkIntegrationSnippet = brSdkIntegrationSnippet.replace(/(?:token:)(.*?)(?=",)/gmi, 'token: "' + brEngProjectToken);
        }
    }

    return brSdkIntegrationSnippet;
}

/**
 * Check if brDataLayerViewItem is exist and configured in BM
 * @returns {boolean} True/False
 */
function isBrDataLayerViewItem() {
    return (isBrSdkIntegrationSnippet() && 'brDataLayerViewItem' in sitePrefs.getCustom() && sitePrefs.getCustom()['brDataLayerViewItem']) ? true : false;
}

/**
 * Get brDataLayerNamespace configured in BM
 * @returns {string} brDataLayerNamespace
 */
 function getBrDataLayerNamespace() {
    return sitePrefs.getCustom()['brDataLayerNamespace'];
}

/**
 * Create view_item datalayer object
 * @param {string} product ID
 * @returns {Object} viewItemObj - view_item datalayer object
 **/
function createViewItemDataLayer(productId, selectedProductUrl) {
    selectedProductUrl = selectedProductUrl || null;
    var viewItemObj = {};
    var product = ProductMgr.getProduct(productId);
    var productPrices = getProductPrices(product);
    var tags = ('bloomreachTags' in product.getCustom()) ? product.getCustom().bloomreachTags : '';
    var category_level_1 = getProductCategoryLevel(product, 3);
    var category_level_2 = getProductCategoryLevel(product, 2);
    var category_level_3 = getProductCategory(product);
    
    if (product) {
        viewItemObj = {
            'namespace': getBrDataLayerNamespace(),
            'event_name': 'view_item',
            'event_properties': {
                'title': product.getName(),
                'brand': product.getBrand(),
                'tags': tags,
                'category_level_1': category_level_1 ? category_level_1.displayName : '',
                'category_level_2': category_level_2 ? category_level_2.displayName : '',
                'category_level_3': category_level_3 ? category_level_3.displayName : '',
                'categories_path': getProductCategoriesPath(product),
                'category_id': getProductCategory(product).ID,
                'categories_ids': getProductCategoriesIds(product),
                'price': productPrices.price,
                'discount_percentage': productPrices.discountPercentage,
                'discount_value': productPrices.discountValue,
                'original_price': productPrices.originalPrice,
                'domain': domain,
                'language': getLanguage(),
                'stock_level': getAvailableStock(product)
            }
        };

        if (!empty(selectedProductUrl)) {
            viewItemObj.event_properties.location = domain + selectedProductUrl;
        }

        if (getVariantId(product)) {
            viewItemObj.event_properties = Object.assign({'variant_id': getVariantId(product)}, viewItemObj.event_properties);
        } else {
            viewItemObj.event_properties = Object.assign({'product_id': product.getID()}, viewItemObj.event_properties);
        }
    }
    
    return viewItemObj;
}

/**
 * Get view_item datalayer object
 * @param {dw.catalog.Product} product - Product
 * @returns {string} JSON string of view_item datalayer object
 **/
function getViewItemDataLayer(productId, selectedProductUrl) {
    selectedProductUrl = selectedProductUrl || null;
    try {
        return JSON.stringify(createViewItemDataLayer(productId, selectedProductUrl));
    } catch (e) {
        Logger.error('Error when trying to execute getViewItemDataLayer('+ productId +'):' + e);
        
        return '';
    }
}

/**
 * Get variant id for given product
 * @param {dw.catalog.Product} product - Product
 * @returns {string} product variant id if any, otherwise empty string
 **/
 function getVariantId(product) {
    var variantId = '';

    if (product.isMaster() && !empty(product.getVariationModel().getDefaultVariant())) {
        variantId = product.getVariationModel().getDefaultVariant().getID();
    }

    return variantId;
}

/**
 * Get product available stock
 * @param {dw.catalog.Product} product - Product
 * @returns {string} product available stock or SKUCoverage
 **/
 function getAvailableStock(product) {
    var availabilityModel = product.getAvailabilityModel();
    var inventoryRecord = availabilityModel.getInventoryRecord();
    var allocation = !empty(inventoryRecord) ? inventoryRecord.getAllocation().value : null;
    
    return allocation;
}

/**
 * Get product price
 * @param {dw.catalog.Product} product - Product
 * @returns {string} product price
 **/
 function getProductPrices(product) {
    var productPrices = {};
    
    if ((product.isMaster() || product.isVariationGroup()) && product.getVariationModel().getDefaultVariant()) {
        productPrices.originalPrice = product.getVariationModel().getDefaultVariant().getPriceModel().getPrice();
    } else {
        productPrices.originalPrice = !empty(product.getVariationModel().getSelectedVariant()) ? product.getVariationModel().getSelectedVariant().getPriceModel().getPrice() : product.getPriceModel().getPrice();
    }

    productPrices.price = productPrices.originalPrice;
    var PROMOTION_CLASS_PRODUCT = require('dw/campaign/Promotion').PROMOTION_CLASS_PRODUCT;
    var promotions = PromotionMgr.getActivePromotions().getProductPromotions(product);
    if (promotions && promotions.length > 0) {
        var promotionsItr = promotions.iterator();
        while (promotionsItr.hasNext()) {
            var promo = promotionsItr.next();
            if (promo.getPromotionClass() != null && promo.getPromotionClass().equals(PROMOTION_CLASS_PRODUCT)) {
                var tempPrice = 0;
                if (product.optionProduct) {
                    tempPrice = promo.getPromotionalPrice(product, product.getOptionModel());
                } else {
                    tempPrice = promo.getPromotionalPrice(product);
                }
                productPrices.price = tempPrice > 0 && tempPrice < productPrices.price  ? tempPrice : productPrices.price ;       
            }
        }
    }
    
    productPrices.originalPrice = productPrices.originalPrice.value;
    productPrices.price = productPrices.price.value;

    if (productPrices.price < productPrices.originalPrice) {
        productPrices.discountValue = parseFloat((productPrices.originalPrice - productPrices.price).toFixed(2));
        productPrices.discountPercentage = Math.round(100 - (productPrices.price * 100 / productPrices.originalPrice));
    } else {
        productPrices.discountValue = 0;
        productPrices.discountPercentage = 0;
    }

    return productPrices;

}

/**
 * Get Category
 * @param {dw.catalog.Product} product - Product
 * @returns {string} Product's Category
 */
 function getProductCategory(product) {
    var primaryCat = product.primaryCategory ? product.primaryCategory : product.classificationCategory;
    if (primaryCat) {
        return primaryCat;
    } else if (product.isVariant()) {
        var pvm = product.variationModel;
        if (pvm) {
            var masterProduct = pvm.getMaster();
            var masterPrimaryCat = masterProduct.primaryCategory;
            return masterPrimaryCat ? masterPrimaryCat : '';
        }
    }
    return '';
}

/**
 * Get Product categories id's
 * @param {dw.catalog.Product} product - Product
 * @returns {Array} Array of categories id's
 */
 function getProductCategoriesIds(product) {
    var categories = [];
    var allCategoryAssignments = product.allCategoryAssignments;
    if(allCategoryAssignments.length == 0){
		if (product.variationModel) {
             var masterProduct = product.variationModel.getMaster();
             allCategoryAssignments = masterProduct.allCategoryAssignments;
		}
    }
    if(allCategoryAssignments){
        allCategoryAssignments.toArray().forEach(function (category) {
            if (category && category.category) {
                categories.push(category.category.ID);
            }
        });
    }

    return categories;
}

/**
 * Get Product Category Level 2 OR 3
 * @param {dw.catalog.Product} product - Product
 * @param {Number} level
 * @returns {dw.catalog.Category} Category Level 2 OR 3
 */
 function getProductCategoryLevel(product, level) {
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
    } else if (parentCategory && parentCategory.getParent() && level === 3) {
        category = parentCategory.getParent();
    }

    return category;
}

/**
 * Get product categories path
 * @param {dw.catalog.Product} product - Product
 * @returns {string} String of categories path
 */
function getProductCategoriesPath(product) {
    var primaryCategory = getProductCategory(product);
    var primaryCategoryName = primaryCategory ? primaryCategory.displayName : '';
    var categoryLevelTwo = getProductCategoryLevel(product, 2);
    var categoryLevelTwoName = categoryLevelTwo ? categoryLevelTwo.displayName : '';
    var categoryLevelThree = getProductCategoryLevel(product, 3);
    var categoryLevelThreeName = categoryLevelThree ? categoryLevelThree.displayName : '';
    var categoryPath = (categoryLevelThreeName ? categoryLevelThreeName + ' > ' : '') + (categoryLevelTwoName ? categoryLevelTwoName + ' > ' : '') + (primaryCategoryName ? primaryCategoryName : '');

    return categoryPath;
}

/**
* Check if brDataLayerViewCategory is exist and configured in BM
* @returns {boolean} True/False
*/
function isBrDataLayerViewCategory() {
   return (isBrSdkIntegrationSnippet() && 'brDataLayerViewCategory' in sitePrefs.getCustom() && sitePrefs.getCustom()['brDataLayerViewCategory']) ? true : false;
}

/**
 * Get view_category datalayer object for SFRA
 * @param {pdict.productSearch} productSearchObj
 * @returns {string} JSON string of view_category datalayer object
 **/
 function getViewCategoryDataLayerSFRA(productSearchObj) {
    try {
        return JSON.stringify(createViewCategoryDataLayerSFRA(productSearchObj));
    } catch (e) {
        Logger.error('Error when trying to execute getViewCategoryDataLayer('+ productSearchObj +'):' + e);
        
        return '';
    }
}

/**
 * Get view_category datalayer object for Site Genesis
 * @param {pdict.productSearch} productSearchObj
 * @returns {string} JSON string of view_category datalayer object
 **/
 function getViewCategoryDataLayerSG(productSearchObj) {
    try {
        return JSON.stringify(createViewCategoryDataLayerSG(productSearchObj));
    } catch (e) {
        Logger.error('Error when trying to execute getViewCategoryDataLayer('+ productSearchObj +'):' + e);
        
        return '';
    }
}

/**
 * Get productIds list for datalayer object
 * @param {pdict.productSearch} productSearchObj
 * @returns {Array} listed_products with productIds list
 **/
function getListedProductsIds(productSearchObj) {
    var listed_products = [];

    //check for productIds exists and get it for SFRA site 
    if ('productIds' in productSearchObj && !empty(productSearchObj.productIds)) {
        var productIds = productSearchObj.productIds;
        productIds.forEach(function(item) {
            listed_products.push(item.productID);
        });
    } else {
        //get productID's for SG
        var params = request.httpParameterMap;

        var productPagingModel = new PagingModel(productSearchObj.productSearchHits, productSearchObj.count);
        if (params.start.submitted) {
            productPagingModel.setStart(params.start.intValue);
        }
    
        if (params.sz.submitted && params.sz.intValue <= 60) {
            productPagingModel.setPageSize(params.sz.intValue);
        } else {
            productPagingModel.setPageSize(12);
        }
        if (productPagingModel) {
    
            while (productPagingModel.pageElements.hasNext()) {
                var productItem = productPagingModel.pageElements.next();
                listed_products.push(productItem.productID);
            }
        }
    }
    
    return listed_products;
}

/**
 * Get Category Level 2 OR 3
 * @param  {dw.catalog.Category} category
 * @param  {Number} level
 * @returns {dw.catalog.Category} resultCategory Level 2 OR 3
 */
 function getCategoryLevel(category, level) {
    var resultCategory = '';
    var parentCategory = category.getParent();
    
    if (parentCategory && level === 2) {
        resultCategory = category.getParent();
    } else if (parentCategory && level === 3) {
        resultCategory = parentCategory.getParent();
    }

    return resultCategory;
}

/**
 * Get categories path
 * @param {dw.catalog.Category} category
 * @returns {string} String of categories path
 */
 function getCategoriesPath(category) {
    var primaryCategory = category;
    var primaryCategoryName = primaryCategory ? primaryCategory.displayName : '';
    var categoryLevelTwo = getCategoryLevel(category, 2);
    var categoryLevelTwoName = categoryLevelTwo ? categoryLevelTwo.displayName : '';
    var categoryLevelThree = getCategoryLevel(category, 3);
    var categoryLevelThreeName = categoryLevelThree ? categoryLevelThree.displayName : '';
    var categoryPath = (categoryLevelThreeName ? categoryLevelThreeName + ' > ' : '') + (categoryLevelTwoName ? categoryLevelTwoName + ' > ' : '') + (primaryCategoryName ? primaryCategoryName : '');

    return categoryPath;
}

/**
 * Get categories id's
 * @param {dw.catalog.Category} category
 * @returns {Array} Array of categories id's
 */
 function getCategoriesIds(category) {
    var categories = [];
    if (!empty(category) && category.ID !== 'root') {
        categories.push(category.ID);
        var parentCategory = category.getParent();

        while (parentCategory.ID !== 'root') {
            categories.push(parentCategory.ID);
            parentCategory = parentCategory.getParent();
        }
    }

    return categories.reverse();
}

/**
 * Get the selected filters type and values
 * @param {pdict.ProductSearchResult} productSearchResult
 * @return {Array} - List of selected filters type and values
 */
 function getSelectedFilters(productSearchResult) {
    var selectedFiltersList = [];
    var refinements = productSearchResult.refinements;
    var refinementDefinitions = refinements.refinementDefinitions;
    if (productSearchResult.isRefinedByCategory()) {
        selectedFiltersList.push('Category=' + productSearchResult.refinementCategory.displayName);
    }
    for (var i = 0; i < refinementDefinitions.length; i++) {
        var allRefinementValues = refinements.getAllRefinementValues(refinementDefinitions[i]);
        for (var q = 0; q < allRefinementValues.length; q++) {           
            if (productSearchResult.isRefinedByAttributeValue(refinementDefinitions[i].attributeID, allRefinementValues[q].value)) {
                selectedFiltersList.push(refinements.refinementDefinitions[i].displayName + '=' + allRefinementValues[q].value);
            }
            if (productSearchResult.isRefinedByPriceRange(allRefinementValues[q].valueFrom, allRefinementValues[q].valueTo)) {
                selectedFiltersList.push(refinements.refinementDefinitions[i].displayName + '=' + allRefinementValues[q].displayValue);
            }
        }
    }
 
    return selectedFiltersList;
}

/**
 * Get Sorting Rule Name
 * @param {pdict.productSearch.sortingRule} productSearch.sortingRule
 * @param  {dw.catalog.Category} category
 * @returns {string} sortingRuleName Sorting Rule Name
 */
function getSortingRuleName(sortingRule, category) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var sortOptions = CatalogMgr.getSortingOptions();
    var sortingRuleName, sortingRuleID;

    if (empty(sortingRule)) {
        if (empty(category)) {
			category = CatalogMgr.getSiteCatalog().getRoot();
		}
		if (!empty(category.getDefaultSortingRule())) {
			sortingRuleID = category.getDefaultSortingRule().getID();
		}
    } else {
        if ('ruleId' in sortingRule) {
            sortingRuleID = sortingRule.ruleId;
        } else {
            sortingRuleID = sortingRule.getID();
        }
    }
    
    for (var i = 0; i < sortOptions.length; i++) {
        if (sortOptions[i].getSortingRule().getID() === sortingRuleID) {
            sortingRuleName = sortOptions[i].getDisplayName();
            return sortingRuleName;
        }
    }

    return sortingRuleName;
}

/**
 * Create view_category datalayer object for SFRA
 * @param {pdict.productSearch} productSearchObj
 * @returns {Object} viewCategoryObj - view_category datalayer object
 **/
 function createViewCategoryDataLayerSFRA(productSearchObj) {
    var viewCategoryObj = {};
    var category = productSearchObj.productSearch.category;
    var category_level_1 = getCategoryLevel(category, 3);
    var category_level_2 = getCategoryLevel(category, 2);
    var category_level_3 = category;
    if (productSearchObj) {
        viewCategoryObj = {
            'namespace': getBrDataLayerNamespace(),
            'event_name': 'view_category',
            'event_properties': {
                'category_id':category.ID,
                'category_name': category.displayName,
                'listed_products': getListedProductsIds(productSearchObj),
                'category_level_1': category_level_1 ? category_level_1.displayName : '',
                'category_level_2': category_level_2 ? category_level_2.displayName : '',
                'category_level_3': category_level_3 ? category_level_3.displayName : '',
                'categories_path': getCategoriesPath(category),
                'categories_ids': getCategoriesIds(category),
                'filter_by': getSelectedFilters(productSearchObj.productSearch),
                'sort_by': getSortingRuleName(productSearchObj.productSort, category),
                'domain': domain,
                'language': getLanguage(),
            }
        };

    }
    
    return viewCategoryObj;
}

/**
 * Create view_category datalayer object for Site Genesis
 * @param {pdict.ProductSearchResult} productSearchResult
 * @returns {Object} viewCategoryObj - view_category datalayer object
 **/
 function createViewCategoryDataLayerSG(productSearchResult) {
    var viewCategoryObj = {};
    var category = productSearchResult.category;
    var category_level_1 = getCategoryLevel(category, 3);
    var category_level_2 = getCategoryLevel(category, 2);
    var category_level_3 = category;
    if (productSearchResult) {
        viewCategoryObj = {
            'namespace': getBrDataLayerNamespace(),
            'event_name': 'view_category',
            'event_properties': {
                'category_id':category.ID,
                'category_name': category.displayName,
                'listed_products': getListedProductsIds(productSearchResult),
                'category_level_1': category_level_1 ? category_level_1.displayName : '',
                'category_level_2': category_level_2 ? category_level_2.displayName : '',
                'category_level_3': category_level_3 ? category_level_3.displayName : '',
                'categories_path': getCategoriesPath(category),
                'categories_ids': getCategoriesIds(category),
                'filter_by': getSelectedFilters(productSearchResult),
                'sort_by': getSortingRuleName(productSearchResult.getSortingRule(), category),
                'domain': domain,
                'language': getLanguage(),
            }
        };

    }
    
    return viewCategoryObj;
}

/**
  * Get master/variation product ID
  * @param {dw.catalog.Product} product - Product
  * @returns {string} string master/variation product ID
  **/
function getMasterID(product) {
    var productID = product.getID();
    if (product.isVariant()) {
        productID = product.getVariationModel().getMaster().getID();
    }
    if (product.isBundled()) {
        productID = product.getBundles()[0].ID;
    }
    if (product.isProductSetProduct()) {
        productID = product.getProductSetProducts()[0].ID;
    }
    return productID;
}

/**
  * Get result object
  * @param {dw.order.ProductLineItems} lineItems
  * @returns {object} resultObj
  **/
function getProductItems(lineItems) {
    var resultObj = {
        'product_list': [],
        'product_ids': [],
        'variant_list': [],
        'variant_ids': [],
    };
    while (lineItems.hasNext()) {
        var item = lineItems.next();
        var product = item.getProduct();
        var productID = product.getID();
        var masterID = getMasterID(product);
        resultObj.variant_ids.push(productID);
        resultObj.product_ids.push(masterID);
        resultObj.variant_list.push({'variant_id':productID, 'quantity':item.getQuantityValue()});
        resultObj.product_list.push({'product_id':masterID, 'quantity':item.getQuantityValue()});
    }
    return resultObj;
}
/**
* Check if brDataLayerCartUpdate is exist and configured in BM
* @returns {boolean} True/False
*/
function isBrDataLayerCartUpdate() {
    return (isBrSdkIntegrationSnippet() && 'brDataLayerCartUpdate' in sitePrefs.getCustom() && sitePrefs.getCustom()['brDataLayerCartUpdate']) ? true : false;
 }
 
 /**
  * Get cart_update datalayer object for SFRA
  * @param {string} product ID
  * @param {string} eventProperties
  * @returns {string} JSON string of cart_update datalayer object
  **/
  function getCartUpdateDataLayer(productID, eventProperties) {
    try {
        return JSON.stringify(createCartUpdateDataLayer(productID, eventProperties));
    } catch (e) {
        Logger.error('Error when trying to execute getCartUpdateDataLayer: ' + e);
        
        return '';
    }
 }

/**
 * Create cart_update datalayer object
 * @param {string} product ID
 * @param {string} eventProperties
 * @returns {Object} cartUpdateObj - cart_update datalayer object
 **/
 function createCartUpdateDataLayer(productID, eventProperties) {
    var currentBasket = require('dw/order/BasketMgr').getCurrentBasket();
    var product = ProductMgr.getProduct(productID);
    var variantID = productID;
    var masterID = getMasterID(product);
    var tags = ('bloomreachTags' in product.getCustom()) ? product.getCustom().bloomreachTags : '';
    var eventPropertiesObj = JSON.parse(eventProperties);
    var category = getProductCategory(product);
    var category_level_1 = getProductCategoryLevel(product, 3);
    var category_level_2 = getProductCategoryLevel(product, 2);
    var category_level_3 = category;
    var productPrices = getProductPrices(product);
    var lineItemsObj = getProductItems(currentBasket.getProductLineItems().iterator());
    var cartUpdateObj = {};
    if (product) {
        cartUpdateObj = {
            'namespace': getBrDataLayerNamespace(),
            'event_name': 'cart_update',
            'event_properties': {
                'action': eventPropertiesObj.action,
                'button_type': eventPropertiesObj.button_type,
                'button_copy': eventPropertiesObj.button_copy,
                'page_type': eventPropertiesObj.page_type,
                'product_id': masterID,
                'variant_id': variantID,
                'title': product.getName(),
                'brand': product.getBrand(),
                'tags': tags,
                'category_level_1': category_level_1 ? category_level_1.displayName : '',
                'category_level_2': category_level_2 ? category_level_2.displayName : '',
                'category_level_3': category_level_3 ? category_level_3.displayName : '',
                'categories_path': getProductCategoriesPath(product),
                'category_id': category.ID,
                'categories_ids': getProductCategoriesIds(product),
                'price': productPrices.price,
                'discount_percentage': productPrices.discountPercentage,
                'discount_value': productPrices.discountValue,
                'original_price': productPrices.originalPrice,
                'domain': domain,
                'language': getLanguage(),
                'product_list': lineItemsObj.product_list,
                'product_ids': lineItemsObj.product_ids,
                'variant_list': lineItemsObj.variant_list,
                'variant_ids': lineItemsObj.variant_ids,
                'total_quantity': currentBasket.getProductQuantityTotal(),
                'total_price': currentBasket.getTotalGrossPrice().value || currentBasket.getAdjustedMerchandizeTotalGrossPrice().value,
                'total_price_without_tax': currentBasket.getTotalNetPrice().value || currentBasket.getAdjustedMerchandizeTotalNetPrice().value,
            }
        };

    }
    
    return cartUpdateObj;
}

/**
 * Get cart_update datalayer object
 * @param {string} orderNumber
 * @returns {string} JSON string of cart_update datalayer object
 **/
function getCartUpdateEmptyDataLayer(orderNumber) {
    try {
        return JSON.stringify(createCartUpdateEmptyDataLayer(orderNumber));
    } catch (e) {
        Logger.error('Error when trying to execute getCartUpdateDataLayer: ' + e);
        
        return '';
    }
 }

/**
 * Create cart_update datalayer object
 * @param {string} orderNumber
 * @returns {Object} cartUpdateObj - cart_update datalayer object
 **/
 function createCartUpdateEmptyDataLayer(orderNumber) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var lineItemsObj = getProductItems(order.getProductLineItems().iterator());
    var cartUpdateObj = {};
    if (order) {
        cartUpdateObj = {
            'namespace': getBrDataLayerNamespace(),
            'event_name': 'cart_update',
            'event_properties': {
                'action': 'empty',
                'button_type': 'checkout',
                'button_copy': '',
                'page_type': 'checkout',
                'product_id': '',
                'variant_id': '',
                'title': '',
                'brand': '',
                'tags': '',
                'category_level_1': '',
                'category_level_2': '',
                'category_level_3': '',
                'categories_path': '',
                'category_id': '',
                'categories_ids': '',
                'price': 0,
                'discount_percentage': 0,
                'discount_value': 0,
                'original_price': 0,
                'domain': domain,
                'language': getLanguage(),
                'product_list': lineItemsObj.product_list,
                'product_ids': lineItemsObj.product_ids,
                'variant_list': lineItemsObj.variant_list,
                'variant_ids': lineItemsObj.variant_ids,
                'total_quantity': order.getProductQuantityTotal(),
                'total_price': order.getTotalGrossPrice().value || order.getAdjustedMerchandizeTotalGrossPrice().value,
                'total_price_without_tax': order.getTotalNetPrice().value || order.getAdjustedMerchandizeTotalNetPrice().value
            }
        };
    }
    
    return cartUpdateObj;
}

/**
* Check if brDataLayerViewCategory is exist and configured in BM
* @returns {boolean} True/False
*/
function isBrDataLayerIdentification() {
    return (isBrSdkIntegrationSnippet() && 'brDataLayerIdentification' in sitePrefs.getCustom() && sitePrefs.getCustom()['brDataLayerIdentification'].getValue() !== 'identify_disabled') ? true : false;
 }

/**
 * Get identification datalayer object
 * @param {string} orderNumber
 * @returns {string} JSON string of identification datalayer object
 **/
function getIdentificationDataLayer() {
    try {
        return JSON.stringify(createIdentificationDataLayer());
    } catch (e) {
        Logger.error('Error when trying to execute getIdentificationDataLayer: ' + e);
        
        return '';
    }
 }

/**
 * Create identification datalayer object for SFRA
 * @param {string} orderNumber
 * @returns {Object} cartUpdateObj - identification datalayer object
 **/
function createIdentificationDataLayer() {
    var brDataLayerIdentification = sitePrefs.getCustom()['brDataLayerIdentification'].getValue();
    var customer = session.customer;
    var identificationObj = {};
    if (brDataLayerIdentification && customer.authenticated && customer.registered) {
        identificationObj = {
            'namespace': getBrDataLayerNamespace(),
            'event_name': 'login'
        }
        if (brDataLayerIdentification === 'identify_email') {
            identificationObj.event_properties = {
                'customer_ids': {
                    'email': customer.profile.email
                }
            }
        } else if (brDataLayerIdentification === 'identify_customer_id') {
            identificationObj.event_properties = {
                'customer_ids': {
                    'customer_id': customer.profile.customerNo
                }
            }
        } else {
            identificationObj.event_properties = {
                'customer_ids': {
                    'customer_id': customer.profile.customerNo,
                    'email': customer.profile.email
                }
            }
        }
    }
    
    return identificationObj;
}

module.exports = {
    isBrSdkIntegrationSnippet: isBrSdkIntegrationSnippet,
    getBrSdkIntegrationSnippet: getBrSdkIntegrationSnippet,
    isBrDataLayerViewItem: isBrDataLayerViewItem,
    getViewItemDataLayer: getViewItemDataLayer,
    isBrDataLayerViewCategory: isBrDataLayerViewCategory,
    getViewCategoryDataLayerSFRA: getViewCategoryDataLayerSFRA,
    getViewCategoryDataLayerSG: getViewCategoryDataLayerSG,
    isBrDataLayerCartUpdate: isBrDataLayerCartUpdate,
    getCartUpdateDataLayer: getCartUpdateDataLayer,
    getCartUpdateEmptyDataLayer: getCartUpdateEmptyDataLayer,
    isBrDataLayerIdentification: isBrDataLayerIdentification,
    getIdentificationDataLayer: getIdentificationDataLayer
}