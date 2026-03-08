import {
  normalizeSqlType,
  SQL_TYPE_DEFAULT_CLASSIFICATION,
  SUPPORTED_SEMANTIC_TYPES,
} from '../core/semanticTypes';
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

function normalizeBlankPercentage(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
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
            blankPercentage: 0,
          };
          continue;
        }
      }

      const fromAi = classification.tables[table.name]?.columns[column.name]?.semanticType;
      result[table.name][column.name] = {
        kind: 'semantic',
        semanticType: fromAi ?? fallbackSemantic(column.dbType),
        blankPercentage: 0,
      };
    }
  }

  return result;
}

function isSemanticRule(rule: ColumnGenerationRule): boolean {
  return (
    rule.kind === 'semantic' &&
    typeof rule.semanticType === 'string' &&
    SUPPORTED_SEMANTIC_TYPES.includes(rule.semanticType as SemanticDataType)
  );
}

function isReferenceRule(rule: ColumnGenerationRule): boolean {
  return (
    rule.kind === 'reference' &&
    typeof rule.reference?.tableName === 'string' &&
    typeof rule.reference?.columnName === 'string'
  );
}

function isCustomListRule(rule: ColumnGenerationRule): boolean {
  return (
    rule.kind === 'customList' &&
    Array.isArray(rule.customValues) &&
    rule.customValues.length > 0
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
        merged[table.name][column.name] = {
          ...candidate,
          semanticType: candidate.semanticType ?? fallbackSemantic(column.dbType),
          blankPercentage: normalizeBlankPercentage(
            candidate.blankPercentage,
            fallbackRules[table.name][column.name].blankPercentage ?? 0,
          ),
        };
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
          merged[table.name][column.name] = {
            ...candidate,
            blankPercentage: normalizeBlankPercentage(
              candidate.blankPercentage,
              fallbackRules[table.name][column.name].blankPercentage ?? 0,
            ),
          };
          continue;
        }
      }
      if (candidate && isCustomListRule(candidate)) {
        merged[table.name][column.name] = {
          ...candidate,
          blankPercentage: normalizeBlankPercentage(
            candidate.blankPercentage,
            fallbackRules[table.name][column.name].blankPercentage ?? 0,
          ),
        };
        continue;
      }
      merged[table.name][column.name] = {
        ...fallbackRules[table.name][column.name],
        blankPercentage: normalizeBlankPercentage(
          fallbackRules[table.name][column.name].blankPercentage,
          0,
        ),
      };
    }
  }

  return merged;
}
