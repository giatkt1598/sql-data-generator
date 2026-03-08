import {
  DATA_TYPE_GROUPS,
  SEMANTIC_DATA_TYPES,
  type DataTypeGroup,
  type SemanticDataType,
} from '../../../shared/dataTypes';

export interface ProjectEntity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type DataTypeCatalogValue = SemanticDataType | 'customList';
export { DATA_TYPE_GROUPS, SEMANTIC_DATA_TYPES };
export type { DataTypeGroup, SemanticDataType };

export interface ColumnGenerationRule {
  kind: 'semantic' | 'reference' | 'customList';
  fieldName?: string;
  semanticType?: SemanticDataType;
  reference?: {
    tableName: string;
    columnName: string;
  };
  customValues?: Array<string | number | boolean>;
  blankPercentage?: number;
  numberOptions?: {
    min?: number;
    max?: number;
    decimals?: number;
  };
  dateTimeOptions?: {
    start?: string;
    end?: string;
    format?: string;
  };
  timeOptions?: {
    from?: string;
    to?: string;
    format?: string;
  };
  sequenceOptions?: {
    startAt?: number;
    step?: number;
    repeat?: number;
  };
  digitSequenceOptions?: {
    format?: string;
  };
  formulaOptions?: {
    expression?: string;
  };
  regularExpressionOptions?: {
    pattern?: string;
  };
  emailOptions?: {
    domains?: string[];
  };
  textOptions?: {
    minLength?: number;
    maxLength?: number;
    unit?: 'words' | 'characters';
  };
}

export type TableColumnRules = Record<string, Record<string, ColumnGenerationRule>>;

export interface GenerationRequestEntity {
  id: string;
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  columnRules?: TableColumnRules;
  schemaRelationshipsJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnDesignerModel {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      dbType: string;
      nullable: boolean;
      isPrimaryKey: boolean;
    }>;
  }>;
  columnRules: TableColumnRules;
}

export interface PreviewResult {
  preview: string;
  totalLines: number;
}

export interface DataTypeDefinition {
  value: DataTypeCatalogValue;
  displayName: string;
  description: string;
  groups: DataTypeGroup[];
}
