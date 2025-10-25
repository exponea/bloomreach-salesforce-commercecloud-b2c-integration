/**
 * Mock implementation of dw/svc/Service
 * Represents a service in the system
 */

class ServiceConfiguration {
    constructor() {
        this.credential = {
            URL: '',
            user: '',
            password: ''
        };
    }

    getCredential() {
        return this.credential;
    }

    setCredential(credential) {
        this.credential = credential;
    }
}

class ServiceResponse {
    constructor(status, statusCode, text, object) {
        this.status = status;
        this.statusCode = statusCode;
        this.text = text;
        this.object = object;
        this.error = null;
        this.errorMessage = null;
    }

    isOk() {
        return this.status === 'OK';
    }

    isError() {
        return this.status === 'ERROR';
    }

    getStatus() {
        return this.status;
    }

    getStatusCode() {
        return this.statusCode;
    }

    getError() {
        return this.error;
    }

    getErrorMessage() {
        return this.errorMessage;
    }
}

class Service {
    constructor(serviceId, serviceConfig) {
        this.serviceId = serviceId;
        this.config = serviceConfig || {};
        this.configuration = new ServiceConfiguration();
        this.url = '';
        this.headers = {};
        this.requestMethod = 'POST';
        this.throwOnError = false;
        
        // Mock response behavior
        this.mockResponse = null;
        this.mockError = null;
    }

    /**
     * Gets the service configuration
     * @returns {ServiceConfiguration} The configuration
     */
    getConfiguration() {
        return this.configuration;
    }

    /**
     * Sets the service URL
     * @param {string} url - The URL
     */
    setURL(url) {
        this.url = url;
    }

    /**
     * Gets the service URL
     * @returns {string} The URL
     */
    getURL() {
        return this.url;
    }

    /**
     * Adds a header to the request
     * @param {string} name - Header name
     * @param {string} value - Header value
     */
    addHeader(name, value) {
        this.headers[name] = value;
    }

    /**
     * Adds a parameter to the request
     * @param {string} name - Parameter name
     * @param {string} value - Parameter value
     */
    addParam(name, value) {
        if (!this.params) {
            this.params = {};
        }
        this.params[name] = value;
    }

    /**
     * Sets the request method
     * @param {string} method - HTTP method (GET, POST, etc.)
     */
    setRequestMethod(method) {
        this.requestMethod = method;
    }

    /**
     * Sets whether to throw on error
     * @param {boolean} throwOnError - Whether to throw on error
     */
    setThrowOnError(throwOnError) {
        this.throwOnError = throwOnError;
    }

    /**
     * Calls the service
     * @param {*} requestObject - The request object
     * @returns {ServiceResponse} The service response
     */
    call(requestObject) {
        try {
            // If mock error is set, return error response
            if (this.mockError) {
                const response = new ServiceResponse('ERROR', 500, '', null);
                response.error = this.mockError;
                response.errorMessage = this.mockError.message || 'Service error';
                
                if (this.throwOnError) {
                    throw this.mockError;
                }
                
                return response;
            }

            // Create request using config
            let request = requestObject;
            if (this.config.createRequest) {
                request = this.config.createRequest(this, requestObject);
            }

            // Use mock response if set, otherwise create default OK response
            let responseText = 'OK';
            let responseObject = null;

            if (this.mockResponse) {
                responseText = this.mockResponse.text || responseText;
                responseObject = this.mockResponse.object || null;
            }

            const response = new ServiceResponse('OK', 200, responseText, responseObject);

            // Parse response using config
            if (this.config.parseResponse) {
                responseObject = this.config.parseResponse(this, response);
            }

            response.object = responseObject;
            return response;

        } catch (error) {
            const response = new ServiceResponse('ERROR', 500, '', null);
            response.error = error;
            response.errorMessage = error.message;

            if (this.throwOnError) {
                throw error;
            }

            return response;
        }
    }

    /**
     * Sets mock response for testing
     * @param {Object} response - Mock response object with text and/or object properties
     */
    __setMockResponse(response) {
        this.mockResponse = response;
    }

    /**
     * Sets mock error for testing
     * @param {Error} error - Mock error to return
     */
    __setMockError(error) {
        this.mockError = error;
    }

    /**
     * Resets mock data
     */
    __reset() {
        this.mockResponse = null;
        this.mockError = null;
    }
}

module.exports = Service;

