export interface ProjectEntity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type SemanticDataType =
  | 'unknown'
  | 'guid'
  | 'sequence'
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
  | 'dateTime'
  | 'boolean'
  | 'number'
  | 'text';

export type DataTypeCatalogValue = SemanticDataType | 'customList';

export type DataTypeGroup = 'Basic' | 'Personal' | 'Table Primary Key';

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
  sequenceOptions?: {
    startAt?: number;
    step?: number;
    repeat?: number;
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
  group: DataTypeGroup;
}
