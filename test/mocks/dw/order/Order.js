/**
 * Mock implementation of dw/order/Order
 * Represents an order in the system
 */

class Order {
    constructor(orderNo) {
        this.orderNo = orderNo;
        this.orderToken = `token_${orderNo}`;
        this.creationDate = new Date();
        this.status = Order.ORDER_STATUS_CREATED;
        this.customerEmail = '';
        this.customerName = '';
        this.currencyCode = 'USD';
        this.totalGrossPrice = { value: 0 };
        this.totalNetPrice = { value: 0 };
        this.totalTax = { value: 0 };
        this.adjustedMerchandizeTotalGrossPrice = { value: 0 };
        this.adjustedMerchandizeTotalNetPrice = { value: 0 };
        this.adjustedShippingTotalGrossPrice = { value: 0 };
        this.adjustedShippingTotalNetPrice = { value: 0 };
        this.merchandizeTotalGrossPrice = { value: 0 };
        this.merchandizeTotalNetPrice = { value: 0 };
        this.shippingTotalGrossPrice = { value: 0 };
        this.shippingTotalNetPrice = { value: 0 };
        this.allProductLineItems = [];
        this.allLineItems = [];
        this.allProductQuantities = new Map();
        this.billingAddress = null;
        this.defaultShipment = null;
        this.shipments = [];
        this.paymentInstruments = [];
        this.custom = {};
    }

    getOrderNo() {
        return this.orderNo;
    }

    getCreationDate() {
        return this.creationDate;
    }

    getStatus() {
        return this.status;
    }

    getCustomerEmail() {
        return this.customerEmail;
    }

    getTotalGrossPrice() {
        return this.totalGrossPrice;
    }

    getTotalNetPrice() {
        return this.totalNetPrice;
    }

    getAllProductLineItems() {
        return {
            iterator: () => ({
                hasNext: () => false,
                next: () => null
            }),
            toArray: () => this.allProductLineItems
        };
    }

    getAllLineItems() {
        return {
            iterator: () => ({
                hasNext: () => false,
                next: () => null
            }),
            toArray: () => this.allLineItems
        };
    }
}

// Order status constants
Order.ORDER_STATUS_CREATED = 0;
Order.ORDER_STATUS_NEW = 1;
Order.ORDER_STATUS_OPEN = 2;
Order.ORDER_STATUS_COMPLETED = 3;
Order.ORDER_STATUS_CANCELLED = 4;
Order.ORDER_STATUS_REPLACED = 5;
Order.ORDER_STATUS_FAILED = 6;

module.exports = Order;

