import { TableColumnRules, TableSchema } from '../core/types';

function addEdge(
  graph: Map<string, string[]>,
  incomingCount: Map<string, number>,
  parent: string,
  child: string,
) {
  const children = graph.get(parent) ?? [];
  if (children.includes(child)) {
    return;
  }
  children.push(child);
  graph.set(parent, children);
  incomingCount.set(child, (incomingCount.get(child) ?? 0) + 1);
}

export function resolveTableOrder(
  tables: TableSchema[],
  columnRules?: TableColumnRules,
): TableSchema[] {
  const byName = new Map(tables.map((table) => [table.name, table]));
  const incomingCount = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const table of tables) {
    incomingCount.set(table.name, 0);
    graph.set(table.name, []);
  }

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      if (byName.has(fk.referencedTable) && fk.referencedTable !== table.name) {
        addEdge(graph, incomingCount, fk.referencedTable, table.name);
      }
    }
  }

  if (columnRules) {
    for (const table of tables) {
      const rulesForTable = columnRules[table.name] ?? {};
      for (const column of table.columns) {
        const rule = rulesForTable[column.name];
        if (rule?.kind !== 'reference' || !rule.reference) {
          continue;
        }
        const parentTable = rule.reference.tableName;
        if (!byName.has(parentTable) || parentTable === table.name) {
          continue;
        }
        addEdge(graph, incomingCount, parentTable, table.name);
      }
    }
  }

  const queue: string[] = [];
  for (const [name, count] of incomingCount.entries()) {
    if (count === 0) {
      queue.push(name);
    }
  }

  const sortedNames: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    sortedNames.push(current);

    for (const child of graph.get(current) ?? []) {
      const nextCount = (incomingCount.get(child) ?? 0) - 1;
      incomingCount.set(child, nextCount);
      if (nextCount === 0) {
        queue.push(child);
      }
    }
  }

  if (sortedNames.length !== tables.length) {
    throw new Error('Cannot resolve table order because dependencies are cyclic.');
  }

  return sortedNames.map((name) => byName.get(name) as TableSchema);
}
