/**
 * Mock implementation of dw/catalog/ProductMgr
 * Manages product operations for testing purposes
 */

const products = [];

class ProductIterator {
    constructor(products) {
        this.products = products;
        this.currentIndex = 0;
    }

    hasNext() {
        return this.currentIndex < this.products.length;
    }

    next() {
        if (!this.hasNext()) {
            return null;
        }
        return this.products[this.currentIndex++];
    }

    close() {
        this.currentIndex = this.products.length;
    }

    getCount() {
        return this.products.length;
    }

    get count() {
        return this.products.length;
    }
}

module.exports = {
    /**
     * Gets a product by ID
     * @param {string} productId - The product ID
     * @returns {Object|null} The product or null if not found
     */
    getProduct: function(productId) {
        return products.find(product => product.ID === productId) || null;
    },

    /**
     * Queries products
     * @param {string} queryString - The query string
     * @param {string} sortString - The sort criteria
     * @param {...any} args - Additional query arguments
     * @returns {Object} Iterator over matching products
     */
    queryAllSiteProducts: function(queryString, sortString, ...args) {
        // Simple mock - returns all products
        return new ProductIterator(products);
    },

    /**
     * Queries products in a category
     * @param {string} categoryId - The category ID
     * @returns {Object} Iterator over products in category
     */
    queryProductsInCategory: function(categoryId) {
        const categoryProducts = products.filter(
            product => product.categoryId === categoryId
        );
        return new ProductIterator(categoryProducts);
    },

    /**
     * Searches products
     * @param {string} searchPhrase - The search phrase
     * @param {string} sortString - The sort criteria
     * @returns {Object} Iterator over matching products
     */
    searchProducts: function(searchPhrase, sortString) {
        return new ProductIterator(products);
    },

    // Test helpers
    __addProduct: function(product) {
        products.push(product);
    },

    __setProducts: function(newProducts) {
        products.length = 0;
        products.push(...newProducts);
    },

    __getProducts: function() {
        return products;
    },

    __reset: function() {
        products.length = 0;
    }
};

