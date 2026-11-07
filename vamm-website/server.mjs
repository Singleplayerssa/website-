import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleAiRequest } from './ai-service.mjs';

const assets = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/app.js': ['app.js', 'text/javascript'],
  '/news-feed.js': ['news-feed.js', 'text/javascript'],
  '/web-research.js': ['web-research.js', 'text/javascript'],
  '/model.js': ['model.js', 'text/javascript'],
  '/style.css': ['style.css', 'text/css'],
  '/images/brand.svg': ['images/brand.svg', 'image/svg+xml'],
  '/images/academy.svg': ['images/academy.svg', 'image/svg+xml'],
  '/images/market.svg': ['images/market.svg', 'image/svg+xml'],
  '/images/mentor.svg': ['images/mentor.svg', 'image/svg+xml'],
  '/images/missions.svg': ['images/missions.svg', 'image/svg+xml'],
  '/images/news.svg': ['images/news.svg', 'image/svg+xml'],
};

const port = Number(process.argv[2] ?? 8000);
const server = http.createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (request, response) => {
  const path = request.url.split('?')[0];
  if (path === '/api/quiz' || path === '/api/mentor' || path === '/api/research') {
    await handleAiRequest(request, response, path);
    return;
  }
  const asset = Object.hasOwn(assets, path) && assets[path];
  if (!asset) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': asset[1] + '; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    response.writeHead(500).end('Unable to read the requested file');
  }
});
server.listen(port, '127.0.0.1', () => console.log('Open http://127.0.0.1:' + server.address().port));
