import type {
  CustomListTypeDefinition,
  DataTypeCatalogValue,
  TableColumnRules,
} from '../../models/apiModels';
import { DATA_TYPE_GROUPS } from '../../models/apiModels';

export interface MockDataSchemaDetailForm {
  name: string;
  schemaSql: string;
  classificationJson: string;
  schemaRelationshipsJson: string;
  locale: string;
  sqlProvider: '' | 'sqlserver' | 'postgres' | 'mysql';
}

export interface PickerTarget {
  tableName: string;
  columnName: string;
}

export type ColumnRuleValue = TableColumnRules[string][string];

export type PickerGroupName = (typeof DATA_TYPE_GROUPS)[number] | 'Custom List';

export type PickerItem =
  | {
      key: string;
      kind: 'semantic';
      value: DataTypeCatalogValue;
      groups: PickerGroupName[];
      title: string;
      description: string;
    }
  | {
      key: string;
      kind: 'reference';
      value: string;
      groups: PickerGroupName[];
      title: string;
      description: string;
    }
  | {
      key: string;
      kind: 'customType';
      value: string;
      groups: PickerGroupName[];
      title: string;
      description: string;
      customType: CustomListTypeDefinition;
    };
