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

    // Helper function to process nested conditionals recursively
    function processNestedConditionals(content, data) {
        let processed = content;
        let nestedCount = 0;
        
        while (processed.includes('{{#if') && nestedCount < 5) {
            // Handle nested if/else blocks first
            const nestedIfElse = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
            let nestedMatch;
            const nestedMatches = [];
            
            // Reset regex lastIndex
            nestedIfElse.lastIndex = 0;
            while ((nestedMatch = nestedIfElse.exec(processed)) !== null) {
                nestedMatches.push({
                    fullMatch: nestedMatch[0],
                    variable: nestedMatch[1],
                    ifContent: nestedMatch[2],
                    elseContent: nestedMatch[3],
                    index: nestedMatch.index
                });
            }
            
            // Process in reverse order
            for (let i = nestedMatches.length - 1; i >= 0; i--) {
                const m = nestedMatches[i];
                const value = getNestedValue(data, m.variable);
                const replacement = isTruthy(value) ? m.ifContent : m.elseContent;
                processed = processed.substring(0, m.index) + replacement + processed.substring(m.index + m.fullMatch.length);
            }
            
            // Handle nested simple if blocks (without else)
            const nestedIf = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
            const simpleMatches = [];
            let simpleMatch;
            
            // Reset regex lastIndex
            nestedIf.lastIndex = 0;
            while ((simpleMatch = nestedIf.exec(processed)) !== null) {
                simpleMatches.push({
                    fullMatch: simpleMatch[0],
                    variable: simpleMatch[1],
                    content: simpleMatch[2],
                    index: simpleMatch.index
                });
            }
            
            // Process in reverse order
            for (let i = simpleMatches.length - 1; i >= 0; i--) {
                const m = simpleMatches[i];
                const value = getNestedValue(data, m.variable);
                const replacement = isTruthy(value) ? m.content : '';
                processed = processed.substring(0, m.index) + replacement + processed.substring(m.index + m.fullMatch.length);
            }
            
            nestedCount++;
        }
        
        return processed;
    }

    // Process top-level {{#if}} conditionals
    let ifCount = 0;
    while (result.includes('{{#if') && ifCount < 10) {
        // Process if/else blocks first - need to match correctly by counting nested blocks
        // Find all if/else blocks by finding {{#if ... {{else}} ... {{/if}} patterns
        // and ensuring we match the correct closing {{/if}}
        const ifElseMatches = [];
        let searchIndex = 0;
        
        while (searchIndex < result.length) {
            const ifStart = result.indexOf('{{#if', searchIndex);
            if (ifStart === -1) break;
            
            // Find the variable name
            const ifMatch = result.substring(ifStart).match(/^\{\{#if\s+(\w+)\}\}/);
            if (!ifMatch) {
                searchIndex = ifStart + 5;
                continue;
            }
            
            const variable = ifMatch[1];
            const ifContentStart = ifStart + ifMatch[0].length;
            
            // Look for {{else}} before any closing {{/if}}
            let depth = 1;
            let pos = ifContentStart;
            let elsePos = -1;
            let elseEndPos = -1;
            let ifEndPos = -1;
            
            while (pos < result.length && depth > 0) {
                const nextIf = result.indexOf('{{#if', pos);
                const nextElse = result.indexOf('{{else}}', pos);
                const nextEndIf = result.indexOf('{{/if}}', pos);
                
                // Find the next relevant token
                let nextToken = result.length;
                let tokenType = 'end';
                
                if (nextIf !== -1 && nextIf < nextToken) {
                    nextToken = nextIf;
                    tokenType = 'if';
                }
                if (nextElse !== -1 && nextElse < nextToken && depth === 1) {
                    nextToken = nextElse;
                    tokenType = 'else';
                }
                if (nextEndIf !== -1 && nextEndIf < nextToken) {
                    nextToken = nextEndIf;
                    tokenType = 'endif';
                }
                
                if (tokenType === 'if') {
                    depth++;
                    pos = nextToken + 5;
                } else if (tokenType === 'else' && depth === 1) {
                    elsePos = nextToken;
                    elseEndPos = nextToken + 8;
                    pos = nextToken + 8;
                } else if (tokenType === 'endif') {
                    depth--;
                    if (depth === 0) {
                        ifEndPos = nextToken;
                    }
                    pos = nextToken + 7;
                } else {
                    break;
                }
            }
            
            // If we found a matching else and endif, this is an if/else block
            if (elsePos !== -1 && ifEndPos !== -1) {
                const ifContent = result.substring(ifContentStart, elsePos);
                const elseContent = result.substring(elseEndPos, ifEndPos);
                const fullMatch = result.substring(ifStart, ifEndPos + 7);
                
                ifElseMatches.push({
                    fullMatch: fullMatch,
                    variable: variable,
                    ifContent: ifContent,
                    elseContent: elseContent,
                    index: ifStart
                });
                
                searchIndex = ifEndPos + 7;
            } else {
                // Not an if/else block, skip it
                searchIndex = ifStart + 5;
            }
        }
        
        // Process matches in reverse order (to preserve indices)
        for (let i = ifElseMatches.length - 1; i >= 0; i--) {
            const m = ifElseMatches[i];
            const value = getNestedValue(data, m.variable);
            let replacement = '';
            
            if (isTruthy(value)) {
                // Process nested conditionals in if block too
                replacement = processNestedConditionals(m.ifContent, data);
            } else {
                // Process nested conditionals in else block
                replacement = processNestedConditionals(m.elseContent, data);
            }
            
            result = result.substring(0, m.index) + replacement + result.substring(m.index + m.fullMatch.length);
        }
        
        // Then process simple if blocks (without else) - but exclude those already in if/else
        const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        const ifMatches = [];
        let ifMatch;
        
        // Reset regex lastIndex and collect all simple if matches
        ifRegex.lastIndex = 0;
        while ((ifMatch = ifRegex.exec(result)) !== null) {
            // Skip if this is part of an if/else block (check context)
            const before = result.substring(Math.max(0, ifMatch.index - 100), ifMatch.index);
            const after = result.substring(ifMatch.index, Math.min(result.length, ifMatch.index + ifMatch[0].length + 100));
            
            if (!before.includes('{{else}}') && !after.includes('{{else}}')) {
                ifMatches.push({
                    fullMatch: ifMatch[0],
                    variable: ifMatch[1],
                    content: ifMatch[2],
                    index: ifMatch.index
                });
            }
        }
        
        // Process matches in reverse order
        for (let i = ifMatches.length - 1; i >= 0; i--) {
            const m = ifMatches[i];
            const value = getNestedValue(data, m.variable);
            
            if (isTruthy(value)) {
                result = result.substring(0, m.index) + m.content + result.substring(m.index + m.fullMatch.length);
            } else {
                result = result.substring(0, m.index) + result.substring(m.index + m.fullMatch.length);
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
