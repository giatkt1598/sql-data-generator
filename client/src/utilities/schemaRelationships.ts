import type { ColumnDesignerModel, TableColumnRules } from '../models/apiModels';

type RelationshipNode = {
  count?: number;
  distribution?: number[];
  [childTableName: string]: RelationshipNode | number[] | number | undefined;
};

type RelationshipConfig = Array<Record<string, RelationshipNode>>;

export function buildDefaultSchemaRelationshipsJson(
  designerModel: ColumnDesignerModel,
  columnRules: TableColumnRules,
): string {
  const tables = designerModel.tables;
  const childrenByParent = new Map<string, string[]>();
  const parentByTable = new Map<string, string>();

  for (const table of tables) {
    const rulesForTable = columnRules[table.name] ?? {};
    let selectedParent: string | undefined;

    for (const column of table.columns) {
      const rule = rulesForTable[column.name];
      if (rule?.kind === 'reference' && rule.reference) {
        selectedParent = rule.reference.tableName;
        break;
      }
    }

    if (selectedParent && selectedParent !== table.name) {
      parentByTable.set(table.name, selectedParent);
      const list = childrenByParent.get(selectedParent) ?? [];
      if (!list.includes(table.name)) {
        list.push(table.name);
      }
      childrenByParent.set(selectedParent, list);
    }
  }

  const hasKnownParent = new Set(parentByTable.keys());
  const roots = tables
    .map((table) => table.name)
    .filter((tableName) => !hasKnownParent.has(tableName));

  const visited = new Set<string>();
  function buildNode(tableName: string, asRoot: boolean): RelationshipNode {
    if (visited.has(tableName)) {
      return asRoot ? { count: 1000 } : { distribution: [1] };
    }
    visited.add(tableName);

    const node: RelationshipNode = asRoot ? { count: 1000 } : { distribution: [1] };
    const rulesForTable = columnRules[tableName] ?? {};
    for (const [columnName, rule] of Object.entries(rulesForTable)) {
      if (rule.kind === 'reference' && rule.reference?.tableName === tableName) {
        node[`${tableName}.${columnName}`] = { distribution: [1] };
      }
    }

    const children = childrenByParent.get(tableName) ?? [];
    for (const child of children) {
      node[child] = buildNode(child, false);
    }
    return node;
  }

  const config: RelationshipConfig = [];
  for (const root of roots) {
    config.push({ [root]: buildNode(root, true) });
  }

  const existingRoots = new Set(config.flatMap((item) => Object.keys(item)));
  for (const table of tables) {
    if (!existingRoots.has(table.name) && !hasKnownParent.has(table.name)) {
      config.push({ [table.name]: { count: 1000 } });
    }
  }

  return JSON.stringify(config, null, 2).replace(
    /\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]/g,
    (_fullMatch, values: string) => `[${values.replace(/\s+/g, '')}]`,
  );
}
