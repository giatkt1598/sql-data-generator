import { TableColumnRules } from '../core/types';

export interface ProjectEntity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRequestEntity {
  id: string;
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  rowsPerTable: number;
  columnRules?: TableColumnRules;
  createdAt: string;
  updatedAt: string;
}

export interface AppStorageState {
  projects: ProjectEntity[];
  generationRequests: GenerationRequestEntity[];
}
