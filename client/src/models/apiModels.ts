export interface ProjectEntity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type SemanticDataType =
  | 'unknown'
  | 'id'
  | 'fullName'
  | 'firstName'
  | 'lastName'
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

export interface ColumnGenerationRule {
  kind: 'semantic' | 'reference';
  semanticType?: SemanticDataType;
  reference?: {
    tableName: string;
    columnName: string;
  };
}

export type TableColumnRules = Record<string, Record<string, ColumnGenerationRule>>;

export interface GenerationRequestEntity {
  id: string;
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  rowsPerTable: number;
  columnRules?: TableColumnRules;
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
