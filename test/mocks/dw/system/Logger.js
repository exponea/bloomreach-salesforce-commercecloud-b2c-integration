/**
 * Mock implementation of dw/system/Logger
 * Provides logging functionality for testing purposes
 */

class Logger {
    constructor(category, fileName) {
        this.category = category;
        this.fileName = fileName;
        this.logs = {
            debug: [],
            info: [],
            warn: [],
            error: []
        };
    }

    /**
     * Logs a debug message
     * @param {string} message - The message template
     * @param {...any} args - Arguments to replace in the template
     */
    debug(message, ...args) {
        const formattedMessage = this._formatMessage(message, args);
        this.logs.debug.push(formattedMessage);
        // Optionally output to console for debugging tests
        // console.debug(`[DEBUG] ${formattedMessage}`);
    }

    /**
     * Logs an info message
     * @param {string} message - The message template
     * @param {...any} args - Arguments to replace in the template
     */
    info(message, ...args) {
        const formattedMessage = this._formatMessage(message, args);
        this.logs.info.push(formattedMessage);
        // console.info(`[INFO] ${formattedMessage}`);
    }

    /**
     * Logs a warning message
     * @param {string} message - The message template
     * @param {...any} args - Arguments to replace in the template
     */
    warn(message, ...args) {
        const formattedMessage = this._formatMessage(message, args);
        this.logs.warn.push(formattedMessage);
        // console.warn(`[WARN] ${formattedMessage}`);
    }

    /**
     * Logs an error message
     * @param {string} message - The message template
     * @param {...any} args - Arguments to replace in the template
     */
    error(message, ...args) {
        const formattedMessage = this._formatMessage(message, args);
        this.logs.error.push(formattedMessage);
        // console.error(`[ERROR] ${formattedMessage}`);
    }

    /**
     * Formats a message by replacing {0}, {1}, etc. with provided arguments
     * @private
     */
    _formatMessage(message, args) {
        if (!args || args.length === 0) {
            return message;
        }
        
        let formatted = message;
        args.forEach((arg, index) => {
            const regex = new RegExp(`\\{${index}\\}`, 'g');
            formatted = formatted.replace(regex, String(arg));
        });
        return formatted;
    }

    /**
     * Gets all logged messages
     * @returns {Object} Object containing arrays of logged messages by level
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Clears all logged messages
     */
    clearLogs() {
        this.logs = {
            debug: [],
            info: [],
            warn: [],
            error: []
        };
    }
}

// Store all created loggers for test access
const loggers = {};

module.exports = {
    /**
     * Gets a logger instance
     * @param {string} category - The logger category
     * @param {string} fileName - The file name for the logger
     * @returns {Logger} A logger instance
     */
    getLogger: function(category, fileName) {
        const key = `${category}:${fileName || ''}`;
        if (!loggers[key]) {
            loggers[key] = new Logger(category, fileName);
        }
        return loggers[key];
    },

    /**
     * Static logging methods for direct Logger class usage
     */
    info: function(message, ...args) {
        const logger = new Logger('default', 'default');
        logger.info(message, ...args);
    },

    error: function(message, ...args) {
        const logger = new Logger('default', 'default');
        logger.error(message, ...args);
    },

    warn: function(message, ...args) {
        const logger = new Logger('default', 'default');
        logger.warn(message, ...args);
    },

    debug: function(message, ...args) {
        const logger = new Logger('default', 'default');
        logger.debug(message, ...args);
    },

    // Test helpers
    __getAllLoggers: function() {
        return loggers;
    },

    __reset: function() {
        Object.keys(loggers).forEach(key => {
            loggers[key].clearLogs();
        });
    }
};

