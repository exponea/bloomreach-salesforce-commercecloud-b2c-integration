/**
 * Mock implementation of dw/util/HashMap
 * Provides map functionality similar to Java's HashMap
 */

class HashMap {
    constructor() {
        this.map = new Map();
    }

    /**
     * Puts a key-value pair into the map
     * @param {*} key - The key
     * @param {*} value - The value
     * @returns {*} The previous value associated with key, or undefined
     */
    put(key, value) {
        const oldValue = this.map.get(key);
        this.map.set(key, value);
        return oldValue;
    }

    /**
     * Gets a value by key
     * @param {*} key - The key
     * @returns {*} The value, or undefined if not found
     */
    get(key) {
        return this.map.get(key);
    }

    /**
     * Checks if the map contains a key
     * @param {*} key - The key
     * @returns {boolean} True if key exists
     */
    containsKey(key) {
        return this.map.has(key);
    }

    /**
     * Checks if the map contains a value
     * @param {*} value - The value
     * @returns {boolean} True if value exists
     */
    containsValue(value) {
        for (const val of this.map.values()) {
            if (val === value) {
                return true;
            }
        }
        return false;
    }

    /**
     * Removes a key-value pair
     * @param {*} key - The key
     * @returns {*} The removed value, or undefined
     */
    remove(key) {
        const value = this.map.get(key);
        this.map.delete(key);
        return value;
    }

    /**
     * Clears all entries from the map
     */
    clear() {
        this.map.clear();
    }

    /**
     * Gets the size of the map
     * @returns {number} The size
     */
    size() {
        return this.map.size;
    }

    /**
     * Checks if the map is empty
     * @returns {boolean} True if empty
     */
    isEmpty() {
        return this.map.size === 0;
    }

    /**
     * Gets all keys
     * @returns {Object} Collection of keys
     */
    keySet() {
        const keys = Array.from(this.map.keys());
        return {
            iterator: () => {
                let index = 0;
                return {
                    hasNext: () => index < keys.length,
                    next: () => keys[index++]
                };
            },
            toArray: () => keys
        };
    }

    /**
     * Gets all values
     * @returns {Object} Collection of values
     */
    values() {
        const values = Array.from(this.map.values());
        return {
            iterator: () => {
                let index = 0;
                return {
                    hasNext: () => index < values.length,
                    next: () => values[index++]
                };
            },
            toArray: () => values
        };
    }

    /**
     * Gets all entries
     * @returns {Object} Set of entries
     */
    entrySet() {
        const entries = Array.from(this.map.entries()).map(([key, value]) => ({
            key,
            value,
            getKey: () => key,
            getValue: () => value
        }));
        return {
            iterator: () => {
                let index = 0;
                return {
                    hasNext: () => index < entries.length,
                    next: () => entries[index++]
                };
            },
            toArray: () => entries
        };
    }

    /**
     * Puts all entries from another map
     * @param {HashMap|Map|Object} map - The map to copy from
     */
    putAll(map) {
        if (map instanceof HashMap) {
            map.map.forEach((value, key) => {
                this.map.set(key, value);
            });
        } else if (map instanceof Map) {
            map.forEach((value, key) => {
                this.map.set(key, value);
            });
        } else if (typeof map === 'object') {
            Object.entries(map).forEach(([key, value]) => {
                this.map.set(key, value);
            });
        }
    }
}

module.exports = HashMap;

