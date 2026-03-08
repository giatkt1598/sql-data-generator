import type { TableColumnRules } from '../../models/apiModels';

export interface RequestDetailForm {
  name: string;
  schemaSql: string;
  classificationJson: string;
  schemaRelationshipsJson: string;
  locale: string;
}

export interface PickerTarget {
  tableName: string;
  columnName: string;
}

export type ColumnRuleValue = TableColumnRules[string][string];
