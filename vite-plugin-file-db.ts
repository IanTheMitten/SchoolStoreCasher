import fs from 'fs';
import path from 'path';
import type { Connect, Plugin } from 'vite';

// Mirrors the browser's IndexedDB to a JSON file on disk (data/db.json, gitignored),
// so store data survives the browser clearing its storage. Works under `vite` and
// `vite preview`; the client (src/services/fileSync.ts) talks to it over /__filedb.

export const FILE_DB_ENDPOINT = '/__filedb';

export function fileDbPlugin(options: { dir?: string } = {}): Plugin {
  let filePath = '';

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url || req.url.split('?')[0] !== FILE_DB_ENDPOINT) return next();
    res.setHeader('X-File-Db', '1');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        res.statusCode = 204;
        return res.end();
      }
      res.setHeader('Content-Type', 'application/json');
      return fs.createReadStream(filePath).pipe(res);
    }

    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          const parsed = JSON.parse(body);
          if (!parsed || parsed.app !== 'SchoolStoreCasher' || typeof parsed.data !== 'object') {
            throw new Error('Not a SchoolStoreCasher snapshot');
          }
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          // Write to a temp file and rename so a crash never leaves a half-written db.json.
          const tmp = `${filePath}.tmp`;
          fs.writeFileSync(tmp, body);
          if (fs.existsSync(filePath)) fs.copyFileSync(filePath, `${filePath}.bak`);
          fs.renameSync(tmp, filePath);
          res.statusCode = 204;
          res.end();
        } catch (err: any) {
          res.statusCode = 400;
          res.end(err?.message || 'Invalid snapshot');
        }
      });
      req.on('error', () => {
        res.statusCode = 500;
        res.end();
      });
      return;
    }

    res.statusCode = 405;
    res.end();
  };

  return {
    name: 'schoolstore-file-db',
    configResolved(config) {
      filePath = path.resolve(config.root, options.dir || 'data', 'db.json');
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
