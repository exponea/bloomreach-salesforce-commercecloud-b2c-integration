var File = require('dw/io/File');
var EConstants = require('~/cartridge/scripts/util/ExponeaProductFeedConstants');

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
    return fileNamePrefix + '_' + timeStamp + '.' + fileExtension;
}

module.exports = {
    createFileName: createFileName
};
