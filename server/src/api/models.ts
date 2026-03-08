import { SqlProvider, TableColumnRules } from '../core/types';

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
  locale?: string;
  sqlProvider?: SqlProvider | '';
  columnRules?: TableColumnRules;
  schemaRelationshipsJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppStorageState {
  projects: ProjectEntity[];
  generationRequests: GenerationRequestEntity[];
}
