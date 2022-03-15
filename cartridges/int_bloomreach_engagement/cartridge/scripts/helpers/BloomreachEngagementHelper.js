var bloomReachEngagementAPIServices = require('~/cartridge/scripts/services/BloomreachEngagementAPIService.js');
var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');
var Site = require('dw/system/Site');

const bloomReachEngagementAPIService = function(import_Id, webDavFilePath) {
	var currentSite = Site.getCurrent();
	var bloomreachServiceURL = currentSite.getCustomPreferenceValue('bloomreach_api_base_url')
		+ '/data/v2/projects/projectToken/imports/import_id/start';
    var bloomreachProjectToken = currentSite.getCustomPreferenceValue('bloomreach_project_token');

    var BREngagementAPISerivce = bloomReachEngagementAPIServices.getBloomreachEngagementAPIService(import_Id);
    var result = {};
    try {
        // Result Object
        var requestObject = {
        	webDavFilePath: webDavFilePath
       	};
        result = BREngagementAPISerivce.call(requestObject);

        var serviceURL = bloomreachServiceURL.replace('projectToken', bloomreachProjectToken).replace('import_id', import_Id);
        
        Logger.info('bloomreach.engagement.service call URL: ' + serviceURL);
        Logger.info('Request Data: ' + BREngagementAPISerivce.getRequestData());
        Logger.info('Response Data: ' + result);
        
    } catch (e) {
        Logger.error('Error while triggering bloomreach engagement api {0}', e.message);
    }

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