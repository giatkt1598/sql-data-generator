import axios from 'axios';

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

export type SemanticDataType =
  | 'unknown'
  | 'id'
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phoneNumber'
  | 'address'
  | 'city'
  | 'country'
  | 'zipCode'
  | 'companyName'
  | 'jobTitle'
  | 'url'
  | 'date'
  | 'dateTime'
  | 'boolean'
  | 'number'
  | 'text';

export interface ColumnGenerationRule {
  kind: 'semantic' | 'reference';
  semanticType?: SemanticDataType;
  reference?: {
    tableName: string;
    columnName: string;
  };
}

export type TableColumnRules = Record<string, Record<string, ColumnGenerationRule>>;

export interface ColumnDesignerModel {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      dbType: string;
      nullable: boolean;
      isPrimaryKey: boolean;
    }>;
  }>;
  columnRules: TableColumnRules;
}

export interface PreviewResult {
  preview: string;
  totalLines: number;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
});

export async function getProjects(): Promise<ProjectEntity[]> {
  const response = await api.get<{ items: ProjectEntity[] }>('/projects');
  return response.data.items;
}

export async function createProject(payload: {
  name: string;
  description: string;
}): Promise<ProjectEntity> {
  const response = await api.post<ProjectEntity>('/projects', payload);
  return response.data;
}

export async function updateProject(
  id: string,
  payload: { name: string; description: string },
): Promise<ProjectEntity> {
  const response = await api.put<ProjectEntity>(`/projects/${id}`, payload);
  return response.data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

export async function getGenerationRequests(
  projectId: string,
): Promise<GenerationRequestEntity[]> {
  const response = await api.get<{ items: GenerationRequestEntity[] }>('/generation-requests', {
    params: { projectId },
  });
  return response.data.items;
}

export async function createGenerationRequest(payload: {
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  rowsPerTable: number;
  columnRules?: TableColumnRules;
}): Promise<GenerationRequestEntity> {
  const response = await api.post<GenerationRequestEntity>('/generation-requests', payload);
  return response.data;
}

export async function updateGenerationRequest(
  id: string,
  payload: {
    projectId: string;
    name: string;
    schemaSql: string;
    classificationJson: string;
    rowsPerTable: number;
    columnRules?: TableColumnRules;
  },
): Promise<GenerationRequestEntity> {
  const response = await api.put<GenerationRequestEntity>(`/generation-requests/${id}`, payload);
  return response.data;
}

export async function deleteGenerationRequest(id: string): Promise<void> {
  await api.delete(`/generation-requests/${id}`);
}

export async function previewGenerationRequest(id: string): Promise<PreviewResult> {
  const response = await api.post<PreviewResult>(`/generation-requests/${id}/preview`);
  return response.data;
}

export async function previewFromInput(payload: {
  schemaSql: string;
  classificationJson: string;
  rowsPerTable: number;
  columnRules?: TableColumnRules;
}): Promise<PreviewResult> {
  const response = await api.post<PreviewResult>('/preview', payload);
  return response.data;
}

export async function downloadGenerationRequest(id: string): Promise<Blob> {
  const response = await api.get(`/generation-requests/${id}/download`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function downloadFromInput(payload: {
  schemaSql: string;
  classificationJson: string;
  rowsPerTable: number;
  columnRules?: TableColumnRules;
}): Promise<Blob> {
  const response = await api.post('/download', payload, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function generateClassificationPrompt(payload: {
  schemaSql: string;
  extraBusinessContext: string;
}): Promise<string> {
  const response = await api.post<{ prompt: string }>('/classification-prompt', payload);
  return response.data.prompt;
}

export async function getSemanticTypes(): Promise<SemanticDataType[]> {
  const response = await api.get<{ items: SemanticDataType[] }>('/semantic-types');
  return response.data.items;
}

export async function getColumnDesignerModel(payload: {
  schemaSql: string;
  classificationJson: string;
  columnRules?: TableColumnRules;
}): Promise<ColumnDesignerModel> {
  const response = await api.post<ColumnDesignerModel>('/column-designer-model', payload);
  return response.data;
}
