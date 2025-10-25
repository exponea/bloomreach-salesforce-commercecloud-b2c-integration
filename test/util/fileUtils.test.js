/**
 * Unit tests for fileUtils
 * Tests the CSV file merging functionality with header handling
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('fileUtils', function() {
    let fileUtils;
    let mockFile;
    let mockFileReader;
    let mockFileWriter;
    let mockCSVStreamReader;
    let mockCSVStreamWriter;
    let mockLogger;

    // Set up mocks before tests
    before(function() {
        // Storage for test-specific data
        let csvDataByFile = {};
        let fileExistsMap = {};
        let capturedWriter = null;

        // Create comprehensive mocks for dw/io operations
        mockFile = function(pathOrParent, relativePath) {
            // Handle both single path string and (parent, relativePath) arguments
            if (relativePath) {
                // Two-argument form: new File(parentDir, relativePath)
                const parentPath = typeof pathOrParent === 'string' ? pathOrParent : pathOrParent.fullPath;
                this.fullPath = parentPath + '/' + relativePath;
            } else {
                // Single-argument form: new File(path)
                this.fullPath = pathOrParent;
            }
            this.name = this.fullPath.split('/').pop();
            this._exists = fileExistsMap[this.fullPath] !== undefined ? fileExistsMap[this.fullPath] : true;
            this._isDirectory = false;
        };
        mockFile.prototype.exists = function() { return this._exists; };
        mockFile.prototype.mkdirs = function() { return true; };
        mockFile.SEPARATOR = '/';
        mockFile.IMPEX = 'IMPEX';
        mockFile.getRootDirectory = sinon.stub().returns({
            fullPath: '/test/root'
        });
        // Add helper methods for tests
        mockFile._setFileExists = function(path, exists) {
            fileExistsMap[path] = exists;
        };
        mockFile._resetFileExists = function() {
            fileExistsMap = {};
        };

        // Mock FileReader
        mockFileReader = function(file) {
            this.file = file;
        };
        mockFileReader.prototype.close = sinon.stub();

        // Mock FileWriter
        mockFileWriter = function(file) {
            this.file = file;
            this.content = '';
            capturedWriter = this;
        };
        mockFileWriter.prototype.close = sinon.stub();

        // Mock CSVStreamReader
        mockCSVStreamReader = function(reader) {
            this.reader = reader;
            this.lines = csvDataByFile[reader.file.fullPath] || [];
            this.currentIndex = 0;
        };
        mockCSVStreamReader.prototype.readNext = function() {
            if (this.currentIndex < this.lines.length) {
                return this.lines[this.currentIndex++];
            }
            return null;
        };
        mockCSVStreamReader.prototype.close = sinon.stub();
        // Add helper method for tests
        mockCSVStreamReader._setFileData = function(path, data) {
            csvDataByFile[path] = data;
        };
        mockCSVStreamReader._resetFileData = function() {
            csvDataByFile = {};
        };

        // Mock CSVStreamWriter
        mockCSVStreamWriter = function(writer) {
            this.writer = writer;
            this.writtenLines = [];
            capturedWriter = this;
        };
        mockCSVStreamWriter.prototype.writeNext = function(line) {
            this.writtenLines.push(line);
        };
        mockCSVStreamWriter.prototype.close = sinon.stub();
        // Add helper to get the last writer
        mockCSVStreamWriter._getLastWriter = function() {
            return capturedWriter;
        };

        // Create mock Logger
        mockLogger = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };

        // Load the module with mocked dependencies using proxyquire
        fileUtils = proxyquire.noCallThru()('../../cartridges/int_bloomreach_engagement/cartridge/scripts/util/fileUtils', {
            'dw/io/File': mockFile,
            'dw/io/FileReader': mockFileReader,
            'dw/io/FileWriter': mockFileWriter,
            'dw/io/CSVStreamReader': mockCSVStreamReader,
            'dw/io/CSVStreamWriter': mockCSVStreamWriter,
            '~/cartridge/scripts/util/productFeedConstants': {
                FILE_EXTENSTION: {
                    CSV: 'csv'
                }
            }
        });
    });

    // Reset stubs before each test
    beforeEach(function() {
        // Clear all stubs
        mockFile.getRootDirectory.reset();
        mockFile.getRootDirectory.returns({ fullPath: '/test/root' });
        mockFileReader.prototype.close.reset();
        mockFileWriter.prototype.close.reset();
        mockCSVStreamReader.prototype.close.reset();
        mockCSVStreamWriter.prototype.close.reset();
        mockLogger.info.reset();
        mockLogger.warn.reset();
        mockLogger.error.reset();
        
        // Reset test data
        mockCSVStreamReader._resetFileData();
        mockFile._resetFileExists();
    });

    describe('createFileName()', function() {
        
        it('should create a filename with timestamp', function() {
            // Test: Verify that createFileName generates a filename with timestamp and extension
            
            const prefix = 'products-FULL';
            const result = fileUtils.createFileName(prefix);
            
            expect(result).to.be.a('string');
            expect(result).to.match(/^products-FULL\d+\.csv$/);
        });

        it('should use default CSV extension when not specified', function() {
            // Test: Verify that CSV is used as default extension
            
            const prefix = 'products';
            const result = fileUtils.createFileName(prefix);
            
            expect(result).to.match(/\.csv$/);
        });

        it('should use custom extension when provided', function() {
            // Test: Verify that custom extensions can be specified
            
            const prefix = 'products';
            const extension = 'xml';
            const result = fileUtils.createFileName(prefix, extension);
            
            expect(result).to.match(/\.xml$/);
        });
    });

    describe('createLatestFileName()', function() {
        
        it('should create a LATEST filename without timestamp', function() {
            // Test: Verify that createLatestFileName generates a static filename with -LATEST suffix
            
            const prefix = 'products-FULL';
            const result = fileUtils.createLatestFileName(prefix);
            
            expect(result).to.equal('products-FULL-LATEST.csv');
        });

        it('should use default CSV extension when not specified', function() {
            // Test: Verify that CSV is used as default extension for LATEST files
            
            const prefix = 'products';
            const result = fileUtils.createLatestFileName(prefix);
            
            expect(result).to.equal('products-LATEST.csv');
        });

        it('should use custom extension when provided', function() {
            // Test: Verify that custom extensions work for LATEST files
            
            const prefix = 'products';
            const extension = 'xml';
            const result = fileUtils.createLatestFileName(prefix, extension);
            
            expect(result).to.equal('products-LATEST.xml');
        });
    });

    describe('mergeCSVFilesIntoLatest()', function() {
        
        it('should merge multiple CSV files into a LATEST file', function() {
            // Test: Verify that multiple CSV files are correctly merged into one LATEST file
            // This covers the basic merging functionality
            
            const csvFilePaths = [
                '/test/root/folder/products-FULL-1234567890.csv',
                '/test/root/folder/products-FULL-1234567891.csv'
            ];
            const targetFolder = 'folder';
            const fileNamePrefix = 'products-FULL';

            // Set up mock CSV data for the files
            const file1Data = [
                ['id', 'name', 'price'],
                ['1', 'Product 1', '10.00'],
                ['2', 'Product 2', '20.00']
            ];
            const file2Data = [
                ['id', 'name', 'price'],
                ['3', 'Product 3', '30.00'],
                ['4', 'Product 4', '40.00']
            ];

            // Set up the mock data for each file
            mockCSVStreamReader._setFileData(csvFilePaths[0], file1Data);
            mockCSVStreamReader._setFileData(csvFilePaths[1], file2Data);

            // Call the function
            const result = fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Verify the LATEST file was created
            expect(result).to.be.a('string');
            expect(result).to.include('products-FULL-LATEST.csv');

            // Get the CSV writer that was used
            const csvWriter = mockCSVStreamWriter._getLastWriter();

            // Verify the CSV writer wrote the correct data
            expect(csvWriter.writtenLines).to.have.lengthOf(5);
            expect(csvWriter.writtenLines[0]).to.deep.equal(['id', 'name', 'price']); // Header from first file
            expect(csvWriter.writtenLines[1]).to.deep.equal(['1', 'Product 1', '10.00']); // Data from first file
            expect(csvWriter.writtenLines[2]).to.deep.equal(['2', 'Product 2', '20.00']); // Data from first file
            expect(csvWriter.writtenLines[3]).to.deep.equal(['3', 'Product 3', '30.00']); // Data from second file (header skipped)
            expect(csvWriter.writtenLines[4]).to.deep.equal(['4', 'Product 4', '40.00']); // Data from second file

            // Verify logging
            expect(mockLogger.info.called).to.be.true;
        });

        it('should skip headers from all files except the first', function() {
            // Test: Verify that the merge function correctly skips header rows from all files except the first one
            // This is critical for ensuring the LATEST file has only one header row
            
            const csvFilePaths = [
                '/test/root/folder/products-1.csv',
                '/test/root/folder/products-2.csv',
                '/test/root/folder/products-3.csv'
            ];
            const targetFolder = 'folder';
            const fileNamePrefix = 'products';

            // Set up mock CSV data - each file has a header row
            const file1Data = [
                ['id', 'name'],
                ['1', 'Product 1']
            ];
            const file2Data = [
                ['id', 'name'],
                ['2', 'Product 2']
            ];
            const file3Data = [
                ['id', 'name'],
                ['3', 'Product 3']
            ];

            // Set up the mock data for each file
            mockCSVStreamReader._setFileData(csvFilePaths[0], file1Data);
            mockCSVStreamReader._setFileData(csvFilePaths[1], file2Data);
            mockCSVStreamReader._setFileData(csvFilePaths[2], file3Data);

            // Call the function
            fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Get the CSV writer that was used
            const csvWriter = mockCSVStreamWriter._getLastWriter();

            // Verify only 4 lines total: 1 header + 3 data rows
            expect(csvWriter.writtenLines).to.have.lengthOf(4);
            
            // Verify header appears only once (first line)
            expect(csvWriter.writtenLines[0]).to.deep.equal(['id', 'name']);
            
            // Verify data from all three files
            expect(csvWriter.writtenLines[1]).to.deep.equal(['1', 'Product 1']);
            expect(csvWriter.writtenLines[2]).to.deep.equal(['2', 'Product 2']);
            expect(csvWriter.writtenLines[3]).to.deep.equal(['3', 'Product 3']);
        });

        it('should handle empty file list gracefully', function() {
            // Test: Verify that the function handles empty input without errors
            
            const result = fileUtils.mergeCSVFilesIntoLatest([], 'folder', 'products', mockLogger);
            
            expect(result).to.be.null;
            expect(mockLogger.warn.calledWith('No CSV files to merge')).to.be.true;
        });

        it('should handle null file list gracefully', function() {
            // Test: Verify that the function handles null input without errors
            
            const result = fileUtils.mergeCSVFilesIntoLatest(null, 'folder', 'products', mockLogger);
            
            expect(result).to.be.null;
            expect(mockLogger.warn.called).to.be.true;
        });

        it('should warn when CSV file does not exist', function() {
            // Test: Verify that non-existent files are logged as warnings but don't break the merge
            
            const csvFilePaths = [
                '/test/root/folder/products-1.csv',
                '/test/root/folder/products-missing.csv'
            ];
            const targetFolder = 'folder';
            const fileNamePrefix = 'products';

            // Mark the second file as non-existent
            mockFile._setFileExists(csvFilePaths[1], false);

            // Set up mock CSV data for first file
            const file1Data = [
                ['id', 'name'],
                ['1', 'Product 1']
            ];

            // Set up the mock data for the first file
            mockCSVStreamReader._setFileData(csvFilePaths[0], file1Data);

            // Call the function
            fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Verify warning was logged
            expect(mockLogger.warn.called).to.be.true;
            
            // Get the CSV writer that was used
            const csvWriter = mockCSVStreamWriter._getLastWriter();
            
            // Verify only first file's data was written
            expect(csvWriter.writtenLines).to.have.lengthOf(2);
        });

        it('should handle single file merge correctly', function() {
            // Test: Verify that merging a single file works correctly
            // (edge case where no splitting occurred)
            
            const csvFilePaths = [
                '/test/root/folder/products-FULL-1234567890.csv'
            ];
            const targetFolder = 'folder';
            const fileNamePrefix = 'products-FULL';

            // Set up mock CSV data
            const fileData = [
                ['id', 'name', 'price'],
                ['1', 'Product 1', '10.00'],
                ['2', 'Product 2', '20.00']
            ];

            // Set up the mock data for the file
            mockCSVStreamReader._setFileData(csvFilePaths[0], fileData);

            // Call the function
            const result = fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Verify the LATEST file was created
            expect(result).to.be.a('string');
            expect(result).to.include('products-FULL-LATEST.csv');

            // Get the CSV writer that was used
            const csvWriter = mockCSVStreamWriter._getLastWriter();

            // Verify all data was written (header + 2 data rows)
            expect(csvWriter.writtenLines).to.have.lengthOf(3);
            expect(csvWriter.writtenLines[0]).to.deep.equal(['id', 'name', 'price']);
            expect(csvWriter.writtenLines[1]).to.deep.equal(['1', 'Product 1', '10.00']);
            expect(csvWriter.writtenLines[2]).to.deep.equal(['2', 'Product 2', '20.00']);
        });
    });
});

