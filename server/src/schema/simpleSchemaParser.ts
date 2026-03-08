import { ColumnSchema, DatabaseSchema, ForeignKeySchema, TableSchema } from '../core/types';

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
    columns: fkMatch[1].split(',').map((x) => x.trim().replace(/["`\[\]]/g, '')),
    referencedTable: fkMatch[2].trim().replace(/["`\[\]]/g, ''),
    referencedColumns: fkMatch[3].split(',').map((x) => x.trim().replace(/["`\[\]]/g, '')),
  };
}

export function parseCreateTableSql(sqlText: string): DatabaseSchema {
  const tableRegex = /create\s+table\s+([^\s(]+)\s*\(([\s\S]*?)\);/gi;
  const tables: TableSchema[] = [];

  let tableMatch: RegExpExecArray | null = tableRegex.exec(sqlText);
  while (tableMatch) {
    const rawTableName = tableMatch[1].trim();
    const tableName = rawTableName.replace(/["`\[\]]/g, '');
    const body = tableMatch[2].trim();
    const parts = splitColumnAndConstraints(body);

    const columns: ColumnSchema[] = [];
    const foreignKeys: ForeignKeySchema[] = [];
    const primaryKeyColumns: string[] = [];

    for (const part of parts) {
      if (/^constraint\s+/i.test(part) || /^foreign\s+key/i.test(part)) {
        const parsedFk = parseInlineForeignKey(part);
        if (parsedFk) {
          foreignKeys.push(parsedFk);
        }

        const pkTableMatch = part.match(/primary key\s*\(([^)]+)\)/i);
        if (pkTableMatch) {
          primaryKeyColumns.push(
            ...pkTableMatch[1].split(',').map((x) => x.trim().replace(/["`\[\]]/g, '')),
          );
        }
        continue;
      }

      const columnMatch = part.match(/^([^\s]+)\s+(.+)$/);
      if (!columnMatch) {
        continue;
      }

      const columnName = columnMatch[1].replace(/["`\[\]]/g, '');
      const definition = columnMatch[2];
      const dbTypeMatch = definition.match(/^[a-zA-Z]+(\s*\([^)]+\))?/);
      const dbType = dbTypeMatch ? dbTypeMatch[0].trim() : 'text';
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

    tableMatch = tableRegex.exec(sqlText);
  }

  return { tables };
}
