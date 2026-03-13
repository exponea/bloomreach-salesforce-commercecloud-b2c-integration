/**
 * Validates all SFCC metadata XML files shipped with the cartridge.
 *
 * Checks performed per file:
 *  1. Well-formedness  - XMLValidator.validate() must return true
 *  2. Correct root element and SFCC namespace
 *  3. Structural assertions derived from the official SFCC XSD schemas:
 *       jobs.xsd        -> jobs/2015-07-01
 *       services.xsd    -> services/2014-09-26
 *       metadata.xsd    -> metadata/2006-10-31
 *
 * No system tools (xmllint, Java) required - fast-xml-parser is pure JS.
 */

'use strict';

var expect = require('chai').expect;
var XMLParser = require('fast-xml-parser').XMLParser;
var XMLValidator = require('fast-xml-parser').XMLValidator;
var fs = require('fs');
var path = require('path');

var METADATA_DIR = path.resolve(__dirname, '../../metadata/site-template');

var PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false
};

// Valid attribute types from metadata.xsd simpleType.AttributeType
var VALID_ATTR_TYPES = [
    'string', 'int', 'double', 'text', 'html', 'image',
    'boolean', 'date', 'datetime', 'email', 'password',
    'set-of-string', 'set-of-int', 'set-of-double',
    'enum-of-string', 'enum-of-int'
];

// Valid staging-mode values from metadata.xsd simpleType.StagingMode
var VALID_STAGING_MODES = ['no-staging', 'source-to-target'];

// Valid storage-scope values from metadata.xsd simpleType.StorageScope
var VALID_STORAGE_SCOPES = ['site', 'organization'];

function readXML(relPath) {
    return fs.readFileSync(path.join(METADATA_DIR, relPath), 'utf8');
}

// Wraps a value in an array when it is not already one.
// fast-xml-parser returns an object when there is a single child element and
// an array when there are multiple, so this helper normalises both cases.
function toArray(value) {
    if (value === undefined || value === null) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

describe('Metadata XML Files', function () {
    var parser = new XMLParser(PARSER_OPTIONS);

    // =========================================================================
    // jobs.xml
    // Validated against: http://www.demandware.com/xml/impex/jobs/2015-07-01
    // =========================================================================
    describe('jobs.xml', function () {
        var content;
        var parsed;

        before(function () {
            content = readXML('jobs.xml');
            parsed = parser.parse(content);
        });

        it('is well-formed XML', function () {
            var result = XMLValidator.validate(content);
            expect(result).to.equal(true);
        });

        it('has root element "jobs" with the correct SFCC namespace', function () {
            expect(parsed).to.have.property('jobs');
            expect(parsed.jobs['@_xmlns']).to.equal(
                'http://www.demandware.com/xml/impex/jobs/2015-07-01'
            );
        });

        it('contains at least one job element', function () {
            var jobs = toArray(parsed.jobs.job);
            expect(jobs.length).to.be.above(0);
        });

        it('every job has a non-empty job-id attribute', function () {
            var jobs = toArray(parsed.jobs.job);
            jobs.forEach(function (job) {
                expect(job['@_job-id']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('every job has a flow or split element (some jobs use split/flow-template instead of flow)', function () {
            var jobs = toArray(parsed.jobs.job);
            jobs.forEach(function (job) {
                var hasFlow = Object.prototype.hasOwnProperty.call(job, 'flow');
                var hasSplit = Object.prototype.hasOwnProperty.call(job, 'split');
                expect(hasFlow || hasSplit).to.equal(
                    true,
                    'job "' + job['@_job-id'] + '" has neither a flow nor a split element'
                );
            });
        });

        it('every context (in flow or split) has a non-empty site-id attribute', function () {
            var jobs = toArray(parsed.jobs.job);
            jobs.forEach(function (job) {
                if (job.flow) {
                    // Regular flow: <flow><context site-id="..."/></flow>
                    var context = job.flow.context;
                    expect(context['@_site-id']).to.be.a('string').and.have.length.above(0);
                } else if (job.split) {
                    // Split flow: <split><contexts><context site-id="..."/></contexts></split>
                    var contexts = toArray(job.split.contexts.context);
                    expect(contexts.length).to.be.above(0);
                    contexts.forEach(function (ctx) {
                        expect(ctx['@_site-id']).to.be.a('string').and.have.length.above(0);
                    });
                }
            });
        });

        it('every step has the required step-id, type and enforce-restart attributes', function () {
            var jobs = toArray(parsed.jobs.job);
            jobs.forEach(function (job) {
                var steps;
                if (job.flow) {
                    steps = toArray(job.flow.step);
                } else if (job.split) {
                    // Split flow: <split><flow-template><step .../></flow-template></split>
                    steps = toArray(job.split['flow-template'].step);
                } else {
                    steps = [];
                }
                steps.forEach(function (step) {
                    expect(step['@_step-id']).to.be.a('string').and.have.length.above(0);
                    expect(step['@_type']).to.be.a('string').and.have.length.above(0);
                    expect(step).to.have.property('@_enforce-restart');
                });
            });
        });

        it('contains the "Bloomreach Engagement - Test SFTP Connection" job', function () {
            var jobIds = toArray(parsed.jobs.job).map(function (j) {
                return j['@_job-id'];
            });
            expect(jobIds).to.include('Bloomreach Engagement - Test SFTP Connection');
        });

        it('"Bloomreach Engagement - Test SFTP Connection" job has the testSFTPConnection step with the correct type', function () {
            var jobs = toArray(parsed.jobs.job);
            var sftpJob = jobs.find(function (j) {
                return j['@_job-id'] === 'Bloomreach Engagement - Test SFTP Connection';
            });
            expect(sftpJob, 'SFTP job not found').to.not.equal(undefined);
            var steps = toArray(sftpJob.flow ? sftpJob.flow.step : []);
            var sftpStep = steps.find(function (s) {
                return s['@_step-id'] === 'testSFTPConnection';
            });
            expect(sftpStep, 'testSFTPConnection step not found').to.not.equal(undefined);
            expect(sftpStep['@_type']).to.equal('custom.BloomreachEngagement.TestSFTPConnection');
        });
    });

    // =========================================================================
    // services.xml
    // Validated against: http://www.demandware.com/xml/impex/services/2014-09-26
    // =========================================================================
    describe('services.xml', function () {
        var content;
        var parsed;

        before(function () {
            content = readXML('services.xml');
            parsed = parser.parse(content);
        });

        it('is well-formed XML', function () {
            var result = XMLValidator.validate(content);
            expect(result).to.equal(true);
        });

        it('has root element "services" with the correct SFCC namespace', function () {
            expect(parsed).to.have.property('services');
            expect(parsed.services['@_xmlns']).to.equal(
                'http://www.demandware.com/xml/impex/services/2014-09-26'
            );
        });

        it('every service-credential has a non-empty service-credential-id', function () {
            var creds = toArray(parsed.services['service-credential']);
            expect(creds.length).to.be.above(0);
            creds.forEach(function (cred) {
                expect(cred['@_service-credential-id']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('every service-profile has a non-empty service-profile-id', function () {
            var profiles = toArray(parsed.services['service-profile']);
            expect(profiles.length).to.be.above(0);
            profiles.forEach(function (profile) {
                expect(profile['@_service-profile-id']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('every service has a non-empty service-id and a service-type child element', function () {
            var services = toArray(parsed.services.service);
            expect(services.length).to.be.above(0);
            services.forEach(function (service) {
                expect(service['@_service-id']).to.be.a('string').and.have.length.above(0);
                // service-type minOccurs=1 in services.xsd
                expect(service['service-type']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('service profile-id and credential-id reference ids defined in this file', function () {
            var credIds = toArray(parsed.services['service-credential']).map(function (c) {
                return c['@_service-credential-id'];
            });
            var profileIds = toArray(parsed.services['service-profile']).map(function (p) {
                return p['@_service-profile-id'];
            });
            toArray(parsed.services.service).forEach(function (service) {
                if (service['profile-id']) {
                    expect(profileIds).to.include(service['profile-id']);
                }
                if (service['credential-id']) {
                    expect(credIds).to.include(service['credential-id']);
                }
            });
        });
    });

    // =========================================================================
    // meta/system-objecttype-extensions.xml
    // Validated against: http://www.demandware.com/xml/impex/metadata/2006-10-31
    // =========================================================================
    describe('meta/system-objecttype-extensions.xml', function () {
        var content;
        var parsed;

        before(function () {
            content = readXML('meta/system-objecttype-extensions.xml');
            parsed = parser.parse(content);
        });

        it('is well-formed XML', function () {
            var result = XMLValidator.validate(content);
            expect(result).to.equal(true);
        });

        it('has root element "metadata" with the correct SFCC namespace', function () {
            expect(parsed).to.have.property('metadata');
            expect(parsed.metadata['@_xmlns']).to.equal(
                'http://www.demandware.com/xml/impex/metadata/2006-10-31'
            );
        });

        it('contains at least one type-extension with a non-empty type-id', function () {
            var extensions = toArray(parsed.metadata['type-extension']);
            expect(extensions.length).to.be.above(0);
            extensions.forEach(function (ext) {
                expect(ext['@_type-id']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('contains the expected SitePreferences type-extension', function () {
            var typeIds = toArray(parsed.metadata['type-extension']).map(function (e) {
                return e['@_type-id'];
            });
            expect(typeIds).to.include('SitePreferences');
        });

        it('every attribute-definition has a non-empty attribute-id', function () {
            var extensions = toArray(parsed.metadata['type-extension']);
            extensions.forEach(function (ext) {
                var defs = toArray((ext['custom-attribute-definitions'] || {})['attribute-definition']);
                defs.forEach(function (def) {
                    expect(def['@_attribute-id']).to.be.a('string').and.have.length.above(0);
                });
            });
        });

        it('every attribute-definition has a valid type per metadata.xsd', function () {
            var extensions = toArray(parsed.metadata['type-extension']);
            extensions.forEach(function (ext) {
                var defs = toArray((ext['custom-attribute-definitions'] || {})['attribute-definition']);
                defs.forEach(function (def) {
                    expect(
                        VALID_ATTR_TYPES,
                        'attribute-id "' + def['@_attribute-id'] + '" has invalid type "' + def.type + '"'
                    ).to.include(def.type);
                });
            });
        });

        it('every attribute-group has a non-empty group-id', function () {
            var extensions = toArray(parsed.metadata['type-extension']);
            extensions.forEach(function (ext) {
                var groups = toArray((ext['group-definitions'] || {})['attribute-group']);
                groups.forEach(function (group) {
                    expect(group['@_group-id']).to.be.a('string').and.have.length.above(0);
                });
            });
        });
    });

    // =========================================================================
    // meta/custom-objecttype-definitions.xml
    // Validated against: http://www.demandware.com/xml/impex/metadata/2006-10-31
    // =========================================================================
    describe('meta/custom-objecttype-definitions.xml', function () {
        var content;
        var parsed;

        before(function () {
            content = readXML('meta/custom-objecttype-definitions.xml');
            parsed = parser.parse(content);
        });

        it('is well-formed XML', function () {
            var result = XMLValidator.validate(content);
            expect(result).to.equal(true);
        });

        it('has root element "metadata" with the correct SFCC namespace', function () {
            expect(parsed).to.have.property('metadata');
            expect(parsed.metadata['@_xmlns']).to.equal(
                'http://www.demandware.com/xml/impex/metadata/2006-10-31'
            );
        });

        it('contains at least one custom-type with a non-empty type-id', function () {
            var types = toArray(parsed.metadata['custom-type']);
            expect(types.length).to.be.above(0);
            types.forEach(function (t) {
                expect(t['@_type-id']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('contains the expected BloomreachEngagementJobLastExecution custom type', function () {
            var typeIds = toArray(parsed.metadata['custom-type']).map(function (t) {
                return t['@_type-id'];
            });
            expect(typeIds).to.include('BloomreachEngagementJobLastExecution');
        });

        it('every custom-type has the required staging-mode and storage-scope elements', function () {
            var types = toArray(parsed.metadata['custom-type']);
            types.forEach(function (t) {
                expect(t).to.have.property('staging-mode');
                expect(t).to.have.property('storage-scope');
            });
        });

        it('staging-mode is a valid value per metadata.xsd', function () {
            var types = toArray(parsed.metadata['custom-type']);
            types.forEach(function (t) {
                expect(VALID_STAGING_MODES).to.include(String(t['staging-mode']));
            });
        });

        it('storage-scope is a valid value per metadata.xsd', function () {
            var types = toArray(parsed.metadata['custom-type']);
            types.forEach(function (t) {
                expect(VALID_STORAGE_SCOPES).to.include(String(t['storage-scope']));
            });
        });

        it('every custom-type has a key-definition with a non-empty attribute-id', function () {
            var types = toArray(parsed.metadata['custom-type']);
            types.forEach(function (t) {
                expect(t).to.have.property('key-definition');
                expect(t['key-definition']['@_attribute-id']).to.be.a('string').and.have.length.above(0);
            });
        });

        it('every attribute-definition has a valid type per metadata.xsd', function () {
            var types = toArray(parsed.metadata['custom-type']);
            types.forEach(function (t) {
                var defs = toArray((t['attribute-definitions'] || {})['attribute-definition']);
                defs.forEach(function (def) {
                    expect(
                        VALID_ATTR_TYPES,
                        'attribute-id "' + def['@_attribute-id'] + '" has invalid type "' + def.type + '"'
                    ).to.include(def.type);
                });
            });
        });
    });
});
