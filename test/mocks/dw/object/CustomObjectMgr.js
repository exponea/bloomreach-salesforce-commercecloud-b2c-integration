/**
 * Mock implementation of dw/object/CustomObjectMgr
 * Manages custom objects for testing purposes
 */

const customObjects = new Map();

class CustomObject {
    constructor(type, key) {
        this.type = type;
        this.key = key;
        this.custom = {};
    }

    getCustom() {
        return this.custom;
    }
}

module.exports = {
    /**
     * Gets a custom object by type and key
     * @param {string} type - The custom object type
     * @param {string} key - The custom object key
     * @returns {Object|null} The custom object or null if not found
     */
    getCustomObject: function(type, key) {
        const objectKey = `${type}:${key}`;
        return customObjects.get(objectKey) || null;
    },

    /**
     * Creates a new custom object
     * @param {string} type - The custom object type
     * @param {string} key - The custom object key
     * @returns {Object} The created custom object
     */
    createCustomObject: function(type, key) {
        const objectKey = `${type}:${key}`;
        if (customObjects.has(objectKey)) {
            throw new Error(`Custom object ${objectKey} already exists`);
        }
        const customObject = new CustomObject(type, key);
        customObjects.set(objectKey, customObject);
        return customObject;
    },

    /**
     * Removes a custom object
     * @param {Object} customObject - The custom object to remove
     */
    remove: function(customObject) {
        const objectKey = `${customObject.type}:${customObject.key}`;
        customObjects.delete(objectKey);
    },

    /**
     * Gets all custom objects of a specific type
     * @param {string} type - The custom object type
     * @returns {Object} Iterator over custom objects
     */
    getAllCustomObjects: function(type) {
        const objectsOfType = [];
        customObjects.forEach((obj, key) => {
            if (obj.type === type) {
                objectsOfType.push(obj);
            }
        });

        return {
            iterator: function() {
                let index = 0;
                return {
                    hasNext: () => index < objectsOfType.length,
                    next: () => objectsOfType[index++]
                };
            },
            getCount: () => objectsOfType.length,
            count: objectsOfType.length
        };
    },

    /**
     * Queries custom objects
     * @param {string} type - The custom object type
     * @param {string} queryString - The query string
     * @param {...any} args - Additional query arguments
     * @returns {Object} Iterator over matching custom objects
     */
    queryCustomObjects: function(type, queryString, ...args) {
        return this.getAllCustomObjects(type);
    },

    // Test helpers
    __setCustomObject: function(type, key, customData) {
        const objectKey = `${type}:${key}`;
        const customObject = new CustomObject(type, key);
        if (customData) {
            customObject.custom = customData;
        }
        customObjects.set(objectKey, customObject);
        return customObject;
    },

    __reset: function() {
        customObjects.clear();
    },

    __getAllCustomObjects: function() {
        return customObjects;
    }
};

