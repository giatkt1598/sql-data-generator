import fs from 'fs';
import path from 'path';
import { AppStorageState } from './models';

const defaultState: AppStorageState = {
  projects: [],
  generationRequests: [],
};

export class JsonFileStorage {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  read(): AppStorageState {
    if (!fs.existsSync(this.filePath)) {
      return defaultState;
    }

    const raw = fs.readFileSync(this.filePath, 'utf-8').trim();
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as AppStorageState;
    return {
      projects: parsed.projects ?? [],
      generationRequests: parsed.generationRequests ?? [],
    };
  }

  write(state: AppStorageState): void {
    const folder = path.dirname(this.filePath);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
  }
}
