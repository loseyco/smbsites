#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { renderTemplate, normalizeColor } from './template-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate website from extracted data
 */
async function generateWebsite(dataFile, outputDir = null) {
    console.log(chalk.blue(`\n🚀 Generating website...\n`));

    try {
        // Load extracted data
        let dataPath;
        if (path.isAbsolute(dataFile)) {
            dataPath = dataFile;
        } else {
            dataPath = path.join(__dirname, '..', '.scraped-data', `${dataFile}.json`);
        }

        if (!await fs.pathExists(dataPath)) {
            throw new Error(`Data file not found: ${dataPath}`);
        }

        const data = await fs.readJson(dataPath);
        console.log(chalk.blue(`\n✓ Loaded data for: ${data.businessName}`));
        console.log(chalk.gray(`  Services: ${data.services?.length || 0}`));
        console.log(chalk.gray(`  Hours: ${data.hours ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`  Logo: ${data.logoPath ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`  Colors: ${data.colors?.primaryColor || 'default'}\n`));

        // Determine output directory
        const businessSlug = data.businessSlug || dataFile;
        
        // Use customer-based structure in websites/sites/ for GitHub
        const websitesDir = path.join(__dirname, '..', 'websites', 'sites');
        const customerDir = path.join(websitesDir, businessSlug);
        const siteDir = outputDir || customerDir;
        
        await fs.ensureDir(customerDir);
        await fs.ensureDir(siteDir);
        await fs.ensureDir(path.join(siteDir, 'assets'));
        await fs.ensureDir(path.join(customerDir, 'data'));

        // Prepare template data
        const siteBasePath = `/site/${businessSlug}`;
        const templateData = {
            businessName: data.businessName || 'Business Name',
            businessSlug: businessSlug,
            siteBasePath: siteBasePath,
            businessTagline: data.businessTagline || `Welcome to ${data.businessName}`,
            businessDescription: data.businessDescription || `${data.businessName} - Local Business`,
            aboutText: data.aboutText || `We are ${data.businessName}, your trusted local business.`,
            primaryColor: normalizeColor(data.colors?.primaryColor),
            secondaryColor: normalizeColor(data.colors?.secondaryColor),
            accentColor: normalizeColor(data.colors?.accentColor),
            textColor: normalizeColor(data.colors?.textColor),
            bgColor: normalizeColor(data.colors?.bgColor),
            phone: data.contact?.phone || null,
            email: data.contact?.email || null,
            address: data.contact?.address || '',
            hours: data.hours || '',
            services: (data.services || []).map((service, index) => ({
                ...service,
                image: data.images && data.images[index + 1] ? data.images[index + 1] : null
            })),
            hasServices: (data.services && data.services.length > 0),
            socialLinks: data.socialLinks || [],
            images: data.images || [],
            hasImages: (data.images && data.images.length > 0),
            heroImage: data.images && data.images.length > 0 ? data.images[0] : null,
            currentYear: new Date().getFullYear(),
            logo: !!data.logoPath,
            logoExt: data.logoPath ? path.extname(data.logoPath) : '.png'
        };

        // Load templates
        const templateDir = path.join(__dirname, '..', 'templates', 'base');
        const htmlTemplate = await fs.readFile(path.join(templateDir, 'index.html'), 'utf-8');
        const cssTemplate = await fs.readFile(path.join(templateDir, 'styles.css'), 'utf-8');
        const jsTemplate = await fs.readFile(path.join(templateDir, 'script.js'), 'utf-8');

        // Render templates
        console.log(chalk.gray('Rendering templates...'));
        const html = renderTemplate(htmlTemplate, templateData);
        const css = renderTemplate(cssTemplate, templateData);
        const js = jsTemplate; // JavaScript doesn't need templating

        // Write files
        await fs.writeFile(path.join(siteDir, 'index.html'), html);
        await fs.writeFile(path.join(siteDir, 'styles.css'), css);
        await fs.writeFile(path.join(siteDir, 'script.js'), js);
        
        console.log(chalk.blue(`✓ Generated with ${templateData.services.length} services, logo: ${templateData.logo}, hours: ${!!templateData.hours}`));

        // Copy logo if available
        if (data.logoPath && await fs.pathExists(data.logoPath)) {
            const logoExt = path.extname(data.logoPath);
            const logoDest = path.join(siteDir, 'assets', `logo${logoExt}`);
            await fs.copy(data.logoPath, logoDest);
            console.log(chalk.green('✓ Logo copied'));
        }

        // Save scraped data to customer data folder
        const customerDataFile = path.join(customerDir, 'data', 'scraped-data.json');
        await fs.writeJson(customerDataFile, data, { spaces: 2 });

        // Create or update customer.json
        const customerFile = path.join(customerDir, 'customer.json');
        let customer = {
            customerId: businessSlug,
            businessName: data.businessName || businessSlug,
            status: "pending",
            contact: {
                phone: data.contact?.phone || null,
                email: data.contact?.email || null,
                address: data.contact?.address || null,
                contactedDate: null,
                contactMethod: null,
                notes: null
            },
            website: {
                previewUrl: `https://${businessSlug}.websites.losey.co`,
                localUrl: `/site/${businessSlug}`,
                sourceUrl: data.sourceUrl || null,
                hasExistingWebsite: !!data.sourceUrl,
                deployed: false,
                deployedDate: null,
                customDomain: null
            },
            generated: {
                date: new Date().toISOString(),
                dataSource: data.sourceUrl ? "scraped" : "google-places",
                servicesCount: data.services?.length || 0,
                hasLogo: !!data.logoPath,
                hasHours: !!data.hours
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

        // Merge with existing customer data if present
        if (await fs.pathExists(customerFile)) {
            const existing = await fs.readJson(customerFile);
            customer = { ...existing, ...customer, generated: customer.generated };
        }

        await fs.writeJson(customerFile, customer, { spaces: 2 });
        console.log(chalk.green('✓ Customer record created/updated'));

        // Auto-update sites.html portfolio page
        try {
            const { buildSitesPage } = await import('../scripts/build-index.js');
            await buildSitesPage();
            console.log(chalk.green('✓ Sites portfolio page updated'));
        } catch (err) {
            console.log(chalk.yellow('⚠ Could not update sites page (run npm run build-sites manually)'));
        }

        console.log(chalk.green(`\n✓ Website generated successfully!`));
        console.log(chalk.blue(`\n📁 Website directory: ${siteDir}\n`));
        console.log(chalk.cyan('Generated files:'));
        console.log(`  - customer.json (customer record)`);
        console.log(`  - data/scraped-data.json`);
        console.log(`  - index.html`);
        console.log(`  - styles.css`);
        console.log(`  - script.js`);
        if (data.logoPath) {
            console.log(`  - assets/logo${path.extname(data.logoPath)}\n`);
        }

        return { customerDir, siteDir };

    } catch (error) {
        console.error(chalk.red('\n❌ Error generating website:'), error.message);
        throw error;
    }
}

// CLI Interface
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
                     process.argv[1]?.includes('generator/index.js') ||
                     process.argv[1]?.includes('generator') ||
                     process.argv[1]?.endsWith('index.js');

if (isMainModule) {
    const dataFile = process.argv[2];
    const outputDir = process.argv[3] || null;

    if (!dataFile) {
        console.log(chalk.red('❌ Please provide a data file name (without .json extension)'));
        console.log(chalk.yellow('\nUsage: node generator/index.js <data-file-slug> [output-dir]\n'));
        console.log(chalk.gray('Example: node generator/index.js restaurant-name\n'));
        process.exit(1);
    }

    generateWebsite(dataFile, outputDir).catch(err => {
        console.error(chalk.red('\n❌ Fatal error:'), err);
        process.exit(1);
    });
}

export { generateWebsite };

