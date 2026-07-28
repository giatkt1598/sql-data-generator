import {
  DATA_TYPE_GROUPS,
  SEMANTIC_DATA_TYPES,
  type DataTypeGroup,
  type SemanticDataType,
} from '../../../shared/dataTypes';

export type SqlDialect = 'postgres' | 'mysql' | 'sqlserver' | 'generic';
export type SqlProvider = Exclude<SqlDialect, 'generic'>;

export type DataTypeCatalogValue = SemanticDataType | 'customList';
export { DATA_TYPE_GROUPS, SEMANTIC_DATA_TYPES };
export type { DataTypeGroup, SemanticDataType };

export interface ColumnSchema {
  name: string;
  dbType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface ForeignKeySchema {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKeyColumns: string[];
  foreignKeys: ForeignKeySchema[];
}

export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface ColumnClassification {
  semanticType: SemanticDataType;
  dbType: string | null;
  nullable: boolean;
  isPrimaryKey: boolean;
  references: {
    tableName: string;
    columnName: string;
  } | null;
}

export interface TableClassification {
  columns: Record<string, ColumnClassification>;
}

export interface AiClassificationResult {
  tables: Record<string, TableClassification>;
}

export interface ColumnReference {
  tableName: string;
  columnName: string;
}

export interface ColumnGenerationRule {
  kind: 'semantic' | 'reference' | 'customList';
  fieldName?: string;
  semanticType?: SemanticDataType;
  reference?: ColumnReference;
  customTypeName?: string;
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
  sequenceDateTimeOptions?: {
    start?: string;
    step?: number;
    unit?: 'seconds' | 'minutes' | 'hours' | 'days';
    format?: string;
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
export type TableColumnOrder = Record<string, string[]>;

export interface DataTypeDefinition {
  value: DataTypeCatalogValue;
  displayName: string;
  description: string;
  groups: DataTypeGroup[];
}

export interface CustomListTypeDefinition {
  id: string;
  name: string;
  values: Array<string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaRelationshipNode {
  count?: number;
  distribution?: number[];
  [childTableName: string]: SchemaRelationshipNode | number[] | number | undefined;
}

export type SchemaRelationshipsRoot = Record<string, SchemaRelationshipNode>;
export type SchemaRelationshipsConfig = SchemaRelationshipsRoot[];

export interface GeneratedTableRows {
  tableName: string;
  rows: Record<string, string | number | boolean | null>[];
}
