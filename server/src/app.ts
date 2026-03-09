import cors from 'cors';
import express from 'express';
import path from 'path';
import { MockDataSchemaService } from './api/mockDataSchemaService';
import { buildApiRouter } from './api/routes';
import { JsonFileStorage } from './api/storage';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  const storageFile = path.join(process.cwd(), 'data', 'app-storage.json');
  const service = new MockDataSchemaService(new JsonFileStorage(storageFile));
  app.use('/api', buildApiRouter(service));

  return app;
}
