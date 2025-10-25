/**
 * Mock implementation of dw/util/StringUtils
 * Provides string utility functions for testing purposes
 */

module.exports = {
    /**
     * Encodes a string to Base64
     * @param {string} str - The string to encode
     * @returns {string} The Base64 encoded string
     */
    encodeBase64: function(str) {
        if (!str) {
            return '';
        }
        return Buffer.from(str).toString('base64');
    },

    /**
     * Decodes a Base64 string
     * @param {string} str - The Base64 string to decode
     * @returns {string} The decoded string
     */
    decodeBase64: function(str) {
        if (!str) {
            return '';
        }
        return Buffer.from(str, 'base64').toString('utf-8');
    },

    /**
     * Formats a string by replacing placeholders
     * @param {string} template - The template string with {0}, {1}, etc.
     * @param {...any} args - Arguments to replace placeholders
     * @returns {string} The formatted string
     */
    format: function(template, ...args) {
        if (!template) {
            return '';
        }
        let result = template;
        args.forEach((arg, index) => {
            const regex = new RegExp(`\\{${index}\\}`, 'g');
            result = result.replace(regex, String(arg));
        });
        return result;
    },

    /**
     * Trims whitespace from a string
     * @param {string} str - The string to trim
     * @returns {string} The trimmed string
     */
    trim: function(str) {
        return str ? str.trim() : '';
    },

    /**
     * Pads a string to the left
     * @param {string} str - The string to pad
     * @param {number} length - The desired length
     * @param {string} padChar - The character to pad with
     * @returns {string} The padded string
     */
    pad: function(str, length, padChar) {
        const s = String(str || '');
        const pad = padChar || ' ';
        return s.padStart(length, pad);
    },

    /**
     * Checks if a string is empty or null
     * @param {string} str - The string to check
     * @returns {boolean} True if empty or null
     */
    isEmpty: function(str) {
        return !str || str.length === 0;
    },

    /**
     * Converts string to lowercase
     * @param {string} str - The string
     * @returns {string} Lowercase string
     */
    toLowerCase: function(str) {
        return str ? str.toLowerCase() : '';
    },

    /**
     * Converts string to uppercase
     * @param {string} str - The string
     * @returns {string} Uppercase string
     */
    toUpperCase: function(str) {
        return str ? str.toUpperCase() : '';
    }
};

