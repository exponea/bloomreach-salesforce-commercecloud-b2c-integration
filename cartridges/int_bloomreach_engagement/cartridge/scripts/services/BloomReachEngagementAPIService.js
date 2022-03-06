'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');

var Service = require('dw/svc/Service');

var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');

function getBloomReachEngagementAPIService(import_Id) {
    var currentSite = Site.getCurrent();
    var bloomreachServiceURL = currentSite.getCustomPreferenceValue('bloomreach_api_base_url');
    var bloomreachAPIKeyId = currentSite.getCustomPreferenceValue('bloomreach_api_key_id');
    var bloomreachAPIKeySecret = currentSite.getCustomPreferenceValue('bloomreach_api_key_secret');
    var bloomreachProjectToken = currentSite.getCustomPreferenceValue('bloomreach_project_token');
    if (import_Id && bloomreachAPIKeyId && bloomreachAPIKeySecret && bloomreachProjectToken) {
        var service : Service = LocalServiceRegistry.createService('bloomreach.engagement.service', {
        	createRequest: function (svc, requestObject) {
            	var webDavFilePath = requestObject.webDavFilePath;

				return '{"path":"' + webDavFilePath + '"}';
        	},
        	parseResponse: function (svc, response) {
            	return response.text;
        	},
        	getRequestLogMessage: function (request) {
            	return request;
        	},
        	getResponseLogMessage: function (response) {
            	return response.text;
        	},
        	filterLogMessage: function(msg) {
				return msg;
			}
        });
        
        var svcCredential = service.getConfiguration().getCredential();
        
        var url = bloomreachServiceURL;
        var newURL = url.replace('projectToken', bloomreachProjectToken).replace('import_id', import_Id);
        
        service.setURL(newURL);
        var authorizationHeader = 'Basic ' + StringUtils.encodeBase64(bloomreachAPIKeyId + ':' + bloomreachAPIKeySecret);
        service.addHeader('Authorization', authorizationHeader);
        service.addHeader('Content-Type', 'application/json');

        return service;
    } else {
        throw new Error('Error while triggering bloomreach engagement api: credentials not provided');
    }
}

module.exports = {
    getBloomReachEngagementAPIService: getBloomReachEngagementAPIService
};
