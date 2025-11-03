# How to Generate a New Website

This document explains the complete process for generating a new small business website.

## Quick Start

To generate a website for a new business, run these commands:

```bash
# 1. Scrape the existing website (if they have one)
npm run scrape <URL>

# 2. Generate the website from scraped data
npm run generate <business-slug>

# The sites portfolio page (sites.html) will be auto-updated
```

## Detailed Steps

### Step 1: Scrape Website Data

If the business has an existing website, scrape it to extract:
- Business name, tagline, description
- Logo (automatically filters out hosting platform logos like Toast, Squarespace)
- Colors from their site
- Contact information (phone, email, address)
- Services/products
- Hours of operation
- Images (hero images, food photos, etc.)
- Social media links

**Command:**
```bash
npm run scrape https://example-business.com
```

This saves the data to `.scraped-data/<business-slug>.json`

### Step 2: Review/Edit Scraped Data (Optional)

If needed, you can edit the JSON file in `.scraped-data/` to:
- Add missing services
- Improve hours formatting
- Fix contact information
- Add better descriptions

### Step 3: Generate the Website

**Command:**
```bash
npm run generate <business-slug>
```

The business slug is automatically generated from the business name (e.g., "Joe's Pizza" → "joe-s-pizza"), or you can check the `.scraped-data/` folder for the exact filename.

This will:
- Generate HTML, CSS, and JS files in `websites/sites/<business-slug>/`
- Copy the logo to the assets folder
- Create/update `customer.json` for status tracking
- **Automatically rebuild** `sites.html` to include the new site

### Step 4: View Locally

Start the local server:
```bash
npm run serve
```

Then view:
- Homepage: http://localhost:8080/
- Sites Portfolio: http://localhost:8080/sites
- Your new site: http://localhost:8080/site/<business-slug>

## If Business Has No Existing Website

If the business doesn't have a website, you can:

1. **Use Google Places API** (automated pipeline):
   ```bash
   npm run pipeline
   ```
   This finds nearby businesses, checks if they have websites, and generates sites for those without one.

2. **Manual Data Entry**: Create a JSON file in `.scraped-data/` with the business information, then run `npm run generate`.

## File Structure

After generation, each business has:

```
websites/sites/<business-slug>/
├── index.html          # Generated website
├── styles.css          # Generated styles
├── script.js           # Generated JavaScript
├── assets/
│   └── logo.png (or .svg)
├── customer.json       # Status tracking
└── data/
    └── scraped-data.json
```

## Key Files

- **Scraper**: `scraper/analyzer.js` - Extracts data from existing websites
- **Generator**: `generator/index.js` - Builds websites from data
- **Templates**: `templates/base/` - HTML/CSS/JS templates
- **Sites Page Builder**: `scripts/build-index.js` - Auto-updates portfolio

## Troubleshooting

### Logo Shows Hosting Platform Logo
- The scraper now filters out common hosting platform logos (Toast, Squarespace, Wix)
- If it still picks the wrong logo, manually edit `.scraped-data/<slug>.json` and set `logoUrl: null` or provide the correct logo URL

### Hours Look Bad
- The hours extraction is basic - you may need to manually format them in the JSON file before generating

### Site Not Showing in Portfolio
- Run `npm run build-sites` manually to rebuild the sites page
- Or regenerate the site (it auto-updates now)

### Need to Add More Sections
- Edit the template in `templates/base/index.html`
- Add new sections as needed (catering, events, etc.)
- Then regenerate: `npm run generate <slug>`

## Automation Status

✅ **Automated:**
- Logo extraction (filters platform logos)
- Sites page auto-update
- Customer data tracking
- File generation

⚠️ **Semi-Automated:**
- Service extraction (may need manual additions)
- Hours formatting (may need cleanup)

❌ **Manual:**
- Reviewing scraped data for accuracy
- Adding custom sections
- Final content polish

## Next Steps After Generation

1. Review the generated site locally
2. Make any needed adjustments to the data file
3. Regenerate if changes made
4. Demo the site to the business
5. Track outreach and responses in `customer.json`

