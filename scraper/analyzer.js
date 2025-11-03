#!/usr/bin/env node

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import {
    extractColors,
    extractBusinessName,
    extractContactInfo,
    extractSocialLinks,
    extractLogo,
    extractServices,
    extractHours,
    extractImages,
    extractAboutText,
    generateSlug
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main scraper function
 */
async function scrapeWebsite(url) {
    console.log(chalk.blue(`\n🔍 Analyzing website: ${url}\n`));

    let browser;
    let page;

    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Navigate to page
        console.log(chalk.gray('Loading page...'));
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Get page content
        const html = await page.content();
        const $ = cheerio.default ? cheerio.default.load(html) : cheerio.load(html);

        // Extract data
        console.log(chalk.gray('Extracting data...'));
        
        const businessName = extractBusinessName($);
        const colors = await extractColors($, page);
        const contact = extractContactInfo($);
        const socialLinks = extractSocialLinks($);
        const logoUrl = extractLogo($, url);
        const services = extractServices($);
        const images = extractImages($, url);
        const hours = extractHours($);

        // Download logo if found
        let logoPath = null;
        if (logoUrl) {
            console.log(chalk.gray(`Downloading logo from ${logoUrl}...`));
            try {
                const response = await page.goto(logoUrl, { waitUntil: 'networkidle0' });
                const buffer = await response.buffer();
                
                const logoDir = path.join(__dirname, '..', '.scraped-data', 'logos');
                await fs.ensureDir(logoDir);
                
                const logoExt = path.extname(new URL(logoUrl).pathname) || '.png';
                logoPath = path.join(logoDir, `logo${logoExt}`);
                await fs.writeFile(logoPath, buffer);
                console.log(chalk.green('✓ Logo downloaded'));
            } catch (e) {
                console.log(chalk.yellow('⚠ Could not download logo:', e.message));
            }
        }

        // Compile extracted data
        const extractedData = {
            sourceUrl: url,
            businessName: businessName,
            businessSlug: generateSlug(businessName),
            businessTagline: $('meta[property="og:description"]').attr('content') || 
                            $('meta[name="description"]').attr('content') || 
                            'Welcome to ' + businessName,
            businessDescription: $('meta[name="description"]').attr('content') || 
                                $('meta[property="og:description"]').attr('content') || 
                                `${businessName} - Your trusted local business`,
            colors: colors,
            contact: contact,
            socialLinks: socialLinks,
            logoUrl: logoUrl,
            logoPath: logoPath,
            services: services,
            hours: extractHours($),
            images: images,
            aboutText: extractAboutText($) || `${businessName} - Your trusted local business`
        };

        // Save extracted data
        const outputDir = path.join(__dirname, '..', '.scraped-data');
        await fs.ensureDir(outputDir);
        
        const outputFile = path.join(outputDir, `${extractedData.businessSlug}.json`);
        await fs.writeJson(outputFile, extractedData, { spaces: 2 });

        console.log(chalk.green(`\n✓ Extraction complete!`));
        console.log(chalk.blue(`\n📄 Data saved to: ${outputFile}\n`));
        
        console.log(chalk.cyan('Extracted Information:'));
        console.log(`  Business Name: ${extractedData.businessName}`);
        console.log(`  Primary Color: ${extractedData.colors.primaryColor}`);
        console.log(`  Phone: ${extractedData.contact.phone || 'Not found'}`);
        console.log(`  Email: ${extractedData.contact.email || 'Not found'}`);
        console.log(`  Services: ${extractedData.services.length}`);
        console.log(`  Social Links: ${extractedData.socialLinks.length}\n`);

        await browser.close();
        return extractedData;

    } catch (error) {
        console.error(chalk.red('\n❌ Error scraping website:'), error.message);
        if (browser) {
            await browser.close();
        }
        throw error;
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('analyzer.js')) {
    const url = process.argv[2];
    
    if (!url) {
        console.log(chalk.red('❌ Please provide a URL to scrape'));
        console.log(chalk.yellow('\nUsage: node scraper/analyzer.js <url>\n'));
        process.exit(1);
    }

    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        console.log(chalk.red('❌ Invalid URL provided'));
        process.exit(1);
    }

    scrapeWebsite(url).catch(err => {
        console.error(chalk.red('\n❌ Fatal error:'), err);
        process.exit(1);
    });
}

export { scrapeWebsite };

