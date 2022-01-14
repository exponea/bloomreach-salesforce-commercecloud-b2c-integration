'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');

function getBloomReachEngagementAPIService(import_Id) {
   return LocalServiceRegistry.createService('bloomreach.engagement.service', {
       createRequest: function (svc) {
        var currentSite = Site.getCurrent();
        var bloomreachAPIKeyId = currentSite.getCustomPreferenceValue('bloomreach_api_key_id');
        var bloomreachAPIKeySecret = currentSite.getCustomPreferenceValue('bloomreach_api_key_secret');
        var bloomreachProjectToken = currentSite.getCustomPreferenceValue('bloomreach_project_token');

        var svcCredential = svc.getConfiguration().getCredential();
        var url = svcCredential.URL;
        
        svc.URL = url.replace('projectToken', bloomreachProjectToken).replace('import_id', import_Id);
        svc.addHeader('Authorization', 'Basic ' + StringUtils.encodeBase64(bloomreachAPIKeyId + ':' + bloomreachAPIKeySecret));
        var requestBody = {
            path: 'URL',
            test_connection: true
        };
        return JSON.stringify(requestBody); 
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
   });
}

module.exports = {
    getBloomReachEngagementAPIService: getBloomReachEngagementAPIService
};