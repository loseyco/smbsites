/**
 * Simple template engine for replacing placeholders in templates
 */

/**
 * Replace placeholders in template string with data
 */
export function renderTemplate(template, data) {
    let result = template;

    // Helper to check if a value is truthy
    function isTruthy(value) {
        if (value === null || value === undefined || value === '') {
            return false;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return true;
    }

    // Process {{#each}} loops first
    let loopCount = 0;
    while (result.includes('{{#each') && loopCount < 10) {
        result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
            const array = getNestedValue(data, arrayName);
            if (!Array.isArray(array) || array.length === 0) {
                return '';
            }

            return array.map((item, index) => {
                let itemContent = content;
                
                // Process nested {{#if this.prop}} blocks in each loop
                let nestedCount = 0;
                while (itemContent.includes('{{#if this.') && nestedCount < 5) {
                    // Handle {{#if this.prop}}...{{else}}...{{/if}}
                    itemContent = itemContent.replace(/\{\{#if\s+this\.(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (m, prop, ifContent, elseContent) => {
                        if (isTruthy(item[prop])) {
                            return ifContent;
                        }
                        return elseContent || '';
                    });
                    
                    // Handle {{#if this.prop}}...{{/if}}
                    itemContent = itemContent.replace(/\{\{#if\s+this\.(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (m, prop, nestedContent) => {
                        if (isTruthy(item[prop])) {
                            return nestedContent;
                        }
                        return '';
                    });
                    nestedCount++;
                }
                
                // Replace {{this.property}}
                itemContent = itemContent.replace(/\{\{this\.(\w+)\}\}/g, (m, prop) => {
                    return item[prop] || '';
                });
                
                // Replace {{this.property.subproperty}}
                itemContent = itemContent.replace(/\{\{this\.(\w+)\.(\w+)\}\}/g, (m, prop1, prop2) => {
                    return (item[prop1] && item[prop1][prop2]) || '';
                });

                // Replace {{@index}}
                itemContent = itemContent.replace(/\{\{@index\}\}/g, index);

                return itemContent;
            }).join('');
        });
        loopCount++;
    }

    // Process top-level {{#if}} conditionals
    let ifCount = 0;
    while (result.includes('{{#if') && ifCount < 10) {
        // Process if/else blocks first
        const ifElseRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/;
        let ifElseMatch;
        
        while ((ifElseMatch = result.match(ifElseRegex)) !== null) {
            const [fullMatch, variable, ifContent, elseContent] = ifElseMatch;
            const value = getNestedValue(data, variable);
            const index = result.indexOf(fullMatch);
            
            if (isTruthy(value)) {
                result = result.substring(0, index) + ifContent + result.substring(index + fullMatch.length);
            } else {
                result = result.substring(0, index) + elseContent + result.substring(index + fullMatch.length);
            }
        }
        
        // Then process simple if blocks (without else)
        const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/;
        let ifMatch;
        
        while ((ifMatch = result.match(ifRegex)) !== null) {
            const [fullMatch, variable, content] = ifMatch;
            const value = getNestedValue(data, variable);
            const index = result.indexOf(fullMatch);
            
            if (isTruthy(value)) {
                result = result.substring(0, index) + content + result.substring(index + fullMatch.length);
            } else {
                result = result.substring(0, index) + result.substring(index + fullMatch.length);
            }
        }
        
        ifCount++;
    }

    // Handle array access patterns like {{images.0.url}}
    result = result.replace(/\{\{(\w+)\.(\d+)\.(\w+)\}\}/g, (match, arrayName, index, prop) => {
        const array = getNestedValue(data, arrayName);
        if (Array.isArray(array) && array[parseInt(index)]) {
            return array[parseInt(index)][prop] || '';
        }
        return '';
    });
    
    // Handle array access without property like {{images.0}}
    result = result.replace(/\{\{(\w+)\.(\d+)\}\}/g, (match, arrayName, index) => {
        const array = getNestedValue(data, arrayName);
        if (Array.isArray(array) && array[parseInt(index)]) {
            return JSON.stringify(array[parseInt(index)]);
        }
        return '';
    });

    // Handle simple replacements {{variable}} or {{variable.property}}
    result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = getNestedValue(data, path);
        if (value === null || value === undefined) {
            return '';
        }
        return String(value);
    });

    // Final cleanup: Remove any remaining template tags
    result = result.replace(/\{\{[#\/]?\w+.*?\}\}/g, '');

    return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return undefined;
        }
    }

    return value;
}

/**
 * Convert hex color with # to format without #
 */
export function normalizeColor(color) {
    if (!color) return '333333';
    
    // Remove # if present
    let hex = color.replace('#', '');
    
    // Convert short hex to long (e.g., #f00 -> #ff0000)
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    // Extract hex from rgb/rgba
    if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
            const r = parseInt(matches[0]).toString(16).padStart(2, '0');
            const g = parseInt(matches[1]).toString(16).padStart(2, '0');
            const b = parseInt(matches[2]).toString(16).padStart(2, '0');
            hex = r + g + b;
        }
    }
    
    return hex.toUpperCase();
}
