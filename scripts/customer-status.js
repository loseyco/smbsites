#!/usr/bin/env node

/**
 * View customer status and list all customers
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function listCustomers(filterStatus = null) {
    const customersDir = path.join(__dirname, '..', 'customers');

    if (!await fs.pathExists(customersDir)) {
        console.log(chalk.yellow('No customers directory found. Run migration first.\n'));
        return;
    }

    const customerFolders = (await fs.readdir(customersDir))
        .filter(item => {
            const itemPath = path.join(customersDir, item);
            return fs.statSync(itemPath).isDirectory();
        });

    if (customerFolders.length === 0) {
        console.log(chalk.yellow('No customers found.\n'));
        return;
    }

    const customers = [];

    for (const folder of customerFolders) {
        const customerFile = path.join(customersDir, folder, 'customer.json');
        if (await fs.pathExists(customerFile)) {
            const customer = await fs.readJson(customerFile);
            if (!filterStatus || customer.status === filterStatus) {
                customers.push(customer);
            }
        }
    }

    // Sort by business name
    customers.sort((a, b) => a.businessName.localeCompare(b.businessName));

    console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║              Customer Status Report                   ║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════╝\n'));

    const statusCounts = {};
    customers.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });

    console.log(chalk.blue('Status Summary:'));
    Object.entries(statusCounts).forEach(([status, count]) => {
        const color = status === 'active' ? chalk.green : 
                     status === 'interested' ? chalk.yellow :
                     status === 'declined' ? chalk.red : chalk.gray;
        console.log(`  ${color(status.padEnd(12))}: ${count}`);
    });
    console.log('');

    console.log(chalk.blue('Customers:\n'));
    
    customers.forEach((customer, index) => {
        const statusColor = customer.status === 'active' ? chalk.green :
                           customer.status === 'interested' ? chalk.yellow :
                           customer.status === 'declined' ? chalk.red :
                           customer.status === 'contacted' ? chalk.cyan : chalk.gray;

        console.log(`${index + 1}. ${chalk.bold(customer.businessName)}`);
        console.log(`   Status: ${statusColor(customer.status)}`);
        console.log(`   Preview: ${chalk.underline(customer.website.previewUrl)}`);
        if (customer.contact.phone) {
            console.log(`   Phone: ${customer.contact.phone}`);
        }
        if (customer.outreach.sentDate) {
            console.log(`   Contacted: ${customer.outreach.sentDate}`);
        }
        if (customer.billing.active) {
            console.log(`   ${chalk.green('✓ Active Customer')} - $${customer.billing.monthlyRate}/mo`);
        }
        console.log('');
    });

    console.log(chalk.gray(`\nTotal: ${customers.length} customers\n`));
}

// CLI
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.includes('customer-status')) {
    const filterStatus = process.argv[2] || null;
    listCustomers(filterStatus).catch(err => {
        console.error(chalk.red('Error:'), err);
        process.exit(1);
    });
}

export { listCustomers };

