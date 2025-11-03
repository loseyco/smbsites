/**
 * Utility functions for web scraping and data extraction
 */

/**
 * Extract colors from CSS stylesheets and inline styles
 */
export function extractColors($, page) {
    const colors = new Set();
    
    // Extract from inline styles
    $('[style*="color"], [style*="background"]').each((i, elem) => {
        const style = $(elem).attr('style') || '';
        const colorMatches = style.match(/#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g);
        if (colorMatches) {
            colorMatches.forEach(color => colors.add(color));
        }
    });

    // Extract from stylesheets (requires page context)
    if (page) {
        try {
            const stylesheets = page.querySelectorAll('style, link[rel="stylesheet"]');
            stylesheets.forEach(sheet => {
                if (sheet.textContent) {
                    const cssMatches = sheet.textContent.match(/#[0-9A-Fa-f]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g);
                    if (cssMatches) {
                        cssMatches.forEach(color => colors.add(color));
                    }
                }
            });
        } catch (e) {
            console.warn('Could not extract colors from stylesheets:', e.message);
        }
    }

    // Convert hex colors to standard format and filter common defaults
    const colorArray = Array.from(colors)
        .filter(color => {
            const normalized = color.toLowerCase();
            return !['#fff', '#ffffff', '#000', '#000000', '#transparent'].includes(normalized);
        })
        .slice(0, 5); // Limit to 5 colors

    // Find primary and secondary colors (first two distinct colors)
    return {
        primaryColor: colorArray[0] || '#333333',
        secondaryColor: colorArray[1] || '#666666',
        accentColor: colorArray[2] || '#ff6b6b',
        textColor: '#333333',
        bgColor: '#ffffff'
    };
}

/**
 * Extract business name from page
 */
export function extractBusinessName($) {
    // Try multiple selectors
    const selectors = [
        'h1',
        '.logo',
        '[class*="logo"]',
        'title',
        'meta[property="og:title"]',
        '[class*="brand"]',
        '[class*="business-name"]'
    ];

    for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length) {
            let text = element.text() || element.attr('content') || element.attr('alt');
            if (text) {
                // Clean up the text
                text = text.trim().split('\n')[0].split('|')[0].split('-')[0].trim();
                if (text.length > 3 && text.length < 100) {
                    return text;
                }
            }
        }
    }

    return 'Business Name';
}

/**
 * Extract contact information
 */
export function extractContactInfo($) {
    const contact = {
        phone: null,
        email: null,
        address: null
    };

    const bodyText = $('body').text();

    // Extract phone (common patterns)
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    const phoneMatch = bodyText.match(phoneRegex);
    if (phoneMatch) {
        contact.phone = phoneMatch[0];
    }

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = bodyText.match(emailRegex);
    if (emailMatch) {
        contact.email = emailMatch[0];
    }

    // Extract address (look for common address patterns)
    const addressSelectors = [
        '[class*="address"]',
        '[class*="location"]',
        '[itemprop="address"]',
        'address'
    ];

    for (const selector of addressSelectors) {
        const element = $(selector).first();
        if (element.length) {
            let addr = element.text().trim();
            if (addr.length > 10 && addr.length < 200) {
                contact.address = addr;
                break;
            }
        }
    }

    return contact;
}

/**
 * Extract social media links
 */
export function extractSocialLinks($) {
    const socialLinks = [];
    const platforms = {
        'facebook.com': 'Facebook',
        'twitter.com': 'Twitter',
        'instagram.com': 'Instagram',
        'linkedin.com': 'LinkedIn',
        'youtube.com': 'YouTube',
        'tiktok.com': 'TikTok'
    };

    $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) {
            for (const [domain, platform] of Object.entries(platforms)) {
                if (href.includes(domain)) {
                    socialLinks.push({
                        platform: platform,
                        url: href.startsWith('http') ? href : `https://${href}`
                    });
                    break;
                }
            }
        }
    });

    return socialLinks;
}

/**
 * Extract logo image URL (excludes hosting platform logos)
 */
export function extractLogo($, baseUrl) {
    // Blacklist of hosting platform domains/logos to exclude
    const platformBlacklist = [
        'toast', 'squarespace', 'wix', 'shopify', 'wordpress.com',
        'cloudfront', 'cdn', 'logo-filled', 'icon-filled'
    ];

    const logoSelectors = [
        'img[class*="logo"]:not([src*="toast"]):not([src*="squarespace"]):not([src*="wix"])',
        '.logo img',
        '[class*="brand"] img',
        'header img',
        '.header img',
        'img[alt*="logo"]:not([alt*="Toast"]):not([alt*="Squarespace"])',
        'img[alt*="Logo"]:not([alt*="Toast"])',
        '[data-logo] img',
        '[data-brand] img'
    ];

    for (const selector of logoSelectors) {
        const img = $(selector).first();
        if (img.length) {
            let src = img.attr('src') || img.attr('data-src');
            if (src) {
                // Skip if it's a platform logo
                const srcLower = src.toLowerCase();
                if (platformBlacklist.some(platform => srcLower.includes(platform))) {
                    continue; // Skip this one, try next
                }

                // Handle relative URLs
                if (src.startsWith('//')) {
                    src = 'https:' + src;
                } else if (src.startsWith('/')) {
                    const url = new URL(baseUrl);
                    src = url.origin + src;
                } else if (!src.startsWith('http')) {
                    const url = new URL(baseUrl);
                    src = url.origin + '/' + src;
                }
                
                // Final check - skip if still contains platform indicators
                const finalSrcLower = src.toLowerCase();
                if (!platformBlacklist.some(platform => finalSrcLower.includes(platform))) {
                    return src;
                }
            }
        }
    }

    // Fallback: look for images in header/nav that aren't platform logos
    $('header img, nav img, .navbar img').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src) {
            const srcLower = src.toLowerCase();
            if (!platformBlacklist.some(platform => srcLower.includes(platform))) {
                // Handle relative URLs
                let fullSrc = src;
                if (src.startsWith('//')) {
                    fullSrc = 'https:' + src;
                } else if (src.startsWith('/')) {
                    const url = new URL(baseUrl);
                    fullSrc = url.origin + src;
                } else if (!src.startsWith('http')) {
                    const url = new URL(baseUrl);
                    fullSrc = url.origin + '/' + src;
                }
                return fullSrc;
            }
        }
    });

    return null;
}

/**
 * Extract services or products
 */
export function extractServices($) {
    const services = [];
    
    // Look for common service/product section selectors
    const sectionSelectors = [
        '[class*="service"]',
        '[class*="product"]',
        '[class*="menu"]',
        '[id*="service"]',
        '[id*="product"]'
    ];

    for (const selector of sectionSelectors) {
        const elements = $(selector).slice(0, 10); // Limit to 10 items
        if (elements.length > 0) {
            elements.each((i, elem) => {
                const heading = $(elem).find('h2, h3, h4, .title').first().text().trim();
                const description = $(elem).text().replace(heading, '').trim().substring(0, 200);
                
                if (heading && heading.length > 3) {
                    services.push({
                        name: heading,
                        description: description || 'Service description'
                    });
                }
            });
            
            if (services.length > 0) break;
        }
    }

    return services.slice(0, 6); // Limit to 6 services
}

/**
 * Extract business hours
 */
export function extractHours($) {
    const hoursSelectors = [
        '[class*="hour"]',
        '[class*="time"]',
        '[id*="hour"]',
        'time'
    ];

    for (const selector of hoursSelectors) {
        const element = $(selector).first();
        if (element.length) {
            const hours = element.text().trim();
            if (hours.length > 5 && hours.length < 200) {
                return hours;
            }
        }
    }

    return null;
}

/**
 * Extract images from website (hero images, food photos, etc.)
 */
export function extractImages($, baseUrl) {
    const images = [];
    
    // Look for hero images, banner images, food photos
    const imageSelectors = [
        'img[class*="hero"]',
        'img[class*="banner"]',
        'img[class*="food"]',
        'img[class*="menu"]',
        'img[alt*="food"]',
        'img[alt*="restaurant"]',
        '.hero img',
        '.banner img',
        '[class*="gallery"] img',
        '[class*="carousel"] img'
    ];
    
    $(imageSelectors.join(', ')).each((i, elem) => {
        if (i >= 6) return false; // Limit to 6 images
        
        let src = $(elem).attr('src') || $(elem).attr('data-src');
        if (!src) return;
        
        // Skip logos and tiny images
        const alt = $(elem).attr('alt') || '';
        if (alt.toLowerCase().includes('logo') || src.includes('logo')) return;
        
        // Handle relative URLs
        if (src.startsWith('//')) {
            src = 'https:' + src;
        } else if (src.startsWith('/')) {
            const url = new URL(baseUrl);
            src = url.origin + src;
        } else if (!src.startsWith('http')) {
            const url = new URL(baseUrl);
            src = url.origin + '/' + src;
        }
        
        // Skip data URLs and very small images
        if (!src.startsWith('data:') && !src.includes('icon') && !src.includes('avatar')) {
            images.push({
                url: src,
                alt: alt || 'Business image',
                type: alt.toLowerCase().includes('food') ? 'food' : 'hero'
            });
        }
    });
    
    return images.slice(0, 6);
}

/**
 * Extract about text
 */
export function extractAboutText($) {
    const aboutSelectors = [
        '[class*="about"] p',
        '[id*="about"] p',
        '.description',
        '[class*="description"]',
        'section p'
    ];
    
    for (const selector of aboutSelectors) {
        const element = $(selector).first();
        if (element.length) {
            const text = element.text().trim();
            if (text.length > 50 && text.length < 500) {
                return text;
            }
        }
    }
    
    return null;
}

/**
 * Generate slug from business name
 */
export function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

