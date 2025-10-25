/**
 * Mock implementation of dw/campaign/Promotion
 * Represents a promotion in the system
 */

class Promotion {
    constructor(id, name) {
        this.ID = id;
        this.name = name;
        this.promotionClass = Promotion.PROMOTION_CLASS_PRODUCT;
        this.enabled = true;
        this.startDate = null;
        this.endDate = null;
        this.calloutMsg = '';
        this.details = '';
        this.custom = {};
    }

    getID() {
        return this.ID;
    }

    getName() {
        return this.name;
    }

    getPromotionClass() {
        return this.promotionClass;
    }

    isEnabled() {
        return this.enabled;
    }

    getStartDate() {
        return this.startDate;
    }

    getEndDate() {
        return this.endDate;
    }

    getCalloutMsg() {
        return this.calloutMsg;
    }

    getDetails() {
        return this.details;
    }

    getCustom() {
        return this.custom;
    }

    isBasedOnSourceCodes() {
        return false;
    }

    isBasedOnCoupons() {
        return false;
    }
}

// Promotion class constants
Promotion.PROMOTION_CLASS_PRODUCT = 'PRODUCT';
Promotion.PROMOTION_CLASS_ORDER = 'ORDER';
Promotion.PROMOTION_CLASS_SHIPPING = 'SHIPPING';

module.exports = Promotion;

