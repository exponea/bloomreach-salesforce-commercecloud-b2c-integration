/**
 * Mock implementation of dw/util/ArrayList
 * Provides list functionality similar to Java's ArrayList
 */

class ArrayList {
    constructor(initialArray) {
        this.items = initialArray ? [...initialArray] : [];
    }

    /**
     * Adds an item to the list
     * @param {*} item - The item to add
     * @returns {boolean} True if successful
     */
    add(item) {
        this.items.push(item);
        return true;
    }

    /**
     * Adds an item at a specific index
     * @param {number} index - The index
     * @param {*} item - The item to add
     */
    addAt(index, item) {
        this.items.splice(index, 0, item);
    }

    /**
     * Adds all items from another collection
     * @param {Array|ArrayList} collection - The collection to add
     * @returns {boolean} True if successful
     */
    addAll(collection) {
        const items = Array.isArray(collection) ? collection : collection.toArray();
        this.items.push(...items);
        return true;
    }

    /**
     * Removes an item from the list
     * @param {*} item - The item to remove
     * @returns {boolean} True if item was found and removed
     */
    remove(item) {
        const index = this.items.indexOf(item);
        if (index > -1) {
            this.items.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Removes an item at a specific index
     * @param {number} index - The index
     * @returns {*} The removed item
     */
    removeAt(index) {
        return this.items.splice(index, 1)[0];
    }

    /**
     * Clears all items from the list
     */
    clear() {
        this.items = [];
    }

    /**
     * Gets an item at a specific index
     * @param {number} index - The index
     * @returns {*} The item at the index
     */
    get(index) {
        return this.items[index];
    }

    /**
     * Sets an item at a specific index
     * @param {number} index - The index
     * @param {*} item - The item to set
     */
    set(index, item) {
        this.items[index] = item;
    }

    /**
     * Gets the size of the list
     * @returns {number} The size
     */
    size() {
        return this.items.length;
    }

    /**
     * Checks if the list is empty
     * @returns {boolean} True if empty
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Checks if the list contains an item
     * @param {*} item - The item to check
     * @returns {boolean} True if item is in the list
     */
    contains(item) {
        return this.items.indexOf(item) > -1;
    }

    /**
     * Gets the index of an item
     * @param {*} item - The item
     * @returns {number} The index, or -1 if not found
     */
    indexOf(item) {
        return this.items.indexOf(item);
    }

    /**
     * Converts to a native JavaScript array
     * @returns {Array} The array
     */
    toArray() {
        return [...this.items];
    }

    /**
     * Returns an iterator
     * @returns {Object} Iterator object
     */
    iterator() {
        let index = 0;
        const items = this.items;
        return {
            hasNext: () => index < items.length,
            next: () => items[index++]
        };
    }

    /**
     * Pushes an item (alias for add, for compatibility)
     * @param {*} item - The item to push
     */
    push(item) {
        this.add(item);
    }

    /**
     * Gets the length (for array-like access)
     * @returns {number} The length
     */
    get length() {
        return this.items.length;
    }
}

module.exports = ArrayList;

