import fs from 'fs';
import path from 'path';
import { GeneratedTableRows } from '../core/types';

function sqlValue(value: string | number | boolean | null): string {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function buildInsertSql(tableData: GeneratedTableRows): string {
  if (tableData.rows.length === 0) {
    return '';
  }
  const columns = Object.keys(tableData.rows[0]);
  const valueLines = tableData.rows.map((row) => {
    const values = columns.map((column) => sqlValue(row[column] ?? null)).join(', ');
    return `(${values})`;
  });

  return [
    `INSERT INTO ${tableData.tableName} (${columns.join(', ')})`,
    `VALUES\n${valueLines.join(',\n')};`,
    '',
  ].join('\n');
}

export function writeInsertFiles(tableRows: GeneratedTableRows[], outputDir: string): string[] {
  fs.mkdirSync(outputDir, { recursive: true });
  const files: string[] = [];

  tableRows.forEach((tableData, index) => {
    const order = String(index + 1).padStart(3, '0');
    const fileName = `${order}_${tableData.tableName}.sql`;
    const fullPath = path.join(outputDir, fileName);
    fs.writeFileSync(fullPath, buildInsertSql(tableData), 'utf-8');
    files.push(fullPath);
  });

  return files;
}
