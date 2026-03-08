import { httpClient } from './httpClient';
import type { GenerationRequestEntity, TableColumnRules } from '../models/apiModels';

export async function getGenerationRequests(
  projectId: string,
): Promise<GenerationRequestEntity[]> {
  const response = await httpClient.get<{ items: GenerationRequestEntity[] }>(
    '/generation-requests',
    {
      params: { projectId },
    },
  );
  return response.data.items;
}

export async function createGenerationRequest(payload: {
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  locale?: string;
  sqlProvider?: 'sqlserver' | 'postgres' | 'mysql' | '';
  columnRules?: TableColumnRules;
  schemaRelationshipsJson?: string;
}): Promise<GenerationRequestEntity> {
  const response = await httpClient.post<GenerationRequestEntity>('/generation-requests', payload);
  return response.data;
}

export async function updateGenerationRequest(
  id: string,
  payload: {
    projectId: string;
    name: string;
    schemaSql: string;
    classificationJson: string;
    locale?: string;
    sqlProvider?: 'sqlserver' | 'postgres' | 'mysql' | '';
    columnRules?: TableColumnRules;
    schemaRelationshipsJson?: string;
  },
): Promise<GenerationRequestEntity> {
  const response = await httpClient.put<GenerationRequestEntity>(
    `/generation-requests/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteGenerationRequest(id: string): Promise<void> {
  await httpClient.delete(`/generation-requests/${id}`);
}
