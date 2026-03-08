import { SUPPORTED_SEMANTIC_TYPES } from '../core/semanticTypes';
import {
  AiClassificationResult,
  DatabaseSchema,
  SemanticDataType,
  TableSchema,
} from '../core/types';

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
      if (typeof columnObj.dbType !== 'string' || columnObj.dbType.trim().length === 0) {
        throw new Error(`Column '${tableName}.${columnName}' must have dbType.`);
      }
      if (typeof columnObj.nullable !== 'boolean') {
        throw new Error(`Column '${tableName}.${columnName}' must have nullable boolean.`);
      }
      if (typeof columnObj.isPrimaryKey !== 'boolean') {
        throw new Error(`Column '${tableName}.${columnName}' must have isPrimaryKey boolean.`);
      }
      if (typeof columnObj.isForeignKey !== 'boolean') {
        throw new Error(`Column '${tableName}.${columnName}' must have isForeignKey boolean.`);
      }
      if (typeof columnObj.semanticType !== 'string') {
        throw new Error(`Column '${tableName}.${columnName}' must have semanticType.`);
      }
      if (!isSemanticType(columnObj.semanticType)) {
        throw new Error(
          `Column '${tableName}.${columnName}' has unsupported semanticType '${columnObj.semanticType}'.`,
        );
      }
      if (columnObj.isForeignKey) {
        if (!columnObj.references || typeof columnObj.references !== 'object') {
          throw new Error(`Column '${tableName}.${columnName}' must have references object.`);
        }
        const references = columnObj.references as Record<string, unknown>;
        if (typeof references.tableName !== 'string' || references.tableName.trim().length === 0) {
          throw new Error(`Column '${tableName}.${columnName}' references.tableName is required.`);
        }
        if (typeof references.columnName !== 'string' || references.columnName.trim().length === 0) {
          throw new Error(`Column '${tableName}.${columnName}' references.columnName is required.`);
        }
      }
    }
  }

  const result = root as unknown as AiClassificationResult;
  const tableNames = new Set(Object.keys(result.tables));

  for (const [tableName, tableValue] of Object.entries(result.tables)) {
    for (const [columnName, columnValue] of Object.entries(tableValue.columns)) {
      if (!columnValue.isForeignKey || !columnValue.references) {
        continue;
      }
      if (!tableNames.has(columnValue.references.tableName)) {
        throw new Error(
          `Column '${tableName}.${columnName}' references unknown table '${columnValue.references.tableName}'.`,
        );
      }
      const referencedTable = result.tables[columnValue.references.tableName];
      if (!referencedTable.columns[columnValue.references.columnName]) {
        throw new Error(
          `Column '${tableName}.${columnName}' references unknown column '${columnValue.references.tableName}.${columnValue.references.columnName}'.`,
        );
      }
    }
  }

  return result;
}

export function buildDatabaseSchemaFromClassification(
  classification: AiClassificationResult,
): DatabaseSchema {
  return {
    tables: Object.entries(classification.tables).map(([tableName, tableValue]) => {
      const columns = Object.entries(tableValue.columns).map(([columnName, columnValue]) => ({
        name: columnName,
        dbType: columnValue.dbType,
        nullable: columnValue.nullable,
        isPrimaryKey: columnValue.isPrimaryKey,
      }));

      return {
        name: tableName,
        columns,
        primaryKeyColumns: Object.entries(tableValue.columns)
          .filter(([, columnValue]) => columnValue.isPrimaryKey)
          .map(([columnName]) => columnName),
        foreignKeys: Object.entries(tableValue.columns)
          .filter(([, columnValue]) => columnValue.isForeignKey && columnValue.references)
          .map(([columnName, columnValue]) => ({
            columns: [columnName],
            referencedTable: columnValue.references!.tableName,
            referencedColumns: [columnValue.references!.columnName],
          })),
      };
    }),
  };
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
