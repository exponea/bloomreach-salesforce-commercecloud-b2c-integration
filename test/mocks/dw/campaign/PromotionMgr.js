/**
 * Mock implementation of dw/campaign/PromotionMgr
 * Manages promotions for testing purposes
 */

const Promotion = require('./Promotion');

const promotions = [];

module.exports = {
    /**
     * Gets active promotions
     * @returns {Object} Iterator over active promotions
     */
    getActivePromotions: function() {
        const activePromotions = promotions.filter(promo => promo.isEnabled());
        
        return {
            iterator: function() {
                let index = 0;
                return {
                    hasNext: () => index < activePromotions.length,
                    next: () => activePromotions[index++]
                };
            },
            getCount: () => activePromotions.length,
            count: activePromotions.length,
            toArray: () => activePromotions
        };
    },

    /**
     * Gets a promotion by ID
     * @param {string} promotionId - The promotion ID
     * @returns {Promotion|null} The promotion or null if not found
     */
    getPromotion: function(promotionId) {
        return promotions.find(promo => promo.ID === promotionId) || null;
    },

    /**
     * Gets active customer promotions
     * @returns {Object} Collection of active customer promotions
     */
    getActiveCustomerPromotions: function() {
        return this.getActivePromotions();
    },

    /**
     * Gets active product promotions
     * @returns {Object} Collection of active product promotions
     */
    getActiveProductPromotions: function() {
        const productPromotions = promotions.filter(
            promo => promo.isEnabled() && 
                     promo.promotionClass === Promotion.PROMOTION_CLASS_PRODUCT
        );
        
        return {
            iterator: function() {
                let index = 0;
                return {
                    hasNext: () => index < productPromotions.length,
                    next: () => productPromotions[index++]
                };
            },
            getCount: () => productPromotions.length,
            count: productPromotions.length,
            toArray: () => productPromotions
        };
    },

    /**
     * Gets active order promotions
     * @returns {Object} Collection of active order promotions
     */
    getActiveOrderPromotions: function() {
        const orderPromotions = promotions.filter(
            promo => promo.isEnabled() && 
                     promo.promotionClass === Promotion.PROMOTION_CLASS_ORDER
        );
        
        return {
            iterator: function() {
                let index = 0;
                return {
                    hasNext: () => index < orderPromotions.length,
                    next: () => orderPromotions[index++]
                };
            },
            getCount: () => orderPromotions.length,
            count: orderPromotions.length,
            toArray: () => orderPromotions
        };
    },

    /**
     * Gets active shipping promotions
     * @returns {Object} Collection of active shipping promotions
     */
    getActiveShippingPromotions: function() {
        const shippingPromotions = promotions.filter(
            promo => promo.isEnabled() && 
                     promo.promotionClass === Promotion.PROMOTION_CLASS_SHIPPING
        );
        
        return {
            iterator: function() {
                let index = 0;
                return {
                    hasNext: () => index < shippingPromotions.length,
                    next: () => shippingPromotions[index++]
                };
            },
            getCount: () => shippingPromotions.length,
            count: shippingPromotions.length,
            toArray: () => shippingPromotions
        };
    },

    // Test helpers
    __addPromotion: function(promotion) {
        promotions.push(promotion);
    },

    __createPromotion: function(id, name, promotionClass) {
        const promotion = new Promotion(id, name);
        if (promotionClass) {
            promotion.promotionClass = promotionClass;
        }
        promotions.push(promotion);
        return promotion;
    },

    __setPromotions: function(newPromotions) {
        promotions.length = 0;
        promotions.push(...newPromotions);
    },

    __getPromotions: function() {
        return promotions;
    },

    __reset: function() {
        promotions.length = 0;
    }
};

