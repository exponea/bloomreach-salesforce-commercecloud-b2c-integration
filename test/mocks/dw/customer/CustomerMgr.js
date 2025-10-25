/**
 * Mock implementation of dw/customer/CustomerMgr
 * Manages customer operations for testing purposes
 */

const customers = [];

class CustomerIterator {
    constructor(customers) {
        this.customers = customers;
        this.currentIndex = 0;
    }

    hasNext() {
        return this.currentIndex < this.customers.length;
    }

    next() {
        if (!this.hasNext()) {
            return null;
        }
        return this.customers[this.currentIndex++];
    }

    close() {
        this.currentIndex = this.customers.length;
    }

    getCount() {
        return this.customers.length;
    }

    get count() {
        return this.customers.length;
    }
}

module.exports = {
    /**
     * Gets a customer by customer number
     * @param {string} customerNo - The customer number
     * @returns {Object|null} The customer or null if not found
     */
    getCustomerByCustomerNumber: function(customerNo) {
        return customers.find(customer => customer.customerNo === customerNo) || null;
    },

    /**
     * Gets a customer by login
     * @param {string} login - The login/email
     * @param {string} password - The password
     * @returns {Object|null} The customer or null if not found/invalid credentials
     */
    getCustomerByLogin: function(login, password) {
        return customers.find(
            customer => customer.profile && customer.profile.email === login
        ) || null;
    },

    /**
     * Queries customers
     * @param {string} queryString - The query string
     * @param {string} sortString - The sort criteria
     * @param {...any} args - Additional query arguments
     * @returns {Object} Iterator over matching customers
     */
    queryProfiles: function(queryString, sortString, ...args) {
        // Simple mock - returns all customers
        return new CustomerIterator(customers);
    },

    /**
     * Searches customers
     * @param {string} searchPhrase - The search phrase
     * @param {string} sortString - The sort criteria
     * @returns {Object} Iterator over matching customers
     */
    searchProfiles: function(searchPhrase, sortString) {
        return new CustomerIterator(customers);
    },

    /**
     * Creates a customer
     * @param {string} login - The customer login/email
     * @param {string} password - The password
     * @returns {Object} The created customer
     */
    createCustomer: function(login, password) {
        const customer = {
            customerNo: `CUST${customers.length + 1}`,
            profile: {
                email: login,
                firstName: '',
                lastName: '',
                custom: {}
            },
            custom: {}
        };
        customers.push(customer);
        return customer;
    },

    /**
     * Gets or creates a customer by login
     * @param {string} login - The customer login/email
     * @returns {Object} The customer
     */
    getCustomerByLogin: function(login) {
        return customers.find(
            customer => customer.profile && customer.profile.email === login
        ) || null;
    },

    // Test helpers
    __addCustomer: function(customer) {
        customers.push(customer);
    },

    __setCustomers: function(newCustomers) {
        customers.length = 0;
        customers.push(...newCustomers);
    },

    __getCustomers: function() {
        return customers;
    },

    __reset: function() {
        customers.length = 0;
    }
};

