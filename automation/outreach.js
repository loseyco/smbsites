#!/usr/bin/env node

/**
 * Outreach automation - Generate email and social media messages with site links
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate outreach message for a business
 */
export function generateOutreachMessage(businessName, siteUrl, options = {}) {
    const {
        type = 'email', // 'email' or 'social'
        tone = 'professional', // 'professional', 'friendly', 'casual'
        includePricing = true
    } = options;

    const messages = {
        email: {
            professional: {
                subject: `Modern Website Created for ${businessName}`,
                body: `Hello,

I noticed ${businessName} could benefit from a modern, mobile-friendly website. I've created a sample website for you to review:

${siteUrl}

This is a completely free, no-obligation preview. The site is:
- Mobile-first and fast-loading
- Modern and professional design
- Ready to help attract more customers

If you like what you see, we can make it live on your domain for a low monthly fee that includes hosting and updates. No upfront costs.

Would you like to schedule a quick call to discuss?

Best regards`
            },
            friendly: {
                subject: `I Built You a Free Website Preview!`,
                body: `Hi there!

I'm a local web developer, and I thought ${businessName} deserved a better website. So I built you one for free to check out:

${siteUrl}

Take a look when you get a chance - it's mobile-friendly, loads fast, and looks modern. If you like it, we can make it live on your domain. I charge a small monthly fee (much less than you'd think) that covers hosting and any updates you need.

No pressure, just wanted to show you what's possible!

Thanks,
[Your Name]`
            },
            casual: {
                subject: `Check out your new website preview!`,
                body: `Hey!

I built ${businessName} a quick website preview - check it out:

${siteUrl}

It's mobile-friendly and looks pretty good if I do say so myself! 😊

If you dig it, we can make it live. Super affordable monthly rate that includes everything.

Let me know what you think!

Cheers`
            }
        },
        social: {
            professional: {
                message: `I've created a modern website preview for ${businessName}. Check it out: ${siteUrl} - Mobile-friendly, fast, and ready to help grow your business!`
            },
            friendly: {
                message: `Just built a free website preview for ${businessName}! Take a look: ${siteUrl} - Mobile-friendly and ready to go! 🚀`
            },
            casual: {
                message: `Check out this website I made for ${businessName}! ${siteUrl} - Mobile-friendly and looking good! 😊`
            }
        }
    };

    return messages[type][tone];
}

/**
 * Generate outreach CSV for import into email/social tools
 */
export async function generateOutreachCSV(results, outputFile) {
    const csvRows = [];
    
    // Header
    csvRows.push('Business Name,Website URL,Email,Phone,Address,Outreach Email Subject,Outreach Email Body,Social Media Message');

    for (const result of results) {
        if (result.status !== 'success') continue;

        const emailMsg = generateOutreachMessage(result.business, result.url, { type: 'email', tone: 'friendly' });
        const socialMsg = generateOutreachMessage(result.business, result.url, { type: 'social', tone: 'friendly' });

        // Escape quotes and newlines for CSV
        const escapeCSV = (str) => {
            if (!str) return '';
            return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        };

        csvRows.push([
            escapeCSV(result.business),
            result.url,
            result.email || '',
            result.phone || '',
            result.address || '',
            escapeCSV(emailMsg.subject),
            escapeCSV(emailMsg.body),
            escapeCSV(socialMsg.message)
        ].join(','));
    }

    const csvContent = csvRows.join('\n');
    
    if (!outputFile) {
        outputFile = path.join(__dirname, '..', '.scraped-data', `outreach-${Date.now()}.csv`);
    }

    await fs.writeFile(outputFile, csvContent);
    console.log(chalk.green(`✓ Outreach CSV generated: ${outputFile}\n`));

    return outputFile;
}

/**
 * Generate individual outreach files for each business
 */
export async function generateIndividualOutreachFiles(results, outputDir) {
    if (!outputDir) {
        outputDir = path.join(__dirname, '..', '.scraped-data', 'outreach');
    }
    await fs.ensureDir(outputDir);

    const files = [];

    for (const result of results) {
        if (result.status !== 'success') continue;

        const emailMsg = generateOutreachMessage(result.business, result.url, { type: 'email', tone: 'friendly' });
        const socialMsg = generateOutreachMessage(result.business, result.url, { type: 'social', tone: 'friendly' });

        const filename = result.slug || result.business.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const filepath = path.join(outputDir, `${filename}-outreach.txt`);

        const content = `OUTREACH FOR: ${result.business}
Website URL: ${result.url}

═══════════════════════════════════════════
EMAIL TEMPLATE
═══════════════════════════════════════════

Subject: ${emailMsg.subject}

${emailMsg.body}

═══════════════════════════════════════════
SOCIAL MEDIA TEMPLATE
═══════════════════════════════════════════

${socialMsg.message}

`;

        await fs.writeFile(filepath, content);
        files.push(filepath);
    }

    console.log(chalk.green(`✓ Generated ${files.length} outreach files in ${outputDir}\n`));
    return files;
}

// CLI Interface
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || 
                     process.argv[1].includes('outreach.js') ||
                     process.argv[1].endsWith('outreach.js');

if (isMainModule) {
    const resultsFile = process.argv[2];

    if (!resultsFile) {
        console.log(chalk.red('❌ Please provide a pipeline results JSON file'));
        console.log(chalk.yellow('\nUsage: node automation/outreach.js <results-file.json>\n'));
        process.exit(1);
    }

    (async () => {
        try {
            const resultsPath = path.isAbsolute(resultsFile) 
                ? resultsFile 
                : path.join(__dirname, '..', '.scraped-data', resultsFile);
            
            const data = await fs.readJson(resultsPath);
            const results = data.results || data;

            console.log(chalk.blue(`\n📧 Generating outreach materials for ${results.length} businesses...\n`));

            // Generate CSV
            await generateOutreachCSV(results);

            // Generate individual files
            await generateIndividualOutreachFiles(results);

            console.log(chalk.green('✓ Outreach materials generated!\n'));

        } catch (error) {
            console.error(chalk.red('\n❌ Error:'), error.message);
            process.exit(1);
        }
    })();
}

