#!/usr/bin/env node

/**
 * Build the main index.html page that lists all sites
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildSitesPage() {
    const sitesDir = path.join(__dirname, '..', 'websites', 'sites');
    const outputFile = path.join(__dirname, '..', 'sites.html');
    
    if (!await fs.pathExists(sitesDir)) {
        console.log(chalk.yellow('No sites directory found.\n'));
        return;
    }
    
    const siteFolders = (await fs.readdir(sitesDir))
        .filter(item => {
            const itemPath = path.join(sitesDir, item);
            return fs.statSync(itemPath).isDirectory();
        });
    
    const sites = [];
    
    for (const folder of siteFolders) {
        const customerFile = path.join(sitesDir, folder, 'customer.json');
        if (await fs.pathExists(customerFile)) {
            const customer = await fs.readJson(customerFile);
            sites.push({
                slug: folder,
                name: customer.businessName,
                status: customer.status || 'pending',
                url: `/site/${folder}`,
                previewUrl: `/site/${folder}/assets/logo.png`, // Will be fixed to use correct extension
                hasLogo: customer.generated?.hasLogo || false,
                generatedDate: customer.generated?.date || new Date().toISOString(),
                phone: customer.contact?.phone,
                address: customer.contact?.address
            });
        }
    }
    
    // Sort by status, then name
    sites.sort((a, b) => {
        const statusOrder = { 'active': 1, 'interested': 2, 'contacted': 3, 'pending': 4, 'declined': 5 };
        const aOrder = statusOrder[a.status] || 99;
        const bOrder = statusOrder[b.status] || 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
    });
    
    // Generate HTML
    const stats = {
        total: sites.length,
        active: sites.filter(s => s.status === 'active').length,
        interested: sites.filter(s => s.status === 'interested').length,
        contacted: sites.filter(s => s.status === 'contacted').length,
        pending: sites.filter(s => s.status === 'pending').length
    };
    
    const sitesHTML = sites.map(site => `
        <a href="${site.url}" class="site-card" data-status="${site.status}">
            <div class="site-card-header">
                <div>
                    <div class="site-name">${site.name}</div>
                </div>
                <span class="status-badge status-${site.status}">${site.status}</span>
            </div>
            <div class="site-preview">
                ${site.hasLogo ? `<img src="${site.previewUrl}" alt="${site.name}" onerror="this.parentElement.innerHTML='Preview';">` : 'Preview'}
            </div>
            <div class="site-info">
                ${site.phone ? `<div class="site-info-item">📞 ${site.phone}</div>` : ''}
                ${site.address ? `<div class="site-info-item">📍 ${site.address}</div>` : ''}
                <div class="site-info-item">Generated: ${new Date(site.generatedDate).toLocaleDateString()}</div>
                <a href="${site.previewUrl}" class="view-link">View Site →</a>
            </div>
        </a>
    `).join('');
    
    const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Small Business Websites - Portfolio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        header p {
            font-size: 1.2rem;
            opacity: 0.95;
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            display: block;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
        }
        
        .sites-container {
            padding: 2rem;
        }
        
        .sites-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        
        .site-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 1.5rem;
            border: 2px solid transparent;
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
        .site-card:hover {
            border-color: #667eea;
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .site-card-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 1rem;
        }
        
        .site-name {
            font-size: 1.3rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 0.5rem;
        }
        
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            white-space: nowrap;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-contacted {
            background: #cfe2ff;
            color: #084298;
        }
        
        .status-interested {
            background: #d1e7dd;
            color: #0f5132;
        }
        
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-declined {
            background: #f8d7da;
            color: #721c24;
        }
        
        .site-preview {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
            position: relative;
            overflow: hidden;
        }
        
        .site-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .site-info {
            font-size: 0.9rem;
            color: #666;
        }
        
        .site-info-item {
            margin: 0.25rem 0;
        }
        
        .view-link {
            display: inline-block;
            margin-top: 1rem;
            color: #667eea;
            font-weight: 600;
            text-decoration: none;
        }
        
        .view-link:hover {
            text-decoration: underline;
        }
        
        .filter-tabs {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 2rem;
        }
        
        .filter-tab {
            padding: 0.5rem 1rem;
            background: #f0f0f0;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .filter-tab:hover {
            background: #e0e0e0;
        }
        
        .filter-tab.active {
            background: #667eea;
            color: white;
        }
        
        .no-sites {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .site-card[data-status="declined"] {
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Small Business Websites</h1>
            <p>Modern, mobile-first websites for local businesses</p>
            <div class="stats">
                <div class="stat">
                    <span class="stat-number">${stats.total}</span>
                    <span class="stat-label">Total Sites</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${stats.active}</span>
                    <span class="stat-label">Active</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${stats.pending}</span>
                    <span class="stat-label">Pending</span>
                </div>
            </div>
        </header>
        
        <div class="sites-container">
            <div class="filter-tabs">
                <button class="filter-tab active" data-filter="all">All</button>
                <button class="filter-tab" data-filter="pending">Pending</button>
                <button class="filter-tab" data-filter="contacted">Contacted</button>
                <button class="filter-tab" data-filter="interested">Interested</button>
                <button class="filter-tab" data-filter="active">Active</button>
            </div>
            
            <div class="sites-grid" id="sites-grid">
                ${sitesHTML || '<div class="no-sites">No sites generated yet. Run the pipeline to create sites!</div>'}
            </div>
        </div>
    </div>
    
    <script>
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const filter = tab.dataset.filter;
                const cards = document.querySelectorAll('.site-card');
                cards.forEach(card => {
                    if (filter === 'all' || card.dataset.status === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    </script>
</body>
</html>`;
    
    await fs.writeFile(outputFile, indexHTML);
    console.log(chalk.green(`✓ Sites page built with ${sites.length} sites\n`));
}

// Export for use in generator
export { buildSitesPage };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
    buildSitesPage().catch(err => {
        console.error(chalk.red('Error:'), err);
        process.exit(1);
    });
}

