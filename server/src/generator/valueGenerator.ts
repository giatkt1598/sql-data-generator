import { SQL_TYPE_DEFAULT_CLASSIFICATION, normalizeSqlType } from '../core/semanticTypes';
import {
  AiClassificationResult,
  ColumnSchema,
  GeneratedTableRows,
  GenerationOptions,
  SemanticDataType,
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

function getColumnSemanticType(
  tableName: string,
  columnName: string,
  classification: AiClassificationResult,
  column: ColumnSchema,
): SemanticDataType {
  const fromAi = classification.tables[tableName]?.columns[columnName]?.semanticType;
  if (fromAi) {
    return fromAi;
  }
  if (column.isPrimaryKey) {
    return 'id';
  }
  return inferFallbackSemanticType(column);
}

function findForeignKeyValue(
  table: TableSchema,
  columnName: string,
  rowIndex: number,
  context: GenerateContext,
): string | number | boolean | null {
  for (const fk of table.foreignKeys) {
    const fkColumnIndex = fk.columns.indexOf(columnName);
    if (fkColumnIndex < 0) {
      continue;
    }

    const parentRows = context.generatedByTable.get(fk.referencedTable)?.rows;
    if (!parentRows || parentRows.length === 0) {
      return null;
    }

    const parentRow = parentRows[rowIndex % parentRows.length];
    const parentColumn = fk.referencedColumns[fkColumnIndex];
    return (parentRow[parentColumn] as string | number | boolean | null) ?? null;
  }

  return null;
}

function generateRowsForTable(
  table: TableSchema,
  classification: AiClassificationResult,
  options: GenerationOptions,
  context: GenerateContext,
): GeneratedTableRows {
  const rows: Record<string, string | number | boolean | null>[] = [];
  for (let rowIndex = 0; rowIndex < options.rowsPerTable; rowIndex += 1) {
    const row: Record<string, string | number | boolean | null> = {};
    for (const column of table.columns) {
      const fkValue = findForeignKeyValue(table, column.name, rowIndex, context);
      if (fkValue !== null) {
        row[column.name] = fkValue;
        continue;
      }

      const semanticType = getColumnSemanticType(table.name, column.name, classification, column);
      row[column.name] = generateScalarValue(semanticType, rowIndex);
    }
    rows.push(row);
  }

  return { tableName: table.name, rows };
}

export function generateDataByTableOrder(
  orderedTables: TableSchema[],
  classification: AiClassificationResult,
  options: GenerationOptions,
): GeneratedTableRows[] {
  const result: GeneratedTableRows[] = [];
  const context: GenerateContext = {
    generatedByTable: new Map<string, GeneratedTableRows>(),
  };

  for (const table of orderedTables) {
    const generated = generateRowsForTable(table, classification, options, context);
    context.generatedByTable.set(table.name, generated);
    result.push(generated);
  }

  return result;
}
