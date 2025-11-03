#!/usr/bin/env node

/**
 * Local development server with routing support
 * Handles /site/[slug] -> /websites/sites/[slug] routing
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const ROOT_DIR = __dirname;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function getMimeType(filePath) {
    const ext = extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT_DIR, req.url === '/' ? 'index.html' : req.url);
    
    // Handle /site/[slug] routing
    if (req.url.startsWith('/site/')) {
        const slugMatch = req.url.match(/^\/site\/([^\/]+)(\/.*)?$/);
        if (slugMatch) {
            const slug = slugMatch[1];
            let rest = slugMatch[2] || '/index.html';
            
            // If rest is empty or just '/', serve index.html
            if (!rest || rest === '/') {
                rest = '/index.html';
            }
            
            // Remove leading slash from rest for path.join
            rest = rest.startsWith('/') ? rest.slice(1) : rest;
            filePath = path.join(ROOT_DIR, 'websites', 'sites', slug, rest);
        }
    }
    
    // Handle /sites -> sites.html
    if (req.url === '/sites' || req.url === '/sites/') {
        filePath = path.join(ROOT_DIR, 'sites.html');
    }
    
    // Normalize file path
    filePath = path.normalize(filePath);
    
    // Security check - ensure file is within ROOT_DIR
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Try with index.html if it's a directory
            if (!err && stats.isDirectory()) {
                const indexPath = path.join(filePath, 'index.html');
                fs.stat(indexPath, (err2) => {
                    if (!err2) {
                        serveFile(indexPath, res);
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    }
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            }
            return;
        }
        
        serveFile(filePath, res);
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Local server running at http://localhost:${PORT}`);
    console.log(`\n📁 Available routes:`);
    console.log(`   - Homepage: http://localhost:${PORT}/`);
    console.log(`   - Sites Portfolio: http://localhost:${PORT}/sites`);
    console.log(`   - Client Sites: http://localhost:${PORT}/site/[business-slug]`);
    console.log(`\n   Example: http://localhost:${PORT}/site/patton-block-grill-brew-pub\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Try stopping the other server or use a different port.\n`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

