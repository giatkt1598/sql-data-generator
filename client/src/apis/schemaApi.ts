import { httpClient } from './httpClient';
import type {
  ColumnDesignerModel,
  SemanticDataType,
  TableColumnRules,
} from '../models/apiModels';

export async function generateClassificationPrompt(payload: {
  schemaSql: string;
  extraBusinessContext: string;
}): Promise<string> {
  const response = await httpClient.post<{ prompt: string }>('/classification-prompt', payload);
  return response.data.prompt;
}

export async function getSemanticTypes(): Promise<SemanticDataType[]> {
  const response = await httpClient.get<{ items: SemanticDataType[] }>('/semantic-types');
  return response.data.items;
}

export async function getColumnDesignerModel(payload: {
  schemaSql: string;
  classificationJson: string;
  columnRules?: TableColumnRules;
}): Promise<ColumnDesignerModel> {
  const response = await httpClient.post<ColumnDesignerModel>('/column-designer-model', payload);
  return response.data;
}
