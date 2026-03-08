import { SemanticDataType } from './types';

export const SUPPORTED_SEMANTIC_TYPES: SemanticDataType[] = [
  'unknown',
  'id',
  'fullName',
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'address',
  'city',
  'country',
  'zipCode',
  'companyName',
  'jobTitle',
  'url',
  'date',
  'dateTime',
  'boolean',
  'number',
  'text',
];

export const SQL_TYPE_DEFAULT_CLASSIFICATION: Record<string, SemanticDataType> = {
  int: 'number',
  integer: 'number',
  bigint: 'number',
  smallint: 'number',
  tinyint: 'number',
  decimal: 'number',
  numeric: 'number',
  float: 'number',
  real: 'number',
  double: 'number',
  bit: 'boolean',
  boolean: 'boolean',
  bool: 'boolean',
  date: 'date',
  datetime: 'dateTime',
  timestamp: 'dateTime',
  char: 'text',
  varchar: 'text',
  text: 'text',
  nchar: 'text',
  nvarchar: 'text',
};

export function normalizeSqlType(dbType: string): string {
  return dbType
    .toLowerCase()
    .replace(/\(.+\)/g, '')
    .trim();
}
