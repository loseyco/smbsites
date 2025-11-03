#!/usr/bin/env node

/**
 * Migrate existing sites to new customer-based structure
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateSitesToCustomers() {
    const sitesDir = path.join(__dirname, '..', 'sites');
    const customersDir = path.join(__dirname, '..', 'customers');
    const scrapedDataDir = path.join(__dirname, '..', '.scraped-data');

    await fs.ensureDir(customersDir);

    console.log(chalk.blue('\n🔄 Migrating sites to customer structure...\n'));

    // Get all site folders (exclude README.md)
    const siteFolders = (await fs.readdir(sitesDir))
        .filter(item => {
            const itemPath = path.join(sitesDir, item);
            return fs.statSync(itemPath).isDirectory();
        });

    for (const siteFolder of siteFolders) {
        const sitePath = path.join(sitesDir, siteFolder);
        const customerPath = path.join(customersDir, siteFolder);
        
        // Check if data file exists
        const dataFile = path.join(scrapedDataDir, `${siteFolder}.json`);
        let scrapedData = null;
        
        if (await fs.pathExists(dataFile)) {
            scrapedData = await fs.readJson(dataFile);
        }

        // Create customer structure
        await fs.ensureDir(customerPath);
        await fs.ensureDir(path.join(customerPath, 'website'));
        await fs.ensureDir(path.join(customerPath, 'data'));

        // Move website files
        const websiteSrc = sitePath;
        const websiteDest = path.join(customerPath, 'website');
        
        const files = await fs.readdir(websiteSrc);
        for (const file of files) {
            if (file !== 'README.md') {
                const src = path.join(websiteSrc, file);
                const dest = path.join(websiteDest, file);
                await fs.copy(src, dest);
            }
        }

        // Create customer.json
        const customerData = {
            customerId: siteFolder,
            businessName: scrapedData?.businessName || siteFolder.replace(/-/g, ' '),
            status: "pending",
            contact: {
                phone: scrapedData?.contact?.phone || null,
                email: scrapedData?.contact?.email || null,
                address: scrapedData?.contact?.address || null,
                contactedDate: null,
                contactMethod: null,
                notes: null
            },
            website: {
                previewUrl: `https://${siteFolder}.websites.losey.co`,
                localUrl: `/customers/${siteFolder}/website/`,
                sourceUrl: scrapedData?.sourceUrl || null,
                hasExistingWebsite: !!scrapedData?.sourceUrl,
                deployed: false,
                deployedDate: null,
                customDomain: null
            },
            generated: {
                date: new Date().toISOString(),
                dataSource: scrapedData?.sourceUrl ? "scraped" : "google-places",
                servicesCount: scrapedData?.services?.length || 0,
                hasLogo: !!scrapedData?.logoPath,
                hasHours: !!scrapedData?.hours
            },
            outreach: {
                sentDate: null,
                method: null,
                responseDate: null,
                interested: null,
                notes: null
            },
            billing: {
                monthlyRate: null,
                startDate: null,
                lastPayment: null,
                active: false
            },
            notes: ""
        };

        await fs.writeJson(path.join(customerPath, 'customer.json'), customerData, { spaces: 2 });

        // Copy scraped data if exists
        if (scrapedData) {
            await fs.writeJson(path.join(customerPath, 'data', 'scraped-data.json'), scrapedData, { spaces: 2 });
        }

        console.log(chalk.green(`✓ Migrated: ${customerData.businessName}`));
    }

    console.log(chalk.blue(`\n✅ Migration complete! ${siteFolders.length} customers migrated.\n`));
    console.log(chalk.yellow('⚠️  Original sites folder kept for backup. You can delete it after verifying.\n'));
}

migrateSitesToCustomers().catch(err => {
    console.error(chalk.red('Error:'), err);
    process.exit(1);
});

