export type SqlDialect = 'postgres' | 'mysql' | 'sqlserver' | 'generic';

export type SemanticDataType =
  | 'unknown'
  | 'guid'
  | 'int'
  | 'float'
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'email'
  | 'phoneNumber'
  | 'address'
  | 'city'
  | 'country'
  | 'zipCode'
  | 'companyName'
  | 'jobTitle'
  | 'url'
  | 'date'
  | 'dateTime'
  | 'boolean'
  | 'number'
  | 'text';

export type DataTypeCatalogValue = SemanticDataType | 'customList';

export type DataTypeGroup = 'Basic' | 'Personal' | 'Table Primary Key';

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
  reason?: string;
}

export interface TableClassification {
  columns: Record<string, ColumnClassification>;
}

export interface AiClassificationResult {
  version: '1';
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
  customValues?: Array<string | number | boolean>;
  blankPercentage?: number;
}

export type TableColumnRules = Record<string, Record<string, ColumnGenerationRule>>;

export interface DataTypeDefinition {
  value: DataTypeCatalogValue;
  displayName: string;
  description: string;
  group: DataTypeGroup;
}

export interface SchemaRelationshipNode {
  count?: number;
  distribution?: number[];
  [childTableName: string]: SchemaRelationshipNode | number[] | number | undefined;
}

export type SchemaRelationshipsRoot = Record<string, SchemaRelationshipNode>;
export type SchemaRelationshipsConfig = SchemaRelationshipsRoot[];

export interface GenerationOptions {}

export interface GeneratedTableRows {
  tableName: string;
  rows: Record<string, string | number | boolean | null>[];
}
