import { normalizeSqlType, SQL_TYPE_DEFAULT_CLASSIFICATION } from '../core/semanticTypes';
import {
  ColumnGenerationRule,
  ColumnSchema,
  GeneratedTableRows,
  GenerationOptions,
  SchemaRelationshipNode,
  SchemaRelationshipsConfig,
  SemanticDataType,
  TableColumnRules,
  TableSchema,
} from '../core/types';

interface GenerationPlan {
  rowCountByTable: Map<string, number>;
  parentAssignments: Map<string, Map<string, number[]>>;
  selfColumnDistributions: Map<string, Map<string, number[]>>;
}

interface GenerateContext {
  generatedByTable: Map<string, GeneratedTableRows>;
  plan: GenerationPlan;
}

const DEFAULT_TABLE_ROWS = 10;

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

function sanitizeDistribution(input: number[] | undefined): number[] {
  if (!input || input.length === 0) {
    return [1];
  }
  const filtered = input.filter((value) => Number.isInteger(value) && value > 0);
  return filtered.length > 0 ? filtered : [1];
}

function extractChildren(node: SchemaRelationshipNode): Array<[string, SchemaRelationshipNode]> {
  const children: Array<[string, SchemaRelationshipNode]> = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'count' || key === 'distribution') {
      continue;
    }
    if (key.includes('.')) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      children.push([key, value as SchemaRelationshipNode]);
    }
  }
  return children;
}

function extractSelfColumnDistributions(
  tableName: string,
  node: SchemaRelationshipNode,
): Array<[string, number[]]> {
  const result: Array<[string, number[]]> = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'count' || key === 'distribution') {
      continue;
    }
    if (!key.includes('.')) {
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const [nodeTable, nodeColumn] = key.split('.', 2);
    if (nodeTable !== tableName || !nodeColumn) {
      continue;
    }
    const distribution = sanitizeDistribution((value as SchemaRelationshipNode).distribution);
    result.push([nodeColumn, distribution]);
  }
  return result;
}

function addParentAssignments(
  assignmentsByTable: Map<string, Map<string, number[]>>,
  childTable: string,
  parentTable: string,
  parentIndexes: number[],
) {
  const tableAssignments = assignmentsByTable.get(childTable) ?? new Map<string, number[]>();
  const existing = tableAssignments.get(parentTable) ?? [];
  existing.push(...parentIndexes);
  tableAssignments.set(parentTable, existing);
  assignmentsByTable.set(childTable, tableAssignments);
}

function buildGenerationPlan(
  tables: TableSchema[],
  options: GenerationOptions,
  relationships?: SchemaRelationshipsConfig,
): GenerationPlan {
  const rowCountByTable = new Map<string, number>();
  const parentAssignments = new Map<string, Map<string, number[]>>();
  const selfColumnDistributions = new Map<string, Map<string, number[]>>();

  if (!relationships) {
    for (const table of tables) {
      rowCountByTable.set(table.name, DEFAULT_TABLE_ROWS);
    }
    return { rowCountByTable, parentAssignments, selfColumnDistributions };
  }

  for (const table of tables) {
    rowCountByTable.set(table.name, 0);
  }

  function getAssignedCount(tableName: string): number {
    const map = parentAssignments.get(tableName);
    if (!map) {
      return 0;
    }
    let total = 0;
    for (const indexes of map.values()) {
      total += indexes.length;
    }
    return total;
  }

  function walkNode(
    tableName: string,
    node: SchemaRelationshipNode,
    parentTable: string | undefined,
    parentIndexes: number[] | undefined,
  ) {
    const currentCount = rowCountByTable.get(tableName) ?? 0;
    let ownIndexes: number[] = [];

    if (!parentTable) {
      const rootCount =
        Number.isInteger(node.count) && (node.count as number) > 0
          ? (node.count as number)
          : DEFAULT_TABLE_ROWS;
      rowCountByTable.set(tableName, rootCount);
      ownIndexes = Array.from({ length: rootCount }, (_value, index) => index);
    } else {
      const distribution = sanitizeDistribution(node.distribution);
      const parentIndexList = parentIndexes ?? [];
      ownIndexes = [];
      for (const [orderIndex, parentIndex] of parentIndexList.entries()) {
        const copies = distribution[orderIndex % distribution.length];
        for (let copy = 0; copy < copies; copy += 1) {
          ownIndexes.push(parentIndex);
        }
      }
      addParentAssignments(parentAssignments, tableName, parentTable, ownIndexes);
      rowCountByTable.set(tableName, Math.max(currentCount, getAssignedCount(tableName)));
    }

    for (const [columnName, distribution] of extractSelfColumnDistributions(tableName, node)) {
      const byColumn = selfColumnDistributions.get(tableName) ?? new Map<string, number[]>();
      byColumn.set(columnName, distribution);
      selfColumnDistributions.set(tableName, byColumn);
      // Loop safeguard: ignore nested recursion for self table.column nodes.
    }

    for (const [childTable, childNode] of extractChildren(node)) {
      if (!rowCountByTable.has(childTable)) {
        continue;
      }
      walkNode(childTable, childNode, tableName, ownIndexes);
    }
  }

  for (const rootItem of relationships) {
    for (const [rootTableName, node] of Object.entries(rootItem)) {
      if (!rowCountByTable.has(rootTableName)) {
        continue;
      }
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        continue;
      }
      walkNode(rootTableName, node as SchemaRelationshipNode, undefined, undefined);
    }
  }

  for (const table of tables) {
    if ((rowCountByTable.get(table.name) ?? 0) === 0) {
      rowCountByTable.set(table.name, DEFAULT_TABLE_ROWS);
    }
  }

  return { rowCountByTable, parentAssignments, selfColumnDistributions };
}

function findReferenceValueForTable(
  currentTableName: string,
  currentColumnName: string,
  rule: ColumnGenerationRule,
  rowIndex: number,
  context: GenerateContext,
  currentRows: Record<string, string | number | boolean | null>[],
): string | number | boolean | null {
  if (rule.kind !== 'reference' || !rule.reference) {
    return null;
  }
  const parentTable = rule.reference.tableName;
  const parentRows =
    parentTable === currentTableName
      ? currentRows
      : (context.generatedByTable.get(parentTable)?.rows ?? []);
  if (parentRows.length === 0) {
    return null;
  }

  if (parentTable === currentTableName) {
    const distribution = context.plan.selfColumnDistributions
      .get(currentTableName)
      ?.get(currentColumnName);
    if (distribution && distribution.length > 0) {
      const step = distribution[rowIndex % distribution.length];
      if (step <= 0) {
        return null;
      }
      const parentIndex = rowIndex - step;
      if (parentIndex < 0 || parentIndex >= parentRows.length) {
        return null;
      }
      const parentRow = parentRows[parentIndex];
      return (parentRow[rule.reference.columnName] as string | number | boolean | null) ?? null;
    }
  }

  const plannedIndex =
    context.plan.parentAssignments.get(currentTableName)?.get(parentTable)?.at(rowIndex);
  const targetIndex = plannedIndex ?? rowIndex;
  const parentRow = parentRows[targetIndex % parentRows.length];
  return (parentRow[rule.reference.columnName] as string | number | boolean | null) ?? null;
}

function generateRowsForTable(
  table: TableSchema,
  context: GenerateContext,
  rules?: TableColumnRules,
): GeneratedTableRows {
  const rowCount = context.plan.rowCountByTable.get(table.name) ?? 0;
  const rows: Record<string, string | number | boolean | null>[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row: Record<string, string | number | boolean | null> = {};

    for (const column of table.columns) {
      const rule = getColumnRule(table.name, column, rules);
      const referenceValue = findReferenceValueForTable(
        table.name,
        column.name,
        rule,
        rowIndex,
        context,
        rows,
      );
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
  relationships?: SchemaRelationshipsConfig,
): GeneratedTableRows[] {
  const result: GeneratedTableRows[] = [];
  const context: GenerateContext = {
    generatedByTable: new Map<string, GeneratedTableRows>(),
    plan: buildGenerationPlan(orderedTables, options, relationships),
  };

  for (const table of orderedTables) {
    const generated = generateRowsForTable(table, context, rules);
    context.generatedByTable.set(table.name, generated);
    result.push(generated);
  }

  return result;
}
