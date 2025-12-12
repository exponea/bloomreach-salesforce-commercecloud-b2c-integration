var path = require('path');

    module.exports = [{
        mode: 'production',
        name: 'js',
        entry: {
            'default/js/components/datalayers/dataLayer': './cartridges/int_bloomreach_engagement/cartridge/client/default/js/components/datalayers/dataLayer.js'
        },
        output: {
            path: path.resolve('./cartridges/int_bloomreach_engagement/cartridge/static'),
            filename: '[name].js'
        }
    }];