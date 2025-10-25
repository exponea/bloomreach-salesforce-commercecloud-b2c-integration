'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');

var Service = require('dw/svc/Service');

var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');

function getBloomreachEngagementAPIService(import_Id) {
    var currentSite = Site.getCurrent();
    var bloomreachServiceURL = currentSite.getCustomPreferenceValue('brEngApiBaseUrl')
    	+ '/data/v2/projects/projectToken/imports/import_id/start';
    var bloomreachAPIKeyId = currentSite.getCustomPreferenceValue('brEngApiKeyId');
    var bloomreachAPIKeySecret = currentSite.getCustomPreferenceValue('brEngApiKeySecret');
    var bloomreachProjectToken = currentSite.getCustomPreferenceValue('brEngProjectToken');
    if (import_Id && bloomreachAPIKeyId && bloomreachAPIKeySecret && bloomreachProjectToken) {
        var service = LocalServiceRegistry.createService('bloomreach.engagement.service', {
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
    getBloomreachEngagementAPIService: getBloomreachEngagementAPIService
};
