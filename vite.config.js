import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

const downloadCache = new Map();

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'download-service',
      configureServer(server) {
        // Cache uploaded blob and return a permanent HTTP download URL
        server.middlewares.use('/api/cache-download', (req, res) => {
          if (req.method === 'POST') {
            const rawFilename = req.headers['x-filename'] || 'videofy_export.zip';
            const filename = decodeURIComponent(rawFilename);
            const mimeType = req.headers['content-type'] || 'application/octet-stream';
            const token = 'dl_' + Math.random().toString(36).substring(2, 11);

            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
              const buffer = Buffer.concat(chunks);
              downloadCache.set(token, { buffer, filename, mimeType });

              // Auto-clean cache after 5 minutes
              setTimeout(() => downloadCache.delete(token), 300000);

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({
                token,
                filename,
                downloadUrl: `/api/get-download/${token}/${encodeURIComponent(filename)}`
              }));
            });
          } else {
            res.statusCode = 405;
            res.end('Method Not Allowed');
          }
        });

        // Serve the cached file via standard HTTP GET with Content-Disposition
        server.middlewares.use('/api/get-download', (req, res) => {
          const parts = req.url.split('?')[0].split('/').filter(Boolean);
          const token = parts[0];
          const item = downloadCache.get(token);

          if (item) {
            res.setHeader('Content-Type', item.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${item.filename}"`);
            res.setHeader('Content-Length', item.buffer.length);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(item.buffer);
          } else {
            res.statusCode = 404;
            res.end('Download expirado ou inválido.');
          }
        });
      },
    },
  ],
  // Pages: landing at /, editor at /app/, login return at /auth/callback.html
  build: {
    rollupOptions: {
      input: {
        landing: page('./index.html'),
        app: page('./app/index.html'),
        authCallback: page('./auth/callback.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
