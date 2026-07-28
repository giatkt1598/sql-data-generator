import {
  normalizeSqlType,
  SQL_TYPE_DEFAULT_CLASSIFICATION,
  SUPPORTED_SEMANTIC_TYPES,
} from '../core/semanticTypes';
import dayjs from 'dayjs';
import {
  AiClassificationResult,
  ColumnGenerationRule,
  SemanticDataType,
  TableColumnRules,
  TableSchema,
} from '../core/types';

function fallbackSemantic(dbType: string): SemanticDataType {
  const normalized = normalizeSqlType(dbType);
  return SQL_TYPE_DEFAULT_CLASSIFICATION[normalized] ?? 'unknown';
}

function normalizeSemanticType(value: unknown, fallback: SemanticDataType): SemanticDataType {
  if (typeof value === 'string' && SUPPORTED_SEMANTIC_TYPES.includes(value as SemanticDataType)) {
    return value as SemanticDataType;
  }
  return fallback;
}

function normalizeBlankPercentage(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function normalizeFieldName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeNumberOptionValue(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeNumberOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { min?: number; max?: number; decimals?: number } | undefined,
) {
  const min = normalizeNumberOptionValue(rule?.numberOptions?.min, fallback?.min ?? 0);
  const max = normalizeNumberOptionValue(rule?.numberOptions?.max, fallback?.max ?? 100);
  const decimals = Math.max(
    0,
    Math.floor(normalizeNumberOptionValue(rule?.numberOptions?.decimals, fallback?.decimals ?? 0)),
  );

  return {
    min,
    max: max >= min ? max : min,
    decimals,
  };
}

function normalizeDateTimeOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { start?: string; end?: string; format?: string } | undefined,
) {
  const defaultStart = dayjs().subtract(1, 'year').format('YYYY-MM-DD');
  const defaultEnd = dayjs().format('YYYY-MM-DD');
  const start =
    typeof rule?.dateTimeOptions?.start === 'string' && rule.dateTimeOptions.start.trim()
      ? rule.dateTimeOptions.start
      : (fallback?.start ?? defaultStart);
  const end =
    typeof rule?.dateTimeOptions?.end === 'string' && rule.dateTimeOptions.end.trim()
      ? rule.dateTimeOptions.end
      : (fallback?.end ?? defaultEnd);
  const format =
    typeof rule?.dateTimeOptions?.format === 'string' && rule.dateTimeOptions.format.trim()
      ? rule.dateTimeOptions.format
      : (fallback?.format ?? 'yyyy-MM-dd');

  return { start, end, format };
}

function normalizeTimeOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { from?: string; to?: string; format?: string } | undefined,
) {
  const from =
    typeof rule?.timeOptions?.from === 'string' && rule.timeOptions.from.trim()
      ? rule.timeOptions.from
      : (fallback?.from ?? '00:00');
  const to =
    typeof rule?.timeOptions?.to === 'string' && rule.timeOptions.to.trim()
      ? rule.timeOptions.to
      : (fallback?.to ?? '23:59');
  const format =
    typeof rule?.timeOptions?.format === 'string' && rule.timeOptions.format.trim()
      ? rule.timeOptions.format
      : (fallback?.format ?? 'HH:mm:ss');

  return { from, to, format };
}

function normalizeSequenceOptionValue(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeSequenceOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { startAt?: number; step?: number; repeat?: number } | undefined,
) {
  const startAt = normalizeSequenceOptionValue(
    rule?.sequenceOptions?.startAt,
    fallback?.startAt ?? 1,
  );
  const step = normalizeSequenceOptionValue(rule?.sequenceOptions?.step, fallback?.step ?? 1);
  const repeat = Math.max(
    1,
    Math.floor(normalizeSequenceOptionValue(rule?.sequenceOptions?.repeat, fallback?.repeat ?? 1)),
  );

  return { startAt, step, repeat };
}

function normalizeSequenceDateTimeOptions(
  rule: ColumnGenerationRule | undefined,
  fallback:
    | { start?: string; step?: number; unit?: 'seconds' | 'minutes' | 'hours' | 'days'; format?: string }
    | undefined,
) {
  const start =
    typeof rule?.sequenceDateTimeOptions?.start === 'string' &&
    rule.sequenceDateTimeOptions.start.trim()
      ? rule.sequenceDateTimeOptions.start
      : (fallback?.start ?? dayjs().subtract(1, 'month').startOf('day').format('YYYY-MM-DDTHH:mm'));
  const step = normalizeSequenceOptionValue(rule?.sequenceDateTimeOptions?.step, fallback?.step ?? 1);
  const unit =
    rule?.sequenceDateTimeOptions?.unit === 'seconds' ||
    rule?.sequenceDateTimeOptions?.unit === 'minutes' ||
    rule?.sequenceDateTimeOptions?.unit === 'hours' ||
    rule?.sequenceDateTimeOptions?.unit === 'days'
      ? rule.sequenceDateTimeOptions.unit
      : (fallback?.unit ?? 'days');
  const format =
    typeof rule?.sequenceDateTimeOptions?.format === 'string' &&
    rule.sequenceDateTimeOptions.format.trim()
      ? rule.sequenceDateTimeOptions.format
      : (fallback?.format ?? 'yyyy-MM-dd HH:mm:ss');

  return { start, step, unit, format };
}

function normalizeFixedValueOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { value?: string } | undefined,
) {
  const configuredValue = rule?.fixedValueOptions?.value;
  const value =
    typeof configuredValue === 'string'
      ? configuredValue
      : (fallback?.value ?? '');
  return { value };
}

function normalizeDigitSequenceOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { format?: string } | undefined,
) {
  const format =
    typeof rule?.digitSequenceOptions?.format === 'string'
      ? rule.digitSequenceOptions.format
      : (fallback?.format ?? '');
  return { format };
}

function normalizeFormulaOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { expression?: string } | undefined,
) {
  const expression =
    typeof rule?.formulaOptions?.expression === 'string'
      ? rule.formulaOptions.expression
      : (fallback?.expression ?? '');
  return { expression };
}

function normalizeRegularExpressionOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { pattern?: string } | undefined,
) {
  const pattern =
    typeof rule?.regularExpressionOptions?.pattern === 'string'
      ? rule.regularExpressionOptions.pattern
      : (fallback?.pattern ?? '');
  return { pattern };
}

function normalizeEmailOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { domains?: string[] } | undefined,
) {
  const domains = Array.isArray(rule?.emailOptions?.domains)
    ? rule.emailOptions.domains
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : (fallback?.domains ?? []);

  return { domains };
}

function normalizeTextOptions(
  rule: ColumnGenerationRule | undefined,
  fallback: { minLength?: number; maxLength?: number; unit?: 'words' | 'characters' } | undefined,
) {
  const rawMinLength =
    typeof rule?.textOptions?.minLength === 'number' && Number.isFinite(rule.textOptions.minLength)
      ? rule.textOptions.minLength
      : (fallback?.minLength ?? 1);
  const rawMaxLength =
    typeof rule?.textOptions?.maxLength === 'number' && Number.isFinite(rule.textOptions.maxLength)
      ? rule.textOptions.maxLength
      : (fallback?.maxLength ?? 4);
  const minLength = Math.max(0, Math.floor(rawMinLength));
  const maxLength = Math.max(minLength, Math.floor(rawMaxLength));
  const unit: 'words' | 'characters' =
    rule?.textOptions?.unit === 'characters' ? 'characters' : 'words';

  return { minLength, maxLength, unit };
}

function readCandidateFieldName(rule: ColumnGenerationRule | undefined): unknown {
  if (!rule) {
    return undefined;
  }
  const legacyRule = rule as ColumnGenerationRule & { field_name?: unknown };
  return legacyRule.fieldName ?? legacyRule.field_name;
}

export function buildDefaultColumnRules(
  tables: TableSchema[],
  classification: AiClassificationResult,
): TableColumnRules {
  const result: TableColumnRules = {};
  const tableMap = new Map(tables.map((table) => [table.name, table]));

  for (const table of tables) {
    result[table.name] = {};
    for (const column of table.columns) {
      const fk = table.foreignKeys.find((item) => item.columns.includes(column.name));
      if (fk) {
        const columnIndex = fk.columns.indexOf(column.name);
        const refColumn = fk.referencedColumns[columnIndex];
        if (tableMap.has(fk.referencedTable)) {
          result[table.name][column.name] = {
            kind: 'reference',
            fieldName: column.name,
            reference: {
              tableName: fk.referencedTable,
              columnName: refColumn,
            },
            blankPercentage: 0,
          };
          continue;
        }
      }

      const fromAi = classification.tables[table.name]?.columns[column.name]?.semanticType;
      result[table.name][column.name] = {
        kind: 'semantic',
        fieldName: column.name,
        semanticType: normalizeSemanticType(fromAi, fallbackSemantic(column.dbType)),
        blankPercentage: 0,
        numberOptions: {
          min: 0,
          max: 100,
          decimals: 0,
        },
        dateTimeOptions: {
          start: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
          end: dayjs().format('YYYY-MM-DD'),
          format: 'yyyy-MM-dd',
        },
        timeOptions: {
          from: '00:00',
          to: '23:59',
          format: 'HH:mm:ss',
        },
        sequenceOptions: {
          startAt: 1,
          step: 1,
          repeat: 1,
        },
        sequenceDateTimeOptions: {
          start: dayjs().subtract(1, 'month').startOf('day').format('YYYY-MM-DDTHH:mm'),
          step: 1,
          unit: 'days',
          format: 'yyyy-MM-dd HH:mm:ss',
        },
        fixedValueOptions: {
          value: '',
        },
        digitSequenceOptions: {
          format: '',
        },
        formulaOptions: {
          expression: '',
        },
        regularExpressionOptions: {
          pattern: '',
        },
        emailOptions: {
          domains: [],
        },
        textOptions: {
          minLength: 1,
          maxLength: 4,
          unit: 'words',
        },
      };
    }
  }

  return result;
}

function isSemanticRule(rule: ColumnGenerationRule): boolean {
  return (
    rule.kind === 'semantic' &&
    typeof rule.semanticType === 'string' &&
    SUPPORTED_SEMANTIC_TYPES.includes(normalizeSemanticType(rule.semanticType, 'unknown'))
  );
}

function isReferenceRule(rule: ColumnGenerationRule): boolean {
  return (
    rule.kind === 'reference' &&
    typeof rule.reference?.tableName === 'string' &&
    typeof rule.reference?.columnName === 'string'
  );
}

function isCustomListRule(rule: ColumnGenerationRule): boolean {
  return rule.kind === 'customList' && Array.isArray(rule.customValues);
}

export function sanitizeColumnRules(
  tables: TableSchema[],
  input: TableColumnRules | undefined,
  fallbackRules: TableColumnRules,
): TableColumnRules {
  if (!input) {
    return fallbackRules;
  }

  const tableSet = new Set(tables.map((table) => table.name));
  const tableColumns = new Map<string, Set<string>>();
  for (const table of tables) {
    tableColumns.set(table.name, new Set(table.columns.map((column) => column.name)));
  }

  const merged: TableColumnRules = {};
  for (const table of tables) {
    merged[table.name] = {};
    for (const column of table.columns) {
      const candidate = input[table.name]?.[column.name];
      if (candidate && isSemanticRule(candidate)) {
        merged[table.name][column.name] = {
          ...candidate,
          fieldName: normalizeFieldName(readCandidateFieldName(candidate), column.name),
          semanticType: normalizeSemanticType(
            candidate.semanticType,
            fallbackSemantic(column.dbType),
          ),
          blankPercentage: normalizeBlankPercentage(
            candidate.blankPercentage,
            fallbackRules[table.name][column.name].blankPercentage ?? 0,
          ),
          numberOptions: normalizeNumberOptions(
            candidate,
            fallbackRules[table.name][column.name].numberOptions,
          ),
          dateTimeOptions: normalizeDateTimeOptions(
            candidate,
            fallbackRules[table.name][column.name].dateTimeOptions,
          ),
          timeOptions: normalizeTimeOptions(
            candidate,
            fallbackRules[table.name][column.name].timeOptions,
          ),
          sequenceOptions: normalizeSequenceOptions(
            candidate,
            fallbackRules[table.name][column.name].sequenceOptions,
          ),
          sequenceDateTimeOptions: normalizeSequenceDateTimeOptions(
            candidate,
            fallbackRules[table.name][column.name].sequenceDateTimeOptions,
          ),
          fixedValueOptions: normalizeFixedValueOptions(
            candidate,
            fallbackRules[table.name][column.name].fixedValueOptions,
          ),
          digitSequenceOptions: normalizeDigitSequenceOptions(
            candidate,
            fallbackRules[table.name][column.name].digitSequenceOptions,
          ),
          formulaOptions: normalizeFormulaOptions(
            candidate,
            fallbackRules[table.name][column.name].formulaOptions,
          ),
          regularExpressionOptions: normalizeRegularExpressionOptions(
            candidate,
            fallbackRules[table.name][column.name].regularExpressionOptions,
          ),
          emailOptions: normalizeEmailOptions(
            candidate,
            fallbackRules[table.name][column.name].emailOptions,
          ),
          textOptions: normalizeTextOptions(
            candidate,
            fallbackRules[table.name][column.name].textOptions,
          ),
        };
        continue;
      }
      if (candidate && isReferenceRule(candidate)) {
        const reference = candidate.reference;
        if (!reference) {
          merged[table.name][column.name] = fallbackRules[table.name][column.name];
          continue;
        }
        const hasTable = tableSet.has(reference.tableName);
        const hasColumn = tableColumns.get(reference.tableName)?.has(reference.columnName);
        if (hasTable && hasColumn) {
          merged[table.name][column.name] = {
            ...candidate,
            fieldName: normalizeFieldName(readCandidateFieldName(candidate), column.name),
            blankPercentage: normalizeBlankPercentage(
              candidate.blankPercentage,
              fallbackRules[table.name][column.name].blankPercentage ?? 0,
            ),
            numberOptions: normalizeNumberOptions(
              candidate,
              fallbackRules[table.name][column.name].numberOptions,
            ),
            dateTimeOptions: normalizeDateTimeOptions(
              candidate,
              fallbackRules[table.name][column.name].dateTimeOptions,
            ),
            timeOptions: normalizeTimeOptions(
              candidate,
              fallbackRules[table.name][column.name].timeOptions,
            ),
            sequenceOptions: normalizeSequenceOptions(
              candidate,
              fallbackRules[table.name][column.name].sequenceOptions,
            ),
            sequenceDateTimeOptions: normalizeSequenceDateTimeOptions(
              candidate,
              fallbackRules[table.name][column.name].sequenceDateTimeOptions,
            ),
            fixedValueOptions: normalizeFixedValueOptions(
              candidate,
              fallbackRules[table.name][column.name].fixedValueOptions,
            ),
            digitSequenceOptions: normalizeDigitSequenceOptions(
              candidate,
              fallbackRules[table.name][column.name].digitSequenceOptions,
            ),
            formulaOptions: normalizeFormulaOptions(
              candidate,
              fallbackRules[table.name][column.name].formulaOptions,
            ),
            regularExpressionOptions: normalizeRegularExpressionOptions(
              candidate,
              fallbackRules[table.name][column.name].regularExpressionOptions,
            ),
            emailOptions: normalizeEmailOptions(
              candidate,
              fallbackRules[table.name][column.name].emailOptions,
            ),
            textOptions: normalizeTextOptions(
              candidate,
              fallbackRules[table.name][column.name].textOptions,
            ),
          };
          continue;
        }
      }
      if (candidate && isCustomListRule(candidate)) {
        merged[table.name][column.name] = {
          ...candidate,
          fieldName: normalizeFieldName(readCandidateFieldName(candidate), column.name),
          customTypeName:
            typeof candidate.customTypeName === 'string' ? candidate.customTypeName : undefined,
          blankPercentage: normalizeBlankPercentage(
            candidate.blankPercentage,
            fallbackRules[table.name][column.name].blankPercentage ?? 0,
          ),
          numberOptions: normalizeNumberOptions(
            candidate,
            fallbackRules[table.name][column.name].numberOptions,
          ),
          dateTimeOptions: normalizeDateTimeOptions(
            candidate,
            fallbackRules[table.name][column.name].dateTimeOptions,
          ),
          timeOptions: normalizeTimeOptions(
            candidate,
            fallbackRules[table.name][column.name].timeOptions,
          ),
          sequenceOptions: normalizeSequenceOptions(
            candidate,
            fallbackRules[table.name][column.name].sequenceOptions,
          ),
          sequenceDateTimeOptions: normalizeSequenceDateTimeOptions(
            candidate,
            fallbackRules[table.name][column.name].sequenceDateTimeOptions,
          ),
          fixedValueOptions: normalizeFixedValueOptions(
            candidate,
            fallbackRules[table.name][column.name].fixedValueOptions,
          ),
          digitSequenceOptions: normalizeDigitSequenceOptions(
            candidate,
            fallbackRules[table.name][column.name].digitSequenceOptions,
          ),
          formulaOptions: normalizeFormulaOptions(
            candidate,
            fallbackRules[table.name][column.name].formulaOptions,
          ),
          regularExpressionOptions: normalizeRegularExpressionOptions(
            candidate,
            fallbackRules[table.name][column.name].regularExpressionOptions,
          ),
          emailOptions: normalizeEmailOptions(
            candidate,
            fallbackRules[table.name][column.name].emailOptions,
          ),
          textOptions: normalizeTextOptions(
            candidate,
            fallbackRules[table.name][column.name].textOptions,
          ),
        };
        continue;
      }
      merged[table.name][column.name] = {
        ...fallbackRules[table.name][column.name],
        fieldName: normalizeFieldName(
          readCandidateFieldName(candidate) ?? fallbackRules[table.name][column.name].fieldName,
          column.name,
        ),
        customTypeName:
          typeof candidate?.customTypeName === 'string' ? candidate.customTypeName : undefined,
        blankPercentage: normalizeBlankPercentage(
          candidate?.blankPercentage ?? fallbackRules[table.name][column.name].blankPercentage,
          0,
        ),
        numberOptions: normalizeNumberOptions(
          candidate,
          fallbackRules[table.name][column.name].numberOptions,
        ),
        dateTimeOptions: normalizeDateTimeOptions(
          candidate,
          fallbackRules[table.name][column.name].dateTimeOptions,
        ),
        timeOptions: normalizeTimeOptions(
          candidate,
          fallbackRules[table.name][column.name].timeOptions,
        ),
        sequenceOptions: normalizeSequenceOptions(
          candidate,
          fallbackRules[table.name][column.name].sequenceOptions,
        ),
        sequenceDateTimeOptions: normalizeSequenceDateTimeOptions(
          candidate,
          fallbackRules[table.name][column.name].sequenceDateTimeOptions,
        ),
        fixedValueOptions: normalizeFixedValueOptions(
          candidate,
          fallbackRules[table.name][column.name].fixedValueOptions,
        ),
        digitSequenceOptions: normalizeDigitSequenceOptions(
          candidate,
          fallbackRules[table.name][column.name].digitSequenceOptions,
        ),
        formulaOptions: normalizeFormulaOptions(
          candidate,
          fallbackRules[table.name][column.name].formulaOptions,
        ),
        regularExpressionOptions: normalizeRegularExpressionOptions(
          candidate,
          fallbackRules[table.name][column.name].regularExpressionOptions,
        ),
        emailOptions: normalizeEmailOptions(
          candidate,
          fallbackRules[table.name][column.name].emailOptions,
        ),
        textOptions: normalizeTextOptions(
          candidate,
          fallbackRules[table.name][column.name].textOptions,
        ),
      };
    }
  }

  return merged;
}
