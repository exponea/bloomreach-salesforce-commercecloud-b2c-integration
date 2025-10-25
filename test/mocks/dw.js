/**
 * Mock implementation of the global dw object
 * This provides access to all SFCC Digital Web APIs for testing
 * 
 * Usage in tests:
 * global.dw = require('./test/mocks/dw');
 */

module.exports = {
    // System APIs
    system: {
        Logger: require('./dw/system/Logger'),
        Status: require('./dw/system/Status'),
        Site: require('./dw/system/Site'),
        Transaction: require('./dw/system/Transaction'),
        System: require('./dw/system/System')
    },

    // IO APIs
    io: {
        File: require('./dw/io/File'),
        FileWriter: require('./dw/io/FileWriter'),
        FileReader: require('./dw/io/FileReader'),
        CSVStreamWriter: require('./dw/io/CSVStreamWriter'),
        CSVStreamReader: require('./dw/io/CSVStreamReader')
    },

    // Order APIs
    order: {
        Order: require('./dw/order/Order'),
        OrderMgr: require('./dw/order/OrderMgr')
    },

    // Object APIs
    object: {
        CustomObjectMgr: require('./dw/object/CustomObjectMgr')
    },

    // Utility APIs
    util: {
        ArrayList: require('./dw/util/ArrayList'),
        HashMap: require('./dw/util/HashMap'),
        StringUtils: require('./dw/util/StringUtils')
    },

    // Catalog APIs
    catalog: {
        ProductMgr: require('./dw/catalog/ProductMgr')
    },

    // Customer APIs
    customer: {
        CustomerMgr: require('./dw/customer/CustomerMgr')
    },

    // Web APIs
    web: {
        URLUtils: require('./dw/web/URLUtils'),
        URL: require('./dw/web/URL')
    },

    // Service APIs
    svc: {
        LocalServiceRegistry: require('./dw/svc/LocalServiceRegistry'),
        Service: require('./dw/svc/Service')
    },

    // Campaign APIs
    campaign: {
        Promotion: require('./dw/campaign/Promotion'),
        PromotionMgr: require('./dw/campaign/PromotionMgr')
    }
};

