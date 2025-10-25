/**
 * Mock implementation of dw/web/URLUtils
 * Provides URL generation utilities for testing purposes
 */

const URL = require('./URL');

let mockSiteHost = 'test-site.demandware.net';
let mockProtocol = 'https';

module.exports = {
    /**
     * Generates an absolute URL
     * @param {string} pipeline - The pipeline/controller
     * @param {...any} args - Additional parameters
     * @returns {URL} The generated URL
     */
    abs: function(pipeline, ...args) {
        let url = `${mockProtocol}://${mockSiteHost}/${pipeline}`;
        
        // Parse arguments as key-value pairs
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i];
            const value = args[i + 1];
            if (key && value !== undefined) {
                url += url.includes('?') ? '&' : '?';
                url += `${key}=${encodeURIComponent(value)}`;
            }
        }
        
        return new URL(url);
    },

    /**
     * Generates a relative URL
     * @param {string} pipeline - The pipeline/controller
     * @param {...any} args - Additional parameters
     * @returns {URL} The generated URL
     */
    url: function(pipeline, ...args) {
        let url = `/${pipeline}`;
        
        // Parse arguments as key-value pairs
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i];
            const value = args[i + 1];
            if (key && value !== undefined) {
                url += url.includes('?') ? '&' : '?';
                url += `${key}=${encodeURIComponent(value)}`;
            }
        }
        
        return new URL(url);
    },

    /**
     * Generates a home page URL
     * @returns {URL} The home page URL
     */
    home: function() {
        const homeUrl = `${mockProtocol}://${mockSiteHost}/`;
        const urlObj = new URL(homeUrl);
        
        // Add siteHost method for compatibility
        urlObj.siteHost = function() {
            return {
                toString: () => mockSiteHost
            };
        };
        
        return urlObj;
    },

    /**
     * Generates a static URL
     * @param {string} path - The path to the static resource
     * @returns {URL} The static URL
     */
    staticURL: function(path) {
        const url = `${mockProtocol}://${mockSiteHost}/static/${path}`;
        return new URL(url);
    },

    /**
     * Generates an image URL
     * @param {string} path - The path to the image
     * @param {...any} args - Additional parameters
     * @returns {URL} The image URL
     */
    imageURL: function(path, ...args) {
        let url = `${mockProtocol}://${mockSiteHost}/images/${path}`;
        
        // Parse arguments as key-value pairs
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i];
            const value = args[i + 1];
            if (key && value !== undefined) {
                url += url.includes('?') ? '&' : '?';
                url += `${key}=${value}`;
            }
        }
        
        return new URL(url);
    },

    /**
     * Generates an absolute URL for a specific site
     * @param {string} site - The site ID
     * @param {string} pipeline - The pipeline/controller
     * @param {...any} args - Additional parameters
     * @returns {URL} The generated URL
     */
    absForSite: function(site, pipeline, ...args) {
        return this.abs(pipeline, ...args);
    },

    /**
     * Generates an HTTP URL
     * @param {string} pipeline - The pipeline/controller
     * @param {...any} args - Additional parameters
     * @returns {URL} The generated URL
     */
    http: function(pipeline, ...args) {
        const previousProtocol = mockProtocol;
        mockProtocol = 'http';
        const result = this.abs(pipeline, ...args);
        mockProtocol = previousProtocol;
        return result;
    },

    /**
     * Generates an HTTPS URL
     * @param {string} pipeline - The pipeline/controller
     * @param {...any} args - Additional parameters
     * @returns {URL} The generated URL
     */
    https: function(pipeline, ...args) {
        const previousProtocol = mockProtocol;
        mockProtocol = 'https';
        const result = this.abs(pipeline, ...args);
        mockProtocol = previousProtocol;
        return result;
    },

    // Test helpers
    __setSiteHost: function(host) {
        mockSiteHost = host;
    },

    __setProtocol: function(protocol) {
        mockProtocol = protocol;
    },

    __reset: function() {
        mockSiteHost = 'test-site.demandware.net';
        mockProtocol = 'https';
    }
};

