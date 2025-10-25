/**
 * Mock implementation of dw/io/CSVStreamReader
 * Provides CSV reading capabilities for testing purposes
 */

class CSVStreamReader {
    constructor(fileReader, separator, enclosingCharacter) {
        this.fileReader = fileReader;
        this.separator = separator || ',';
        this.enclosingCharacter = enclosingCharacter || '"';
        this.currentRow = 0;
        this.rows = [];
        this.closed = false;
    }

    /**
     * Reads the next line of CSV data
     * @returns {Array|null} Array of values, or null if end of file
     */
    readNext() {
        if (this.closed || this.currentRow >= this.rows.length) {
            return null;
        }
        
        return this.rows[this.currentRow++];
    }

    /**
     * Closes the reader
     */
    close() {
        this.closed = true;
        if (this.fileReader) {
            this.fileReader.close();
        }
    }

    /**
     * Sets CSV data for testing
     * @param {Array<Array>} rows - Array of arrays representing CSV rows
     */
    __setRows(rows) {
        this.rows = rows;
        this.currentRow = 0;
    }

    /**
     * Parses CSV content string
     * @param {string} content - CSV content as string
     */
    __parseContent(content) {
        const lines = content.split('\n').filter(line => line.trim());
        this.rows = lines.map(line => this._parseCsvLine(line));
        this.currentRow = 0;
    }

    /**
     * Parses a single CSV line
     * @private
     */
    _parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = i < line.length - 1 ? line[i + 1] : null;
            
            if (char === this.enclosingCharacter) {
                if (inQuotes && nextChar === this.enclosingCharacter) {
                    // Escaped quote
                    current += this.enclosingCharacter;
                    i++; // Skip next character
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === this.separator && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }
}

module.exports = CSVStreamReader;

