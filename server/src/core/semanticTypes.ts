import { DataTypeDefinition, SemanticDataType } from './types';

export const SUPPORTED_SEMANTIC_TYPES: SemanticDataType[] = [
  'unknown',
  'guid',
  'sequence',
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
  'dateTime',
  'boolean',
  'number',
  'text',
];

export const DATA_TYPE_DEFINITIONS: DataTypeDefinition[] = [
  {
    value: 'unknown',
    displayName: 'Unknown',
    description: 'Fallback text value.',
    group: 'Basic',
  },
  {
    value: 'guid',
    displayName: 'GUID',
    description: 'GUID/UUID value.',
    group: 'Basic',
  },
  {
    value: 'sequence',
    displayName: 'Sequence',
    description: 'Incrementing numeric sequence with configurable start, step, and repeat.',
    group: 'Basic',
  },
  {
    value: 'dateTime',
    displayName: 'Date Time',
    description: 'Date or date-time value.',
    group: 'Basic',
  },
  {
    value: 'boolean',
    displayName: 'Boolean',
    description: 'true/false value.',
    group: 'Basic',
  },
  {
    value: 'number',
    displayName: 'Number',
    description: 'General numeric value.',
    group: 'Basic',
  },
  {
    value: 'text',
    displayName: 'Text',
    description: 'Generic text value.',
    group: 'Basic',
  },
  {
    value: 'url',
    displayName: 'URL',
    description: 'Website URL value.',
    group: 'Basic',
  },
  {
    value: 'customList',
    displayName: 'Custom List',
    description: 'Choose values manually, separated by commas in the Schemas grid.',
    group: 'Basic',
  },
  {
    value: 'fullName',
    displayName: 'Full Name',
    description: 'Person full name.',
    group: 'Personal',
  },
  {
    value: 'firstName',
    displayName: 'First Name',
    description: 'Person first name.',
    group: 'Personal',
  },
  {
    value: 'lastName',
    displayName: 'Last Name',
    description: 'Person last name.',
    group: 'Personal',
  },
  {
    value: 'gender',
    displayName: 'Gender',
    description: 'Gender value.',
    group: 'Personal',
  },
  {
    value: 'email',
    displayName: 'Email',
    description: 'Email format value.',
    group: 'Personal',
  },
  {
    value: 'phoneNumber',
    displayName: 'Phone Number',
    description: 'Phone number value.',
    group: 'Personal',
  },
  {
    value: 'address',
    displayName: 'Address',
    description: 'Street address value.',
    group: 'Personal',
  },
  {
    value: 'city',
    displayName: 'City',
    description: 'City name.',
    group: 'Personal',
  },
  {
    value: 'country',
    displayName: 'Country',
    description: 'Country name.',
    group: 'Personal',
  },
  {
    value: 'zipCode',
    displayName: 'Zip Code',
    description: 'Postal/zip code.',
    group: 'Personal',
  },
  {
    value: 'companyName',
    displayName: 'Company Name',
    description: 'Company name.',
    group: 'Personal',
  },
  {
    value: 'jobTitle',
    displayName: 'Job Title',
    description: 'Job title.',
    group: 'Personal',
  },
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
  uniqueidentifier: 'guid',
  uuid: 'guid',
  bit: 'boolean',
  boolean: 'boolean',
  bool: 'boolean',
  date: 'dateTime',
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
