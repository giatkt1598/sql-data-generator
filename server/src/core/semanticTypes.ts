import { DataTypeDefinition, SEMANTIC_DATA_TYPES } from './types';
import type { SemanticDataType } from './types';

export const SUPPORTED_SEMANTIC_TYPES = [...SEMANTIC_DATA_TYPES];

export const DATA_TYPE_DEFINITIONS: DataTypeDefinition[] = [
  {
    value: 'unknown',
    displayName: 'NULL',
    description: 'Always generates NULL.\nExample: NULL',
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
    description: 'Pattern-based random string or row references.\nExample: Ticket-391-ajQ',
    group: 'Basic',
  },
  {
    value: 'sequence',
    displayName: 'Sequence',
    description: 'Incrementing number sequence.\nExample: 1, 2, 3, 4',
    group: 'Basic',
  },
  {
    value: 'creditCardNumber',
    displayName: 'Credit Card #',
    description: 'Credit card number.\nExample: 4017959045824',
    group: 'Commerce',
  },
  {
    value: 'creditCardType',
    displayName: 'Credit Card Type',
    description: 'Card issuer name.\nExample: visa',
    group: 'Commerce',
  },
  {
    value: 'currency',
    displayName: 'Currency',
    description: 'Currency name.\nExample: Dollar',
    group: 'Commerce',
  },
  {
    value: 'currencyCode',
    displayName: 'Currency Code',
    description: 'Currency code.\nExample: USD',
    group: 'Commerce',
  },
  {
    value: 'departmentRetail',
    displayName: 'Department (Retail)',
    description: 'Retail department.\nExample: Grocery',
    group: 'Commerce',
  },
  {
    value: 'iban',
    displayName: 'IBAN',
    description: 'International bank number.\nExample: FR76 5960 2948 07N1 L9TC PVYX E17',
    group: 'Commerce',
  },
  {
    value: 'money',
    displayName: 'Money',
    description: 'Formatted money amount.\nExample: $3.00',
    group: 'Commerce',
  },
  {
    value: 'productCategory',
    displayName: 'Product Category',
    description: 'Top-level product category.\nExample: Toys',
    group: 'Commerce',
  },
  {
    value: 'productDescription',
    displayName: 'Product Description',
    description: 'Product marketing text.\nExample: Savory lentil chips',
    group: 'Commerce',
  },
  {
    value: 'productName',
    displayName: 'Product Name',
    description: 'Product display name.\nExample: Classic Black Trousers',
    group: 'Commerce',
  },
  {
    value: 'productPrice',
    displayName: 'Product Price',
    description: 'Product price text.\nExample: $12.94',
    group: 'Commerce',
  },
  {
    value: 'productSubcategory',
    displayName: 'Product Subcategory',
    description: 'Detailed product category.\nExample: Gourmet Snacks',
    group: 'Commerce',
  },
  {
    value: 'stockIndustry',
    displayName: 'Stock Industry',
    description: 'Industry name.\nExample: Semiconductors',
    group: 'Commerce',
  },
  {
    value: 'stockMarket',
    displayName: 'Stock Market',
    description: 'Exchange name.\nExample: NASDAQ',
    group: 'Commerce',
  },
  {
    value: 'stockMarketCap',
    displayName: 'Stock Market Cap',
    description: 'Market cap text.\nExample: $54.29M',
    group: 'Commerce',
  },
  {
    value: 'stockName',
    displayName: 'Stock Name',
    description: 'Listed company name.\nExample: Microsoft Corporation',
    group: 'Commerce',
  },
  {
    value: 'stockSector',
    displayName: 'Stock Sector',
    description: 'Sector name.\nExample: Technology',
    group: 'Commerce',
  },
  {
    value: 'stockSymbol',
    displayName: 'Stock Symbol',
    description: 'Ticker symbol.\nExample: MSFT',
    group: 'Commerce',
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
