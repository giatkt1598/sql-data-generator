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
    return value ? '1' : '0';
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function buildInsertSql(tableData: GeneratedTableRows): string {
  if (tableData.rows.length === 0) {
    return '';
  }
  const columns = Object.keys(tableData.rows[0]);
  const insertLines = tableData.rows.map((row) => {
    const values = columns.map((column) => sqlValue(row[column] ?? null)).join(', ');
    return `INSERT INTO ${tableData.tableName} (${columns.join(', ')}) VALUES (${values});`;
  });

  return [...insertLines, ''].join('\n');
}

export interface SqlFileArtifact {
  fileName: string;
  content: string;
}

export function buildInsertFileArtifacts(tableRows: GeneratedTableRows[]): SqlFileArtifact[] {
  return tableRows.map((tableData, index) => {
    const order = String(index + 1).padStart(3, '0');
    return {
      fileName: `${order}_${tableData.tableName}.sql`,
      content: buildInsertSql(tableData),
    };
  });
}

export function writeInsertFiles(tableRows: GeneratedTableRows[], outputDir: string): string[] {
  fs.mkdirSync(outputDir, { recursive: true });
  const files: string[] = [];

  const artifacts = buildInsertFileArtifacts(tableRows);
  artifacts.forEach((artifact) => {
    const fullPath = path.join(outputDir, artifact.fileName);
    fs.writeFileSync(fullPath, artifact.content, 'utf-8');
    files.push(fullPath);
  });

  return files;
}
