/**
 * Mock implementation of dw/io/CSVStreamWriter
 * Provides CSV writing capabilities for testing purposes
 */

class CSVStreamWriter {
    constructor(fileWriter, separator, enclosingCharacter) {
        this.fileWriter = fileWriter;
        this.separator = separator || ',';
        this.enclosingCharacter = enclosingCharacter || '"';
        this.rowsWritten = [];
        this.closed = false;
    }

    /**
     * Writes the next line of CSV data
     * @param {Array|Object} values - Array of values or object to write
     */
    writeNext(values) {
        if (this.closed) {
            throw new Error('Cannot write to closed CSVStreamWriter');
        }

        let valuesArray;
        if (Array.isArray(values)) {
            valuesArray = values;
        } else if (values && typeof values.toArray === 'function') {
            // Handle ArrayList or similar
            valuesArray = values.toArray();
        } else if (typeof values === 'object') {
            valuesArray = Object.values(values);
        } else {
            valuesArray = [values];
        }

        // Store the raw values for test assertions
        this.rowsWritten.push([...valuesArray]);

        // Format as CSV
        const csvLine = valuesArray.map(value => {
            const stringValue = String(value == null ? '' : value);
            
            // Check if value needs to be enclosed (contains separator, newline, or enclosing character)
            if (stringValue.includes(this.separator) || 
                stringValue.includes('\n') || 
                stringValue.includes(this.enclosingCharacter)) {
                // Escape enclosing characters by doubling them
                const escaped = stringValue.replace(
                    new RegExp(this.enclosingCharacter, 'g'),
                    this.enclosingCharacter + this.enclosingCharacter
                );
                return this.enclosingCharacter + escaped + this.enclosingCharacter;
            }
            
            return stringValue;
        }).join(this.separator);

        this.fileWriter.write(csvLine + '\n');
    }

    /**
     * Flushes the writer
     */
    flush() {
        if (this.fileWriter) {
            this.fileWriter.flush();
        }
    }

    /**
     * Closes the writer
     */
    close() {
        this.closed = true;
        if (this.fileWriter) {
            this.fileWriter.close();
        }
    }

    /**
     * Gets all rows written (test helper)
     * @returns {Array} Array of arrays representing rows
     */
    getRowsWritten() {
        return this.rowsWritten;
    }

    /**
     * Gets the underlying FileWriter (test helper)
     * @returns {FileWriter} The file writer
     */
    getFileWriter() {
        return this.fileWriter;
    }
}

module.exports = CSVStreamWriter;

