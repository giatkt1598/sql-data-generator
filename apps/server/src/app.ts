import fs from 'fs';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { MockDataSchemaService } from './api/mockDataSchemaService';
import { buildApiRouter } from './api/routes';
import { JsonFileStorage } from './api/storage';

function resolveClientDistPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '..', 'client', 'dist'),
    path.resolve(process.cwd(), 'client', 'dist'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return null;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  const storageFile = path.join(process.cwd(), 'data', 'app-storage.json');
  const service = new MockDataSchemaService(new JsonFileStorage(storageFile));
  app.use('/api', buildApiRouter(service));

  const clientDistPath = resolveClientDistPath();
  if (clientDistPath) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}
