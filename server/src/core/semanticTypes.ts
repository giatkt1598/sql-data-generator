import { DataTypeDefinition, SemanticDataType } from './types';

export const SUPPORTED_SEMANTIC_TYPES: SemanticDataType[] = [
  'unknown',
  'guid',
  'int',
  'float',
  'fullName',
  'firstName',
  'lastName',
  'gender',
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

export const DATA_TYPE_DEFINITIONS: DataTypeDefinition[] = [
  { value: 'unknown', displayName: 'Unknown', description: 'Fallback text value.' },
  { value: 'guid', displayName: 'GUID', description: 'GUID/UUID value.' },
  { value: 'int', displayName: 'Int', description: 'Integer numeric value.' },
  { value: 'float', displayName: 'Float', description: 'Floating-point numeric value.' },
  { value: 'fullName', displayName: 'Full Name', description: 'Person full name.' },
  { value: 'firstName', displayName: 'First Name', description: 'Person first name.' },
  { value: 'lastName', displayName: 'Last Name', description: 'Person last name.' },
  { value: 'gender', displayName: 'Gender', description: 'Gender value.' },
  { value: 'email', displayName: 'Email', description: 'Email format value.' },
  { value: 'phoneNumber', displayName: 'Phone Number', description: 'Phone number value.' },
  { value: 'address', displayName: 'Address', description: 'Street address value.' },
  { value: 'city', displayName: 'City', description: 'City name.' },
  { value: 'country', displayName: 'Country', description: 'Country name.' },
  { value: 'zipCode', displayName: 'Zip Code', description: 'Postal/zip code.' },
  { value: 'companyName', displayName: 'Company Name', description: 'Company name.' },
  { value: 'jobTitle', displayName: 'Job Title', description: 'Job title.' },
  { value: 'url', displayName: 'URL', description: 'Website URL value.' },
  { value: 'date', displayName: 'Date', description: 'Date value.' },
  { value: 'dateTime', displayName: 'Date Time', description: 'Date-time value.' },
  { value: 'boolean', displayName: 'Boolean', description: 'true/false value.' },
  { value: 'number', displayName: 'Number', description: 'General numeric value.' },
  { value: 'text', displayName: 'Text', description: 'Generic text value.' },
];

export const SQL_TYPE_DEFAULT_CLASSIFICATION: Record<string, SemanticDataType> = {
  int: 'int',
  integer: 'int',
  bigint: 'int',
  smallint: 'int',
  tinyint: 'int',
  decimal: 'number',
  numeric: 'number',
  float: 'float',
  real: 'float',
  double: 'float',
  uniqueidentifier: 'guid',
  uuid: 'guid',
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
