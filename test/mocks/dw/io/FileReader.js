/**
 * Mock implementation of dw/io/FileReader
 * Provides file reading capabilities for testing purposes
 */

class FileReader {
    constructor(file, encoding) {
        this.file = file;
        this.encoding = encoding || 'UTF-8';
        this.content = '';
        this.position = 0;
        this.closed = false;
    }

    /**
     * Reads a line from the file
     * @returns {string|null} The line read, or null if end of file
     */
    readLine() {
        if (this.closed || this.position >= this.content.length) {
            return null;
        }
        
        const nextNewline = this.content.indexOf('\n', this.position);
        let line;
        
        if (nextNewline === -1) {
            line = this.content.substring(this.position);
            this.position = this.content.length;
        } else {
            line = this.content.substring(this.position, nextNewline);
            this.position = nextNewline + 1;
        }
        
        return line;
    }

    /**
     * Reads all content from the file
     * @returns {string} The entire file content
     */
    readLines() {
        const lines = [];
        let line;
        while ((line = this.readLine()) !== null) {
            lines.push(line);
        }
        return lines;
    }

    /**
     * Closes the reader
     */
    close() {
        this.closed = true;
    }

    /**
     * Sets the content for testing
     * @param {string} content - The content to read
     */
    __setContent(content) {
        this.content = content;
        this.position = 0;
    }
}

module.exports = FileReader;

