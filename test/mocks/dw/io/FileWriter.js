/**
 * Mock implementation of dw/io/FileWriter
 * Provides file writing capabilities for testing purposes
 */

class FileWriter {
    constructor(file, encoding) {
        this.file = file;
        this.encoding = encoding || 'UTF-8';
        this.content = '';
        this.closed = false;
    }

    /**
     * Writes a string to the file
     * @param {string} str - The string to write
     */
    write(str) {
        if (this.closed) {
            throw new Error('Cannot write to closed FileWriter');
        }
        this.content += str;
    }

    /**
     * Writes a line to the file
     * @param {string} str - The string to write
     */
    writeLine(str) {
        this.write(str + '\n');
    }

    /**
     * Flushes the writer
     */
    flush() {
        // In mock, this is a no-op but marks that flush was called
    }

    /**
     * Closes the writer
     */
    close() {
        this.closed = true;
    }

    /**
     * Gets the written content (test helper)
     * @returns {string} The content written to the file
     */
    getContent() {
        return this.content;
    }

    /**
     * Checks if the writer is closed (test helper)
     * @returns {boolean} True if closed
     */
    isClosed() {
        return this.closed;
    }
}

module.exports = FileWriter;

