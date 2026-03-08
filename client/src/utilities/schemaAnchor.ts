export function tableAnchorId(tableName: string): string {
  return `schema-table-${tableName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
}
