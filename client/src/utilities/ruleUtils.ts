import type { ColumnGenerationRule, SemanticDataType } from '../models/apiModels';

export function stringifyRule(rule?: ColumnGenerationRule): string {
  if (!rule) {
    return 'unknown';
  }
  if (rule.kind === 'reference' && rule.reference) {
    return `${rule.reference.tableName}.${rule.reference.columnName}`;
  }
  return rule.semanticType ?? 'unknown';
}

export function parseRule(value: string): ColumnGenerationRule {
  if (value.includes('.')) {
    const [tableName, columnName] = value.split('.', 2);
    return { kind: 'reference', reference: { tableName, columnName } };
  }
  return { kind: 'semantic', semanticType: value as SemanticDataType };
}
