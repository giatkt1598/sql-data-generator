import { createHash, randomUUID } from 'crypto';
import dayjs from 'dayjs';
import {
  fakerDE,
  fakerEN,
  fakerES,
  fakerFR,
  fakerJA,
  fakerKO,
  fakerVI,
  fakerZH_CN,
  type Faker,
} from '@faker-js/faker';
import RandExp from 'randexp';
import { SUPPORTED_LOCALES } from '../core/locales';
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
  faker: Faker;
}

interface DigitSequenceFormatPart {
  kind: 'text' | 'reference';
  value: string;
}

const DEFAULT_TABLE_ROWS = 10;
const MAX_ROWS_PER_TABLE = 10_000_000;
const MAX_TOTAL_ROWS = 10_000_000;
const DEFAULT_DATE_TIME_FORMAT = 'yyyy-MM-dd';
const STOCK_INDUSTRIES = [
  'Semiconductors',
  'Major Banks',
  'Oil & Gas Production',
  'Software',
  'Biotechnology',
  'Telecommunications',
  'Consumer Electronics',
  'Renewable Energy',
  'E-Commerce',
  'Medical Devices',
  'Aerospace',
  'Automotive Manufacturing',
  'Cybersecurity',
];
const STOCK_MARKETS = ['NYSE', 'NASDAQ', 'AMEX', 'LSE', 'HOSE', 'HNX', 'NYSE Arca', 'TSX'];
const STOCK_SECTORS = [
  'Technology',
  'Capital Goods',
  'Finance',
  'Energy',
  'Healthcare',
  'Consumer Services',
  'Utilities',
  'Transportation',
  'Materials',
];
const PRODUCT_SUBCATEGORIES = [
  'Plant-Based Beverages',
  'Gourmet Snacks',
  'Home Fragrance & Accessories',
  'Outdoor',
  'Clothing - Outerwear',
  'Wireless Earbuds',
  'Smart Home Security',
  'Travel Accessories',
  'Desk Organization',
  'Fitness Recovery',
  'Pet Wellness',
  'Kitchen Storage',
  'Laptop Sleeves',
];
const GROCERY_PRODUCTS = [
  'Tomato - Green',
  'Spinach - Baby',
  'Avocado',
  'Milk - Whole',
  'Eggs - Free Range',
  'Banana',
  'Orange Juice - No Pulp',
  'Greek Yogurt - Plain',
  'Chicken Breast - Boneless',
  'Rice - Jasmine',
  'Bread - Whole Wheat',
  'Cheddar Cheese - Mild',
  'Broccoli Crowns',
  'Salmon Fillet',
  'Coffee Beans - Medium Roast',
  'Pasta - Penne',
  'Olive Oil - Extra Virgin',
];
const MOBILE_DEVICE_BRANDS = [
  'Apple',
  'Samsung',
  'Sony',
  'Google',
  'Xiaomi',
  'OnePlus',
  'Oppo',
  'Vivo',
  'Motorola',
  'Nokia',
];
const MOBILE_DEVICE_MODELS = [
  'iPhone 6',
  'Galaxy S5',
  'Xperia Z3',
  'Pixel 8',
  'Redmi Note 13',
  'iPhone 15 Pro',
  'Galaxy S24 Ultra',
  'OnePlus 12',
  'Moto G Power',
  'Nokia X30',
];
const MOBILE_DEVICE_OPERATING_SYSTEMS = ['Android', 'iOS', 'HarmonyOS'];
const MOVIE_GENRES = [
  'Action | Suspense',
  'Thriller',
  'Comedy',
  'Drama',
  'Sci-Fi',
  'Romance',
  'Adventure',
  'Fantasy',
  'Crime',
  'Animation',
];
const MOVIE_TITLES = [
  'Goodfellas',
  'Titanic',
  'Silverado',
  'The Matrix',
  'Inception',
  'Interstellar',
  'The Dark Knight',
  'Parasite',
  'Spirited Away',
  'Whiplash',
];
const MIME_TYPES = [
  'text/plain',
  'image/png',
  'application/pdf',
  'application/json',
  'text/csv',
  'image/jpeg',
  'application/zip',
  'audio/mpeg',
  'video/mp4',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const TOP_LEVEL_DOMAINS = ['com', 'org', 'net', 'edu', 'gov', 'io', 'app', 'dev', 'co', 'ai'];
const STREET_SUFFIXES = [
  'Street',
  'Drive',
  'Road',
  'Lane',
  'Avenue',
  'Boulevard',
  'Terrace',
  'Court',
  'Circle',
  'Place',
  'Way',
  'Parkway',
  'Trail',
  'Crescent',
  'Highway',
  'Square',
];

function buildHash(algorithm: 'md5' | 'sha1' | 'sha256', value: string): string {
  return createHash(algorithm).update(value).digest('hex');
}

function resolveLocaleFaker(locale?: string): Faker {
  const normalized = (locale ?? '').trim();
  const fakerByLocale: Record<string, Faker> = {
    en: fakerEN,
    vi: fakerVI,
    ja: fakerJA,
    ko: fakerKO,
    zh_CN: fakerZH_CN,
    fr: fakerFR,
    de: fakerDE,
    es: fakerES,
  };

  const supportedLocaleValues = new Set(SUPPORTED_LOCALES.map((item) => item.value));
  if (!supportedLocaleValues.has(normalized)) {
    return fakerEN;
  }

  return fakerByLocale[normalized] ?? fakerEN;
}

function randomAppVersion(localeFaker: Faker): string {
  const parts = localeFaker.helpers.arrayElement([2, 3]);
  return Array.from({ length: parts }, () =>
    String(localeFaker.number.int({ min: 0, max: 20 })),
  ).join('.');
}

function randomAppBundleId(localeFaker: Faker): string {
  return `com.${localeFaker.internet.domainWord()}.${localeFaker.internet.domainWord()}`;
}

function randomBase64ImageUrl(localeFaker: Faker): string {
  const payload = Buffer.from(localeFaker.string.alphanumeric(48)).toString('base64');
  return `data:image/png;base64,${payload}`;
}

function randomDummyImageUrl(localeFaker: Faker): string {
  const width = localeFaker.number.int({ min: 100, max: 800 });
  const height = localeFaker.number.int({ min: 100, max: 800 });
  return `https://dummyimage.com/${width}x${height}`;
}

function randomIpv4Cidr(localeFaker: Faker): string {
  return `${localeFaker.internet.ipv4()}/${localeFaker.number.int({ min: 8, max: 32 })}`;
}

function randomIpv6Cidr(localeFaker: Faker): string {
  return `${localeFaker.internet.ipv6()}/${localeFaker.number.int({ min: 32, max: 128 })}`;
}

function inferFallbackSemanticType(column: ColumnSchema): SemanticDataType {
  const normalized = normalizeSqlType(column.dbType);
  return SQL_TYPE_DEFAULT_CLASSIFICATION[normalized] ?? 'unknown';
}

function toDayjsFormat(format: string): string {
  return format.replace(/yyyy/g, 'YYYY').replace(/dd/g, 'DD').replace(/\ba\b/g, 'A');
}

function parseClockTime(value: string, fallback: string): dayjs.Dayjs {
  const parsed = dayjs(`2000-01-01 ${value.trim()}`);
  if (parsed.isValid()) {
    return parsed;
  }
  return dayjs(`2000-01-01 ${fallback}`);
}

function applyDigitSequenceTokens(input: string, localeFaker: Faker): string {
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
        result += localeFaker.string.numeric(1);
        break;
      case '@':
        result += localeFaker.string.alpha({ length: 1, casing: 'lower' });
        break;
      case '^':
        result += localeFaker.string.alpha({ length: 1, casing: 'upper' });
        break;
      case '*':
        result += localeFaker.helpers.arrayElement([
          localeFaker.string.numeric(1),
          localeFaker.string.alpha({ length: 1, casing: 'lower' }),
          localeFaker.string.alpha({ length: 1, casing: 'upper' }),
        ]);
        break;
      case '$':
        result += localeFaker.helpers.arrayElement([
          localeFaker.string.numeric(1),
          localeFaker.string.alpha({ length: 1, casing: 'lower' }),
        ]);
        break;
      case '%':
        result += localeFaker.helpers.arrayElement([
          localeFaker.string.numeric(1),
          localeFaker.string.alpha({ length: 1, casing: 'upper' }),
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
  localeFaker: Faker,
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
      return applyDigitSequenceTokens(part.value, localeFaker);
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

function generateRegularExpressionValue(
  pattern: string,
  tableName: string,
  columnName: string,
): string {
  if (!pattern.trim()) {
    return '';
  }

  try {
    return new RandExp(pattern).gen();
  } catch {
    throw new Error(
      `Regular Expression in '${tableName}.${columnName}' is invalid. Check the regex pattern.`,
    );
  }
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
  localeFaker: Faker,
): string | number | boolean | null {
  const salt = runSalt.slice(0, 8).toLowerCase();

  switch (semanticType) {
    case 'guid':
      return localeFaker.string.uuid().toUpperCase();
    case 'digitSequence':
      return generateDigitSequenceValue(
        rule.digitSequenceOptions?.format?.trim() ?? '',
        row,
        tableName,
        column.name,
        localeFaker,
      );
    case 'formula':
      return evaluateFormulaExpression(
        rule.formulaOptions?.expression?.trim() ?? '',
        row,
        tableName,
        column.name,
      );
    case 'regularExpression':
      return generateRegularExpressionValue(
        rule.regularExpressionOptions?.pattern ?? '',
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
      return randomAppBundleId(localeFaker);
    case 'appName':
      return localeFaker.commerce.productName();
    case 'appVersion':
      return randomAppVersion(localeFaker);
    case 'base64ImageUrl':
      return randomBase64ImageUrl(localeFaker);
    case 'creditCardNumber':
      return localeFaker.finance.creditCardNumber();
    case 'creditCardType':
      return localeFaker.finance.creditCardIssuer().toLowerCase();
    case 'currencyName':
      return localeFaker.finance.currency().name;
    case 'currencyCode':
      return localeFaker.finance.currency().code;
    case 'departmentRetail':
      return localeFaker.commerce.department();
    case 'domainName':
      return localeFaker.internet.domainName();
    case 'dummyImageUrl':
      return randomDummyImageUrl(localeFaker);
    case 'fileName':
      return localeFaker.system.fileName();
    case 'iban':
      return localeFaker.finance.iban({ formatted: true });
    case 'ipAddressV4':
      return localeFaker.internet.ipv4();
    case 'ipAddressV4Cidr':
      return randomIpv4Cidr(localeFaker);
    case 'ipAddressV6':
      return localeFaker.internet.ipv6();
    case 'ipAddressV6Cidr':
      return randomIpv6Cidr(localeFaker);
    case 'macAddress':
      return localeFaker.internet.mac();
    case 'md5':
      return buildHash('md5', `${tableName}.${column.name}.${rowIndex}.${salt}`);
    case 'mimeType':
      return localeFaker.helpers.arrayElement(MIME_TYPES);
    case 'productCategory':
      return localeFaker.commerce.department();
    case 'productDescription':
      return localeFaker.commerce.productDescription();
    case 'productGrocery':
      return localeFaker.helpers.arrayElement(GROCERY_PRODUCTS);
    case 'productName':
      return localeFaker.commerce.productName();
    case 'productSubcategory':
      return localeFaker.helpers.arrayElement(PRODUCT_SUBCATEGORIES);
    case 'mobileDeviceBrand':
      return localeFaker.helpers.arrayElement(MOBILE_DEVICE_BRANDS);
    case 'mobileDeviceModel':
      return localeFaker.helpers.arrayElement(MOBILE_DEVICE_MODELS);
    case 'mobileDeviceOs':
      return localeFaker.helpers.arrayElement(MOBILE_DEVICE_OPERATING_SYSTEMS);
    case 'mobileDeviceReleaseDate':
      return String(localeFaker.number.int({ min: 2007, max: dayjs().year() }));
    case 'movieGenres':
      return localeFaker.helpers.arrayElement(MOVIE_GENRES);
    case 'movieTitle':
      return localeFaker.helpers.arrayElement(MOVIE_TITLES);
    case 'color':
      return localeFaker.color.human();
    case 'hexColor':
      return localeFaker.color.rgb({ casing: 'upper', prefix: '#' });
    case 'sha1':
      return buildHash('sha1', `${tableName}.${column.name}.${rowIndex}.${salt}`);
    case 'sha256':
      return buildHash('sha256', `${tableName}.${column.name}.${rowIndex}.${salt}`);
    case 'stockIndustry':
      return localeFaker.helpers.arrayElement(STOCK_INDUSTRIES);
    case 'stockMarket':
      return localeFaker.helpers.arrayElement(STOCK_MARKETS);
    case 'stockName':
      return localeFaker.company.name();
    case 'stockSector':
      return localeFaker.helpers.arrayElement(STOCK_SECTORS);
    case 'stockSymbol':
      return localeFaker.string.alpha({ length: { min: 3, max: 5 }, casing: 'upper' });
    case 'topLevelDomain':
      return localeFaker.helpers.arrayElement(TOP_LEVEL_DOMAINS);
    case 'userAgent':
      return localeFaker.internet.userAgent();
    case 'username':
      return localeFaker.internet.username();
    case 'password':
      return localeFaker.internet.password({
        length: 12,
        memorable: false,
        pattern: /[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      });
    case 'passwordHash':
      return buildHash('sha256', `${tableName}.${column.name}.${rowIndex}.${salt}.${randomUUID()}`);
    case 'number': {
      const min = rule.numberOptions?.min ?? 0;
      const max = rule.numberOptions?.max ?? 100;
      const decimals = Math.max(0, Math.floor(rule.numberOptions?.decimals ?? 0));
      if (decimals === 0) {
        return localeFaker.number.int({
          min: Math.ceil(min),
          max: Math.floor(Math.max(min, max)),
        });
      }
      return localeFaker.number.float({
        min,
        max: Math.max(min, max),
        fractionDigits: decimals,
      });
    }
    case 'fullName':
      return localeFaker.person.fullName();
    case 'firstName':
      return localeFaker.person.firstName();
    case 'lastName':
      return localeFaker.person.lastName();
    case 'gender':
      return localeFaker.person.sexType();
    case 'email':
      const domains =
        rule.emailOptions?.domains?.filter(
          (domain) => typeof domain === 'string' && domain.trim(),
        ) ?? [];
      return localeFaker.internet.email({
        provider: domains.length > 0 ? localeFaker.helpers.arrayElement(domains) : 'example.com',
        firstName: `user${rowIndex + 1}`,
        lastName: salt,
      });
    case 'phoneNumber':
      return localeFaker.helpers.replaceSymbols(`09${salt.slice(0, 4)}####`);
    case 'address':
      return localeFaker.location.streetAddress();
    case 'streetAddress':
      return localeFaker.location.streetAddress();
    case 'streetName':
      return localeFaker.location.street();
    case 'streetNumber':
      return localeFaker.location.buildingNumber();
    case 'streetSuffix':
      return localeFaker.helpers.arrayElement(STREET_SUFFIXES);
    case 'city':
      return localeFaker.location.city();
    case 'country':
      return localeFaker.location.country();
    case 'countryCode':
      return localeFaker.location.countryCode();
    case 'latitude':
      return localeFaker.location.latitude();
    case 'longitude':
      return localeFaker.location.longitude();
    case 'state':
      return localeFaker.location.state();
    case 'stateAbbrev':
      return localeFaker.location.state({ abbreviated: true });
    case 'zipCode':
      return localeFaker.location.zipCode();
    case 'companyName':
      return localeFaker.company.name();
    case 'jobTitle':
      return localeFaker.person.jobTitle();
    case 'url':
      return localeFaker.internet.url({ appendSlash: false });
    case 'dateTime':
      const from = rule.dateTimeOptions?.start?.trim()
        ? dayjs(rule.dateTimeOptions.start.trim()).startOf('day').toDate()
        : dayjs().subtract(1, 'year').startOf('day').toDate();
      const to = rule.dateTimeOptions?.end?.trim()
        ? dayjs(rule.dateTimeOptions.end.trim()).endOf('day').toDate()
        : dayjs().endOf('day').toDate();
      const format = rule.dateTimeOptions?.format?.trim() || DEFAULT_DATE_TIME_FORMAT;
      return dayjs(localeFaker.date.between({ from, to })).format(toDayjsFormat(format));
    case 'time': {
      const fromTime = parseClockTime(rule.timeOptions?.from ?? '', '00:00');
      const toTime = parseClockTime(rule.timeOptions?.to ?? '', '23:59');
      const safeToTime = toTime.isBefore(fromTime) ? fromTime : toTime;
      const diffSeconds = safeToTime.diff(fromTime, 'second');
      const offsetSeconds =
        diffSeconds <= 0 ? 0 : localeFaker.number.int({ min: 0, max: diffSeconds });
      const timeFormat = rule.timeOptions?.format?.trim() || 'HH:mm:ss';
      return fromTime.add(offsetSeconds, 'second').format(toDayjsFormat(timeFormat));
    }
    case 'timeZone':
      return localeFaker.date.timeZone();
    case 'boolean':
      return localeFaker.datatype.boolean();
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
          : localeFaker.number.int({ min: textMinLength, max: textMaxLength });
      if (textUnit === 'characters') {
        return localeFaker.string.alpha({
          length: textLength,
          casing: 'lower',
        });
      }
      return localeFaker.lorem.words(textLength);
    case 'unknown':
      return null;
    default:
      return `${localeFaker.lorem.word()}_${salt}_${rowIndex + 1}`;
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
      const rootCount = Number.isInteger(node.count) ? (node.count as number) : DEFAULT_TABLE_ROWS;
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
      rowCountByTable.set(table.name, 0);
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
        context.faker,
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
  locale?: string,
): GeneratedTableRows[] {
  const result: GeneratedTableRows[] = [];
  const context: GenerateContext = {
    generatedByTable: new Map<string, GeneratedTableRows>(),
    plan: buildGenerationPlan(orderedTables, relationships),
    runSalt: randomUUID().replace(/-/g, ''),
    faker: resolveLocaleFaker(locale),
  };

  for (const table of orderedTables) {
    const generated = generateRowsForTable(table, context, rules);
    context.generatedByTable.set(table.name, generated);
    result.push(generated);
  }

  return result;
}
