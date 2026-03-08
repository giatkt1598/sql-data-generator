import { normalizeSqlType, SQL_TYPE_DEFAULT_CLASSIFICATION } from '../core/semanticTypes';
import {
  ColumnGenerationRule,
  ColumnSchema,
  GeneratedTableRows,
  GenerationOptions,
  SemanticDataType,
  TableColumnRules,
  TableSchema,
} from '../core/types';

interface GenerateContext {
  generatedByTable: Map<string, GeneratedTableRows>;
}

function inferFallbackSemanticType(column: ColumnSchema): SemanticDataType {
  const normalized = normalizeSqlType(column.dbType);
  return SQL_TYPE_DEFAULT_CLASSIFICATION[normalized] ?? 'unknown';
}

function generateScalarValue(
  semanticType: SemanticDataType,
  rowIndex: number,
): string | number | boolean {
  switch (semanticType) {
    case 'id':
    case 'number':
      return rowIndex + 1;
    case 'fullName':
      return `User ${rowIndex + 1}`;
    case 'firstName':
      return `First${rowIndex + 1}`;
    case 'lastName':
      return `Last${rowIndex + 1}`;
    case 'email':
      return `user${rowIndex + 1}@example.com`;
    case 'phoneNumber':
      return `090000${String(rowIndex + 1).padStart(4, '0')}`;
    case 'address':
      return `${100 + rowIndex} Sample Street`;
    case 'city':
      return 'Ho Chi Minh City';
    case 'country':
      return 'Vietnam';
    case 'zipCode':
      return `${70000 + rowIndex}`;
    case 'companyName':
      return `Company ${rowIndex + 1}`;
    case 'jobTitle':
      return 'Software Engineer';
    case 'url':
      return `https://example.com/item-${rowIndex + 1}`;
    case 'date':
      return `2026-01-${String((rowIndex % 28) + 1).padStart(2, '0')}`;
    case 'dateTime':
      return `2026-01-${String((rowIndex % 28) + 1).padStart(2, '0')} 08:00:00`;
    case 'boolean':
      return rowIndex % 2 === 0;
    case 'text':
    case 'unknown':
    default:
      return `value_${rowIndex + 1}`;
  }
}

function getColumnRule(
  tableName: string,
  column: ColumnSchema,
  rules?: TableColumnRules,
): ColumnGenerationRule {
  const rule = rules?.[tableName]?.[column.name];
  if (rule) {
    return rule;
  }
  return {
    kind: 'semantic',
    semanticType: column.isPrimaryKey ? 'id' : inferFallbackSemanticType(column),
  };
}

function findReferenceValue(
  rule: ColumnGenerationRule,
  rowIndex: number,
  context: GenerateContext,
): string | number | boolean | null {
  if (rule.kind !== 'reference' || !rule.reference) {
    return null;
  }

  const parentRows = context.generatedByTable.get(rule.reference.tableName)?.rows;
  if (!parentRows || parentRows.length === 0) {
    return null;
  }
  const parentRow = parentRows[rowIndex % parentRows.length];
  return (parentRow[rule.reference.columnName] as string | number | boolean | null) ?? null;
}

function generateRowsForTable(
  table: TableSchema,
  options: GenerationOptions,
  context: GenerateContext,
  rules?: TableColumnRules,
): GeneratedTableRows {
  const rows: Record<string, string | number | boolean | null>[] = [];

  for (let rowIndex = 0; rowIndex < options.rowsPerTable; rowIndex += 1) {
    const row: Record<string, string | number | boolean | null> = {};

    for (const column of table.columns) {
      const rule = getColumnRule(table.name, column, rules);
      const referenceValue = findReferenceValue(rule, rowIndex, context);
      if (referenceValue !== null) {
        row[column.name] = referenceValue;
        continue;
      }

      const semanticType =
        rule.kind === 'semantic'
          ? (rule.semanticType ?? inferFallbackSemanticType(column))
          : inferFallbackSemanticType(column);
      row[column.name] = generateScalarValue(semanticType, rowIndex);
    }

    rows.push(row);
  }

  return { tableName: table.name, rows };
}

export function generateDataByTableOrder(
  orderedTables: TableSchema[],
  options: GenerationOptions,
  rules?: TableColumnRules,
): GeneratedTableRows[] {
  const result: GeneratedTableRows[] = [];
  const context: GenerateContext = {
    generatedByTable: new Map<string, GeneratedTableRows>(),
  };

  for (const table of orderedTables) {
    const generated = generateRowsForTable(table, options, context, rules);
    context.generatedByTable.set(table.name, generated);
    result.push(generated);
  }

  return result;
}
