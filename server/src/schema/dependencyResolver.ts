import { TableSchema } from '../core/types';

export function resolveTableOrder(tables: TableSchema[]): TableSchema[] {
  const byName = new Map(tables.map((table) => [table.name, table]));
  const incomingCount = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const table of tables) {
    incomingCount.set(table.name, 0);
    graph.set(table.name, []);
  }

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      if (!byName.has(fk.referencedTable)) {
        continue;
      }
      graph.get(fk.referencedTable)?.push(table.name);
      incomingCount.set(table.name, (incomingCount.get(table.name) ?? 0) + 1);
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
    throw new Error('Cannot resolve table order because schema has cyclic dependencies.');
  }

  return sortedNames.map((name) => byName.get(name) as TableSchema);
}
