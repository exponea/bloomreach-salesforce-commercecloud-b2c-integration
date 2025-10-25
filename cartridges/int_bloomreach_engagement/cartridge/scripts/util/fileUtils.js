var File = require('dw/io/File');
var EConstants = require('~/cartridge/scripts/util/productFeedConstants');

/**
 * This Function creates file name with file name prefix.
 * @param {string} fileNamePrefix : e.g . export-product
 * @param {string} fileExtension :e.g. csv or xml
 * @returns {string} fileName export-product_siteID_localeID.csv
 */
function createFileName(fileNamePrefix, fileExtension) {
    if (!fileExtension) {
        fileExtension = EConstants.FILE_EXTENSTION.CSV; // eslint-disable-line no-param-reassign
    }
    var dateNow = Date.now();
    var timeStamp = dateNow.toString();
    return fileNamePrefix + timeStamp + '.' + fileExtension;
}

/**
 * This Function creates a static LATEST file name with file name prefix.
 * @param {string} fileNamePrefix : e.g . export-product
 * @param {string} fileExtension :e.g. csv or xml
 * @returns {string} fileName export-product-LATEST.csv
 */
function createLatestFileName(fileNamePrefix, fileExtension) {
    if (!fileExtension) {
        fileExtension = EConstants.FILE_EXTENSTION.CSV; // eslint-disable-line no-param-reassign
    }
    return fileNamePrefix + '-LATEST.' + fileExtension;
}

/**
 * Merges multiple CSV files into a single LATEST file, skipping headers from all files except the first.
 * @param {Array} csvFilePaths - Array of full file paths to merge
 * @param {string} targetFolder - Target folder relative to IMPEX
 * @param {string} fileNamePrefix - File name prefix for the LATEST file
 * @param {Object} Logger - Logger instance for logging
 * @returns {string} Full path to the created LATEST file
 */
function mergeCSVFilesIntoLatest(csvFilePaths, targetFolder, fileNamePrefix, Logger) {
    if (!csvFilePaths || csvFilePaths.length === 0) {
        Logger.warn('No CSV files to merge');
        return null;
    }

    var FileReader = require('dw/io/FileReader');
    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamReader = require('dw/io/CSVStreamReader');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');

    // Create LATEST file
    var latestFileName = createLatestFileName(fileNamePrefix);
    var folderFile = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        Logger.error('Cannot create IMPEX folders for LATEST file: {0}', folderFile.fullPath);
        throw new Error('Cannot create IMPEX folders for LATEST file.');
    }

    var latestFile = new File(folderFile.fullPath + File.SEPARATOR + latestFileName);
    var fileWriter = new FileWriter(latestFile);
    var csvWriter = new CSVStreamWriter(fileWriter);

    try {
        var isFirstFile = true;
        var totalRowsMerged = 0;

        // Iterate through all CSV files
        for (var i = 0; i < csvFilePaths.length; i++) {
            var csvFile = new File(csvFilePaths[i]);
            
            if (!csvFile.exists()) {
                Logger.warn('CSV file does not exist: {0}', csvFilePaths[i]);
                continue;
            }

            var fileReader = new FileReader(csvFile);
            var csvReader = new CSVStreamReader(fileReader);

            try {
                var rowCount = 0;
                var line;

                // Read all lines from the current file
                while ((line = csvReader.readNext()) != null) {
                    rowCount++;
                    
                    // Skip header row for all files except the first one
                    if (!isFirstFile && rowCount === 1) {
                        continue;
                    }

                    // Write the line to the LATEST file
                    csvWriter.writeNext(line);
                    totalRowsMerged++;
                }

                Logger.info('Merged {0} rows from file: {1}', rowCount - (isFirstFile ? 0 : 1), csvFile.name);
                isFirstFile = false;

            } finally {
                csvReader.close();
                fileReader.close();
            }
        }

        Logger.info('Successfully created LATEST file with {0} total rows: {1}', totalRowsMerged, latestFile.fullPath);

    } finally {
        csvWriter.close();
        fileWriter.close();
    }

    return latestFile.fullPath;
}

module.exports = {
    createFileName: createFileName,
    createLatestFileName: createLatestFileName,
    mergeCSVFilesIntoLatest: mergeCSVFilesIntoLatest
};
