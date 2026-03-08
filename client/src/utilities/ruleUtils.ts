import type {
  ColumnGenerationRule,
  DataTypeDefinition,
  SemanticDataType,
} from '../models/apiModels';

export function stringifyRule(
  semanticTypes: DataTypeDefinition[],
  rule?: ColumnGenerationRule,
): string {
  if (!rule) {
    return 'unknown';
  }
  if (rule.kind === 'customList') {
    return 'Custom List';
  }
  if (rule.kind === 'reference' && rule.reference) {
    return `${rule.reference.tableName}.${rule.reference.columnName}`;
  }
  return semanticTypes.find((x) => x.value === rule.semanticType)?.displayName ?? 'unknown';
}

export function parseRule(value: string): ColumnGenerationRule {
  if (value === 'customList') {
    return { kind: 'customList', customValues: [] };
  }
  if (value.includes('.')) {
    const [tableName, columnName] = value.split('.', 2);
    return { kind: 'reference', reference: { tableName, columnName } };
  }
  return { kind: 'semantic', semanticType: value as SemanticDataType };
}
