const http = require('http');
const fs = require('fs');
const path = require('path');
const { parseSingleUrl, parseCreatorInput, parseBatchInput, normalizeSourceKey, analyzeSource } = require('./parsing');
const { ensureStorage, getCachedEntry, saveCachedEntry, appendHistory, loadHistory, loadQueue, saveQueue } = require('./storage');
const { addQueueItem, listQueue, processQueue, updateQueueItem } = require('./queue');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, '..', 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType });
    res.end(data);
  });
}

ensureStorage();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', app: 'dw' }));
    return;
  }

  if (url.pathname === '/api/parse') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const source = String(payload.source || '').trim();
        const mode = payload.mode || 'single';
        let result;

        if (!source) {
          throw new Error('Missing source');
        }

        const cacheKey = normalizeSourceKey(source);
        const cachedEntry = getCachedEntry(cacheKey);

        if (cachedEntry) {
          result = cachedEntry;
        } else {
          if (mode === 'creator') {
            result = parseCreatorInput(source);
          } else if (mode === 'batch') {
            result = parseBatchInput(source);
          } else {
            let html = payload.html || '';
            if (!html && /^https?:\/\//i.test(source)) {
              try {
                const response = await fetch(source);
                if (response.ok) {
                  html = await response.text();
                }
              } catch (error) {
                html = '';
              }
            }
            result = analyzeSource(source, { html });
          }

          result.cacheKey = cacheKey;
          result.cached = false;
          saveCachedEntry(cacheKey, result);
        }

        result.cached = Boolean(cachedEntry);
        result.cacheKey = cacheKey;
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: error.message || 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/history') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(loadHistory()));
    return;
  }

  if (url.pathname === '/api/queue') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const queued = addQueueItem(payload);
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(queued));
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: error.message || 'Invalid queue payload' }));
        }
      });
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(listQueue()));
    return;
  }

  if (url.pathname === '/api/queue/process') {
    const processed = processQueue();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(processed || { status: 'empty' }));
    return;
  }

  if (url.pathname === '/api/queue/next') {
    const processed = processQueue();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(processed || { status: 'empty' }));
    return;
  }

  let reqPath = url.pathname;
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const filePath = path.join(publicDir, reqPath);
  const isSafe = filePath.startsWith(publicDir);

  if (!isSafe) {
    res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  serveFile(filePath, res);
});

server.listen(port, host, () => {
  console.log(`dw server listening on http://${host}:${port}`);
});
