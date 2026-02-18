var bloomReachEngagementAPIServices = require('~/cartridge/scripts/services/BloomreachEngagementAPIService.js');
var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');
var Site = require('dw/system/Site');

const bloomReachEngagementAPIService = function(import_Id, webDavFilePath) {
	var currentSite = Site.getCurrent();
	var bloomreachServiceURL = currentSite.getCustomPreferenceValue('brEngApiBaseUrl')
		+ '/data/v2/projects/projectToken/imports/import_id/start';
    var bloomreachProjectToken = currentSite.getCustomPreferenceValue('brEngProjectToken');

    var BREngagementAPISerivce = bloomReachEngagementAPIServices.getBloomreachEngagementAPIService(import_Id);
    var result = {};

    // Result Object
    var requestObject = {
    	webDavFilePath: webDavFilePath
   	};

    var serviceURL = bloomreachServiceURL.replace('projectToken', bloomreachProjectToken).replace('import_id', import_Id);
    Logger.info('Triggering Bloomreach API import. URL: ' + serviceURL + ' | File path: ' + webDavFilePath);

    result = BREngagementAPISerivce.call(requestObject);

    Logger.info('bloomreach.engagement.service call URL: ' + serviceURL);
    Logger.info('Request Data: ' + BREngagementAPISerivce.getRequestData());
    Logger.info('Response Data: ' + result);

    if (result.status === 'OK') {
        return result.object;
    } else {
        var errorMsg = 'Bloomreach API import trigger failed for import ID: ' + import_Id
            + '. Error: ' + result.errorMessage;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
    }
}

module.exports = {
    bloomReachEngagementAPIService: bloomReachEngagementAPIService
}