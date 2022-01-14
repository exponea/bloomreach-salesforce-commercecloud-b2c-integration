var bloomReachEngagementAPIServices = require('~/cartridge/scripts/services/BloomReachEngagementAPIService.js');
var Logger = dw.system.Logger.getLogger('BloomreachEngagementAPI');


const bloomReachEngagementAPIService = function(import_Id) {
    var BREngagementAPISerivce = bloomReachEngagementAPIServices.getBloomReachEngagementAPIService(import_Id);
    var result = {};
    try {
        // Result Object
        result = BREngagementAPISerivce.call();
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