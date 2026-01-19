
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

process.env.VIP_ACCESS_KEY = 'super-secret-vip-key';
process.env.YOUTUBE_API_KEY = 'test-api-key';

try {
    const dotenvFiles = ['.env', '.env.local'];
    dotenvFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const envConfig = fs.readFileSync(file, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) process.env[key.trim()] = val.trim();
            });
        }
    });
} catch (e) {
    console.log('Error loading env files', e);
}

const PORT = 3000;

function polyfillRes(res) {
    res.status = function (code) {
        this.statusCode = code;
        return this;
    };
    res.json = function (data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
        return this;
    };
    return res;
}

const server = http.createServer(async (req, res) => {
    polyfillRes(res);
    const parsedUrl = url.parse(req.url, true);
    req.query = parsedUrl.query;

    console.log(`${req.method} ${req.url}`);

    if (parsedUrl.pathname.startsWith('/api/')) {
        const routePath = parsedUrl.pathname.replace('/api/', '');
        const filePath = path.join(__dirname, 'api', routePath + '.js');

        try {
            if (fs.existsSync(filePath)) {
                const handlerModule = await import(filePath);
                const handler = handlerModule.default;
                await handler(req, res);
            } else {
                res.status(404).json({ error: 'API route not found' });
            }
        } catch (e) {
            console.error('API Error:', e);
            res.status(500).json({ error: 'Internal Server Error', details: e.message });
        }
        return;
    }

    // SPA Routes - redirect clean URLs to hash-based routing
    // Only redirect browser navigation requests, not asset/script requests
    const SPA_ROUTES = ['/feed', '/search', '/trending', '/settings', '/dashboard'];
    const acceptsHtml = (req.headers.accept || '').includes('text/html');

    if (SPA_ROUTES.includes(parsedUrl.pathname) && acceptsHtml) {
        res.writeHead(302, { Location: `/#${parsedUrl.pathname}` });
        res.end();
        return;
    }

    // Prevent direct browser access to page JS files (serve SPA instead)
    // But allow script/module requests to load normally
    if (parsedUrl.pathname.startsWith('/pages/') && parsedUrl.pathname.endsWith('.js') && acceptsHtml) {
        const pageName = parsedUrl.pathname.replace('/pages/', '').replace('.js', '');
        res.writeHead(302, { Location: `/#/${pageName}` });
        res.end();
        return;
    }

    let filePath = path.join(__dirname, 'dashboard', parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);

    if (!filePath.startsWith(path.join(__dirname, 'dashboard'))) {
        res.status(403).end();
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(filePath + '.html', (err2, content2) => {
                    if (err2) {
                        res.status(404).end('Not Found');
                    } else {
                        res.setHeader('Content-Type', 'text/html');
                        res.end(content2);
                    }
                });
            } else {
                res.status(500).end('Server Error');
            }
        } else {
            let contentType = 'text/html';
            const ext = path.extname(filePath);
            if (ext === '.js') contentType = 'text/javascript';
            if (ext === '.css') contentType = 'text/css';
            if (ext === '.json') contentType = 'application/json';
            if (ext === '.png') contentType = 'image/png';
            if (ext === '.jpg') contentType = 'image/jpeg';

            res.setHeader('Content-Type', contentType);
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
});
