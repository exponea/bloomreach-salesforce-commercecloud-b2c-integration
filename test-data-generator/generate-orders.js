#!/usr/bin/env node
'use strict';

/**
 * Order Data Generator for SFCC
 * Generates test order data in SFCC XML import format for load testing
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Configuration
const CONFIG = {
    orderCount: 100000,
    outputFile: path.join(__dirname, 'orders-import-100k.xml'),
    startOrderNo: 1,
    startCustomerNo: 1,
    // Product SKUs to use in orders (extracted from exported-orders.xml)
    products: [
        { id: '701642843603M', name: 'Wide Waist Pencil Skirt', price: 75.99 },
        { id: '701642843634M', name: 'Wide Waist Pencil Skirt', price: 75.99 },
        { id: '701642843573M', name: 'Wide Waist Pencil Skirt', price: 75.99 },
        { id: '883360520919M', name: 'Front Rise Straight Leg Pants', price: 175.00 },
        { id: '883360520902M', name: 'Front Rise Straight Leg Pants', price: 175.00 },
        { id: '013742002881M', name: 'Hoop Clip On Earring', price: 26.00 },
        { id: '842204063333M', name: 'Men\'s Leather Luggage Fisherman Bag', price: 162.00 },
        { id: '726819487817M', name: 'Platinum V Neck Suit Dress', price: 99.00 },
        { id: '69309284M-1', name: 'Modern Striped Dress Shirt', price: 130.00 },
        { id: '701644026660M', name: 'Floral Scoop Neck Tank Dress', price: 89.00 }
    ],
    minLineItems: 1,
    maxLineItems: 5
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
 * Format date for SFCC (ISO 8601 format)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    return date.toISOString();
}

/**
 * Generate random product line items for an order
 * @param {number} count - Number of line items to generate
 * @returns {Array} Array of line item objects
 */
function generateLineItems(count) {
    const items = [];
    const usedProducts = new Set();
    
    for (let i = 0; i < count; i++) {
        // Select a unique product for this order
        let product;
        do {
            product = faker.helpers.arrayElement(CONFIG.products);
        } while (usedProducts.has(product.id) && usedProducts.size < CONFIG.products.length);
        usedProducts.add(product.id);
        
        const quantity = faker.number.int({ min: 1, max: 3 });
        const basePrice = product.price;
        const netPrice = basePrice * quantity;
        const tax = netPrice * 0.05; // 5% tax rate (matching exported orders)
        const grossPrice = netPrice + tax;
        
        items.push({
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            basePrice: basePrice.toFixed(2),
            netPrice: netPrice.toFixed(2),
            tax: tax.toFixed(2),
            grossPrice: grossPrice.toFixed(2),
            taxRate: '0.05'
        });
    }
    
    return items;
}

/**
 * Generate product line items XML
 * @param {Array} items - Array of line item objects
 * @returns {string} XML string for product line items
 */
function generateProductLineItemsXML(items) {
    return items.map((item, index) => {
        return `      <product-lineitem>
        <net-price>${item.netPrice}</net-price>
        <tax>${item.tax}</tax>
        <gross-price>${item.grossPrice}</gross-price>
        <base-price>${item.basePrice}</base-price>
        <lineitem-text>${escapeXml(item.productName)}</lineitem-text>
        <tax-basis>${item.netPrice}</tax-basis>
        <position>${index + 1}</position>
        <product-id>${escapeXml(item.productId)}</product-id>
        <product-name>${escapeXml(item.productName)}</product-name>
        <quantity unit="">${item.quantity}.0</quantity>
        <tax-rate>${item.taxRate}</tax-rate>
        <shipment-id>me</shipment-id>
        <gift>false</gift>
      </product-lineitem>`;
    }).join('\n');
}

/**
 * Calculate order totals
 * @param {Array} items - Array of line item objects
 * @returns {Object} Object with total calculations
 */
function calculateTotals(items) {
    const merchandiseTotal = items.reduce((sum, item) => sum + parseFloat(item.netPrice), 0);
    const shippingTotal = faker.number.float({ min: 5, max: 25, multipleOf: 0.01 });
    const taxTotal = items.reduce((sum, item) => sum + parseFloat(item.tax), 0);
    const orderTotal = merchandiseTotal + shippingTotal + taxTotal;
    
    return {
        merchandiseTotal: merchandiseTotal.toFixed(2),
        shippingTotal: shippingTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        orderTotal: orderTotal.toFixed(2)
    };
}

/**
 * Generate a single order record in SFCC XML format
 * @param {number} index - Order index (0-based)
 * @returns {string} XML string for order
 */
function generateOrder(index) {
    const orderNo = `ORD${String(CONFIG.startOrderNo + index).padStart(8, '0')}`;
    
    // Use modulo to cycle through customer numbers (assuming customers exist)
    const customerNo = `CUST${String(CONFIG.startCustomerNo + (index % CONFIG.orderCount)).padStart(6, '0')}`;
    
    // Generate order date within last year
    const orderDate = faker.date.past({ years: 1 });
    const creationDate = formatDate(orderDate);
    
    // Status - most orders completed, some new/open, few cancelled
    const statusWeights = [
        { value: 'COMPLETED', weight: 0.7 },
        { value: 'NEW', weight: 0.15 },
        { value: 'OPEN', weight: 0.1 },
        { value: 'CANCELLED', weight: 0.05 }
    ];
    const status = faker.helpers.weightedArrayElement(statusWeights);
    
    // Generate line items
    const lineItemCount = faker.number.int({ min: CONFIG.minLineItems, max: CONFIG.maxLineItems });
    const lineItems = generateLineItems(lineItemCount);
    const totals = calculateTotals(lineItems);
    const productLineItems = generateProductLineItemsXML(lineItems);
    
    // Customer info
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ provider: 'testload.com' });
    
    // Billing address
    const billFirstName = faker.person.firstName();
    const billLastName = faker.person.lastName();
    const billAddress1 = faker.location.streetAddress();
    const billCity = faker.location.city();
    const billZip = faker.location.zipCode();
    const billState = faker.location.state({ abbreviated: true });
    const billPhone = faker.phone.number();
    
    // Shipping address
    const shipFirstName = faker.person.firstName();
    const shipLastName = faker.person.lastName();
    const shipAddress1 = faker.location.streetAddress();
    const shipCity = faker.location.city();
    const shipZip = faker.location.zipCode();
    const shipState = faker.location.state({ abbreviated: true });
    const shipPhone = faker.phone.number();
    
    // Shipping method
    const shippingMethod = faker.helpers.arrayElement(['001', '002', 'standard', 'express']);
    
    // Payment (gross price = net + tax)
    const shippingTax = (parseFloat(totals.shippingTotal) * 0.05).toFixed(2);
    const paymentAmount = (parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal) + parseFloat(totals.shippingTotal) * 1.05).toFixed(2);
    
    return `  <order order-no="${escapeXml(orderNo)}">
    <order-date>${creationDate}</order-date>
    <created-by>storefront</created-by>
    <original-order-no>${escapeXml(orderNo)}</original-order-no>
    <currency>USD</currency>
    <customer-locale>en_US</customer-locale>
    <taxation>net</taxation>
    <invoice-no>${escapeXml(orderNo)}</invoice-no>
    <customer>
      <customer-name>${escapeXml(firstName + ' ' + lastName)}</customer-name>
      <customer-email>${escapeXml(email)}</customer-email>
      <billing-address>
        <first-name>${escapeXml(billFirstName)}</first-name>
        <last-name>${escapeXml(billLastName)}</last-name>
        <address1>${escapeXml(billAddress1)}</address1>
        <city>${escapeXml(billCity)}</city>
        <postal-code>${escapeXml(billZip)}</postal-code>
        <state-code>${escapeXml(billState)}</state-code>
        <country-code>US</country-code>
        <phone>${escapeXml(billPhone)}</phone>
      </billing-address>
    </customer>
    <status>
      <order-status>${status}</order-status>
      <shipping-status>${status === 'COMPLETED' ? 'SHIPPED' : 'NOT_SHIPPED'}</shipping-status>
      <confirmation-status>CONFIRMED</confirmation-status>
      <payment-status>${status === 'COMPLETED' || status === 'OPEN' ? 'PAID' : 'NOT_PAID'}</payment-status>
    </status>
    <current-order-no>${escapeXml(orderNo)}</current-order-no>
    <product-lineitems>
${productLineItems}
    </product-lineitems>
    <shipping-lineitems>
      <shipping-lineitem>
        <net-price>${totals.shippingTotal}</net-price>
        <tax>${(parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
        <gross-price>${(parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
        <base-price>${totals.shippingTotal}</base-price>
        <lineitem-text>Shipping</lineitem-text>
        <tax-basis>${totals.shippingTotal}</tax-basis>
        <item-id>STANDARD_SHIPPING</item-id>
        <shipment-id>me</shipment-id>
        <tax-rate>0.05</tax-rate>
      </shipping-lineitem>
    </shipping-lineitems>
    <shipments>
      <shipment shipment-id="me">
        <status>
          <shipping-status>${status === 'COMPLETED' ? 'SHIPPED' : 'NOT_SHIPPED'}</shipping-status>
        </status>
        <shipping-method>${escapeXml(shippingMethod)}</shipping-method>
        <shipping-address>
          <first-name>${escapeXml(shipFirstName)}</first-name>
          <last-name>${escapeXml(shipLastName)}</last-name>
          <address1>${escapeXml(shipAddress1)}</address1>
          <city>${escapeXml(shipCity)}</city>
          <postal-code>${escapeXml(shipZip)}</postal-code>
          <state-code>${escapeXml(shipState)}</state-code>
          <country-code>US</country-code>
          <phone>${escapeXml(shipPhone)}</phone>
        </shipping-address>
        <gift>false</gift>
        <totals>
          <merchandize-total>
            <net-price>${totals.merchandiseTotal}</net-price>
            <tax>${totals.taxTotal}</tax>
            <gross-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal)).toFixed(2)}</gross-price>
          </merchandize-total>
          <adjusted-merchandize-total>
            <net-price>${totals.merchandiseTotal}</net-price>
            <tax>${totals.taxTotal}</tax>
            <gross-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal)).toFixed(2)}</gross-price>
          </adjusted-merchandize-total>
          <shipping-total>
            <net-price>${totals.shippingTotal}</net-price>
            <tax>${(parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
            <gross-price>${(parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
          </shipping-total>
          <adjusted-shipping-total>
            <net-price>${totals.shippingTotal}</net-price>
            <tax>${(parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
            <gross-price>${(parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
          </adjusted-shipping-total>
          <shipment-total>
            <net-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.shippingTotal)).toFixed(2)}</net-price>
            <tax>${(parseFloat(totals.taxTotal) + parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
            <gross-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal) + parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
          </shipment-total>
        </totals>
      </shipment>
    </shipments>
    <totals>
      <merchandize-total>
        <net-price>${totals.merchandiseTotal}</net-price>
        <tax>${totals.taxTotal}</tax>
        <gross-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal)).toFixed(2)}</gross-price>
      </merchandize-total>
      <adjusted-merchandize-total>
        <net-price>${totals.merchandiseTotal}</net-price>
        <tax>${totals.taxTotal}</tax>
        <gross-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal)).toFixed(2)}</gross-price>
      </adjusted-merchandize-total>
      <shipping-total>
        <net-price>${totals.shippingTotal}</net-price>
        <tax>${(parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
        <gross-price>${(parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
      </shipping-total>
      <adjusted-shipping-total>
        <net-price>${totals.shippingTotal}</net-price>
        <tax>${(parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
        <gross-price>${(parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
      </adjusted-shipping-total>
      <order-total>
        <net-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.shippingTotal)).toFixed(2)}</net-price>
        <tax>${(parseFloat(totals.taxTotal) + parseFloat(totals.shippingTotal) * 0.05).toFixed(2)}</tax>
        <gross-price>${(parseFloat(totals.merchandiseTotal) + parseFloat(totals.taxTotal) + parseFloat(totals.shippingTotal) * 1.05).toFixed(2)}</gross-price>
      </order-total>
    </totals>
    <payments>
      <payment>
        <credit-card>
          <card-type>VISA</card-type>
          <card-number>XXXX-XXXX-XXXX-1111</card-number>
          <card-holder>${escapeXml(firstName + ' ' + lastName)}</card-holder>
          <card-token>${faker.string.alphanumeric(11).toLowerCase()}</card-token>
          <expiration-month>${faker.number.int({ min: 1, max: 12 })}</expiration-month>
          <expiration-year>${faker.number.int({ min: 2025, max: 2032 })}</expiration-year>
        </credit-card>
        <amount>${paymentAmount}</amount>
        <processor-id>BASIC_CREDIT</processor-id>
        <transaction-id>${escapeXml(orderNo)}</transaction-id>
      </payment>
    </payments>
    <remoteHost>${faker.internet.ipv4()}</remoteHost>
  </order>`;
}

/**
 * Generate the complete XML file with all orders
 */
function generateOrdersXML() {
    console.log(`Starting order data generation...`);
    console.log(`Target: ${CONFIG.orderCount} orders`);
    console.log(`Output file: ${CONFIG.outputFile}`);
    console.log('');

    const startTime = Date.now();
    
    // Create write stream
    const writeStream = fs.createWriteStream(CONFIG.outputFile, { encoding: 'utf8' });
    
    // Write XML header
    writeStream.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    writeStream.write('<orders xmlns="http://www.demandware.com/xml/impex/order/2006-10-31">\n');
    
    // Generate orders in batches to avoid memory issues
    const batchSize = 500;
    let processedCount = 0;
    
    for (let i = 0; i < CONFIG.orderCount; i++) {
        const orderXml = generateOrder(i);
        writeStream.write(orderXml + '\n');
        processedCount++;
        
        // Progress indicator
        if (processedCount % batchSize === 0) {
            const progress = ((processedCount / CONFIG.orderCount) * 100).toFixed(1);
            console.log(`Progress: ${processedCount}/${CONFIG.orderCount} (${progress}%)`);
        }
    }
    
    // Write closing tag
    writeStream.write('</orders>\n');
    writeStream.end();
    
    writeStream.on('finish', () => {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const fileSize = (fs.statSync(CONFIG.outputFile).size / 1024 / 1024).toFixed(2);
        
        console.log('');
        console.log('✓ Generation complete!');
        console.log(`  - Total orders: ${processedCount}`);
        console.log(`  - File size: ${fileSize} MB`);
        console.log(`  - Duration: ${duration} seconds`);
        console.log(`  - Output: ${CONFIG.outputFile}`);
        console.log('');
        console.log('Next steps:');
        console.log('1. Upload the XML file to SFCC Business Manager');
        console.log('2. Navigate to: Administration > Site Development > Import & Export');
        console.log('3. Import the file using "Order Import" job');
        console.log('4. Verify orders in: Merchant Tools > Ordering > Orders');
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
    generateOrdersXML();
} catch (error) {
    console.error('Error generating order data:', error);
    process.exit(1);
}
