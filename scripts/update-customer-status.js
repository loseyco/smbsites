#!/usr/bin/env node

/**
 * Update customer status and information
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateCustomerStatus(customerId, updates) {
    const customersDir = path.join(__dirname, '..', 'customers');
    const customerPath = path.join(customersDir, customerId);
    const customerFile = path.join(customerPath, 'customer.json');

    if (!await fs.pathExists(customerFile)) {
        throw new Error(`Customer not found: ${customerId}`);
    }

    const customer = await fs.readJson(customerFile);

    // Deep merge updates
    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = target[key] || {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    deepMerge(customer, updates);

    // Update timestamp if status changed
    if (updates.status && updates.status !== customer.status) {
        customer.statusUpdated = new Date().toISOString();
    }

    await fs.writeJson(customerFile, customer, { spaces: 2 });

    console.log(chalk.green(`✓ Updated: ${customer.businessName}`));
    console.log(chalk.gray(`  Status: ${customer.status}\n`));

    return customer;
}

// CLI
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.includes('update-customer-status')) {
    const customerId = process.argv[2];
    const status = process.argv[3];

    if (!customerId || !status) {
        console.log(chalk.red('Usage: node scripts/update-customer-status.js <customer-id> <status> [field:value]'));
        console.log(chalk.yellow('\nExample:'));
        console.log('  node scripts/update-customer-status.js patton-block-grill-brew-pub contacted');
        console.log('  node scripts/update-customer-status.js patton-block-grill-brew-pub interested "outreach.responseDate:2025-01-15"\n');
        process.exit(1);
    }

    const updates = { status };
    
    // Handle additional updates
    for (let i = 4; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.includes(':')) {
            const [path, value] = arg.split(':');
            const keys = path.split('.');
            let obj = updates;
            for (let j = 0; j < keys.length - 1; j++) {
                obj[keys[j]] = obj[keys[j]] || {};
                obj = obj[keys[j]];
            }
            obj[keys[keys.length - 1]] = value;
        }
    }

    updateCustomerStatus(customerId, updates).catch(err => {
        console.error(chalk.red('Error:'), err.message);
        process.exit(1);
    });
}

export { updateCustomerStatus };

