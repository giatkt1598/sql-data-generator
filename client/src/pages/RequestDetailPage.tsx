import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Backdrop,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  generateClassificationPrompt,
  generateSqlScript,
  getColumnDesignerModel,
  getGenerationRequests,
  updateGenerationRequest,
} from '../apis';
import type {
  ColumnDesignerModel,
  ColumnGenerationRule,
  SemanticDataType,
  GenerationRequestEntity,
  TableColumnRules,
} from '../models/apiModels';
import { buildDefaultSchemaRelationshipsJson } from '../utilities/schemaRelationships';
import { getErrorMessage } from '../utilities/errorUtils';
import { AnalyzeConfirmDialog } from '../components/request-detail/AnalyzeConfirmDialog';
import { DataTypePickerDialog } from '../components/request-detail/DataTypePickerDialog';
import { GeneralAccordion } from '../components/request-detail/GeneralAccordion';
import { PreviewDialog } from '../components/request-detail/PreviewDialog';
import {
  RequestDetailProvider,
  type RequestDetailContextValue,
} from '../components/request-detail/RequestDetailContext';
import { RequestDetailHeader } from '../components/request-detail/RequestDetailHeader';
import { SchemaRelationshipsAccordion } from '../components/request-detail/SchemaRelationshipsAccordion';
import { SchemasAccordion } from '../components/request-detail/SchemasAccordion';
import type { PickerTarget, RequestDetailForm } from '../components/request-detail/types';
import type { RequestDetailPageProps } from './pageProps';

function toLocalDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildSavedSnapshot(form: RequestDetailForm, columnRules: TableColumnRules): string {
  return JSON.stringify({
    name: form.name,
    schemaSql: form.schemaSql,
    classificationJson: form.classificationJson,
    schemaRelationshipsJson: form.schemaRelationshipsJson,
    locale: form.locale,
    sqlProvider: form.sqlProvider,
    columnRules,
  });
}

export function RequestDetailPage(props: RequestDetailPageProps) {
  const { projectId, requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<GenerationRequestEntity | null>(null);
  const [form, setForm] = useState<RequestDetailForm>({
    name: '',
    schemaSql: '',
    classificationJson: '',
    schemaRelationshipsJson: '',
    locale: 'en',
    sqlProvider: '',
  });
  const [columnRules, setColumnRules] = useState<TableColumnRules>({});
  const [designerModel, setDesignerModel] = useState<ColumnDesignerModel | null>(null);
  const [generalExpanded, setGeneralExpanded] = useState(false);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(false);
  const [schemasExpanded, setSchemasExpanded] = useState(true);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerTab, setTypePickerTab] = useState(0);
  const [customListInput, setCustomListInput] = useState('');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewTooLarge, setPreviewTooLarge] = useState(false);
  const [analyzeConfirmOpen, setAnalyzeConfirmOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isProcessingData, setIsProcessingData] = useState(false);
  const MAX_PREVIEW_LENGTH = 50_000_000;
  const formRef = useRef(form);
  const columnRulesRef = useRef(columnRules);
  const defaultDateTimeStart = useMemo(() => {
    const value = new Date();
    value.setFullYear(value.getFullYear() - 1);
    return toLocalDateInputValue(value);
  }, []);
  const defaultDateTimeEnd = useMemo(() => toLocalDateInputValue(new Date()), []);
  const defaultRuleOptions = useMemo(
    () => ({
      numberOptions: {
        min: 0,
        max: 100,
        decimals: 0,
      },
      dateTimeOptions: {
        start: defaultDateTimeStart,
        end: defaultDateTimeEnd,
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
        unit: 'words' as const,
      },
    }),
    [defaultDateTimeEnd, defaultDateTimeStart],
  );

  function buildFallbackRule(
    semanticType: SemanticDataType,
    columnName: string,
    overrides?: Partial<ColumnGenerationRule>,
  ): ColumnGenerationRule {
    return {
      kind: 'semantic',
      semanticType,
      fieldName: columnName,
      blankPercentage: 0,
      ...defaultRuleOptions,
      ...overrides,
    };
  }

  function mergeRuleDefaults(
    rule: TableColumnRules[string][string] | undefined,
    columnName: string,
    semanticType: SemanticDataType = 'unknown',
  ): TableColumnRules[string][string] {
    const fallbackRule = buildFallbackRule(semanticType, columnName);
    return {
      ...fallbackRule,
      ...rule,
      fieldName: rule?.fieldName ?? fallbackRule.fieldName,
      blankPercentage: rule?.blankPercentage ?? fallbackRule.blankPercentage,
      numberOptions: rule?.numberOptions ?? fallbackRule.numberOptions,
      dateTimeOptions: rule?.dateTimeOptions ?? fallbackRule.dateTimeOptions,
      timeOptions: rule?.timeOptions ?? fallbackRule.timeOptions,
      sequenceOptions: rule?.sequenceOptions ?? fallbackRule.sequenceOptions,
      digitSequenceOptions: rule?.digitSequenceOptions ?? fallbackRule.digitSequenceOptions,
      formulaOptions: rule?.formulaOptions ?? fallbackRule.formulaOptions,
      regularExpressionOptions:
        rule?.regularExpressionOptions ?? fallbackRule.regularExpressionOptions,
      emailOptions: rule?.emailOptions ?? fallbackRule.emailOptions,
      textOptions: rule?.textOptions ?? fallbackRule.textOptions,
    };
  }

  formRef.current = form;
  columnRulesRef.current = columnRules;

  const setDirtyForm: typeof setForm = (value) => {
    setForm((prev) => {
      const nextValue = typeof value === 'function' ? value(prev) : value;
      if (nextValue !== prev) {
        setHasUnsavedChanges(true);
      }
      return nextValue;
    });
  };

  useEffect(() => {
    if (!projectId || !requestId) {
      return;
    }

    void (async () => {
      try {
        props.setLoading(true);
        const items = await getGenerationRequests(projectId);
        const found = items.find((item) => item.id === requestId) ?? null;
        setRequest(found);
        if (!found) {
          return;
        }

        setForm({
          name: found.name,
          schemaSql: found.schemaSql,
          classificationJson: found.classificationJson,
          schemaRelationshipsJson: found.schemaRelationshipsJson ?? '',
          locale: found.locale ?? 'en',
          sqlProvider: found.sqlProvider ?? '',
        });
        setColumnRules(found.columnRules ?? {});
        setGeneralExpanded(false);
        setRelationshipsExpanded(false);
        setSchemasExpanded(true);
        setHasUnsavedChanges(false);

        if (found.schemaSql.trim() && found.classificationJson.trim()) {
          const model = await getColumnDesignerModel({
            schemaSql: found.schemaSql,
            classificationJson: found.classificationJson,
            columnRules: found.columnRules,
          });
          setDesignerModel(model);
          setColumnRules(model.columnRules);
          setSavedSnapshot(
            buildSavedSnapshot(
              {
                name: found.name,
                schemaSql: found.schemaSql,
                classificationJson: found.classificationJson,
                schemaRelationshipsJson: found.schemaRelationshipsJson ?? '',
                locale: found.locale ?? 'en',
                sqlProvider: found.sqlProvider ?? '',
              },
              model.columnRules,
            ),
          );
        } else {
          setDesignerModel(null);
          setSavedSnapshot(
            buildSavedSnapshot(
              {
                name: found.name,
                schemaSql: found.schemaSql,
                classificationJson: found.classificationJson,
                schemaRelationshipsJson: found.schemaRelationshipsJson ?? '',
                locale: found.locale ?? 'en',
                sqlProvider: found.sqlProvider ?? '',
              },
              found.columnRules ?? {},
            ),
          );
        }
      } catch (exception) {
        props.setError(getErrorMessage(exception, 'Failed to load request detail.'));
        console.error(exception);
      } finally {
        props.setLoading(false);
      }
    })();
  }, [projectId, requestId]);

  useEffect(() => {
    document.title = hasUnsavedChanges
      ? `Request: ${form.name || request?.name || ''} (Unsaved changes)`
      : `Request: ${form.name || request?.name || ''}`;
  }, [form.name, hasUnsavedChanges, request?.name]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const project = useMemo(
    () => props.projects.find((item) => item.id === projectId),
    [props.projects, projectId],
  );

  const primaryKeyOptions = useMemo(() => {
    if (!designerModel) {
      return [] as Array<{ value: string; description: string }>;
    }
    return designerModel.tables.flatMap((table) =>
      table.columns
        .filter((column) => column.isPrimaryKey)
        .map((column) => ({
          value: `${table.name}.${column.name}`,
          description: `Reference ${table.name}.${column.name}`,
        })),
    );
  }, [designerModel]);

  async function flushPendingInput(): Promise<void> {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 0);
    });
  }

  async function saveDetail() {
    if (!projectId || !requestId) {
      return;
    }
    try {
      props.setLoading(true);
      await flushPendingInput();
      const updated = await updateGenerationRequest(requestId, {
        projectId,
        name: form.name,
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        locale: form.locale,
        sqlProvider: form.sqlProvider,
        columnRules,
        schemaRelationshipsJson: form.schemaRelationshipsJson,
      });
      setRequest(updated);
      setForm({
        name: updated.name,
        schemaSql: updated.schemaSql,
        classificationJson: updated.classificationJson,
        schemaRelationshipsJson: updated.schemaRelationshipsJson ?? '',
        locale: updated.locale ?? 'en',
        sqlProvider: updated.sqlProvider ?? '',
      });
      setColumnRules(updated.columnRules ?? {});
      setSavedSnapshot(
        buildSavedSnapshot(
          {
            name: updated.name,
            schemaSql: updated.schemaSql,
            classificationJson: updated.classificationJson,
            schemaRelationshipsJson: updated.schemaRelationshipsJson ?? '',
            locale: updated.locale ?? 'en',
            sqlProvider: updated.sqlProvider ?? '',
          },
          updated.columnRules ?? {},
        ),
      );
      setHasUnsavedChanges(false);
      props.setSnack('Request detail saved.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to save request detail.'));
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function confirmLeavePage(): Promise<boolean> {
    await flushPendingInput();

    const latestSnapshot = buildSavedSnapshot(formRef.current, columnRulesRef.current);
    const stillDirty = savedSnapshot.length > 0 && latestSnapshot !== savedSnapshot;

    if (!stillDirty) {
      return true;
    }

    const shouldSave = window.confirm('You have unsaved changes. Save before leaving this page?');
    if (!shouldSave) {
      return true;
    }

    if (!projectId || !requestId) {
      return false;
    }

    try {
      props.setLoading(true);
      const updated = await updateGenerationRequest(requestId, {
        projectId,
        name: formRef.current.name,
        schemaSql: formRef.current.schemaSql,
        classificationJson: formRef.current.classificationJson,
        locale: formRef.current.locale,
        sqlProvider: formRef.current.sqlProvider,
        columnRules: columnRulesRef.current,
        schemaRelationshipsJson: formRef.current.schemaRelationshipsJson,
      });

      setRequest(updated);
      setForm({
        name: updated.name,
        schemaSql: updated.schemaSql,
        classificationJson: updated.classificationJson,
        schemaRelationshipsJson: updated.schemaRelationshipsJson ?? '',
        locale: updated.locale ?? 'en',
        sqlProvider: updated.sqlProvider ?? '',
      });
      setColumnRules(updated.columnRules ?? {});
      setSavedSnapshot(
        buildSavedSnapshot(
          {
            name: updated.name,
            schemaSql: updated.schemaSql,
            classificationJson: updated.classificationJson,
            schemaRelationshipsJson: updated.schemaRelationshipsJson ?? '',
            locale: updated.locale ?? 'en',
            sqlProvider: updated.sqlProvider ?? '',
          },
          updated.columnRules ?? {},
        ),
      );
      setHasUnsavedChanges(false);
      props.setSnack('Request detail saved.');
      return true;
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to save request detail.'));
      return false;
    } finally {
      props.setLoading(false);
    }
  }

  async function buildPrompt() {
    try {
      const prompt = await generateClassificationPrompt({
        schemaSql: form.schemaSql,
        extraBusinessContext: '',
      });
      await navigator.clipboard.writeText(prompt);
      props.setSnack(
        'Prompt copied to clipboard. Please paste it into your AI chatbot and paste the result into "AI Classification JSON" below.',
      );
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to build prompt.'));
      console.error(exception);
    }
  }

  async function analyzeAndBuildSchemas() {
    if (!projectId || !requestId) {
      return;
    }
    try {
      props.setLoading(true);
      await flushPendingInput();
      const model = await getColumnDesignerModel({
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
      });
      const nextSchemaRelationshipsJson = buildDefaultSchemaRelationshipsJson(
        model,
        model.columnRules,
      );
      const updated = await updateGenerationRequest(requestId, {
        projectId,
        name: form.name,
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        locale: form.locale,
        sqlProvider: form.sqlProvider,
        columnRules: model.columnRules,
        schemaRelationshipsJson: nextSchemaRelationshipsJson,
      });

      setRequest(updated);
      setDesignerModel(model);
      setColumnRules(model.columnRules);
      setForm((prev) => ({
        ...prev,
        schemaRelationshipsJson: nextSchemaRelationshipsJson,
      }));
      const nextSnapshot = buildSavedSnapshot(
        {
          name: updated.name,
          schemaSql: updated.schemaSql,
          classificationJson: updated.classificationJson,
          schemaRelationshipsJson: nextSchemaRelationshipsJson,
          locale: updated.locale ?? 'en',
          sqlProvider: updated.sqlProvider ?? '',
        },
        model.columnRules,
      );
      setHasUnsavedChanges(savedSnapshot.length > 0 && nextSnapshot !== savedSnapshot);
      setRelationshipsExpanded(true);
      setSchemasExpanded(true);
      props.setSnack('Schemas and schema relationships were overwritten.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to analyze schemas.'));
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function handlePreview() {
    try {
      setIsProcessingData(true);
      props.setLoading(true);
      await flushPendingInput();
      const script = await generateSqlScript({
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        locale: form.locale,
        sqlProvider: form.sqlProvider,
        columnRules,
        schemaRelationshipsJson: form.schemaRelationshipsJson,
      });
      const isTooLarge = script.length > MAX_PREVIEW_LENGTH;
      setPreviewTooLarge(isTooLarge);
      setPreviewText(isTooLarge ? '' : script);
      setPreviewOpen(true);
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to preview SQL.'));
      console.error(exception);
    } finally {
      setIsProcessingData(false);
      props.setLoading(false);
    }
  }

  async function handleGenerateSql() {
    try {
      setIsProcessingData(true);
      props.setLoading(true);
      await flushPendingInput();
      const script = await generateSqlScript({
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        locale: form.locale,
        sqlProvider: form.sqlProvider,
        columnRules,
        schemaRelationshipsJson: form.schemaRelationshipsJson,
      });
      const blob = new Blob([script], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${form.name || 'generated'}.sql`;
      anchor.click();
      URL.revokeObjectURL(url);
      props.setSnack('SQL generated and downloaded.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to generate SQL.'));
      console.error(exception);
    } finally {
      setIsProcessingData(false);
      props.setLoading(false);
    }
  }

  async function handleCopyPreview() {
    try {
      await navigator.clipboard.writeText(previewText);
      props.setSnack('Preview content copied to clipboard.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to copy preview content.'));
      console.error(exception);
    }
  }

  function onRuleChange(
    tableName: string,
    columnName: string,
    rule: TableColumnRules[string][string],
  ) {
    setHasUnsavedChanges(true);
    setColumnRules((prev) => ({
      ...prev,
      [tableName]: {
        ...(prev[tableName] ?? {}),
        [columnName]: rule,
      },
    }));
  }

  function openTypePicker(tableName: string, columnName: string) {
    const currentRule = columnRules[tableName]?.[columnName];
    if (currentRule?.kind === 'customList') {
      setCustomListInput((currentRule.customValues ?? []).join(','));
    } else {
      setCustomListInput('');
    }
    setPickerTarget({ tableName, columnName });
    setTypePickerTab(0);
    setTypePickerOpen(true);
  }

  function applyRule(rule: TableColumnRules[string][string]) {
    if (!pickerTarget) {
      return;
    }
    const current = columnRules[pickerTarget.tableName]?.[pickerTarget.columnName];
    onRuleChange(pickerTarget.tableName, pickerTarget.columnName, {
      ...mergeRuleDefaults(current, pickerTarget.columnName),
      ...rule,
    });
    setTypePickerOpen(false);
  }

  function applyCustomListRule() {
    if (!pickerTarget) {
      return;
    }
    const customValues = customListInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const parsedValues = customValues.map((item) => {
      const lower = item.toLowerCase();
      if (lower === 'true') {
        return true;
      }
      if (lower === 'false') {
        return false;
      }
      if (lower === 'null') {
        return item;
      }
      if (/^-?\d+(\.\d+)?$/.test(item)) {
        return Number(item);
      }
      return item;
    });
    onRuleChange(pickerTarget.tableName, pickerTarget.columnName, {
      ...mergeRuleDefaults(
        columnRules[pickerTarget.tableName]?.[pickerTarget.columnName],
        pickerTarget.columnName,
      ),
      kind: 'customList',
      customValues: parsedValues,
    });
    setTypePickerOpen(false);
  }

  function onBlankPercentageChange(tableName: string, columnName: string, value: string) {
    const parsed = Number(value);
    const blankPercentage = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    const fallbackRule = mergeRuleDefaults(columnRules[tableName]?.[columnName], columnName);
    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      blankPercentage,
    });
  }

  function onFieldNameChange(tableName: string, columnName: string, value: string) {
    const nextFieldName = value.trim() || columnName;
    const fallbackRule = mergeRuleDefaults(columnRules[tableName]?.[columnName], columnName);
    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: nextFieldName,
    });
  }

  function onCustomListValueChange(tableName: string, columnName: string, value: string) {
    const customValues = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const parsedValues = customValues.map((item) => {
      const lower = item.toLowerCase();
      if (lower === 'true') {
        return true;
      }
      if (lower === 'false') {
        return false;
      }
      if (lower === 'null') {
        return item;
      }
      if (/^-?\d+(\.\d+)?$/.test(item)) {
        return Number(item);
      }
      return item;
    });

    onRuleChange(tableName, columnName, {
      ...mergeRuleDefaults(columnRules[tableName]?.[columnName], columnName),
      kind: 'customList',
      customValues: parsedValues,
    });
  }

  function onNumberOptionChange(
    tableName: string,
    columnName: string,
    key: 'min' | 'max' | 'decimals',
    value: string,
  ) {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? parsed : key === 'max' ? 100 : 0;
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'number',
    );
    const currentOptions = fallbackRule.numberOptions ?? {
      min: 0,
      max: 100,
      decimals: 0,
    };
    const nextOptions = {
      ...currentOptions,
      [key]: key === 'decimals' ? Math.max(0, Math.floor(safeValue)) : safeValue,
    };

    if ((nextOptions.max ?? 100) < (nextOptions.min ?? 0)) {
      if (key === 'min') {
        nextOptions.max = nextOptions.min;
      } else if (key === 'max') {
        nextOptions.min = nextOptions.max;
      }
    }

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      numberOptions: nextOptions,
    });
  }

  function onDateTimeOptionChange(
    tableName: string,
    columnName: string,
    key: 'start' | 'end' | 'format',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'dateTime',
    );
    const currentOptions = fallbackRule.dateTimeOptions ?? {
      start: defaultDateTimeStart,
      end: defaultDateTimeEnd,
      format: 'yyyy-MM-dd',
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      dateTimeOptions: {
        ...currentOptions,
        [key]: value.trim() || currentOptions[key],
      },
    });
  }

  function onSequenceOptionChange(
    tableName: string,
    columnName: string,
    key: 'startAt' | 'step' | 'repeat',
    value: string,
  ) {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? parsed : 1;
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'sequence',
    );
    const currentOptions = fallbackRule.sequenceOptions ?? {
      startAt: 1,
      step: 1,
      repeat: 1,
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      sequenceOptions: {
        ...currentOptions,
        [key]: key === 'repeat' ? Math.max(1, Math.floor(safeValue)) : safeValue,
      },
    });
  }

  function onTimeOptionChange(
    tableName: string,
    columnName: string,
    key: 'from' | 'to' | 'format',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'time',
    );
    const currentOptions = fallbackRule.timeOptions ?? {
      from: '00:00',
      to: '23:59',
      format: 'HH:mm:ss',
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      timeOptions: {
        ...currentOptions,
        [key]: value.trim() || currentOptions[key],
      },
    });
  }

  function onDigitSequenceOptionChange(
    tableName: string,
    columnName: string,
    key: 'format',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'digitSequence',
    );
    const currentOptions = fallbackRule.digitSequenceOptions ?? {
      format: '',
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      digitSequenceOptions: {
        ...currentOptions,
        [key]: value,
      },
    });
  }

  function onTextOptionChange(
    tableName: string,
    columnName: string,
    key: 'minLength' | 'maxLength' | 'unit',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'text',
    );
    const currentOptions = fallbackRule.textOptions ?? {
      minLength: 1,
      maxLength: 4,
      unit: 'words' as const,
    };
    const numericValue = Number.isFinite(Number(value))
      ? Number(value)
      : key === 'maxLength'
        ? 4
        : 1;
    const nextOptions = {
      ...currentOptions,
      [key]:
        key === 'unit'
          ? value === 'characters'
            ? 'characters'
            : 'words'
          : Math.max(0, Math.floor(numericValue)),
    };

    if ((nextOptions.maxLength ?? 4) < (nextOptions.minLength ?? 1)) {
      if (key === 'minLength') {
        nextOptions.maxLength = nextOptions.minLength;
      } else if (key === 'maxLength') {
        nextOptions.minLength = nextOptions.maxLength;
      }
    }

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      textOptions: nextOptions,
    });
  }

  function onFormulaOptionChange(
    tableName: string,
    columnName: string,
    key: 'expression',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'formula',
    );
    const currentOptions = fallbackRule.formulaOptions ?? {
      expression: '',
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      formulaOptions: {
        ...currentOptions,
        [key]: value,
      },
    });
  }

  function onRegularExpressionOptionChange(
    tableName: string,
    columnName: string,
    key: 'pattern',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'regularExpression',
    );
    const currentOptions = fallbackRule.regularExpressionOptions ?? {
      pattern: '',
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      regularExpressionOptions: {
        ...currentOptions,
        [key]: value,
      },
    });
  }

  function onEmailOptionChange(
    tableName: string,
    columnName: string,
    key: 'domains',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'email',
    );
    const currentOptions = fallbackRule.emailOptions ?? {
      domains: [],
    };

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      emailOptions: {
        ...currentOptions,
        [key]: value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      },
    });
  }

  if (!project || !request) {
    return (
      <Card>
        <CardContent>
          <Typography>Request not found.</Typography>
          <Button
            onClick={() => navigate(projectId ? `/projects/${projectId}/requests` : '/projects')}
            sx={{ mt: 1 }}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const contextValue: RequestDetailContextValue = {
    projectId: project.id,
    requestName: form.name || request.name,
    hasUnsavedChanges,
    loading: props.loading,
    form,
    setForm: setDirtyForm,
    columnRules,
    designerModel,
    generalExpanded,
    setGeneralExpanded,
    relationshipsExpanded,
    setRelationshipsExpanded,
    schemasExpanded,
    setSchemasExpanded,
    typePickerOpen,
    setTypePickerOpen,
    typePickerTab,
    setTypePickerTab,
    customListInput,
    setCustomListInput,
    previewOpen,
    setPreviewOpen,
    previewText,
    previewTooLarge,
    analyzeConfirmOpen,
    setAnalyzeConfirmOpen,
    semanticTypes: props.semanticTypes,
    supportedLocales: props.supportedLocales,
    primaryKeyOptions,
    openTypePicker,
    onFieldNameChange,
    onBlankPercentageChange,
    onCustomListValueChange,
    onNumberOptionChange,
    onDateTimeOptionChange,
    onTimeOptionChange,
    onSequenceOptionChange,
    onDigitSequenceOptionChange,
    onFormulaOptionChange,
    onRegularExpressionOptionChange,
    onEmailOptionChange,
    onTextOptionChange,
    applyRule,
    applyCustomListRule,
    handleBack: () => {
      void (async () => {
        const canLeave = await confirmLeavePage();
        if (canLeave) {
          navigate(-1);
        }
      })();
    },
    buildPrompt,
    handlePreview,
    handleGenerateSql,
    saveDetail,
    analyzeAndBuildSchemas,
    handleCopyPreview,
  };

  return (
    <RequestDetailProvider value={contextValue}>
      <>
        <Backdrop
          open={isProcessingData}
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.modal + 1,
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress color="inherit" />
          <Typography variant="h6">Processing...</Typography>
        </Backdrop>
        <Stack spacing={2}>
          <RequestDetailHeader />
          <GeneralAccordion />
          <SchemaRelationshipsAccordion />
          <SchemasAccordion />
          <DataTypePickerDialog />
          <AnalyzeConfirmDialog />
          <PreviewDialog />
        </Stack>
      </>
    </RequestDetailProvider>
  );
}
