import type { ColumnDesignerModel } from '../models/apiModels';

type RelationshipNode = {
  count?: number;
  distribution?: number[];
  [childTableName: string]: RelationshipNode | number[] | number | undefined;
};

type RelationshipConfig = Array<Record<string, RelationshipNode>>;

const DEFAULT_TABLE_ROWS = 10;
const MAX_ESTIMATED_ROWS = 9_999_999;
const OVERFLOW_SUMMARY = 'Estimated rows: 9999999+';

function sanitizeDistribution(input: number[] | undefined): number[] {
  if (!input || input.length === 0) {
    return [1];
  }
  const filtered = input.filter((value) => Number.isInteger(value) && value >= 0);
  return filtered.length > 0 ? filtered : [1];
}

function buildChildCount(parentCount: number, distribution: number[]): number {
  let total = 0;
  for (let index = 0; index < parentCount; index += 1) {
    total += distribution[index % distribution.length];
    if (total > MAX_ESTIMATED_ROWS) {
      return MAX_ESTIMATED_ROWS + 1;
    }
  }
  return total;
}

export interface RelationshipEstimateResult {
  summary: string;
  rowCountByTable: Record<string, number>;
  error?: string;
  overflow?: boolean;
}

export function estimateRelationshipRows(
  relationshipsJson: string,
  designerModel: ColumnDesignerModel | null,
): RelationshipEstimateResult | null {
  if (!designerModel) {
    return null;
  }

  const tableNames = designerModel.tables.map((table) => table.name);
  const rowCountByTable = new Map<string, number>(tableNames.map((tableName) => [tableName, 0]));

  const trimmed = relationshipsJson.trim();
  if (!trimmed) {
    for (const tableName of tableNames) {
      rowCountByTable.set(tableName, DEFAULT_TABLE_ROWS);
    }
    const plain = Object.fromEntries(rowCountByTable);
    const totalRows = Object.values(plain).reduce((sum, value) => sum + value, 0);
    return {
      summary:
        totalRows > MAX_ESTIMATED_ROWS
          ? OVERFLOW_SUMMARY
          : `Estimated rows: ${totalRows.toLocaleString()}`,
      rowCountByTable: plain,
      overflow: totalRows > MAX_ESTIMATED_ROWS,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      summary: 'Estimated rows: unavailable',
      rowCountByTable: Object.fromEntries(rowCountByTable),
      error: 'Schema Relationships JSON is not valid JSON.',
    };
  }

  const config: RelationshipConfig = Array.isArray(parsed)
    ? (parsed as RelationshipConfig)
    : ([parsed] as RelationshipConfig);

  const path = new Set<string>();

  function walkNode(tableName: string, node: RelationshipNode, parentCount?: number) {
    if (!rowCountByTable.has(tableName)) {
      return;
    }
    const visitKey = `${tableName}:${parentCount ?? 'root'}`;
    if (path.has(visitKey)) {
      throw new Error(`Cycle detected in Schema Relationships at '${tableName}'.`);
    }
    path.add(visitKey);

    const nextCount =
      typeof parentCount === 'number'
        ? buildChildCount(parentCount, sanitizeDistribution(node.distribution))
        : Number.isInteger(node.count) && (node.count as number) > 0
          ? (node.count as number)
          : DEFAULT_TABLE_ROWS;

    if (nextCount > MAX_ESTIMATED_ROWS) {
      throw new Error('__ESTIMATE_OVERFLOW__');
    }

    rowCountByTable.set(tableName, Math.max(rowCountByTable.get(tableName) ?? 0, nextCount));

    for (const [key, value] of Object.entries(node)) {
      if (key === 'count' || key === 'distribution' || key.includes('.')) {
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      walkNode(key, value as RelationshipNode, nextCount);
    }

    path.delete(visitKey);
  }

  try {
    for (const item of config) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }
      for (const [tableName, node] of Object.entries(item)) {
        if (!node || typeof node !== 'object' || Array.isArray(node)) {
          continue;
        }
        walkNode(tableName, node as RelationshipNode);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === '__ESTIMATE_OVERFLOW__') {
      return {
        summary: OVERFLOW_SUMMARY,
        rowCountByTable: Object.fromEntries(rowCountByTable),
        overflow: true,
      };
    }
    return {
      summary: 'Estimated rows: unavailable',
      rowCountByTable: Object.fromEntries(rowCountByTable),
      error: error instanceof Error ? error.message : 'Failed to estimate rows.',
    };
  }

  for (const tableName of tableNames) {
    if ((rowCountByTable.get(tableName) ?? 0) === 0) {
      rowCountByTable.set(tableName, DEFAULT_TABLE_ROWS);
    }
  }

  const plain = Object.fromEntries(rowCountByTable);
  const totalRows = Object.values(plain).reduce((sum, value) => sum + value, 0);
  return {
    summary:
      totalRows > MAX_ESTIMATED_ROWS
        ? OVERFLOW_SUMMARY
        : `Estimated rows: ${totalRows.toLocaleString()}`,
    rowCountByTable: plain,
    overflow: totalRows > MAX_ESTIMATED_ROWS,
  };
}
