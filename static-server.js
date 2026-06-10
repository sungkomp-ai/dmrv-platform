const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3370;
const PUBLIC_DIR = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // API routes - return mock data
  if (urlPath.startsWith('/api/bio/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (urlPath === '/api/bio/overview') {
      res.end(JSON.stringify({
        totalCo2Reduction: 12458.7, ch4Oxidized: 8923.4, microorganismTypes: 47,
        activeBioreactors: 12, carbonCreditsGenerated: 3421, biofuelProduced: 5678.9,
        trendData: [
          {month:'Jan',co2:980,ch4:720,biofuel:450},{month:'Feb',co2:1050,ch4:780,biofuel:480},
          {month:'Mar',co2:1120,ch4:830,biofuel:510},{month:'Apr',co2:1080,ch4:790,biofuel:490},
          {month:'May',co2:1200,ch4:870,biofuel:530},{month:'Jun',co2:1150,ch4:850,biofuel:520},
          {month:'Jul',co2:1280,ch4:920,biofuel:560},{month:'Aug',co2:1320,ch4:950,biofuel:580},
          {month:'Sep',co2:1180,ch4:860,biofuel:510},{month:'Oct',co2:1090,ch4:800,biofuel:470},
          {month:'Nov',co2:1020,ch4:750,biofuel:440},{month:'Dec',co2:988,ch4:703,biofuel:458},
        ]
      }));
    } else {
      res.end(JSON.stringify({status:'ok',message:'BioCarbon API'}));
    }
    return;
  }
  
  // Serve static files - redirect root to biocarbon dashboard
  if (urlPath === '/') urlPath = '/biocarbon/index.html';
  if (urlPath === '/biocarbon') urlPath = '/biocarbon/index.html';
  
  const filePath = path.join(PUBLIC_DIR, urlPath);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`BioCarbon static server running on port ${PORT}`);
});
