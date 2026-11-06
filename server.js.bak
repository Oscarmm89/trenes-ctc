const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const RENFE_URL = 'https://gtfsrt.renfe.com/vehicle_positions_LD.json';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // Endpoint proxy local para Renfe sin restricciones CORS
  if (req.url === '/api/renfe') {
    try {
      const response = await fetch(RENFE_URL, {
        headers: { 'User-Agent': 'Renfe-CTC-Dashboard/1.0' }
      });
      const data = await response.text();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Servidor de archivos estáticos
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/index.html') {
    reqPath = '/CODIGO ESTETICA STITCH/code.html';
  }

  const filePath = path.join(__dirname, decodeURIComponent(reqPath));
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(` CTC VÍA LIBRE - Servidor de Desarrollo Activo`);
  console.log(` URL Local: http://localhost:${PORT}`);
  console.log(` Proxy Renfe: http://localhost:${PORT}/api/renfe`);
  console.log(`=================================================\n`);
});

