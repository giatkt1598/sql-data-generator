import { SUPPORTED_SEMANTIC_TYPES } from '../core/semanticTypes';
import { AiClassificationResult, SemanticDataType, TableSchema } from '../core/types';

function isSemanticType(value: string): value is SemanticDataType {
  return SUPPORTED_SEMANTIC_TYPES.includes(value as SemanticDataType);
}

export function parseClassificationJson(jsonText: string): AiClassificationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('AI classification file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI classification JSON must be an object.');
  }

  const root = parsed as Record<string, unknown>;
  if (root.version !== '1') {
    throw new Error("AI classification JSON version must be '1'.");
  }

  if (!root.tables || typeof root.tables !== 'object') {
    throw new Error('AI classification JSON must contain a tables object.');
  }

  const tables = root.tables as Record<string, unknown>;
  for (const [tableName, tableValue] of Object.entries(tables)) {
    if (!tableValue || typeof tableValue !== 'object') {
      throw new Error(`Table '${tableName}' classification must be an object.`);
    }

    const tableObj = tableValue as Record<string, unknown>;
    if (!tableObj.columns || typeof tableObj.columns !== 'object') {
      throw new Error(`Table '${tableName}' must contain a columns object.`);
    }

    const columns = tableObj.columns as Record<string, unknown>;
    for (const [columnName, columnValue] of Object.entries(columns)) {
      if (!columnValue || typeof columnValue !== 'object') {
        throw new Error(`Column '${tableName}.${columnName}' classification must be an object.`);
      }

      const columnObj = columnValue as Record<string, unknown>;
      if (typeof columnObj.semanticType !== 'string') {
        throw new Error(`Column '${tableName}.${columnName}' must have semanticType.`);
      }
      if (!isSemanticType(columnObj.semanticType)) {
        throw new Error(
          `Column '${tableName}.${columnName}' has unsupported semanticType '${columnObj.semanticType}'.`,
        );
      }
    }
  }

  return root as unknown as AiClassificationResult;
}

export function validateClassificationCoverage(
  schemaTables: TableSchema[],
  classification: AiClassificationResult,
): string[] {
  const warnings: string[] = [];

  for (const table of schemaTables) {
    const classifiedTable = classification.tables[table.name];
    if (!classifiedTable) {
      warnings.push(`Missing classification for table '${table.name}'.`);
      continue;
    }

    for (const column of table.columns) {
      if (!classifiedTable.columns[column.name]) {
        warnings.push(`Missing classification for column '${table.name}.${column.name}'.`);
      }
    }
  }

  return warnings;
}
