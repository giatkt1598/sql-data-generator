import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
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
  runSalt: string;
}

const DEFAULT_TABLE_ROWS = 10;
const MAX_ROWS_PER_TABLE = 100_000;
const MAX_TOTAL_ROWS = 200_000;

function inferFallbackSemanticType(column: ColumnSchema): SemanticDataType {
  const normalized = normalizeSqlType(column.dbType);
  return SQL_TYPE_DEFAULT_CLASSIFICATION[normalized] ?? 'unknown';
}

function generateScalarValue(
  semanticType: SemanticDataType,
  column: ColumnSchema,
  rowIndex: number,
  runSalt: string,
): string | number | boolean {
  const salt = runSalt.slice(0, 8).toLowerCase();

  switch (semanticType) {
    case 'guid':
      return faker.string.uuid().toUpperCase();
    case 'int':
    case 'number':
      return faker.number.int({ min: 1, max: 1_000_000 });
    case 'float':
      return faker.number.float({ min: 1, max: 1_000_000, fractionDigits: 2 });
    case 'fullName':
      return faker.person.fullName();
    case 'firstName':
      return faker.person.firstName();
    case 'lastName':
      return faker.person.lastName();
    case 'gender':
      return faker.person.sexType();
    case 'email':
      return faker.internet.email({
        provider: 'example.com',
        firstName: `user${rowIndex + 1}`,
        lastName: salt,
      });
    case 'phoneNumber':
      return faker.helpers.replaceSymbols(`09${salt.slice(0, 4)}####`);
    case 'address':
      return faker.location.streetAddress();
    case 'city':
      return faker.location.city();
    case 'country':
      return faker.location.country();
    case 'zipCode':
      return faker.location.zipCode();
    case 'companyName':
      return faker.company.name();
    case 'jobTitle':
      return faker.person.jobTitle();
    case 'url':
      return faker.internet.url({ appendSlash: false });
    case 'date':
      return faker.date
        .between({ from: '2024-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' })
        .toISOString()
        .slice(0, 10);
    case 'dateTime':
      return faker.date
        .between({ from: '2024-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' })
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
    case 'boolean':
      return faker.datatype.boolean();
    case 'text':
      return faker.lorem.words({ min: 1, max: 3 });
    case 'unknown':
    default:
      return `${faker.lorem.word()}_${salt}_${rowIndex + 1}`;
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
    semanticType: inferFallbackSemanticType(column),
    blankPercentage: 0,
  };
}

function shouldGenerateNull(
  tableName: string,
  columnName: string,
  rowIndex: number,
  blankPercentage: number | undefined,
): boolean {
  const pct = typeof blankPercentage === 'number' ? blankPercentage : 0;
  if (pct <= 0) {
    return false;
  }
  if (pct >= 100) {
    return true;
  }

  const seed = `${tableName}.${columnName}.${rowIndex}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000003;
  }
  return Math.abs(hash % 100) < pct;
}

function generateCustomListValue(
  customValues: Array<string | number | boolean> | undefined,
  rowIndex: number,
): string | number | boolean | null {
  if (!customValues || customValues.length === 0) {
    return null;
  }
  return customValues[rowIndex % customValues.length];
}

function sanitizeDistribution(input: number[] | undefined): number[] {
  if (!input || input.length === 0) {
    return [1];
  }
  const filtered = input.filter((value) => Number.isInteger(value) && value >= 0);
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
  const merged = existing.concat(parentIndexes);
  tableAssignments.set(parentTable, merged);
  assignmentsByTable.set(childTable, tableAssignments);
}

function ensureRowCountWithinLimits(tableName: string, rowCount: number) {
  if (rowCount > MAX_ROWS_PER_TABLE) {
    throw new Error(
      `Table '${tableName}' expands to ${rowCount.toLocaleString()} rows. ` +
        `Reduce Schema Relationships distribution/count settings.`,
    );
  }
}

function ensurePlanWithinLimits(rowCountByTable: Map<string, number>) {
  let totalRows = 0;
  for (const [tableName, rowCount] of rowCountByTable.entries()) {
    ensureRowCountWithinLimits(tableName, rowCount);
    totalRows += rowCount;
  }

  if (totalRows > MAX_TOTAL_ROWS) {
    throw new Error(
      `Generated plan expands to ${totalRows.toLocaleString()} rows in total. ` +
        `Reduce Schema Relationships distribution/count settings.`,
    );
  }
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
      ensureRowCountWithinLimits(tableName, rowCountByTable.get(tableName) ?? 0);
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

  ensurePlanWithinLimits(rowCountByTable);

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
      const hasForeignKey = table.foreignKeys.some((foreignKey) => foreignKey.columns.includes(column.name));
      if (shouldGenerateNull(table.name, column.name, rowIndex, rule.blankPercentage)) {
        row[column.name] = null;
        continue;
      }
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

      if (rule.kind === 'customList') {
        row[column.name] = generateCustomListValue(rule.customValues, rowIndex);
        continue;
      }

      if (hasForeignKey && column.nullable) {
        row[column.name] = null;
        continue;
      }

      const semanticType =
        rule.kind === 'semantic'
          ? (rule.semanticType ?? inferFallbackSemanticType(column))
          : inferFallbackSemanticType(column);
      row[column.name] = generateScalarValue(semanticType, column, rowIndex, context.runSalt);
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
    runSalt: randomUUID().replace(/-/g, ''),
  };

  for (const table of orderedTables) {
    const generated = generateRowsForTable(table, context, rules);
    context.generatedByTable.set(table.name, generated);
    result.push(generated);
  }

  return result;
}
