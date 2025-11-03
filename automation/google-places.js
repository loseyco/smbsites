/**
 * Google Places API integration for finding local businesses
 */

// Uses built-in fetch (Node.js 18+) or global fetch
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find businesses near a location using Google Places API
 */
export async function findLocalBusinesses(options) {
    const {
        apiKey,
        location, // "latitude,longitude" or address
        radius = 5000, // radius in meters
        type = 'restaurant', // business type
        keyword = '', // additional search keyword
        maxResults = 20
    } = options;

    if (!apiKey) {
        throw new Error('Google Places API key is required');
    }

    console.log(chalk.blue(`\n🔍 Searching for ${type} businesses near ${location}...\n`));

    const businesses = [];
    let nextPageToken = null;
    let totalFound = 0;

    do {
        try {
            // Build API request - Using Places API (New)
            // For addresses, use text search. For coordinates, use searchNearby
            let lat, lng;
            let useTextSearch = false;
            
            if (location.includes(',')) {
                const parts = location.split(',').map(s => s.trim());
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    // It's coordinates
                    [lat, lng] = parts.map(Number);
                } else {
                    // It's an address with commas - use text search
                    useTextSearch = true;
                }
            } else {
                // It's an address - use text search
                useTextSearch = true;
            }

            if (useTextSearch) {
                // Use text search API for addresses
                return await searchBusinessesByText(apiKey, `${type} in ${location}`, null);
            }

            let url = `https://places.googleapis.com/v1/places:searchNearby`;
            
            const requestBody = {
                includedTypes: [type],
                maxResultCount: Math.min(maxResults, 20),
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: lat,
                            longitude: lng
                        },
                        radius: radius
                    }
                }
            };

            if (keyword) {
                requestBody.textQuery = keyword;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.websiteUri,places.nationalPhoneNumber,places.businessStatus'
                },
                body: JSON.stringify(requestBody)
            });

            // Note: Pagination handling removed for simplicity - new API handles this differently
            // You can add pagination token support if needed

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: await response.text() };
                }
                throw new Error(`Google Places API error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();

            if (data.places && data.places.length > 0) {
                for (const place of data.places) {
                    const business = {
                        name: place.displayName?.text || 'Unknown',
                        placeId: place.id,
                        address: place.formattedAddress || '',
                        location: {
                            lat: place.location?.latitude || 0,
                            lng: place.location?.longitude || 0
                        },
                        rating: place.rating || null,
                        types: place.types || [],
                        website: place.websiteUri || null,
                        phone: place.nationalPhoneNumber || null,
                        businessStatus: place.businessStatus || 'OPERATIONAL'
                    };

                    // Get additional details if needed
                    try {
                        const details = await getPlaceDetails(apiKey, place.id);
                        if (!business.website && details.website) business.website = details.website;
                        if (!business.phone && details.formatted_phone_number) business.phone = details.formatted_phone_number;
                        business.email = details.email;
                        business.hours = details.opening_hours;
                    } catch (e) {
                        // Continue without additional details
                    }

                    businesses.push(business);
                    totalFound++;

                    if (totalFound >= maxResults) {
                        nextPageToken = null;
                        break;
                    }

                    // Rate limiting - be nice to the API
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Note: Pagination for new API handled differently
            nextPageToken = null; // Simplified - can add pagination later if needed

        } catch (error) {
            console.error(chalk.red(`Error fetching businesses: ${error.message}`));
            break;
        }
    } while (nextPageToken && totalFound < maxResults);

    console.log(chalk.green(`\n✓ Found ${businesses.length} businesses\n`));

    // Save results
    const outputDir = path.join(__dirname, '..', '.scraped-data', 'google-places');
    await fs.ensureDir(outputDir);
    
    const outputFile = path.join(outputDir, `businesses-${Date.now()}.json`);
    await fs.writeJson(outputFile, {
        searchParams: options,
        businesses: businesses,
        timestamp: new Date().toISOString()
    }, { spaces: 2 });

    console.log(chalk.blue(`📄 Results saved to: ${outputFile}\n`));

    return businesses;
}

/**
 * Get detailed information about a place
 */
async function getPlaceDetails(apiKey, placeId) {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'websiteUri,nationalPhoneNumber,emailAddress,regularOpeningHours,formattedAddress'
        }
    });

    if (!response.ok) {
        throw new Error(`Place details error: ${response.status}`);
    }

    const result = await response.json();
    return {
        website: result.websiteUri || null,
        formatted_phone_number: result.nationalPhoneNumber || null,
        email: result.emailAddress || null,
        opening_hours: result.regularOpeningHours ? {
            open_now: result.regularOpeningHours.openNow || false,
            weekday_text: result.regularOpeningHours.weekdayDescriptions || []
        } : null,
        formatted_address: result.formattedAddress || null
    };
}

/**
 * Search for businesses by text query
 */
export async function searchBusinessesByText(apiKey, query, location = null) {
    console.log(chalk.blue(`\n🔍 Searching for: "${query}"...\n`));

    const url = `https://places.googleapis.com/v1/places:searchText`;

    const requestBody = {
        textQuery: query,
        maxResultCount: 20
    };

    if (location && location.includes(',')) {
        const [lat, lng] = location.split(',').map(Number);
        requestBody.locationBias = {
            circle: {
                center: { latitude: lat, longitude: lng },
                radius: 5000
            }
        };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.websiteUri,places.nationalPhoneNumber'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { error: await response.text() };
        }
        throw new Error(`Google Places API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    const businesses = (data.places || []).map(place => ({
        name: place.displayName?.text || 'Unknown',
        placeId: place.id,
        address: place.formattedAddress || '',
        location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0
        },
        rating: place.rating || null,
        website: place.websiteURI || null,
        phone: place.nationalPhoneNumber || null
    }));

    console.log(chalk.green(`✓ Found ${businesses.length} businesses\n`));
    return businesses;
}

