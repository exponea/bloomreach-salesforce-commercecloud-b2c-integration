/**
 * Main entry point for SFCC mocks
 * Provides easy access to all mock modules
 * 
 * Usage:
 * const mocks = require('./test/mocks');
 * const Logger = mocks.Logger;
 * const Order = mocks.Order;
 * 
 * Or set up global dw object:
 * global.dw = require('./test/mocks/dw');
 */

module.exports = {
    // System mocks
    Logger: require('./dw/system/Logger'),
    Status: require('./dw/system/Status'),
    Site: require('./dw/system/Site'),
    Transaction: require('./dw/system/Transaction'),
    System: require('./dw/system/System'),

    // I/O mocks
    File: require('./dw/io/File'),
    FileWriter: require('./dw/io/FileWriter'),
    FileReader: require('./dw/io/FileReader'),
    CSVStreamWriter: require('./dw/io/CSVStreamWriter'),
    CSVStreamReader: require('./dw/io/CSVStreamReader'),

    // Order mocks
    Order: require('./dw/order/Order'),
    OrderMgr: require('./dw/order/OrderMgr'),

    // Object mocks
    CustomObjectMgr: require('./dw/object/CustomObjectMgr'),

    // Utility mocks
    ArrayList: require('./dw/util/ArrayList'),
    HashMap: require('./dw/util/HashMap'),
    StringUtils: require('./dw/util/StringUtils'),

    // Catalog mocks
    ProductMgr: require('./dw/catalog/ProductMgr'),

    // Customer mocks
    CustomerMgr: require('./dw/customer/CustomerMgr'),

    // Web mocks
    URLUtils: require('./dw/web/URLUtils'),
    URL: require('./dw/web/URL'),

    // Service mocks
    LocalServiceRegistry: require('./dw/svc/LocalServiceRegistry'),
    Service: require('./dw/svc/Service'),

    // Campaign mocks
    Promotion: require('./dw/campaign/Promotion'),
    PromotionMgr: require('./dw/campaign/PromotionMgr'),

    // Export the complete dw object
    dw: require('./dw'),

    /**
     * Helper function to reset all mocks
     * Useful in test setup/teardown
     */
    resetAll: function() {
        const Logger = require('./dw/system/Logger');
        const Site = require('./dw/system/Site');
        const System = require('./dw/system/System');
        const URLUtils = require('./dw/web/URLUtils');
        const OrderMgr = require('./dw/order/OrderMgr');
        const CustomObjectMgr = require('./dw/object/CustomObjectMgr');
        const ProductMgr = require('./dw/catalog/ProductMgr');
        const CustomerMgr = require('./dw/customer/CustomerMgr');
        const LocalServiceRegistry = require('./dw/svc/LocalServiceRegistry');
        const PromotionMgr = require('./dw/campaign/PromotionMgr');

        Logger.__reset();
        Site.__reset();
        System.__reset();
        URLUtils.__reset();
        OrderMgr.__reset();
        CustomObjectMgr.__reset();
        ProductMgr.__reset();
        CustomerMgr.__reset();
        LocalServiceRegistry.__reset();
        PromotionMgr.__reset();
    }
};

