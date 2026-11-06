// server.js - Servidor local de desarrollo
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const RENFE_POSITIONS_URL = 'https://gtfsrt.renfe.com/vehicle_positions_LD.json';
const RENFE_TRIPS_URL = 'https://gtfsrt.renfe.com/trip_updates_LD.json';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (parsedUrl.pathname === '/api/renfe') {
    const type = parsedUrl.searchParams.get('type') || 'vehicles';
    const targetUrl = type === 'trips' ? RENFE_TRIPS_URL : RENFE_POSITIONS_URL;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(data));
    } catch (err) {
      const fallbackFile = path.join(__dirname, 'renfe_live.json');
      if (fs.existsSync(fallbackFile)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(fs.readFileSync(fallbackFile));
      }
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const fullPath = path.join(__dirname, filePath);
  const ext = path.extname(fullPath).toLowerCase();

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor local activo en http://localhost:${PORT}`);
});

