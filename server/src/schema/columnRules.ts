import { normalizeSqlType, SQL_TYPE_DEFAULT_CLASSIFICATION } from '../core/semanticTypes';
import {
  AiClassificationResult,
  ColumnGenerationRule,
  SemanticDataType,
  TableColumnRules,
  TableSchema,
} from '../core/types';

function fallbackSemantic(dbType: string): SemanticDataType {
  const normalized = normalizeSqlType(dbType);
  return SQL_TYPE_DEFAULT_CLASSIFICATION[normalized] ?? 'unknown';
}

export function buildDefaultColumnRules(
  tables: TableSchema[],
  classification: AiClassificationResult,
): TableColumnRules {
  const result: TableColumnRules = {};
  const tableMap = new Map(tables.map((table) => [table.name, table]));

  for (const table of tables) {
    result[table.name] = {};
    for (const column of table.columns) {
      const fk = table.foreignKeys.find((item) => item.columns.includes(column.name));
      if (fk) {
        const columnIndex = fk.columns.indexOf(column.name);
        const refColumn = fk.referencedColumns[columnIndex];
        if (tableMap.has(fk.referencedTable)) {
          result[table.name][column.name] = {
            kind: 'reference',
            reference: {
              tableName: fk.referencedTable,
              columnName: refColumn,
            },
          };
          continue;
        }
      }

      const fromAi = classification.tables[table.name]?.columns[column.name]?.semanticType;
      result[table.name][column.name] = {
        kind: 'semantic',
        semanticType: fromAi ?? (column.isPrimaryKey ? 'id' : fallbackSemantic(column.dbType)),
      };
    }
  }

  return result;
}

function isSemanticRule(rule: ColumnGenerationRule): boolean {
  return rule.kind === 'semantic' && typeof rule.semanticType === 'string';
}

function isReferenceRule(rule: ColumnGenerationRule): boolean {
  return (
    rule.kind === 'reference' &&
    typeof rule.reference?.tableName === 'string' &&
    typeof rule.reference?.columnName === 'string'
  );
}

export function sanitizeColumnRules(
  tables: TableSchema[],
  input: TableColumnRules | undefined,
  fallbackRules: TableColumnRules,
): TableColumnRules {
  if (!input) {
    return fallbackRules;
  }

  const tableSet = new Set(tables.map((table) => table.name));
  const tableColumns = new Map<string, Set<string>>();
  for (const table of tables) {
    tableColumns.set(table.name, new Set(table.columns.map((column) => column.name)));
  }

  const merged: TableColumnRules = {};
  for (const table of tables) {
    merged[table.name] = {};
    for (const column of table.columns) {
      const candidate = input[table.name]?.[column.name];
      if (candidate && isSemanticRule(candidate)) {
        merged[table.name][column.name] = candidate;
        continue;
      }
      if (candidate && isReferenceRule(candidate)) {
        const reference = candidate.reference;
        if (!reference) {
          merged[table.name][column.name] = fallbackRules[table.name][column.name];
          continue;
        }
        const hasTable = tableSet.has(reference.tableName);
        const hasColumn = tableColumns.get(reference.tableName)?.has(reference.columnName);
        if (hasTable && hasColumn) {
          merged[table.name][column.name] = candidate;
          continue;
        }
      }
      merged[table.name][column.name] = fallbackRules[table.name][column.name];
    }
  }

  return merged;
}
