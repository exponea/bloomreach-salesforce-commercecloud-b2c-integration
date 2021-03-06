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
    result = BREngagementAPISerivce.call(requestObject);

    var serviceURL = bloomreachServiceURL.replace('projectToken', bloomreachProjectToken).replace('import_id', import_Id);
    
    Logger.info('bloomreach.engagement.service call URL: ' + serviceURL);
    Logger.info('Request Data: ' + BREngagementAPISerivce.getRequestData());
    Logger.info('Response Data: ' + result);

    if (result.status === 'OK') {
        // The result.object is the object returned by the 'after' callback.
        result = result.object;
    } else {
        // Handle the error. See result.error for more information.
        result = result.error;
    }
    return result;
}

module.exports = {
    bloomReachEngagementAPIService: bloomReachEngagementAPIService
}