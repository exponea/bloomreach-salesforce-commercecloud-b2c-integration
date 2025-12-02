#!/usr/bin/env node
'use strict';

/**
 * Customer Data Generator for SFCC
 * Generates test customer data in SFCC XML import format for load testing
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Configuration
const CONFIG = {
    customerCount: 100000,
    outputFile: path.join(__dirname, 'customers-import-100k.xml'),
    defaultPassword: 'Test@123',
    startCustomerNo: 1
};

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Generate a single customer record in SFCC XML format
 * @param {number} index - Customer index (0-based)
 * @returns {string} XML string for customer
 */
function generateCustomer(index) {
    const customerNo = `CUST${String(CONFIG.startCustomerNo + index).padStart(6, '0')}`;
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({
        firstName: firstName.toLowerCase(),
        lastName: lastName.toLowerCase(),
        provider: 'testload.com'
    });
    
    // Generate random creation date within last 2 years
    const creationDate = faker.date.past({ years: 2 });
    const lastModified = faker.date.between({ from: creationDate, to: new Date() });
    
    return `  <customer customer-no="${escapeXml(customerNo)}">
    <credentials>
      <login>${escapeXml(email)}</login>
      <password encrypted="false">${escapeXml(CONFIG.defaultPassword)}</password>
    </credentials>
    <profile>
      <first-name>${escapeXml(firstName)}</first-name>
      <last-name>${escapeXml(lastName)}</last-name>
      <email>${escapeXml(email)}</email>
    </profile>
  </customer>`;
}

/**
 * Generate the complete XML file with all customers
 */
function generateCustomersXML() {
    console.log(`Starting customer data generation...`);
    console.log(`Target: ${CONFIG.customerCount} customers`);
    console.log(`Output file: ${CONFIG.outputFile}`);
    console.log('');

    const startTime = Date.now();
    
    // Create write stream
    const writeStream = fs.createWriteStream(CONFIG.outputFile, { encoding: 'utf8' });
    
    // Write XML header
    writeStream.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    writeStream.write('<customers xmlns="http://www.demandware.com/xml/impex/customer/2006-10-31">\n');
    
    // Generate customers in batches to avoid memory issues
    const batchSize = 1000;
    let processedCount = 0;
    
    for (let i = 0; i < CONFIG.customerCount; i++) {
        const customerXml = generateCustomer(i);
        writeStream.write(customerXml + '\n');
        processedCount++;
        
        // Progress indicator
        if (processedCount % batchSize === 0) {
            const progress = ((processedCount / CONFIG.customerCount) * 100).toFixed(1);
            console.log(`Progress: ${processedCount}/${CONFIG.customerCount} (${progress}%)`);
        }
    }
    
    // Write closing tag
    writeStream.write('</customers>\n');
    writeStream.end();
    
    writeStream.on('finish', () => {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const fileSize = (fs.statSync(CONFIG.outputFile).size / 1024 / 1024).toFixed(2);
        
        console.log('');
        console.log('✓ Generation complete!');
        console.log(`  - Total customers: ${processedCount}`);
        console.log(`  - File size: ${fileSize} MB`);
        console.log(`  - Duration: ${duration} seconds`);
        console.log(`  - Output: ${CONFIG.outputFile}`);
        console.log('');
        console.log('Next steps:');
        console.log('1. Upload the XML file to SFCC Business Manager');
        console.log('2. Navigate to: Administration > Site Development > Import & Export');
        console.log('3. Import the file using "Customer Import" job');
        console.log('4. Run the customer export job to test for failures');
        console.log('');
        console.log('See test-data-generator/README.md for detailed instructions.');
    });
    
    writeStream.on('error', (err) => {
        console.error('Error writing file:', err);
        process.exit(1);
    });
}

// Main execution
try {
    // Ensure output directory exists
    const outputDir = path.dirname(CONFIG.outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate the XML
    generateCustomersXML();
} catch (error) {
    console.error('Error generating customer data:', error);
    process.exit(1);
}
