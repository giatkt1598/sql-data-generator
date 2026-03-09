import {
  CustomListTypeDefinition,
  SqlProvider,
  TableColumnOrder,
  TableColumnRules,
} from '../core/types';

export interface ProjectEntity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockDataSchemaEntity {
  id: string;
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  locale?: string;
  sqlProvider?: SqlProvider | '';
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
  schemaRelationshipsJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppStorageState {
  projects: ProjectEntity[];
  mockDataSchemas: MockDataSchemaEntity[];
  customListTypes: CustomListTypeDefinition[];
}
