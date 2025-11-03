# Customer Management System

## New Structure

All websites are now organized as **customers** with complete tracking information.

### Directory Structure

```
customers/
└── [customer-slug]/
    ├── customer.json          # Customer metadata & status tracking
    ├── website/               # Generated website files
    │   ├── index.html
    │   ├── styles.css
    │   ├── script.js
    │   └── assets/
    │       └── logo.png
    └── data/                  # Source data
        └── scraped-data.json
```

### Customer JSON Schema

Each customer has a `customer.json` with:

- **Status**: `pending`, `contacted`, `interested`, `active`, `declined`, `on-hold`
- **Contact Info**: Phone, email, address, contact dates
- **Website Info**: Preview URL, local URL, deployment status
- **Generated Info**: When generated, data source, features
- **Outreach**: When contacted, method, response
- **Billing**: Monthly rate, payment dates, active status
- **Notes**: Custom notes for each customer

## Usage

### View All Customers

```bash
npm run customers
```

### Filter by Status

```bash
npm run customers pending
npm run customers active
npm run customers interested
```

### Update Customer Status

```bash
npm run update-status patton-block-grill-brew-pub contacted
npm run update-status patton-block-grill-brew-pub interested "outreach.responseDate:2025-01-15"
npm run update-status patton-block-grill-brew-pub active "billing.monthlyRate:50" "billing.startDate:2025-01-01"
```

### Migrate Existing Sites

To move existing sites from `sites/` to `customers/`:

```bash
npm run migrate
```

## Local Viewing

Sites are accessible locally at:
- `http://localhost:8080/customers/[customer-slug]/website/`

Example:
- `http://localhost:8080/customers/patton-block-grill-brew-pub/website/`

## Deployment URLs

When deployed to Vercel:
- `https://[customer-slug].websites.losey.co`

The Vercel API routes subdomains to `/customers/[slug]/website/`

## Benefits

✅ **Separate tracking** for each customer  
✅ **Status management** - easy to see who's contacted, interested, active  
✅ **Billing tracking** - monthly rates and payment dates  
✅ **Complete history** - all data stored per customer  
✅ **Easy to filter** - find pending customers, active ones, etc.  
✅ **Organized structure** - website files separate from metadata  

