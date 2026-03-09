import { httpClient } from './httpClient';
import type { MockDataSchemaEntity, TableColumnOrder, TableColumnRules } from '../models/apiModels';

export async function getMockDataSchemas(projectId: string): Promise<MockDataSchemaEntity[]> {
  const response = await httpClient.get<{ items: MockDataSchemaEntity[] }>('/mock-data-schemas', {
    params: { projectId },
  });
  return response.data.items;
}

export async function createMockDataSchema(payload: {
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  locale?: string;
  sqlProvider?: 'sqlserver' | 'postgres' | 'mysql' | '';
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
  schemaRelationshipsJson?: string;
}): Promise<MockDataSchemaEntity> {
  const response = await httpClient.post<MockDataSchemaEntity>('/mock-data-schemas', payload);
  return response.data;
}

export async function updateMockDataSchema(
  id: string,
  payload: {
    projectId: string;
    name: string;
    schemaSql: string;
    classificationJson: string;
    locale?: string;
    sqlProvider?: 'sqlserver' | 'postgres' | 'mysql' | '';
    columnRules?: TableColumnRules;
    columnOrder?: TableColumnOrder;
    schemaRelationshipsJson?: string;
  },
): Promise<MockDataSchemaEntity> {
  const response = await httpClient.put<MockDataSchemaEntity>(`/mock-data-schemas/${id}`, payload);
  return response.data;
}

export async function deleteMockDataSchema(id: string): Promise<void> {
  await httpClient.delete(`/mock-data-schemas/${id}`);
}
