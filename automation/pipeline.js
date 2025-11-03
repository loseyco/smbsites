#!/usr/bin/env node

/**
 * Automated pipeline: Find businesses → Scrape → Generate sites
 */

import { findLocalBusinesses } from './google-places.js';
import { scrapeWebsite } from '../scraper/analyzer.js';
import { generateWebsite } from '../generator/index.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create business data structure from Google Places data (for businesses without websites)
 */
async function createBusinessDataFromPlaces(business) {
    // Generate a basic color scheme based on business type
    const typeColors = {
        restaurant: { primary: '8B4513', secondary: 'CD853F', accent: 'FF6347' }, // Brown/tan/coral
        store: { primary: '2E5090', secondary: '5B7FAE', accent: 'FFD700' }, // Blue/gold
        bar: { primary: '1A1A1A', secondary: '4A4A4A', accent: 'FFA500' }, // Black/orange
        cafe: { primary: '6F4E37', secondary: 'D2B48C', accent: '8B4513' }, // Coffee browns
        default: { primary: '333333', secondary: '666666', accent: 'FF6B6B' } // Gray/red
    };

    const businessType = business.types?.[0] || 'default';
    const colorScheme = typeColors[businessType] || typeColors.default;

    // Create services from business types
    const services = business.types?.slice(0, 5).map(type => ({
        name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Quality ${type.replace(/_/g, ' ')} services`
    })) || [];

    return {
        sourceUrl: null,
        businessName: business.name,
        businessSlug: business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
        businessTagline: `Welcome to ${business.name}`,
        businessDescription: `${business.name} - Your trusted local ${businessType.replace(/_/g, ' ')} in ${business.address || 'your area'}`,
        colors: {
            primaryColor: colorScheme.primary,
            secondaryColor: colorScheme.secondary,
            accentColor: colorScheme.accent,
            textColor: '333333',
            bgColor: 'FFFFFF'
        },
        contact: {
            phone: business.phone || null,
            email: business.email || null,
            address: business.address || null
        },
        socialLinks: [],
        logoUrl: null,
        logoPath: null,
        services: services,
        hours: business.hours ? (business.hours.weekday_text || []).join('\n') : null,
        aboutText: `${business.name} is a local ${businessType.replace(/_/g, ' ')} committed to serving ${business.address ? 'the ' + business.address.split(',')[0] + ' community' : 'our community'} with quality products and exceptional service.${business.rating ? ` Rated ${business.rating} stars by our customers.` : ''}`
    };
}

// Load environment variables from .env file
async function loadEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        if (await fs.pathExists(envPath)) {
            const envContent = await fs.readFile(envPath, 'utf-8');
            envContent.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        const value = valueParts.join('=').trim();
                        if (value && !process.env[key.trim()]) {
                            process.env[key.trim()] = value;
                        }
                    }
                }
            });
        }
    } catch (e) {
        // Ignore .env loading errors
    }
}

/**
 * Full automation pipeline
 */
export async function runAutomatedPipeline(options) {
    const {
        apiKey,
        location,
        radius = 5000,
        type = 'restaurant',
        keyword = '',
        maxBusinesses = 10,
        skipExisting = true,
        autoGenerate = true
    } = options;

    console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
    console.log(chalk.cyan('║  Automated Business Site Generator  ║'));
    console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));

    try {
        // Step 1: Find businesses
        console.log(chalk.yellow('Step 1: Finding local businesses...\n'));
        const businesses = await findLocalBusinesses({
            apiKey,
            location,
            radius,
            type,
            keyword,
            maxResults: maxBusinesses
        });

        if (businesses.length === 0) {
            console.log(chalk.yellow('No businesses found. Exiting.\n'));
            return [];
        }

        // Process all businesses - with or without websites
        console.log(chalk.blue(`\nFound ${businesses.length} businesses to process\n`));
        console.log(chalk.gray(`  - ${businesses.filter(b => b.website).length} with existing websites (will scrape)\n`));
        console.log(chalk.gray(`  - ${businesses.filter(b => !b.website).length} without websites (will generate from Google data)\n`));

        if (businesses.length === 0) {
            console.log(chalk.yellow('No businesses found. Exiting.\n'));
            return [];
        }

        // Step 2: Process each business
        const results = [];
        
        for (let i = 0; i < businesses.length; i++) {
            const business = businesses[i];
            console.log(chalk.cyan(`\n${'═'.repeat(50)}`));
            console.log(chalk.cyan(`Processing ${i + 1}/${businesses.length}: ${business.name}`));
            console.log(chalk.cyan(`${'═'.repeat(50)}\n`));

            try {
                // Check if already exists (check new structure)
                const slug = business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
                const customerDir = path.join(__dirname, '..', 'websites', 'sites', slug);
                
                if (skipExisting && await fs.pathExists(customerDir)) {
                    console.log(chalk.yellow(`⏭ Skipping ${business.name} (already exists)\n`));
                    results.push({
                        business: business.name,
                        status: 'skipped',
                        url: `https://${slug}.websites.losey.co`
                    });
                    continue;
                }

                let scrapedData;

                if (business.website) {
                    // Step 2a: Scrape website if available
                    console.log(chalk.gray(`Scraping: ${business.website}`));
                    scrapedData = await scrapeWebsite(business.website);

                    // Merge Google Places data with scraped data
                    scrapedData.contact = scrapedData.contact || {};
                    if (business.phone && !scrapedData.contact.phone) {
                        scrapedData.contact.phone = business.phone;
                    }
                    if (business.address && !scrapedData.contact.address) {
                        scrapedData.contact.address = business.address;
                    }
                } else {
                    // Step 2a: Generate from Google Places data only
                    console.log(chalk.gray(`Generating from Google Places data (no website to scrape)`));
                    scrapedData = await createBusinessDataFromPlaces(business);
                    
                    // Ensure slug matches
                    scrapedData.businessSlug = slug;
                    
                    // Save data to JSON file (like scraper does)
                    const dataDir = path.join(__dirname, '..', '.scraped-data');
                    await fs.ensureDir(dataDir);
                    const dataFile = path.join(dataDir, `${slug}.json`);
                    await fs.writeJson(dataFile, scrapedData, { spaces: 2 });
                    console.log(chalk.gray(`Saved data to: ${dataFile}`));
                }

                // Ensure slug matches for scraped data too
                if (business.website) {
                    scrapedData.businessSlug = slug;
                }

                // Step 2b: Generate website
                if (autoGenerate) {
                    console.log(chalk.gray(`Generating website...`));
                    await generateWebsite(scrapedData.businessSlug);
                }

                const siteUrl = `https://${scrapedData.businessSlug}.websites.losey.co`;
                const localUrl = `http://localhost:8080/websites/sites/${scrapedData.businessSlug}/`;
                
                results.push({
                    business: business.name,
                    status: 'success',
                    url: siteUrl,
                    localUrl: localUrl,
                    slug: scrapedData.businessSlug,
                    hadWebsite: !!business.website
                });

                console.log(chalk.green(`✓ Completed: ${siteUrl}\n`));

            } catch (error) {
                console.error(chalk.red(`❌ Error processing ${business.name}: ${error.message}\n`));
                results.push({
                    business: business.name,
                    status: 'error',
                    error: error.message
                });
            }

            // Rate limiting between businesses
            if (i < businesses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Summary
        console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
        console.log(chalk.cyan('║           Summary                    ║'));
        console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));

        const successful = results.filter(r => r.status === 'success');
        const skipped = results.filter(r => r.status === 'skipped');
        const errors = results.filter(r => r.status === 'error');

        console.log(chalk.green(`✓ Successful: ${successful.length}`));
        console.log(chalk.yellow(`⏭ Skipped: ${skipped.length}`));
        console.log(chalk.red(`❌ Errors: ${errors.length}\n`));

        if (successful.length > 0) {
            console.log(chalk.blue('Generated sites:\n'));
            successful.forEach(r => {
                console.log(`  ${chalk.cyan(r.business)}:`);
                console.log(`    Live: ${chalk.underline(r.url)}`);
                console.log(`    Local: ${chalk.gray(r.localUrl || `http://localhost:8080/websites/sites/${r.slug}/`)}`);
            });
            console.log('');
        }

        // Save results
        const outputFile = path.join(__dirname, '..', '.scraped-data', `pipeline-results-${Date.now()}.json`);
        await fs.writeJson(outputFile, {
            timestamp: new Date().toISOString(),
            results: results
        }, { spaces: 2 });

        console.log(chalk.gray(`Results saved to: ${outputFile}\n`));

        return results;

    } catch (error) {
        console.error(chalk.red('\n❌ Pipeline error:'), error.message);
        throw error;
    }
}

// CLI Interface
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || 
                     process.argv[1].includes('pipeline.js') ||
                     process.argv[1].endsWith('pipeline.js');

if (isMainModule) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function question(prompt) {
        return new Promise(resolve => {
            rl.question(prompt, resolve);
        });
    }

    async function main() {
        await loadEnv();
        
        console.log(chalk.cyan('\n🚀 Automated Business Site Generator\n'));

        const apiKey = process.env.GOOGLE_PLACES_API_KEY || await question('Enter Google Places API key: ');
        
        if (!apiKey) {
            console.log(chalk.red('❌ API key is required'));
            rl.close();
            process.exit(1);
        }

        const location = process.argv[2] || await question('Enter location (address or lat,lng): ');
        const type = process.argv[3] || await question('Enter business type (restaurant, bar, cafe, etc.) [restaurant]: ') || 'restaurant';
        const maxBusinesses = parseInt(process.argv[4]) || parseInt(await question('Max businesses to process [10]: ') || '10');

        rl.close();

        await runAutomatedPipeline({
            apiKey,
            location,
            type,
            maxBusinesses,
            skipExisting: true,
            autoGenerate: true
        });
    }

    main().catch(err => {
        console.error(chalk.red('\n❌ Fatal error:'), err);
        process.exit(1);
    });
}

