import { httpClient } from './httpClient';
import type {
  ColumnDesignerModel,
  DataTypeDefinition,
  SupportedLocaleDefinition,
  TableColumnOrder,
  TableColumnRules,
} from '../models/apiModels';

export async function generateClassificationPrompt(payload: {
  schemaSql: string;
  extraBusinessContext: string;
}): Promise<string> {
  const response = await httpClient.post<{ prompt: string }>('/classification-prompt', payload);
  return response.data.prompt;
}

export async function getSemanticTypes(): Promise<DataTypeDefinition[]> {
  const response = await httpClient.get<{ items: DataTypeDefinition[] }>('/semantic-types');
  return response.data.items;
}

export async function getSupportedLocales(): Promise<SupportedLocaleDefinition[]> {
  const response = await httpClient.get<{ items: SupportedLocaleDefinition[] }>('/locales');
  return response.data.items;
}

export async function getColumnDesignerModel(payload: {
  schemaSql: string;
  classificationJson: string;
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
}): Promise<ColumnDesignerModel> {
  const response = await httpClient.post<ColumnDesignerModel>('/column-designer-model', payload);
  return response.data;
}

export async function generateSqlScript(payload: {
  schemaSql: string;
  classificationJson: string;
  locale?: string;
  sqlProvider?: 'sqlserver' | 'postgres' | 'mysql' | '';
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
  schemaRelationshipsJson?: string;
}): Promise<string> {
  const response = await httpClient.post('/download', payload, {
    responseType: 'text',
  });
  return response.data as string;
}
