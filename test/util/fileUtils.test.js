/**
 * Unit tests for fileUtils
 * Tests the CSV file merging functionality with header handling
 * 
 * Updated to use the new standardized SFCC mocks from test/mocks/
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Import the new standardized mocks
const File = require('../mocks/dw/io/File');
const FileReader = require('../mocks/dw/io/FileReader');
const FileWriter = require('../mocks/dw/io/FileWriter');
const CSVStreamReader = require('../mocks/dw/io/CSVStreamReader');
const CSVStreamWriter = require('../mocks/dw/io/CSVStreamWriter');

describe('fileUtils', function() {
    let fileUtils;
    let mockLogger;
    let csvDataByFile = {};
    let fileExistsMap = {};
    let lastCSVWriter = null;
    let ExtendedFile; // Store reference to ExtendedFile for accessing stub

    // Set up mocks before tests
    before(function() {
        // Create wrapper for File that handles test-specific behavior
        ExtendedFile = class extends File {
            constructor(pathOrParent, relativePath) {
                super(pathOrParent, relativePath);
            }
            
            exists() {
                if (fileExistsMap[this.fullPath] !== undefined) {
                    return fileExistsMap[this.fullPath];
                }
                return super.exists();
            }
        };
        
        // Copy static properties
        ExtendedFile.SEPARATOR = File.SEPARATOR;
        ExtendedFile.IMPEX = File.IMPEX;
        ExtendedFile.STATIC = File.STATIC;
        ExtendedFile.TEMP = File.TEMP;
        ExtendedFile.CATALOGS = File.CATALOGS;
        ExtendedFile.LIBRARIES = File.LIBRARIES;
        ExtendedFile.getRootDirectory = sinon.stub().returns({
            fullPath: '/test/root',
            _exists: true,
            _isDirectory: true
        });

        // Create wrapper for CSVStreamReader that uses test data
        const ExtendedCSVStreamReader = class extends CSVStreamReader {
            constructor(fileReader) {
                super(fileReader);
                // Override with test data if available
                const filePath = fileReader.file.fullPath;
                if (csvDataByFile[filePath]) {
                    this.__setRows(csvDataByFile[filePath]);
                }
            }
        };

        // Create wrapper for CSVStreamWriter that tracks last instance
        const ExtendedCSVStreamWriter = class extends CSVStreamWriter {
            constructor(fileWriter) {
                super(fileWriter);
                lastCSVWriter = this;
            }
        };

        // Create mock Logger
        mockLogger = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };

        // Load the module with mocked dependencies using proxyquire
        fileUtils = proxyquire.noCallThru()('../../cartridges/int_bloomreach_engagement/cartridge/scripts/util/fileUtils', {
            'dw/io/File': ExtendedFile,
            'dw/io/FileReader': FileReader,
            'dw/io/FileWriter': FileWriter,
            'dw/io/CSVStreamReader': ExtendedCSVStreamReader,
            'dw/io/CSVStreamWriter': ExtendedCSVStreamWriter,
            '~/cartridge/scripts/util/productFeedConstants': {
                FILE_EXTENSTION: {
                    CSV: 'csv'
                }
            }
        });
    });

    // Reset mocks before each test
    beforeEach(function() {
        // Reset test data
        csvDataByFile = {};
        fileExistsMap = {};
        lastCSVWriter = null;
        
        // Reset logger stubs
        mockLogger.info.reset();
        mockLogger.warn.reset();
        mockLogger.error.reset();
        
        // Reset ExtendedFile.getRootDirectory stub (not File, but ExtendedFile)
        if (ExtendedFile && ExtendedFile.getRootDirectory) {
            ExtendedFile.getRootDirectory.reset();
            ExtendedFile.getRootDirectory.returns({ 
                fullPath: '/test/root',
                _exists: true,
                _isDirectory: true
            });
        }
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
            csvDataByFile[csvFilePaths[0]] = file1Data;
            csvDataByFile[csvFilePaths[1]] = file2Data;

            // Call the function
            const result = fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Verify the LATEST file was created
            expect(result).to.be.a('string');
            expect(result).to.include('products-FULL-LATEST.csv');

            // Get the CSV writer that was used
            const csvWriter = lastCSVWriter;

            // Verify the CSV writer wrote the correct data using the standardized mock method
            const writtenRows = csvWriter.getRowsWritten();
            expect(writtenRows).to.have.lengthOf(5);
            expect(writtenRows[0]).to.deep.equal(['id', 'name', 'price']); // Header from first file
            expect(writtenRows[1]).to.deep.equal(['1', 'Product 1', '10.00']); // Data from first file
            expect(writtenRows[2]).to.deep.equal(['2', 'Product 2', '20.00']); // Data from first file
            expect(writtenRows[3]).to.deep.equal(['3', 'Product 3', '30.00']); // Data from second file (header skipped)
            expect(writtenRows[4]).to.deep.equal(['4', 'Product 4', '40.00']); // Data from second file

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
            csvDataByFile[csvFilePaths[0]] = file1Data;
            csvDataByFile[csvFilePaths[1]] = file2Data;
            csvDataByFile[csvFilePaths[2]] = file3Data;

            // Call the function
            fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Get the CSV writer that was used
            const csvWriter = lastCSVWriter;

            // Verify only 4 lines total: 1 header + 3 data rows (using standardized mock method)
            const writtenRows = csvWriter.getRowsWritten();
            expect(writtenRows).to.have.lengthOf(4);
            
            // Verify header appears only once (first line)
            expect(writtenRows[0]).to.deep.equal(['id', 'name']);
            
            // Verify data from all three files
            expect(writtenRows[1]).to.deep.equal(['1', 'Product 1']);
            expect(writtenRows[2]).to.deep.equal(['2', 'Product 2']);
            expect(writtenRows[3]).to.deep.equal(['3', 'Product 3']);
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
            fileExistsMap[csvFilePaths[1]] = false;

            // Set up mock CSV data for first file
            const file1Data = [
                ['id', 'name'],
                ['1', 'Product 1']
            ];

            // Set up the mock data for the first file
            csvDataByFile[csvFilePaths[0]] = file1Data;

            // Call the function
            fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Verify warning was logged
            expect(mockLogger.warn.called).to.be.true;
            
            // Get the CSV writer that was used
            const csvWriter = lastCSVWriter;
            
            // Verify only first file's data was written (using standardized mock method)
            const writtenRows = csvWriter.getRowsWritten();
            expect(writtenRows).to.have.lengthOf(2);
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
            csvDataByFile[csvFilePaths[0]] = fileData;

            // Call the function
            const result = fileUtils.mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, mockLogger);

            // Verify the LATEST file was created
            expect(result).to.be.a('string');
            expect(result).to.include('products-FULL-LATEST.csv');

            // Get the CSV writer that was used
            const csvWriter = lastCSVWriter;

            // Verify all data was written (header + 2 data rows) using standardized mock method
            const writtenRows = csvWriter.getRowsWritten();
            expect(writtenRows).to.have.lengthOf(3);
            expect(writtenRows[0]).to.deep.equal(['id', 'name', 'price']);
            expect(writtenRows[1]).to.deep.equal(['1', 'Product 1', '10.00']);
            expect(writtenRows[2]).to.deep.equal(['2', 'Product 2', '20.00']);
        });
    });
});

