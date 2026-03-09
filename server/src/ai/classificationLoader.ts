import { SUPPORTED_SEMANTIC_TYPES } from '../core/semanticTypes';
import {
  AiClassificationResult,
  DatabaseSchema,
  ColumnClassification,
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
  if (!root.tables || typeof root.tables !== 'object') {
    throw new Error('AI classification JSON must contain a tables object.');
  }

  const tables = root.tables as Record<string, unknown>;
  const normalizedTables: AiClassificationResult['tables'] = {};

  for (const [tableName, tableValue] of Object.entries(tables)) {
    if (!tableValue || typeof tableValue !== 'object') {
      throw new Error(`Table '${tableName}' classification must be an object.`);
    }

    const tableObj = tableValue as Record<string, unknown>;
    if (!tableObj.columns || typeof tableObj.columns !== 'object') {
      throw new Error(`Table '${tableName}' must contain a columns object.`);
    }

    const columns = tableObj.columns as Record<string, unknown>;
    const normalizedColumns: Record<string, ColumnClassification> = {};
    for (const [columnName, columnValue] of Object.entries(columns)) {
      if (!columnValue || typeof columnValue !== 'object') {
        throw new Error(`Column '${tableName}.${columnName}' classification must be an object.`);
      }

      const columnObj = columnValue as Record<string, unknown>;
      if (
        typeof columnObj.dbType !== 'undefined' &&
        columnObj.dbType !== null &&
        typeof columnObj.dbType !== 'string'
      ) {
        throw new Error(`Column '${tableName}.${columnName}' dbType must be a string or null.`);
      }
      if (typeof columnObj.nullable !== 'undefined' && typeof columnObj.nullable !== 'boolean') {
        throw new Error(
          `Column '${tableName}.${columnName}' nullable must be boolean when provided.`,
        );
      }
      if (
        typeof columnObj.isPrimaryKey !== 'undefined' &&
        typeof columnObj.isPrimaryKey !== 'boolean'
      ) {
        throw new Error(
          `Column '${tableName}.${columnName}' isPrimaryKey must be boolean when provided.`,
        );
      }
      if (typeof columnObj.semanticType !== 'string') {
        throw new Error(`Column '${tableName}.${columnName}' must have semanticType.`);
      }
      if (!isSemanticType(columnObj.semanticType)) {
        throw new Error(
          `Column '${tableName}.${columnName}' has unsupported semanticType '${columnObj.semanticType}'.`,
        );
      }
      if (
        typeof columnObj.references !== 'undefined' &&
        columnObj.references !== null &&
        (!columnObj.references || typeof columnObj.references !== 'object')
      ) {
        throw new Error(
          `Column '${tableName}.${columnName}' references must be an object or null.`,
        );
      }

      if (typeof columnObj.references !== 'undefined' && columnObj.references !== null) {
        const references = columnObj.references as Record<string, unknown>;
        if (typeof references.tableName !== 'string' || references.tableName.trim().length === 0) {
          throw new Error(`Column '${tableName}.${columnName}' references.tableName is required.`);
        }
        if (
          typeof references.columnName !== 'string' ||
          references.columnName.trim().length === 0
        ) {
          throw new Error(`Column '${tableName}.${columnName}' references.columnName is required.`);
        }
      }

      normalizedColumns[columnName] = {
        semanticType: columnObj.semanticType,
        dbType: typeof columnObj.dbType === 'string' ? columnObj.dbType.trim() || null : null,
        nullable: columnObj.nullable === true,
        isPrimaryKey: columnObj.isPrimaryKey === true,
        references:
          typeof columnObj.references === 'undefined'
            ? null
            : (columnObj.references as ColumnClassification['references']),
      };
    }

    normalizedTables[tableName] = {
      columns: normalizedColumns,
    };
  }

  const result: AiClassificationResult = {
    tables: normalizedTables,
  };
  const tableNames = new Set(Object.keys(result.tables));

  for (const [tableName, tableValue] of Object.entries(result.tables)) {
    for (const [columnName, columnValue] of Object.entries(tableValue.columns)) {
      if (!columnValue.references) {
        continue;
      }
      if (!tableNames.has(columnValue.references.tableName)) {
        columnValue.references = null;
        continue;
      }
      const referencedTable = result.tables[columnValue.references.tableName];
      if (!referencedTable.columns[columnValue.references.columnName]) {
        columnValue.references = null;
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
        dbType: columnValue.dbType ?? '',
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
          .filter(([, columnValue]) => columnValue.references)
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
