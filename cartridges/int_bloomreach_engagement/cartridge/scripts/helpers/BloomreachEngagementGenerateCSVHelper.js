'use strict';

var File = require('dw/io/File');
var Site = require('dw/system/Site');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var URL = require('dw/web/URL');
var BloomreachEngagementConstants = require('~/cartridge/scripts/util/orderInfoFeedConstants');

const BloomreachEngagementCustomerInfoFeedHelpers = require('~/cartridge/scripts/helpers/BloomreachEngagementCustomerInfoFeedHelpers.js');

/**
* Creates the empty CSV feed file
* @returns {File} created file in CSV format
*/
function createPurchaseFeedFile(filename,targetFolder,fileNum) {
	//var WORKING_FOLDER = [File.IMPEX, 'src', 'feeds'].join(File.SEPARATOR);
    var workingFolder = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!workingFolder.exists()) {
        workingFolder.mkdirs();
    }
    //var currentDate = new Calendar(Date.now());
    var fileName = [filename,Date.now(),fileNum, '.csv'].join('');
    var purchaseFeedFile = new File(workingFolder, fileName);
    
    return purchaseFeedFile;
}

/**
* check the date of orders to be exported
* @returns {date} orders after this date have to be exported
*/
function getOrderExportDate(jobID) {
	var prefID = jobID.split(' ').join('').replace('(','').replace(')','').replace('-','');
	prefID = prefID.replace(prefID.charAt(0),prefID.charAt(0).toLowerCase());
    return Site.current.getCustomPreferenceValue(prefID + 'FromDate');
}

/**
* set the date of orders to be exported
*/
function updateOrderExportDate(jobID,date) {
	var prefID = jobID.split(' ').join('').replace('(','').replace(')','').replace('-','');
	prefID = prefID.replace(prefID.charAt(0),prefID.charAt(0).toLowerCase());
	Transaction.wrap(function() {
		Site.current.setCustomPreferenceValue(prefID + 'FromDate',date);
	});    
    return;
}

/**
* writes the order attributes in the CSV 
*/
function writePurchaseFeedRow(csw,headers,SFCCAttr,bloomreachOrderObject) {
	var orderCSVAttributes = [];
	/** @type {dw.util.Iterator} */
	var itemIterator;
	for (var i = 0; i < headers.length; i++){
		if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PURCHASESTATUS)){
			orderCSVAttributes.push(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.SUCCESS);
		}else if (headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TOTALQUANTITY)){			
			orderCSVAttributes.push(bloomreachOrderObject.allProductQuantities.values().toArray().reduce((partial_sum, a) => partial_sum + a, 0));			
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.DOMAIN)){
			orderCSVAttributes.push(URLUtils.home().siteHost().toString());
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PURCHASESOURCENAME)){
			orderCSVAttributes.push(URLUtils.home().toString());			
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.SHIPPINGCOMPANY)){
			itemIterator = bloomreachOrderObject.allLineItems.iterator();
			while (itemIterator.hasNext()) {
				/** @type {dw.order.LineItem} */
				var lineItem = itemIterator.next();
				if(lineItem.lineItemText.equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.SHIPPING)){
					orderCSVAttributes.push(lineItem.ID);
				}
			}
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL3)){
			orderCSVAttributes.push(!empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute]) ? bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].displayName : "");			
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL2)){
			orderCSVAttributes.push(!empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute]) && !empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent)? bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent.displayName : "");			
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL1)){
			orderCSVAttributes.push(!empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute]) && !empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent) && !empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent.parent)? bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent.parent.displayName : "");			
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYPATH)){
			orderCSVAttributes.push(!empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute]) && !empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent) && !empty(bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent.parent)? URLUtils.abs('Search-Show','cgid',bloomreachOrderObject.allProductLineItems[0].product[SFCCAttr[i].SFCCProductAttribute].parent.parent.ID).toString() : "");			
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.DISCOUNTVALUE)){
			var valueExist = false;
			itemIterator = bloomreachOrderObject.allLineItems.iterator();
			while (itemIterator.hasNext()) {
				/** @type {dw.order.LineItem} */
				var lineItem = itemIterator.next();
				if('appliedDiscount' in lineItem){
					orderCSVAttributes.push(lineItem.priceValue);
					valueExist = true;
					break;
				}
			}
			if(!valueExist){
				orderCSVAttributes.push("");
			}
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.DISCOUNTPERCENTAGE)){
			var valueExist = false;
			itemIterator = bloomreachOrderObject.allLineItems.iterator();
			while (itemIterator.hasNext()) {
				/** @type {dw.order.LineItem} */
				var lineItem = itemIterator.next();
				if('appliedDiscount' in lineItem){
					orderCSVAttributes.push(lineItem.appliedDiscount.percentage);
					valueExist = true;
					break;
				}
			}
			if(!valueExist){
				orderCSVAttributes.push("");
			}
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PRODUCTLIST)){
			var jsonObj = {};
			var arrayObj = [];
			itemIterator = bloomreachOrderObject.allProductLineItems.iterator();
			while (itemIterator.hasNext()) {
				/** @type {dw.order.ProductLineItem} */
				var productLineItem = itemIterator.next();
				var productID = productLineItem.product ? ('masterProduct' in productLineItem.product ? productLineItem.product.masterProduct.ID : productLineItem.product.ID) : '';
				jsonObj.productId = productID;
				jsonObj.quantity = productLineItem.quantityValue;
				arrayObj.push(JSON.stringify(jsonObj));
			}
			orderCSVAttributes.push(arrayObj.toString());
		}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PRODUCTIDS)){
			var arrayObj = [];
			itemIterator = bloomreachOrderObject.allProductLineItems.iterator();
			while (itemIterator.hasNext()) {
				/** @type {dw.order.ProductLineItem} */
				var productLineItem = itemIterator.next();
				var productID = productLineItem.product ? ('masterProduct' in productLineItem.product ? productLineItem.product.masterProduct.ID : productLineItem.product.ID) : '';
				arrayObj.push(productID);
			}
			orderCSVAttributes.push(arrayObj.toString());
		} else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TIMESTAMP)){
			var timeStamp = BloomreachEngagementCustomerInfoFeedHelpers.getTimeStamp(bloomreachOrderObject[SFCCAttr[i].SFCCProductAttribute]);
			orderCSVAttributes.push(timeStamp);
		} else{
			orderCSVAttributes.push(bloomreachOrderObject[SFCCAttr[i].SFCCProductAttribute]);
		}
	}
	return orderCSVAttributes;
}

/**
* writes the order product attributes in the CSV 
*/
function writePurchaseProductFeedRow(csw,headers,SFCCAttr,bloomreachOrderObject) {	
	var a = BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL1;
	var orderCSVAttributesRows = [];
	/** @type {dw.util.Iterator} */
	var itemIterator = bloomreachOrderObject.allProductLineItems.iterator();
	while (itemIterator.hasNext()) {
		/** @type {dw.order.ProductLineItem} */
		var productLineItem = itemIterator.next();
		var orderCSVAttributes = [];
		var isOptionPLItem = productLineItem.isOptionProductLineItem();
		/** @type {dw.util.Iterator} */
		var subItemIterator;
		
		for (var i = 0; i < headers.length; i++){
			if (isOptionPLItem && headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TITLE)) {
				var optionItemText = productLineItem.lineItemText;
				orderCSVAttributes.push(optionItemText);
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PURCHASESTATUS)){
				orderCSVAttributes.push(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.SUCCESS);
			}else if (headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TOTALQUANTITY)){
				orderCSVAttributes.push(bloomreachOrderObject.allProductQuantities.values().toArray().join(','));
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.SHIPPINGCOMPANY)){
				subItemIterator = bloomreachOrderObject.allLineItems.iterator();
				while(subItemIterator.hasNext()){
					/** @type {dw.order.LineItem} */
					var lineItem = subItemIterator.next();
					if(lineItem.lineItemText.equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.SHIPPING)){
						orderCSVAttributes.push(lineItem.ID);
					}
				}
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.DOMAIN)){
				orderCSVAttributes.push(URLUtils.home().siteHost().toString());
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL3)){
				orderCSVAttributes.push(!empty(productLineItem.product) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute]) ? productLineItem.product[SFCCAttr[i].SFCCProductAttribute].displayName : "");			
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL2)){
				orderCSVAttributes.push(!empty(productLineItem.product) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute]) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent)? productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent.displayName : "");			
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYLEVEL1)){
				orderCSVAttributes.push(!empty(productLineItem.product) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute]) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent.parent)? productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent.parent.displayName : "");			
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.CATEGORYPATH)){
				var category1 = !empty(productLineItem.product) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute]) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent.parent)? productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent.parent.displayName : "";			

				var category2 = !empty(productLineItem.product) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute]) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent)? productLineItem.product[SFCCAttr[i].SFCCProductAttribute].parent.displayName : "";
				
				var category3 = !empty(productLineItem.product) && !empty(productLineItem.product[SFCCAttr[i].SFCCProductAttribute]) ? productLineItem.product[SFCCAttr[i].SFCCProductAttribute].displayName : "";
				
				var categoriesPath = category1 + (category2 ? '>' + category2 : '') + (category3 ? '>' + category3 : '');
				
				orderCSVAttributes.push(categoriesPath);

			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PURCHASESOURCENAME)){
				orderCSVAttributes.push(URLUtils.home().toString());			
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PRODUCTLIST)){
				var jsonObj = {};
				var productID = productLineItem.product ? ('masterProduct' in productLineItem.product ? productLineItem.product.masterProduct.ID : productLineItem.product.ID) : '';
				jsonObj.productId = productID;
				jsonObj.quantity = productLineItem.quantityValue;
				orderCSVAttributes.push(JSON.stringify(jsonObj));
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PRODUCTIDS)){
				var arrayObj = [];
				subItemIterator = bloomreachOrderObject.allProductLineItems.iterator();
				while(subItemIterator.hasNext()){
					/** @type {dw.order.ProductLineItem} */
					var subProductLineItem = subItemIterator.next();
					var productID = subProductLineItem.product ? ('masterProduct' in subProductLineItem.product ? subProductLineItem.product.masterProduct.ID : subProductLineItem.product.ID) : '';
					arrayObj.push(productID);				
				}
				orderCSVAttributes.push(arrayObj.toString());
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PRODUCTID)){			
				orderCSVAttributes.push(productLineItem.product ? ('masterProduct' in productLineItem.product ? productLineItem.product.masterProduct.ID : productLineItem.product.ID) : '');
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TOTALPRICE) || headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TOTALPRICEWITHOUTTAX) || headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.QUANTITY)){
				orderCSVAttributes.push(productLineItem[SFCCAttr[i].SFCCProductAttribute]);
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.VARIANTID) || headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.BRAND) || headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TITLE)){
				orderCSVAttributes.push(productLineItem.product ? productLineItem.product[SFCCAttr[i].SFCCProductAttribute] : '');
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TAGS)){
				orderCSVAttributes.push(productLineItem.product ? productLineItem.product.custom[SFCCAttr[i].SFCCProductAttribute] : '');
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.ORIGINALPRICE) || headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.PRICE)){
				orderCSVAttributes.push(productLineItem.product ? productLineItem.product.priceModel.pricePerUnit : '');
			}		
			else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.DISCOUNTVALUE)){
				if(!empty(productLineItem.priceAdjustments)){
					orderCSVAttributes.push(productLineItem.priceAdjustments[0].priceValue);
				}else{
					orderCSVAttributes.push("");
				}
			}else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.DISCOUNTPERCENTAGE)){
				if(!empty(productLineItem.priceAdjustments)){
					orderCSVAttributes.push(productLineItem.priceAdjustments[0].appliedDiscount.percentage);				
				}else{
					orderCSVAttributes.push("");
				}
			} else if(headers[i].equalsIgnoreCase(BloomreachEngagementConstants.PRODUCT_ATTRIBUTES.TIMESTAMP)){
				var timeStamp = BloomreachEngagementCustomerInfoFeedHelpers.getTimeStamp(bloomreachOrderObject[SFCCAttr[i].SFCCProductAttribute]);
				orderCSVAttributes.push(timeStamp);
			} else{
				orderCSVAttributes.push(bloomreachOrderObject[SFCCAttr[i].SFCCProductAttribute]);
			}		
		}
		
		orderCSVAttributesRows.push(orderCSVAttributes);
	}
	
	return orderCSVAttributesRows;
}

/**
* writes the order attributes headers in the CSV 
*/
function getOrderPurchaseFeedAttributes() {
   var headers = getPurchaseFeedFileHeaders();
   var csvHeaderArray = [];
   var SFCCAttributesValue = [];
   var results = {};
   
   var headersJSON = JSON.parse(headers);
   
    for (var i = 0; i < headersJSON.length; i++) {
       if (csvHeaderArray.indexOf(headersJSON[i].XSDField) == -1) {
           csvHeaderArray.push(headersJSON[i].XSDField);
           SFCCAttributesValue.push({'SFCCProductAttribute': headersJSON[i].SFCCProductAttribute, 'isCustom': headersJSON[i].isCustomAttribute});
        }
    }
   results.headers = csvHeaderArray;
   results.SFCCAttributesValue = SFCCAttributesValue;
   //csw.writeNext(headers);
   return results;
}
/**
* writes the order attributes headers in the CSV 
*/
function getFeedAttributes(headers) {
   var csvHeaderArray = [];
   var SFCCAttributesValue = [];
   var results = {};
   
   var headersJSON = JSON.parse(headers);
   
    for (var i = 0; i < headersJSON.length; i++) {
       if (csvHeaderArray.indexOf(headersJSON[i].XSDField) == -1) {
           csvHeaderArray.push(headersJSON[i].XSDField);
           SFCCAttributesValue.push({'SFCCProductAttribute': headersJSON[i].SFCCProductAttribute, 'isCustom': headersJSON[i].isCustomAttribute});
        }
    }
   results.headers = csvHeaderArray;
   results.SFCCAttributesValue = SFCCAttributesValue;
   return results;
}
/**
* get the custom properties of the orders that needs to be included in CSV 
* @returns {string} returns the properties of orders which needs to be exported
*/
function getPurchaseFeedFileHeaders(){
	return Site.current.getCustomPreferenceValue('brEngPurchaseFeedDataMapping');
}

/**
* get the custom properties of the ordered products that needs to be included in CSV 
* @returns {string} returns the properties of products which needs to be exported
*/
function getPurchaseProductFeedFileHeaders(){
	return Site.current.getCustomPreferenceValue('brEngPurchaseItemDataMapping');
}


/**
* query the orders in BM based on order status
* @returns {Iterator} the iterator of order objects
*/
function getOrdersForPurchaseFeed(orderStatusForExport,lastRunDate) {
	var ordersToProcess;
	if(empty(lastRunDate)){
		ordersToProcess = OrderMgr.searchOrders(orderStatusForExport.join(' OR '), 'creationDate asc');
	}else{
    	ordersToProcess = OrderMgr.searchOrders(orderStatusForExport.join(' OR ') + ' AND creationDate >= {0}', 'creationDate asc', lastRunDate);
	}
    return ordersToProcess;
}

exports.getOrdersForPurchaseFeed = getOrdersForPurchaseFeed;
exports.getPurchaseFeedFileHeaders = getPurchaseFeedFileHeaders;
exports.getOrderPurchaseFeedAttributes = getOrderPurchaseFeedAttributes;
exports.writePurchaseFeedRow = writePurchaseFeedRow;
exports.getOrderExportDate = getOrderExportDate;
exports.createPurchaseFeedFile = createPurchaseFeedFile;
exports.getPurchaseProductFeedFileHeaders = getPurchaseProductFeedFileHeaders;
exports.writePurchaseProductFeedRow = writePurchaseProductFeedRow;
exports.updateOrderExportDate = updateOrderExportDate;
exports.getFeedAttributes = getFeedAttributes;