import { ColumnSchema, DatabaseSchema, ForeignKeySchema, TableSchema } from '../core/types';

function normalizeIdentifier(value: string): string {
  return (
    value
      .trim()
      .replace(/\bASC\b|\bDESC\b/gi, '')
      .split('.')
      .map((segment) => segment.trim().replace(/["`\[\]]/g, ''))
      .filter((segment) => segment.length > 0)
      .at(-1) ?? value.trim().replace(/["`\[\]]/g, '')
  );
}

function splitColumnAndConstraints(definition: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of definition) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function parseInlineForeignKey(line: string): ForeignKeySchema | undefined {
  const fkMatch = line.match(/foreign key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*\(([^)]+)\)/i);
  if (!fkMatch) {
    return undefined;
  }

  return {
    columns: fkMatch[1].split(',').map((x) => normalizeIdentifier(x)),
    referencedTable: normalizeIdentifier(fkMatch[2]),
    referencedColumns: fkMatch[3].split(',').map((x) => normalizeIdentifier(x)),
  };
}

function parseCreateTableBlocks(sqlText: string): Array<{ tableName: string; body: string }> {
  const blocks: Array<{ tableName: string; body: string }> = [];
  const createTableRegex = /create\s+table\s+([^\s(]+)\s*\(/gi;

  let match: RegExpExecArray | null = createTableRegex.exec(sqlText);
  while (match) {
    const tableName = normalizeIdentifier(match[1]);
    let index = createTableRegex.lastIndex;
    let depth = 1;
    let body = '';

    while (index < sqlText.length && depth > 0) {
      const char = sqlText[index];
      if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
      }

      if (depth > 0) {
        body += char;
      }

      index += 1;
    }

    if (body.trim()) {
      blocks.push({ tableName, body: body.trim() });
    }

    createTableRegex.lastIndex = index;
    match = createTableRegex.exec(sqlText);
  }

  return blocks;
}

function parseAlterTableForeignKeys(sqlText: string): ForeignKeySchema[] {
  const foreignKeys: ForeignKeySchema[] = [];
  const statements = sqlText
    .split(/^\s*GO\s*$/gim)
    .map((statement) => statement.trim())
    .filter(
      (statement) => /\balter\s+table\b/i.test(statement) && /\bforeign\s+key\b/i.test(statement),
    );

  for (const statement of statements) {
    const match = statement.match(
      /alter\s+table\s+([^\s]+)[\s\S]*?foreign\s+key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*\(([^)]+)\)/i,
    );
    if (!match) {
      continue;
    }

    foreignKeys.push({
      columns: match[2].split(',').map((x) => normalizeIdentifier(x)),
      referencedTable: normalizeIdentifier(match[3]),
      referencedColumns: match[4].split(',').map((x) => normalizeIdentifier(x)),
      tableName: normalizeIdentifier(match[1]),
    } as ForeignKeySchema & { tableName: string });
  }

  return foreignKeys;
}

export function parseCreateTableSql(sqlText: string): DatabaseSchema {
  const tables: TableSchema[] = [];
  const createBlocks = parseCreateTableBlocks(sqlText);

  for (const createBlock of createBlocks) {
    const tableName = createBlock.tableName;
    const body = createBlock.body;
    const parts = splitColumnAndConstraints(body);

    const columns: ColumnSchema[] = [];
    const foreignKeys: ForeignKeySchema[] = [];
    const primaryKeyColumns: string[] = [];

    for (const part of parts) {
      if (
        /^constraint\s+/i.test(part) ||
        /^foreign\s+key/i.test(part) ||
        /^primary\s+key/i.test(part)
      ) {
        const parsedFk = parseInlineForeignKey(part);
        if (parsedFk) {
          foreignKeys.push(parsedFk);
        }

        const pkTableMatch = part.match(/primary\s+key(?:\s+\w+)?\s*\(([^)]+)\)/i);
        if (pkTableMatch) {
          primaryKeyColumns.push(...pkTableMatch[1].split(',').map((x) => normalizeIdentifier(x)));
        }
        continue;
      }

      const columnMatch = part.match(/^([^\s]+)\s+(.+)$/);
      if (!columnMatch) {
        continue;
      }

      const columnName = normalizeIdentifier(columnMatch[1]);
      const definition = columnMatch[2];
      const dbTypeMatch = definition.match(/^\[[^\]]+\](\s*\([^)]+\))?|^[a-zA-Z]+(\s*\([^)]+\))?/);
      const dbType = dbTypeMatch ? dbTypeMatch[0].trim().replace(/[\[\]]/g, '') : 'text';
      const nullable = !/\bnot\s+null\b/i.test(definition);
      const isPrimaryKey = /\bprimary\s+key\b/i.test(definition);

      if (isPrimaryKey) {
        primaryKeyColumns.push(columnName);
      }

      columns.push({
        name: columnName,
        dbType,
        nullable,
        isPrimaryKey,
      });
    }

    tables.push({
      name: tableName,
      columns,
      primaryKeyColumns: [...new Set(primaryKeyColumns)],
      foreignKeys,
    });
  }

  const tableByName = new Map(tables.map((table) => [table.name, table]));
  const alterForeignKeys = parseAlterTableForeignKeys(sqlText) as Array<
    ForeignKeySchema & { tableName: string }
  >;

  for (const foreignKey of alterForeignKeys) {
    const table = tableByName.get(foreignKey.tableName);
    if (!table) {
      continue;
    }

    const alreadyExists = table.foreignKeys.some(
      (item) =>
        item.referencedTable === foreignKey.referencedTable &&
        item.columns.join(',') === foreignKey.columns.join(',') &&
        item.referencedColumns.join(',') === foreignKey.referencedColumns.join(','),
    );

    if (!alreadyExists) {
      table.foreignKeys.push({
        columns: foreignKey.columns,
        referencedTable: foreignKey.referencedTable,
        referencedColumns: foreignKey.referencedColumns,
      });
    }
  }

  return { tables };
}
