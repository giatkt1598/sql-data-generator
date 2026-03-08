import { DataTypeDefinition, SemanticDataType } from './types';

export const SUPPORTED_SEMANTIC_TYPES: SemanticDataType[] = [
  'unknown',
  'guid',
  'digitSequence',
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
    description: 'Fallback text value.\nExample: value_1',
    group: 'Basic',
  },
  {
    value: 'guid',
    displayName: 'GUID',
    description: 'UUID-style identifier.\nExample: 550E8400-E29B-41D4-A716-446655440000',
    group: 'Basic',
  },
  {
    value: 'digitSequence',
    displayName: 'Digit Sequence',
    description: 'Pattern-based random string.\nExample: Ticket-391-ajQ',
    group: 'Basic',
  },
  {
    value: 'sequence',
    displayName: 'Sequence',
    description: 'Incrementing number sequence.\nExample: 1, 2, 3, 4',
    group: 'Basic',
  },
  {
    value: 'dateTime',
    displayName: 'Date Time',
    description: 'Date or datetime value.\nExample: 2025-03-08',
    group: 'Basic',
  },
  {
    value: 'boolean',
    displayName: 'Boolean',
    description: 'True or false value.\nExample: true / false',
    group: 'Basic',
  },
  {
    value: 'number',
    displayName: 'Number',
    description: 'Number with min/max.\nExample: 42, 99.5',
    group: 'Basic',
  },
  {
    value: 'text',
    displayName: 'Text',
    description: 'Generic text value.\nExample: lorem ipsum',
    group: 'Basic',
  },
  {
    value: 'url',
    displayName: 'URL',
    description: 'Website URL.\nExample: https://example.com/product/1',
    group: 'Basic',
  },
  {
    value: 'customList',
    displayName: 'Custom List',
    description: 'Values you enter manually.\nExample: admin,user,guest',
    group: 'Basic',
  },
  {
    value: 'fullName',
    displayName: 'Full Name',
    description: 'Person full name.\nExample: Nguyen Van A',
    group: 'Personal',
  },
  {
    value: 'firstName',
    displayName: 'First Name',
    description: 'Person first name.\nExample: An',
    group: 'Personal',
  },
  {
    value: 'lastName',
    displayName: 'Last Name',
    description: 'Person last name.\nExample: Nguyen',
    group: 'Personal',
  },
  {
    value: 'gender',
    displayName: 'Gender',
    description: 'Gender label.\nExample: male / female',
    group: 'Personal',
  },
  {
    value: 'email',
    displayName: 'Email',
    description: 'Email address.\nExample: user@example.com',
    group: 'Personal',
  },
  {
    value: 'phoneNumber',
    displayName: 'Phone Number',
    description: 'Phone number.\nExample: 0901234567',
    group: 'Personal',
  },
  {
    value: 'address',
    displayName: 'Address',
    description: 'Street address.\nExample: 123 Nguyen Hue, District 1',
    group: 'Personal',
  },
  {
    value: 'city',
    displayName: 'City',
    description: 'City name.\nExample: Ho Chi Minh City',
    group: 'Personal',
  },
  {
    value: 'country',
    displayName: 'Country',
    description: 'Country name.\nExample: Vietnam',
    group: 'Personal',
  },
  {
    value: 'zipCode',
    displayName: 'Zip Code',
    description: 'Postal code.\nExample: 700000',
    group: 'Personal',
  },
  {
    value: 'companyName',
    displayName: 'Company Name',
    description: 'Company name.\nExample: Acme Corp',
    group: 'Personal',
  },
  {
    value: 'jobTitle',
    displayName: 'Job Title',
    description: 'Job title.\nExample: Software Engineer',
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
