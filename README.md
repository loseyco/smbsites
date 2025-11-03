# Small Business Website Generator

A Node.js tool for rapidly generating modern, mobile-first static websites for local businesses. Designed for affordable website creation and maintenance services.

## Features

- 🔍 **Web Scraping**: Automatically extracts business information, logos, colors, and images from existing websites
- 🎨 **Modern Design**: Professional, mobile-first templates inspired by successful small business websites
- 📱 **Responsive**: All generated sites are fully responsive and mobile-optimized
- 🚀 **Static Generation**: Completely static HTML/CSS/JS sites - fast, reliable, and easy to host
- 🎯 **Site Isolation**: Each generated site is completely independent - template changes won't break existing sites
- 📊 **Customer Management**: Built-in customer tracking and status management system
- 🤖 **Automation**: Automated pipeline for discovering businesses, scraping data, and generating sites

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file with your API keys:

```env
GOOGLE_PLACES_API_KEY=your_key_here
```

### Basic Usage

1. **Scrape a website:**
   ```bash
   npm run scrape https://example-business.com
   ```

2. **Generate a site:**
   ```bash
   npm run generate business-slug
   ```

3. **View locally:**
   ```bash
   npm run serve
   ```
   Then visit `http://localhost:8080/site/business-slug`

## Project Structure

```
SmallBusinessWebsites/
├── scraper/           # Web scraping tools
├── generator/         # Site generation engine
├── templates/         # HTML/CSS templates
├── automation/        # Automated pipelines
├── scripts/           # Utility scripts
├── websites/
│   └── sites/        # Generated client sites
└── .scraped-data/    # Scraped data storage
```

## Workflow

1. **Scrape** existing business website (if available) to extract:
   - Business name, description, tagline
   - Logo (filters out hosting platform logos)
   - Color scheme
   - Contact information
   - Services/products
   - Hours of operation
   - Images (hero, services, gallery)

2. **Generate** static website from scraped data:
   - Creates fully static HTML/CSS/JS
   - Each site is completely isolated
   - Auto-updates portfolio page (`sites.html`)

3. **Deploy** to Vercel with subdomain routing:
   - `business-slug.websites.losey.co`

## Site Isolation

**Every generated site is completely static and independent.** Once generated, sites will NOT be affected by:
- ✅ Template changes
- ✅ Adding new sites
- ✅ Generator updates
- ✅ Any modifications to the codebase

Each site is fully self-contained in `websites/sites/[business-slug]/` with all assets and no dependencies on templates.

## Customer Management

Each customer site includes a `customer.json` file for tracking:
- Business information
- Contact details
- Website generation status
- Outreach status
- Billing status

Use `npm run customers` to view all customers and their status.

## Available Scripts

- `npm run scrape <URL>` - Scrape a website
- `npm run generate <slug>` - Generate a website
- `npm run serve` - Start local development server
- `npm run pipeline` - Run automated pipeline
- `npm run customers` - List all customers
- `npm run update-status <slug> <status>` - Update customer status
- `npm run build-sites` - Rebuild sites portfolio page

## Technologies

- **Node.js** - Runtime
- **Puppeteer** - Web scraping
- **Cheerio** - HTML parsing
- **Vercel** - Hosting (with subdomain routing)

## License

ISC

## Contributing

This is a private project for generating small business websites as a service.
