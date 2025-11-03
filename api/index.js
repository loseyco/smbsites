/**
 * Vercel serverless function to handle subdomain routing
 * Routes subdomains to corresponding site folders in /sites/
 * 
 * For static files (CSS, JS, images), Vercel serves them directly.
 * This function handles the main HTML routing.
 */

export default async function handler(req, res) {
    try {
        const host = req.headers.host || '';
        const urlParts = host.split('.');
        const subdomain = urlParts[0];
        const pathname = req.url || '/';

        // If no subdomain or it's the main domain, serve landing or redirect
        if (!subdomain || subdomain === 'websites' || subdomain === 'www') {
            return res.status(404).json({ 
                message: 'No subdomain specified. Use [business-name].websites.losey.co',
                example: 'restaurant-name.websites.losey.co'
            });
        }

        // For root path, serve index.html by rewriting to the site folder
        if (pathname === '/' || pathname === '/index.html') {
            // Rewrite to serve static file from /site/[slug] structure
            return res.rewrite(`/websites/sites/${subdomain}/index.html`);
        }

        // For other paths, rewrite to the site folder
        // Vercel will handle serving CSS, JS, and image files as static assets
        return res.rewrite(`/websites/sites/${subdomain}${pathname}`);

    } catch (error) {
        console.error('Routing error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}
