import { createHash, randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { faker } from '@faker-js/faker';
import { normalizeSqlType, SQL_TYPE_DEFAULT_CLASSIFICATION } from '../core/semanticTypes';
import {
  ColumnGenerationRule,
  ColumnSchema,
  GeneratedTableRows,
  SchemaRelationshipNode,
  SchemaRelationshipsConfig,
  SemanticDataType,
  TableColumnRules,
  TableSchema,
} from '../core/types';

interface GenerationPlan {
  rowCountByTable: Map<string, number>;
  parentAssignments: Map<string, Map<string, number[]>>;
  selfColumnDistributions: Map<string, Map<string, number[]>>;
}

interface GenerateContext {
  generatedByTable: Map<string, GeneratedTableRows>;
  plan: GenerationPlan;
  runSalt: string;
}

interface DigitSequenceFormatPart {
  kind: 'text' | 'reference';
  value: string;
}

const DEFAULT_TABLE_ROWS = 10;
const MAX_ROWS_PER_TABLE = 100_000;
const MAX_TOTAL_ROWS = 200_000;
const DEFAULT_DATE_TIME_FORMAT = 'yyyy-MM-dd';
const STOCK_INDUSTRIES = [
  'Semiconductors',
  'Major Banks',
  'Oil & Gas Production',
  'Software',
  'Biotechnology',
];
const STOCK_MARKETS = ['NYSE', 'NASDAQ', 'AMEX', 'LSE', 'HOSE'];
const STOCK_SECTORS = ['Technology', 'Capital Goods', 'Finance', 'Energy', 'Healthcare'];
const PRODUCT_SUBCATEGORIES = [
  'Plant-Based Beverages',
  'Gourmet Snacks',
  'Home Fragrance & Accessories',
  'Outdoor',
  'Clothing - Outerwear',
];
const MIME_TYPES = ['text/plain', 'image/png', 'application/pdf', 'application/json', 'text/csv'];
const TOP_LEVEL_DOMAINS = ['com', 'org', 'net', 'edu', 'gov'];

function buildHash(algorithm: 'md5' | 'sha1' | 'sha256', value: string): string {
  return createHash(algorithm).update(value).digest('hex');
}

function randomAppVersion(): string {
  const parts = faker.helpers.arrayElement([2, 3]);
  return Array.from({ length: parts }, () => String(faker.number.int({ min: 0, max: 20 }))).join(
    '.',
  );
}

function randomAppBundleId(): string {
  return `com.${faker.internet.domainWord()}.${faker.internet.domainWord()}`;
}

function randomBase64ImageUrl(): string {
  const payload = Buffer.from(faker.string.alphanumeric(48)).toString('base64');
  return `data:image/png;base64,${payload}`;
}

function randomDummyImageUrl(): string {
  const width = faker.number.int({ min: 100, max: 800 });
  const height = faker.number.int({ min: 100, max: 800 });
  return `https://dummyimage.com/${width}x${height}`;
}

function randomIpv4Cidr(): string {
  return `${faker.internet.ipv4()}/${faker.number.int({ min: 8, max: 32 })}`;
}

function randomIpv6Cidr(): string {
  return `${faker.internet.ipv6()}/${faker.number.int({ min: 32, max: 128 })}`;
}

function inferFallbackSemanticType(column: ColumnSchema): SemanticDataType {
  const normalized = normalizeSqlType(column.dbType);
  return SQL_TYPE_DEFAULT_CLASSIFICATION[normalized] ?? 'unknown';
}

function toDayjsFormat(format: string): string {
  return format.replace(/yyyy/g, 'YYYY').replace(/dd/g, 'DD');
}

function applyDigitSequenceTokens(input: string): string {
  let result = '';

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '\\' && nextChar) {
      result += nextChar;
      index += 1;
      continue;
    }

    switch (char) {
      case '#':
        result += faker.string.numeric(1);
        break;
      case '@':
        result += faker.string.alpha({ length: 1, casing: 'lower' });
        break;
      case '^':
        result += faker.string.alpha({ length: 1, casing: 'upper' });
        break;
      case '*':
        result += faker.helpers.arrayElement([
          faker.string.numeric(1),
          faker.string.alpha({ length: 1, casing: 'lower' }),
          faker.string.alpha({ length: 1, casing: 'upper' }),
        ]);
        break;
      case '$':
        result += faker.helpers.arrayElement([
          faker.string.numeric(1),
          faker.string.alpha({ length: 1, casing: 'lower' }),
        ]);
        break;
      case '%':
        result += faker.helpers.arrayElement([
          faker.string.numeric(1),
          faker.string.alpha({ length: 1, casing: 'upper' }),
        ]);
        break;
      default:
        result += char;
        break;
    }
  }

  return result;
}

function parseDigitSequenceFormat(format: string): DigitSequenceFormatPart[] {
  if (!format) {
    return [];
  }

  const parts: DigitSequenceFormatPart[] = [];
  const referencePattern = /\{([^}]+)\}/g;
  let cursor = 0;

  for (const match of format.matchAll(referencePattern)) {
    const matchedText = match[0];
    const matchedValue = match[1]?.trim();
    const startIndex = match.index ?? -1;
    if (!matchedText || startIndex < 0 || !matchedValue) {
      continue;
    }
    if (startIndex > cursor) {
      parts.push({
        kind: 'text',
        value: format.slice(cursor, startIndex),
      });
    }
    parts.push({
      kind: 'reference',
      value: matchedValue,
    });
    cursor = startIndex + matchedText.length;
  }

  if (cursor < format.length) {
    parts.push({
      kind: 'text',
      value: format.slice(cursor),
    });
  }

  return parts;
}

function extractDigitSequenceDependencies(format: string): string[] {
  return parseDigitSequenceFormat(format)
    .filter((part) => part.kind === 'reference')
    .map((part) => part.value);
}

function extractFormulaDependencies(expression: string): string[] {
  return Array.from(new Set(expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []));
}

function stringifyReferencedValue(value: string | number | boolean | null | undefined): string {
  if (typeof value === 'string') {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/g, '');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

function generateDigitSequenceValue(
  format: string,
  row: Record<string, string | number | boolean | null>,
  tableName: string,
  columnName: string,
): string {
  if (!format) {
    return '';
  }

  return parseDigitSequenceFormat(format)
    .map((part) => {
      if (part.kind === 'reference') {
        if (!(part.value in row)) {
          throw new Error(
            `Digit Sequence in '${tableName}.${columnName}' could not resolve ` +
              `referenced column '${part.value}' in the same row.`,
          );
        }
        if (row[part.value] === null || row[part.value] === undefined) {
          throw new Error(
            `Digit Sequence in '${tableName}.${columnName}' references ` +
              `'${part.value}', but that value is null or undefined.`,
          );
        }
        return stringifyReferencedValue(row[part.value]);
      }
      return applyDigitSequenceTokens(part.value);
    })
    .join('');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function coerceFormulaReferenceValue(
  value: string | number | boolean | null | undefined,
  tableName: string,
  columnName: string,
  dependencyName: string,
): number {
  if (value === null || value === undefined) {
    throw new Error(
      `Formula in '${tableName}.${columnName}' references '${dependencyName}', ` +
        `but that value is null or undefined.`,
    );
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Formula in '${tableName}.${columnName}' references '${dependencyName}', ` +
          `but that value is not a finite number.`,
      );
    }
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  const normalized = Number(value);
  if (Number.isFinite(normalized)) {
    return normalized;
  }
  throw new Error(
    `Formula in '${tableName}.${columnName}' references '${dependencyName}', ` +
      `but that value is not numeric.`,
  );
}

function evaluateFormulaExpression(
  expression: string,
  row: Record<string, string | number | boolean | null>,
  tableName: string,
  columnName: string,
): number {
  if (!expression.trim()) {
    return 0;
  }

  let compiledExpression = expression;
  for (const dependencyName of extractFormulaDependencies(expression)) {
    if (!(dependencyName in row)) {
      throw new Error(
        `Formula in '${tableName}.${columnName}' could not resolve ` +
          `referenced column '${dependencyName}' in the same row.`,
      );
    }
    const numericValue = coerceFormulaReferenceValue(
      row[dependencyName],
      tableName,
      columnName,
      dependencyName,
    );
    compiledExpression = compiledExpression.replace(
      new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(dependencyName)}(?![A-Za-z0-9_])`, 'g'),
      String(numericValue),
    );
  }

  const sanitized = compiledExpression.replace(/\s+/g, '');
  if (!/^[0-9+\-*/%.()]+$/.test(sanitized)) {
    throw new Error(
      `Formula in '${tableName}.${columnName}' contains unsupported characters. ` +
        `Only numbers, column names, +, -, *, /, %, and parentheses are allowed.`,
    );
  }

  let result: number;
  try {
    result = Function(`"use strict"; return (${sanitized});`)() as number;
  } catch {
    throw new Error(
      `Formula in '${tableName}.${columnName}' could not be evaluated. ` +
        `Check the expression syntax.`,
    );
  }

  if (!Number.isFinite(result)) {
    return 0;
  }

  return result;
}

function extractSameRowDependencies(rule: ColumnGenerationRule): string[] {
  if (rule.kind !== 'semantic') {
    return [];
  }
  if (rule.semanticType === 'digitSequence') {
    return extractDigitSequenceDependencies(rule.digitSequenceOptions?.format?.trim() ?? '');
  }
  if (rule.semanticType === 'formula') {
    return extractFormulaDependencies(rule.formulaOptions?.expression?.trim() ?? '');
  }
  return [];
}

function resolveColumnGenerationOrder(
  table: TableSchema,
  rules?: TableColumnRules,
): ColumnSchema[] {
  const columnsByName = new Map(table.columns.map((column) => [column.name, column]));
  const dependenciesByColumn = new Map<string, Set<string>>();
  const dependentsByColumn = new Map<string, Set<string>>();
  const indegreeByColumn = new Map<string, number>();

  for (const column of table.columns) {
    dependenciesByColumn.set(column.name, new Set());
    dependentsByColumn.set(column.name, new Set());
    indegreeByColumn.set(column.name, 0);
  }

  for (const column of table.columns) {
    const rule = getColumnRule(table.name, column, rules);
    for (const dependencyName of extractSameRowDependencies(rule)) {
      if (!columnsByName.has(dependencyName)) {
        throw new Error(
          `Column '${table.name}.${column.name}' references unknown column '${dependencyName}' in the same row.`,
        );
      }

      dependenciesByColumn.get(column.name)?.add(dependencyName);
    }
  }

  for (const [columnName, dependencySet] of dependenciesByColumn.entries()) {
    indegreeByColumn.set(columnName, dependencySet.size);
    for (const dependencyName of dependencySet) {
      dependentsByColumn.get(dependencyName)?.add(columnName);
    }
  }

  const orderedNames: string[] = [];
  const queue = table.columns
    .map((column) => column.name)
    .filter((columnName) => (indegreeByColumn.get(columnName) ?? 0) === 0);

  while (queue.length > 0) {
    const columnName = queue.shift();
    if (!columnName) {
      continue;
    }

    orderedNames.push(columnName);

    for (const dependentName of dependentsByColumn.get(columnName) ?? []) {
      const nextIndegree = (indegreeByColumn.get(dependentName) ?? 0) - 1;
      indegreeByColumn.set(dependentName, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(dependentName);
      }
    }
  }

  if (orderedNames.length !== table.columns.length) {
    throw new Error(
      `Same-row column dependencies are cyclic in table '${table.name}'. ` +
        `Adjust the referenced columns to remove the loop.`,
    );
  }

  return orderedNames.map((columnName) => columnsByName.get(columnName) as ColumnSchema);
}

function generateScalarValue(
  semanticType: SemanticDataType,
  rule: ColumnGenerationRule,
  tableName: string,
  column: ColumnSchema,
  rowIndex: number,
  runSalt: string,
  row: Record<string, string | number | boolean | null>,
): string | number | boolean | null {
  const salt = runSalt.slice(0, 8).toLowerCase();

  switch (semanticType) {
    case 'guid':
      return faker.string.uuid().toUpperCase();
    case 'digitSequence':
      return generateDigitSequenceValue(
        rule.digitSequenceOptions?.format?.trim() ?? '',
        row,
        tableName,
        column.name,
      );
    case 'formula':
      return evaluateFormulaExpression(
        rule.formulaOptions?.expression?.trim() ?? '',
        row,
        tableName,
        column.name,
      );
    case 'sequence': {
      const startAt = rule.sequenceOptions?.startAt ?? 1;
      const step = rule.sequenceOptions?.step ?? 1;
      const repeat = Math.max(1, Math.floor(rule.sequenceOptions?.repeat ?? 1));
      return startAt + Math.floor(rowIndex / repeat) * step;
    }
    case 'appBundleId':
      return randomAppBundleId();
    case 'appName':
      return faker.commerce.productName();
    case 'appVersion':
      return randomAppVersion();
    case 'base64ImageUrl':
      return randomBase64ImageUrl();
    case 'creditCardNumber':
      return faker.finance.creditCardNumber();
    case 'creditCardType':
      return faker.finance.creditCardIssuer().toLowerCase();
    case 'currency':
      return faker.finance.currency().name;
    case 'currencyCode':
      return faker.finance.currency().code;
    case 'departmentRetail':
      return faker.commerce.department();
    case 'domainName':
      return faker.internet.domainName();
    case 'dummyImageUrl':
      return randomDummyImageUrl();
    case 'fileName':
      return faker.system.fileName();
    case 'iban':
      return faker.finance.iban({ formatted: true });
    case 'ipAddressV4':
      return faker.internet.ipv4();
    case 'ipAddressV4Cidr':
      return randomIpv4Cidr();
    case 'ipAddressV6':
      return faker.internet.ipv6();
    case 'ipAddressV6Cidr':
      return randomIpv6Cidr();
    case 'macAddress':
      return faker.internet.mac();
    case 'md5':
      return buildHash('md5', `${tableName}.${column.name}.${rowIndex}.${salt}`);
    case 'mimeType':
      return faker.helpers.arrayElement(MIME_TYPES);
    case 'productCategory':
      return faker.commerce.department();
    case 'productDescription':
      return faker.commerce.productDescription();
    case 'productName':
      return faker.commerce.productName();
    case 'productSubcategory':
      return faker.helpers.arrayElement(PRODUCT_SUBCATEGORIES);
    case 'sha1':
      return buildHash('sha1', `${tableName}.${column.name}.${rowIndex}.${salt}`);
    case 'sha256':
      return buildHash('sha256', `${tableName}.${column.name}.${rowIndex}.${salt}`);
    case 'stockIndustry':
      return faker.helpers.arrayElement(STOCK_INDUSTRIES);
    case 'stockMarket':
      return faker.helpers.arrayElement(STOCK_MARKETS);
    case 'stockName':
      return faker.company.name();
    case 'stockSector':
      return faker.helpers.arrayElement(STOCK_SECTORS);
    case 'stockSymbol':
      return faker.string.alpha({ length: { min: 3, max: 5 }, casing: 'upper' });
    case 'topLevelDomain':
      return faker.helpers.arrayElement(TOP_LEVEL_DOMAINS);
    case 'userAgent':
      return faker.internet.userAgent();
    case 'username':
      return faker.internet.username();
    case 'number': {
      const min = rule.numberOptions?.min ?? 0;
      const max = rule.numberOptions?.max ?? 100;
      const decimals = Math.max(0, Math.floor(rule.numberOptions?.decimals ?? 0));
      if (decimals === 0) {
        return faker.number.int({ min: Math.ceil(min), max: Math.floor(Math.max(min, max)) });
      }
      return faker.number.float({
        min,
        max: Math.max(min, max),
        fractionDigits: decimals,
      });
    }
    case 'fullName':
      return faker.person.fullName();
    case 'firstName':
      return faker.person.firstName();
    case 'lastName':
      return faker.person.lastName();
    case 'gender':
      return faker.person.sexType();
    case 'email':
      const domains =
        rule.emailOptions?.domains?.filter(
          (domain) => typeof domain === 'string' && domain.trim(),
        ) ?? [];
      return faker.internet.email({
        provider: domains.length > 0 ? faker.helpers.arrayElement(domains) : 'example.com',
        firstName: `user${rowIndex + 1}`,
        lastName: salt,
      });
    case 'phoneNumber':
      return faker.helpers.replaceSymbols(`09${salt.slice(0, 4)}####`);
    case 'address':
      return faker.location.streetAddress();
    case 'city':
      return faker.location.city();
    case 'country':
      return faker.location.country();
    case 'zipCode':
      return faker.location.zipCode();
    case 'companyName':
      return faker.company.name();
    case 'jobTitle':
      return faker.person.jobTitle();
    case 'url':
      return faker.internet.url({ appendSlash: false });
    case 'dateTime':
      const from = rule.dateTimeOptions?.start?.trim()
        ? dayjs(rule.dateTimeOptions.start.trim()).startOf('day').toDate()
        : dayjs().subtract(1, 'year').startOf('day').toDate();
      const to = rule.dateTimeOptions?.end?.trim()
        ? dayjs(rule.dateTimeOptions.end.trim()).endOf('day').toDate()
        : dayjs().endOf('day').toDate();
      const format = rule.dateTimeOptions?.format?.trim() || DEFAULT_DATE_TIME_FORMAT;
      return dayjs(faker.date.between({ from, to })).format(toDayjsFormat(format));
    case 'timeZone':
      return faker.date.timeZone();
    case 'boolean':
      return faker.datatype.boolean();
    case 'text':
      const textMinLength = Math.max(0, Math.floor(rule.textOptions?.minLength ?? 1));
      const textMaxLength = Math.max(textMinLength, Math.floor(rule.textOptions?.maxLength ?? 4));
      const textUnit = rule.textOptions?.unit === 'characters' ? 'characters' : 'words';
      if (textMaxLength === 0) {
        return '';
      }
      const textLength =
        textMinLength === textMaxLength
          ? textMinLength
          : faker.number.int({ min: textMinLength, max: textMaxLength });
      if (textUnit === 'characters') {
        return faker.string.alpha({
          length: textLength,
          casing: 'lower',
        });
      }
      return faker.lorem.words(textLength);
    case 'unknown':
      return null;
    default:
      return `${faker.lorem.word()}_${salt}_${rowIndex + 1}`;
  }
}

function getColumnRule(
  tableName: string,
  column: ColumnSchema,
  rules?: TableColumnRules,
): ColumnGenerationRule {
  const rule = rules?.[tableName]?.[column.name];
  if (rule) {
    return rule;
  }
  return {
    kind: 'semantic',
    semanticType: inferFallbackSemanticType(column),
    blankPercentage: 0,
  };
}

function shouldGenerateNull(
  tableName: string,
  columnName: string,
  rowIndex: number,
  blankPercentage: number | undefined,
): boolean {
  const pct = typeof blankPercentage === 'number' ? blankPercentage : 0;
  if (pct <= 0) {
    return false;
  }
  if (pct >= 100) {
    return true;
  }

  const seed = `${tableName}.${columnName}.${rowIndex}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000003;
  }
  return Math.abs(hash % 100) < pct;
}

function generateCustomListValue(
  customValues: Array<string | number | boolean> | undefined,
  rowIndex: number,
): string | number | boolean | null {
  if (!customValues || customValues.length === 0) {
    return null;
  }
  return customValues[rowIndex % customValues.length];
}

function sanitizeDistribution(input: number[] | undefined): number[] {
  if (!input || input.length === 0) {
    return [1];
  }
  const filtered = input.filter((value) => Number.isInteger(value) && value >= 0);
  return filtered.length > 0 ? filtered : [1];
}

function extractChildren(node: SchemaRelationshipNode): Array<[string, SchemaRelationshipNode]> {
  const children: Array<[string, SchemaRelationshipNode]> = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'count' || key === 'distribution') {
      continue;
    }
    if (key.includes('.')) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      children.push([key, value as SchemaRelationshipNode]);
    }
  }
  return children;
}

function extractSelfColumnDistributions(
  tableName: string,
  node: SchemaRelationshipNode,
): Array<[string, number[]]> {
  const result: Array<[string, number[]]> = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'count' || key === 'distribution') {
      continue;
    }
    if (!key.includes('.')) {
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const [nodeTable, nodeColumn] = key.split('.', 2);
    if (nodeTable !== tableName || !nodeColumn) {
      continue;
    }
    const distribution = sanitizeDistribution((value as SchemaRelationshipNode).distribution);
    result.push([nodeColumn, distribution]);
  }
  return result;
}

function addParentAssignments(
  assignmentsByTable: Map<string, Map<string, number[]>>,
  childTable: string,
  parentTable: string,
  parentIndexes: number[],
) {
  const tableAssignments = assignmentsByTable.get(childTable) ?? new Map<string, number[]>();
  const existing = tableAssignments.get(parentTable) ?? [];
  const merged = existing.concat(parentIndexes);
  tableAssignments.set(parentTable, merged);
  assignmentsByTable.set(childTable, tableAssignments);
}

function ensureRowCountWithinLimits(tableName: string, rowCount: number) {
  if (rowCount > MAX_ROWS_PER_TABLE) {
    throw new Error(
      `Table '${tableName}' expands to ${rowCount.toLocaleString()} rows. ` +
        `Reduce Schema Relationships distribution/count settings.`,
    );
  }
}

function ensurePlanWithinLimits(rowCountByTable: Map<string, number>) {
  let totalRows = 0;
  for (const [tableName, rowCount] of rowCountByTable.entries()) {
    ensureRowCountWithinLimits(tableName, rowCount);
    totalRows += rowCount;
  }

  if (totalRows > MAX_TOTAL_ROWS) {
    throw new Error(
      `Generated plan expands to ${totalRows.toLocaleString()} rows in total. ` +
        `Reduce Schema Relationships distribution/count settings.`,
    );
  }
}

function buildGenerationPlan(
  tables: TableSchema[],
  relationships?: SchemaRelationshipsConfig,
): GenerationPlan {
  const rowCountByTable = new Map<string, number>();
  const parentAssignments = new Map<string, Map<string, number[]>>();
  const selfColumnDistributions = new Map<string, Map<string, number[]>>();

  if (!relationships) {
    for (const table of tables) {
      rowCountByTable.set(table.name, DEFAULT_TABLE_ROWS);
    }
    return { rowCountByTable, parentAssignments, selfColumnDistributions };
  }

  for (const table of tables) {
    rowCountByTable.set(table.name, 0);
  }

  function getAssignedCount(tableName: string): number {
    const map = parentAssignments.get(tableName);
    if (!map) {
      return 0;
    }
    let total = 0;
    for (const indexes of map.values()) {
      total += indexes.length;
    }
    return total;
  }

  function walkNode(
    tableName: string,
    node: SchemaRelationshipNode,
    parentTable: string | undefined,
    parentIndexes: number[] | undefined,
  ) {
    const currentCount = rowCountByTable.get(tableName) ?? 0;
    let ownIndexes: number[] = [];

    if (!parentTable) {
      const rootCount =
        Number.isInteger(node.count) && (node.count as number) > 0
          ? (node.count as number)
          : DEFAULT_TABLE_ROWS;
      rowCountByTable.set(tableName, rootCount);
      ownIndexes = Array.from({ length: rootCount }, (_value, index) => index);
    } else {
      const distribution = sanitizeDistribution(node.distribution);
      const parentIndexList = parentIndexes ?? [];
      ownIndexes = [];
      for (const [orderIndex, parentIndex] of parentIndexList.entries()) {
        const copies = distribution[orderIndex % distribution.length];
        for (let copy = 0; copy < copies; copy += 1) {
          ownIndexes.push(parentIndex);
        }
      }
      addParentAssignments(parentAssignments, tableName, parentTable, ownIndexes);
      rowCountByTable.set(tableName, Math.max(currentCount, getAssignedCount(tableName)));
      ensureRowCountWithinLimits(tableName, rowCountByTable.get(tableName) ?? 0);
    }

    for (const [columnName, distribution] of extractSelfColumnDistributions(tableName, node)) {
      const byColumn = selfColumnDistributions.get(tableName) ?? new Map<string, number[]>();
      byColumn.set(columnName, distribution);
      selfColumnDistributions.set(tableName, byColumn);
      // Loop safeguard: ignore nested recursion for self table.column nodes.
    }

    for (const [childTable, childNode] of extractChildren(node)) {
      if (!rowCountByTable.has(childTable)) {
        continue;
      }
      walkNode(childTable, childNode, tableName, ownIndexes);
    }
  }

  for (const rootItem of relationships) {
    for (const [rootTableName, node] of Object.entries(rootItem)) {
      if (!rowCountByTable.has(rootTableName)) {
        continue;
      }
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        continue;
      }
      walkNode(rootTableName, node as SchemaRelationshipNode, undefined, undefined);
    }
  }

  for (const table of tables) {
    if ((rowCountByTable.get(table.name) ?? 0) === 0) {
      rowCountByTable.set(table.name, DEFAULT_TABLE_ROWS);
    }
  }

  ensurePlanWithinLimits(rowCountByTable);

  return { rowCountByTable, parentAssignments, selfColumnDistributions };
}

function findReferenceValueForTable(
  currentTableName: string,
  currentColumnName: string,
  rule: ColumnGenerationRule,
  rowIndex: number,
  context: GenerateContext,
  currentRows: Record<string, string | number | boolean | null>[],
): string | number | boolean | null {
  if (rule.kind !== 'reference' || !rule.reference) {
    return null;
  }
  const parentTable = rule.reference.tableName;
  const parentRows =
    parentTable === currentTableName
      ? currentRows
      : (context.generatedByTable.get(parentTable)?.rows ?? []);
  if (parentRows.length === 0) {
    return null;
  }

  if (parentTable === currentTableName) {
    const distribution = context.plan.selfColumnDistributions
      .get(currentTableName)
      ?.get(currentColumnName);
    if (distribution && distribution.length > 0) {
      const step = distribution[rowIndex % distribution.length];
      if (step <= 0) {
        return null;
      }
      const parentIndex = rowIndex - step;
      if (parentIndex < 0 || parentIndex >= parentRows.length) {
        return null;
      }
      const parentRow = parentRows[parentIndex];
      return (parentRow[rule.reference.columnName] as string | number | boolean | null) ?? null;
    }
  }

  const plannedIndex = context.plan.parentAssignments
    .get(currentTableName)
    ?.get(parentTable)
    ?.at(rowIndex);
  const targetIndex = plannedIndex ?? rowIndex;
  const parentRow = parentRows[targetIndex % parentRows.length];
  return (parentRow[rule.reference.columnName] as string | number | boolean | null) ?? null;
}

function generateRowsForTable(
  table: TableSchema,
  context: GenerateContext,
  rules?: TableColumnRules,
): GeneratedTableRows {
  const rowCount = context.plan.rowCountByTable.get(table.name) ?? 0;
  const orderedColumns = resolveColumnGenerationOrder(table, rules);
  const rows: Record<string, string | number | boolean | null>[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row: Record<string, string | number | boolean | null> = {};

    for (const column of orderedColumns) {
      const rule = getColumnRule(table.name, column, rules);
      const hasForeignKey = table.foreignKeys.some((foreignKey) =>
        foreignKey.columns.includes(column.name),
      );
      if (shouldGenerateNull(table.name, column.name, rowIndex, rule.blankPercentage)) {
        row[column.name] = null;
        continue;
      }
      const referenceValue = findReferenceValueForTable(
        table.name,
        column.name,
        rule,
        rowIndex,
        context,
        rows,
      );
      if (referenceValue !== null) {
        row[column.name] = referenceValue;
        continue;
      }

      if (rule.kind === 'customList') {
        row[column.name] = generateCustomListValue(rule.customValues, rowIndex);
        continue;
      }

      if (rule.kind === 'reference' && hasForeignKey && column.nullable) {
        row[column.name] = null;
        continue;
      }

      const semanticType =
        rule.kind === 'semantic'
          ? (rule.semanticType ?? inferFallbackSemanticType(column))
          : inferFallbackSemanticType(column);
      row[column.name] = generateScalarValue(
        semanticType,
        rule,
        table.name,
        column,
        rowIndex,
        context.runSalt,
        row,
      );
    }

    rows.push(row);
  }

  return { tableName: table.name, rows };
}

export function generateDataByTableOrder(
  orderedTables: TableSchema[],
  rules?: TableColumnRules,
  relationships?: SchemaRelationshipsConfig,
): GeneratedTableRows[] {
  const result: GeneratedTableRows[] = [];
  const context: GenerateContext = {
    generatedByTable: new Map<string, GeneratedTableRows>(),
    plan: buildGenerationPlan(orderedTables, relationships),
    runSalt: randomUUID().replace(/-/g, ''),
  };

  for (const table of orderedTables) {
    const generated = generateRowsForTable(table, context, rules);
    context.generatedByTable.set(table.name, generated);
    result.push(generated);
  }

  return result;
}
