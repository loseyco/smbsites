# Site Isolation & Static Generation

## How Sites Are Isolated

**Every generated site is completely static and independent.** Once a site is generated, it will NOT be affected by:

- ✅ Template changes
- ✅ Adding new sites
- ✅ Generator updates
- ✅ Any modifications to the codebase

## How It Works

### 1. **Full Static Generation**

When you run `npm run generate <slug>`, the generator:

1. **Reads the template** from `templates/base/` (one-time read)
2. **Renders all template variables** into final HTML/CSS/JS
3. **Writes complete static files** to `websites/sites/<slug>/`
4. **Never touches that site again** unless you explicitly regenerate it

### 2. **Complete File Output**

Each site gets:
```
websites/sites/<slug>/
├── index.html      ← Fully rendered, no template tags
├── styles.css      ← All CSS variables replaced with actual colors
├── script.js       ← Complete JavaScript (no templating)
└── assets/
    └── logo.png    ← Copied logo file
```

**These files are 100% static HTML/CSS/JS** - they could work on any web server, no build process needed.

### 3. **No Shared Dependencies**

- ✅ Each site has its own `index.html` (not shared)
- ✅ Each site has its own `styles.css` with embedded colors
- ✅ Each site has its own `script.js`
- ✅ Assets are copied (not linked)
- ✅ No shared code or templates after generation

### 4. **Template Tag Removal**

The template engine ensures:
- All `{{#if}}...{{/if}}` blocks are fully processed
- All `{{#each}}...{{/each}}` loops are expanded
- All `{{variable}}` placeholders are replaced
- **Any remaining template tags are stripped** as a safety net

## Verification

You can verify site isolation by:

1. **Generating a site**:
   ```bash
   npm run generate shawdaddy-s-llc
   ```

2. **Checking the output**:
   ```bash
   cat websites/sites/shawdaddy-s-llc/index.html
   ```
   Should see NO `{{` tags anywhere

3. **Modifying the template**:
   - Change something in `templates/base/index.html`
   - Check the generated site - **it won't change**
   - Only regenerating will pick up template changes

4. **Deploy independently**:
   - Copy `websites/sites/<slug>/` to any web server
   - Works standalone, no dependencies

## Important Notes

⚠️ **To update an existing site with new templates:**
- You must explicitly regenerate: `npm run generate <slug>`
- The old version remains unchanged until you regenerate
- This is intentional - prevents breaking live sites

⚠️ **Template updates are opt-in:**
- Change templates all you want
- Existing sites stay the same
- Regenerate only when you want to update a specific site

## Best Practices

1. **Before deploying a site to production:**
   - Verify it has no template tags: `grep -r "{{" websites/sites/<slug>/`
   - Should return nothing

2. **For production sites:**
   - Consider copying the site to a separate "production" directory
   - Never regenerate production sites from templates
   - Make manual edits to HTML/CSS if needed

3. **For development:**
   - Generate test sites freely
   - Templates can evolve
   - Regenerate test sites to see template changes

