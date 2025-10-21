'use strict';

/**
 * This Function generates header for csv file
 * @param {string} exportType Customer Info
 * @returns {Array} Header Values Array for CSV file
 */
function generateCSVHeader() {
    var sitePrefs = dw.system.Site.getCurrent().getPreferences();
    var customerInfoFeedJSON = sitePrefs.getCustom()["brEngCustomerFeedDataMapping"];
    var customerInfoFeed = JSON.parse(customerInfoFeedJSON);

    var csvHeaderArray = [];
    var SFCCAttributesValue = [];
    var results = {};

    if (customerInfoFeed && customerInfoFeed.length > 0) {
        for (var i = 0; i < customerInfoFeed.length; i++) {
            if (csvHeaderArray.indexOf(customerInfoFeed[i].XSDField) == -1) {
                csvHeaderArray.push(customerInfoFeed[i].XSDField);
                SFCCAttributesValue.push({'SFCCProductAttribute': customerInfoFeed[i].SFCCProductAttribute, 'isCustom': customerInfoFeed[i].isCustomAttribute});
            }
        }
    }

    results.csvHeaderArray = csvHeaderArray;
    results.SFCCAttributesValue = SFCCAttributesValue
    return results;
}

function getTimeStamp(date) {
    var timeStamp;
    if (date) {
        var date = new Date(date);
        timeStamp = Math.floor(date.getTime()/1000);
        return timeStamp.toString();
    } else {
        return "";
    }
}

module.exports = {
    generateCSVHeader: generateCSVHeader,
    getTimeStamp: getTimeStamp
}