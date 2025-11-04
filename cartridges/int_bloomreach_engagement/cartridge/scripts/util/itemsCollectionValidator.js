'use strict';

/**
 * Validation utilities for Items Collection Feed
 * Used for testing and debugging the export output
 */

var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');

/**
 * Validates a JSON Lines file structure
 * @param {string} filePath - Path to .jsonl file
 * @returns {Object} Validation result with errors and warnings
 */
function validateJsonlFile(filePath) {
    var file = new File(filePath);
    var results = {
        valid: true,
        lineCount: 0,
        errors: [],
        warnings: [],
        productCount: 0,
        addCount: 0,
        updateCount: 0,
        removeCount: 0,
        products: []
    };

    if (!file.exists()) {
        results.valid = false;
        results.errors.push('File does not exist: ' + filePath);
        return results;
    }

    var reader = new FileReader(file, 'UTF-8');
    var line;
    var lineNum = 0;

    try {
        while ((line = reader.readLine()) != null) {
            lineNum++;
            results.lineCount++;

            if (!line.trim()) {
                results.warnings.push('Line ' + lineNum + ': Empty line');
                continue;
            }

            try {
                var productData = JSON.parse(line);
                
                // Validate structure
                if (!productData.op) {
                    results.errors.push('Line ' + lineNum + ': Missing "op" field');
                    results.valid = false;
                }

                if (!productData.path) {
                    results.errors.push('Line ' + lineNum + ': Missing "path" field');
                    results.valid = false;
                }

                // Count operations
                if (productData.op === 'add') results.addCount++;
                else if (productData.op === 'remove') results.removeCount++;
                else results.updateCount++;

                results.productCount++;

                // Validate add/update operations
                if (productData.op !== 'remove') {
                    if (!productData.value) {
                        results.errors.push('Line ' + lineNum + ': Missing "value" field for ' + productData.op);
                        results.valid = false;
                    } else {
                        if (!productData.value.attributes) {
                            results.errors.push('Line ' + lineNum + ': Missing "value.attributes"');
                            results.valid = false;
                        }
                        if (!productData.value.variants) {
                            results.warnings.push('Line ' + lineNum + ': Missing "value.variants"');
                        }
                    }
                }

                // Store product ID for summary
                var productId = productData.path.replace('/products/', '');
                results.products.push({
                    line: lineNum,
                    id: productId,
                    op: productData.op,
                    variantCount: productData.value && productData.value.variants ? Object.keys(productData.value.variants).length : 0
                });

            } catch (e) {
                results.errors.push('Line ' + lineNum + ': Invalid JSON - ' + e.message);
                results.valid = false;
            }
        }
    } finally {
        reader.close();
    }

    return results;
}

/**
 * Validates product attribute structure
 * @param {Object} attributes - Product attributes object
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result
 */
function validateProductAttributes(attributes, requiredFields) {
    var results = {
        valid: true,
        missingFields: [],
        presentFields: []
    };

    if (!requiredFields) {
        requiredFields = ['title', 'price', 'url'];
    }

    requiredFields.forEach(function(field) {
        if (attributes[field] !== undefined && attributes[field] !== null) {
            results.presentFields.push(field);
        } else {
            results.missingFields.push(field);
            results.valid = false;
        }
    });

    return results;
}

/**
 * Compares two snapshot files to analyze changes
 * @param {string} oldSnapshotPath - Path to old snapshot
 * @param {string} newSnapshotPath - Path to new snapshot
 * @returns {Object} Comparison result
 */
function compareSnapshots(oldSnapshotPath, newSnapshotPath) {
    var results = {
        added: [],
        removed: [],
        modified: [],
        unchanged: []
    };

    var oldFile = new File(oldSnapshotPath);
    var newFile = new File(newSnapshotPath);

    if (!oldFile.exists() || !newFile.exists()) {
        return {error: 'One or both snapshot files do not exist'};
    }

    // Load old snapshot
    var oldProducts = {};
    var oldReader = new FileReader(oldFile, 'UTF-8');
    var line;
    try {
        while ((line = oldReader.readLine()) != null) {
            var product = JSON.parse(line);
            oldProducts[product.id] = product;
        }
    } finally {
        oldReader.close();
    }

    // Compare with new snapshot
    var newProducts = {};
    var newReader = new FileReader(newFile, 'UTF-8');
    try {
        while ((line = newReader.readLine()) != null) {
            var product = JSON.parse(line);
            newProducts[product.id] = product;

            if (oldProducts[product.id]) {
                // Check if modified
                if (JSON.stringify(oldProducts[product.id]) !== JSON.stringify(product)) {
                    results.modified.push(product.id);
                } else {
                    results.unchanged.push(product.id);
                }
            } else {
                results.added.push(product.id);
            }
        }
    } finally {
        newReader.close();
    }

    // Find removed products
    Object.keys(oldProducts).forEach(function(id) {
        if (!newProducts[id]) {
            results.removed.push(id);
        }
    });

    return results;
}

/**
 * Generates a validation report
 * @param {Object} validationResults - Results from validateJsonlFile
 * @returns {string} Formatted report
 */
function generateValidationReport(validationResults) {
    var report = [];
    
    report.push('=== Items Collection Feed Validation Report ===\n');
    report.push('Status: ' + (validationResults.valid ? 'VALID' : 'INVALID') + '\n');
    report.push('Total Lines: ' + validationResults.lineCount);
    report.push('Total Products: ' + validationResults.productCount);
    report.push('Add Operations: ' + validationResults.addCount);
    report.push('Update Operations: ' + validationResults.updateCount);
    report.push('Remove Operations: ' + validationResults.removeCount);
    report.push('\n');

    if (validationResults.errors.length > 0) {
        report.push('=== ERRORS ===');
        validationResults.errors.forEach(function(error) {
            report.push('  ✗ ' + error);
        });
        report.push('\n');
    }

    if (validationResults.warnings.length > 0) {
        report.push('=== WARNINGS ===');
        validationResults.warnings.forEach(function(warning) {
            report.push('  ⚠ ' + warning);
        });
        report.push('\n');
    }

    if (validationResults.products.length > 0 && validationResults.products.length <= 10) {
        report.push('=== PRODUCTS ===');
        validationResults.products.forEach(function(product) {
            report.push('  Line ' + product.line + ': ' + product.id + ' (' + product.op + ') - ' + product.variantCount + ' variants');
        });
    } else if (validationResults.products.length > 10) {
        report.push('=== PRODUCTS (First 10) ===');
        for (var i = 0; i < 10; i++) {
            var product = validationResults.products[i];
            report.push('  Line ' + product.line + ': ' + product.id + ' (' + product.op + ') - ' + product.variantCount + ' variants');
        }
        report.push('  ... and ' + (validationResults.products.length - 10) + ' more');
    }

    return report.join('\n');
}

/**
 * Main validation function - validates entire export
 * @param {string} targetFolder - Folder containing export files
 * @param {string} siteId - Site ID
 * @returns {Object} Complete validation results
 */
function validateExport(targetFolder, siteId) {
    var results = {
        valid: true,
        files: [],
        totalProducts: 0,
        errors: [],
        warnings: []
    };

    var folder = new File(File.getRootDirectory(File.IMPEX), targetFolder);
    
    if (!folder.exists()) {
        results.valid = false;
        results.errors.push('Export folder does not exist: ' + targetFolder);
        return results;
    }

    // Find all .jsonl files
    var fileRegex = new RegExp('^items_collection_feed_' + siteId + '_\\d{14}.*?\\.jsonl$');
    var files = folder.listFiles();
    
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (fileRegex.test(file.name)) {
            var fileValidation = validateJsonlFile(file.fullPath);
            results.files.push({
                name: file.name,
                validation: fileValidation
            });
            results.totalProducts += fileValidation.productCount;
            
            if (!fileValidation.valid) {
                results.valid = false;
            }
        }
    }

    if (results.files.length === 0) {
        results.warnings.push('No export files found matching pattern');
    }

    return results;
}

module.exports = {
    validateJsonlFile: validateJsonlFile,
    validateProductAttributes: validateProductAttributes,
    compareSnapshots: compareSnapshots,
    generateValidationReport: generateValidationReport,
    validateExport: validateExport
};

