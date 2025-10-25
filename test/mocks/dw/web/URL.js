/**
 * Mock implementation of dw/web/URL
 * Represents a URL in the system
 */

class URL {
    constructor(urlString) {
        this.urlString = urlString || '';
        this.params = new Map();
        
        // Parse URL if provided
        if (urlString) {
            const urlParts = urlString.split('?');
            this.path = urlParts[0];
            
            if (urlParts.length > 1) {
                const queryString = urlParts[1];
                queryString.split('&').forEach(param => {
                    const [key, value] = param.split('=');
                    if (key) {
                        this.params.set(key, decodeURIComponent(value || ''));
                    }
                });
            }
        }
    }

    /**
     * Appends a parameter to the URL
     * @param {string} name - Parameter name
     * @param {*} value - Parameter value
     * @returns {URL} This URL for chaining
     */
    append(name, value) {
        this.params.set(name, value);
        return this;
    }

    /**
     * Gets a parameter value
     * @param {string} name - Parameter name
     * @returns {*} Parameter value
     */
    getParameter(name) {
        return this.params.get(name);
    }

    /**
     * Converts URL to string
     * @returns {string} The URL as a string
     */
    toString() {
        if (!this.urlString) {
            return '';
        }
        
        let url = this.path || this.urlString;
        
        if (this.params.size > 0) {
            const queryParams = [];
            this.params.forEach((value, key) => {
                queryParams.push(`${key}=${encodeURIComponent(value)}`);
            });
            
            if (queryParams.length > 0) {
                url += '?' + queryParams.join('&');
            }
        }
        
        return url;
    }

    /**
     * Gets the absolute URL
     * @returns {URL} This URL
     */
    abs() {
        return this;
    }

    /**
     * Gets the relative URL
     * @returns {URL} This URL
     */
    relative() {
        return this;
    }

    /**
     * Gets the site host (for compatibility with URLUtils.home())
     * @returns {Object} Object with toString method
     */
    siteHost() {
        try {
            // Extract hostname from URL string
            const match = this.urlString.match(/^(?:https?:\/\/)?([^\/]+)/);
            const hostname = match ? match[1] : 'localhost';
            return {
                toString: () => hostname
            };
        } catch (e) {
            return {
                toString: () => 'localhost'
            };
        }
    }
}

module.exports = URL;

