/**
 * Mock implementation of dw/order/OrderMgr
 * Manages order operations for testing purposes
 */

const orders = [];

class OrderIterator {
    constructor(orders) {
        this.orders = orders;
        this.currentIndex = 0;
    }

    hasNext() {
        return this.currentIndex < this.orders.length;
    }

    next() {
        if (!this.hasNext()) {
            return null;
        }
        return this.orders[this.currentIndex++];
    }

    close() {
        this.currentIndex = this.orders.length;
    }

    getCount() {
        return this.orders.length;
    }

    get count() {
        return this.orders.length;
    }
}

module.exports = {
    /**
     * Searches for orders based on query and sort criteria
     * @param {string} queryString - The query string
     * @param {string} sortString - The sort criteria
     * @param {...any} args - Additional arguments for query parameters
     * @returns {Object} Iterator over matching orders
     */
    searchOrders: function(queryString, sortString, ...args) {
        // Simple mock implementation - returns all stored orders
        // In a real test, you would filter based on queryString
        return new OrderIterator(orders);
    },

    /**
     * Gets an order by order number
     * @param {string} orderNo - The order number
     * @returns {Object|null} The order or null if not found
     */
    getOrder: function(orderNo) {
        return orders.find(order => order.orderNo === orderNo) || null;
    },

    /**
     * Creates a new order
     * @param {string} orderNo - The order number
     * @returns {Object} The created order
     */
    createOrder: function(orderNo) {
        const Order = require('./Order');
        const order = new Order(orderNo);
        orders.push(order);
        return order;
    },

    /**
     * Fails an order
     * @param {Object} order - The order to fail
     * @param {boolean} cancelPayment - Whether to cancel payment
     */
    failOrder: function(order, cancelPayment) {
        const Order = require('./Order');
        order.status = Order.ORDER_STATUS_FAILED;
    },

    /**
     * Cancels an order
     * @param {Object} order - The order to cancel
     */
    cancelOrder: function(order) {
        const Order = require('./Order');
        order.status = Order.ORDER_STATUS_CANCELLED;
    },

    // Test helpers
    __addOrder: function(order) {
        orders.push(order);
    },

    __setOrders: function(newOrders) {
        orders.length = 0;
        orders.push(...newOrders);
    },

    __getOrders: function() {
        return orders;
    },

    __reset: function() {
        orders.length = 0;
    }
};

