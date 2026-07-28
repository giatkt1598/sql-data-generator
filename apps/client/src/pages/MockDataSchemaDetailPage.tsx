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
  createCustomListType as createCustomListTypeApi,
  deleteCustomListType as deleteCustomListTypeApi,
  generateClassificationPrompt,
  generateSqlScript,
  getColumnDesignerModel,
  getMockDataSchemas,
  updateCustomListType as updateCustomListTypeApi,
  updateMockDataSchema,
} from '../apis';
import type {
  ColumnDesignerModel,
  ColumnGenerationRule,
  SemanticDataType,
  MockDataSchemaEntity,
  TableColumnOrder,
  TableColumnRules,
} from '../models/apiModels';
import { buildDefaultSchemaRelationshipsJson } from '../utilities/schemaRelationships';
import { getErrorMessage } from '../utilities/errorUtils';
import { AnalyzeConfirmDialog } from '../components/request-detail/AnalyzeConfirmDialog';
import { DataTypePickerDialog } from '../components/request-detail/DataTypePickerDialog';
import { GeneralAccordion } from '../components/request-detail/GeneralAccordion';
import { PreviewDialog } from '../components/request-detail/PreviewDialog';
import {
  MockDataSchemaDetailProvider,
  type MockDataSchemaDetailContextValue,
} from '../components/request-detail/MockDataSchemaDetailContext';
import { MockDataSchemaDetailHeader } from '../components/request-detail/MockDataSchemaDetailHeader';
import { SchemaRelationshipsAccordion } from '../components/request-detail/SchemaRelationshipsAccordion';
import { SchemasAccordion } from '../components/request-detail/SchemasAccordion';
import type { MockDataSchemaDetailForm, PickerTarget } from '../components/request-detail/types';
import type { MockDataSchemaDetailPageProps } from './pageProps';

interface LocalClassificationColumn {
  semanticType: SemanticDataType;
  dbType: string | null;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  references?: {
    tableName: string;
    columnName: string;
  } | null;
}

interface LocalClassificationResult {
  tables: Record<
    string,
    {
      columns: Record<string, LocalClassificationColumn>;
    }
  >;
}

function toLocalDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalOneMonthAgoDateInputValue(value: Date): string {
  const result = new Date(value);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() - 1);
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDayOfMonth));
  return toLocalDateInputValue(result);
}

function buildSavedSnapshot(
  form: MockDataSchemaDetailForm,
  columnRules: TableColumnRules,
  columnOrder: TableColumnOrder,
): string {
  return JSON.stringify({
    name: form.name,
    schemaSql: form.schemaSql,
    classificationJson: form.classificationJson,
    schemaRelationshipsJson: form.schemaRelationshipsJson,
    locale: form.locale,
    sqlProvider: form.sqlProvider,
    columnRules,
    columnOrder,
  });
}

export function MockDataSchemaDetailPage(props: MockDataSchemaDetailPageProps) {
  const { setLoading, setError } = props;
  const { projectId, requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MockDataSchemaEntity | null>(null);
  const [form, setForm] = useState<MockDataSchemaDetailForm>({
    name: '',
    schemaSql: '',
    classificationJson: '',
    schemaRelationshipsJson: '',
    locale: 'en',
    sqlProvider: '',
  });
  const [columnRules, setColumnRules] = useState<TableColumnRules>({});
  const [columnOrder, setColumnOrder] = useState<TableColumnOrder>({});
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
  const columnOrderRef = useRef(columnOrder);
  const defaultDateTimeStart = useMemo(() => {
    const value = new Date();
    value.setFullYear(value.getFullYear() - 1);
    return toLocalDateInputValue(value);
  }, []);
  const defaultDateTimeEnd = useMemo(() => toLocalDateInputValue(new Date()), []);
  const defaultSequenceDateTimeStart = useMemo(
    () => `${toLocalOneMonthAgoDateInputValue(new Date())}T00:00`,
    [],
  );
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
      sequenceDateTimeOptions: {
        start: defaultSequenceDateTimeStart,
        step: 1,
        unit: 'days' as const,
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
        unit: 'words' as const,
      },
    }),
    [defaultDateTimeEnd, defaultDateTimeStart, defaultSequenceDateTimeStart],
  );

  function parseClassificationJsonOrNull(rawJson: string): LocalClassificationResult | null {
    const trimmed = rawJson.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed) as LocalClassificationResult;
    } catch {
      return null;
    }
  }

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
      sequenceDateTimeOptions:
        rule?.sequenceDateTimeOptions ?? fallbackRule.sequenceDateTimeOptions,
      fixedValueOptions: rule?.fixedValueOptions ?? fallbackRule.fixedValueOptions,
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
  columnOrderRef.current = columnOrder;

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
        setLoading(true);
        const items = await getMockDataSchemas(projectId);
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
        setColumnOrder(found.columnOrder ?? {});
        setGeneralExpanded(false);
        setRelationshipsExpanded(false);
        setSchemasExpanded(true);
        setHasUnsavedChanges(false);

        if (found.schemaSql.trim() && found.classificationJson.trim()) {
          const model = await getColumnDesignerModel({
            schemaSql: found.schemaSql,
            classificationJson: found.classificationJson,
            columnRules: found.columnRules,
            columnOrder: found.columnOrder,
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
              found.columnOrder ?? {},
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
              found.columnOrder ?? {},
            ),
          );
        }
      } catch (exception) {
        setError(getErrorMessage(exception, 'Failed to load mock data schema detail.'));
        console.error(exception);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, requestId, setError, setLoading]);

  useEffect(() => {
    document.title = hasUnsavedChanges
      ? `Mock Data Schema: ${form.name || request?.name || ''} (Unsaved changes)`
      : `Mock Data Schema: ${form.name || request?.name || ''}`;
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
      const updated = await updateMockDataSchema(requestId, {
        projectId,
        name: form.name,
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        locale: form.locale,
        sqlProvider: form.sqlProvider,
        columnRules,
        columnOrder,
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
      setColumnOrder(updated.columnOrder ?? {});
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
          updated.columnOrder ?? {},
        ),
      );
      setHasUnsavedChanges(false);
      props.setSnack('Mock data schema saved.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to save mock data schema.'));
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function confirmLeavePage(): Promise<boolean> {
    await flushPendingInput();

    const latestSnapshot = buildSavedSnapshot(
      formRef.current,
      columnRulesRef.current,
      columnOrderRef.current,
    );
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
      const updated = await updateMockDataSchema(requestId, {
        projectId,
        name: formRef.current.name,
        schemaSql: formRef.current.schemaSql,
        classificationJson: formRef.current.classificationJson,
        locale: formRef.current.locale,
        sqlProvider: formRef.current.sqlProvider,
        columnRules: columnRulesRef.current,
        columnOrder: columnOrderRef.current,
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
      setColumnOrder(updated.columnOrder ?? {});
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
          updated.columnOrder ?? {},
        ),
      );
      setHasUnsavedChanges(false);
      props.setSnack('Mock data schema saved.');
      return true;
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to save mock data schema.'));
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
        columnOrder,
      });
      const nextSchemaRelationshipsJson = buildDefaultSchemaRelationshipsJson(
        model,
        model.columnRules,
      );
      const updated = await updateMockDataSchema(requestId, {
        projectId,
        name: form.name,
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        locale: form.locale,
        sqlProvider: form.sqlProvider,
        columnRules: model.columnRules,
        columnOrder,
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
        columnOrder,
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
        columnOrder,
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
        columnOrder,
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

  function addField(tableName: string) {
    const classification = parseClassificationJsonOrNull(formRef.current.classificationJson);
    const table = classification?.tables?.[tableName];
    if (!classification || !table) {
      props.setError('Cannot add field because classification JSON is invalid.');
      return;
    }

    const existingColumnNames = new Set(Object.keys(table.columns));
    let nextIndex = 1;
    let nextColumnName = `field_${nextIndex}`;
    while (existingColumnNames.has(nextColumnName)) {
      nextIndex += 1;
      nextColumnName = `field_${nextIndex}`;
    }

    table.columns[nextColumnName] = {
      dbType: null,
      semanticType: 'text',
      nullable: true,
      references: null,
    };

    const nextClassificationJson = JSON.stringify(classification, null, 2);
    const nextColumnRule = buildFallbackRule('text', nextColumnName);
    const nextDesignerModelTables =
      designerModel?.tables.map((tableItem) =>
        tableItem.name === tableName
          ? {
              ...tableItem,
              columns: [
                ...tableItem.columns,
                {
                  name: nextColumnName,
                  dbType: null,
                  nullable: true,
                  isPrimaryKey: false,
                },
              ],
            }
          : tableItem,
      ) ?? null;

    setDirtyForm((prev) => ({
      ...prev,
      classificationJson: nextClassificationJson,
    }));
    setDesignerModel((prev) =>
      prev
        ? {
            ...prev,
            tables: nextDesignerModelTables ?? prev.tables,
            columnRules: {
              ...prev.columnRules,
              [tableName]: {
                ...(prev.columnRules[tableName] ?? {}),
                [nextColumnName]: nextColumnRule,
              },
            },
          }
        : prev,
    );
    setHasUnsavedChanges(true);
    setColumnRules((prev) => ({
      ...prev,
      [tableName]: {
        ...(prev[tableName] ?? {}),
        [nextColumnName]: nextColumnRule,
      },
    }));
    setColumnOrder((prev) => {
      const currentOrder =
        prev[tableName] ??
        designerModel?.tables
          .find((tableItem) => tableItem.name === tableName)
          ?.columns.map((c) => c.name) ??
        Object.keys(table.columns).filter((columnName) => columnName !== nextColumnName);

      return {
        ...prev,
        [tableName]: [...currentOrder, nextColumnName],
      };
    });
  }

  function deleteField(tableName: string, columnName: string) {
    const classification = parseClassificationJsonOrNull(formRef.current.classificationJson);
    const table = classification?.tables?.[tableName];
    if (!classification || !table) {
      props.setError('Cannot delete field because classification JSON is invalid.');
      return;
    }

    if (!table.columns[columnName]) {
      return;
    }

    delete table.columns[columnName];
    const nextClassificationJson = JSON.stringify(classification, null, 2);

    setDirtyForm((prev) => ({
      ...prev,
      classificationJson: nextClassificationJson,
    }));
    setDesignerModel((prev) =>
      prev
        ? {
            ...prev,
            tables: prev.tables.map((tableItem) =>
              tableItem.name === tableName
                ? {
                    ...tableItem,
                    columns: tableItem.columns.filter((column) => column.name !== columnName),
                  }
                : tableItem,
            ),
            columnRules: Object.fromEntries(
              Object.entries(prev.columnRules).map(([tableItemName, rules]) => [
                tableItemName,
                tableItemName === tableName
                  ? Object.fromEntries(
                      Object.entries(rules).filter(([name]) => name !== columnName),
                    )
                  : rules,
              ]),
            ),
          }
        : prev,
    );
    setHasUnsavedChanges(true);
    setColumnRules((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([tableItemName, rules]) => [
          tableItemName,
          tableItemName === tableName
            ? Object.fromEntries(Object.entries(rules).filter(([name]) => name !== columnName))
            : rules,
        ]),
      ),
    );
    setColumnOrder((prev) => {
      const currentOrder =
        prev[tableName] ??
        designerModel?.tables
          .find((tableItem) => tableItem.name === tableName)
          ?.columns.map((c) => c.name) ??
        Object.keys(table.columns);

      return {
        ...prev,
        [tableName]: currentOrder.filter((name) => name !== columnName),
      };
    });
  }

  function reorderColumns(tableName: string, fromColumnName: string, toColumnName: string) {
    if (fromColumnName === toColumnName) {
      return;
    }

    setHasUnsavedChanges(true);
    setColumnOrder((prev) => {
      const currentOrder =
        prev[tableName] ??
        designerModel?.tables
          .find((table) => table.name === tableName)
          ?.columns.map((c) => c.name) ??
        [];
      const fromIndex = currentOrder.indexOf(fromColumnName);
      const toIndex = currentOrder.indexOf(toColumnName);

      if (fromIndex < 0 || toIndex < 0) {
        return prev;
      }

      const nextOrder = [...currentOrder];
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, fromColumnName);

      return {
        ...prev,
        [tableName]: nextOrder,
      };
    });
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

  function parseCustomTypeValues(valuesText: string): Array<string | number | boolean> {
    return valuesText
      .replace(/\r\n|\r|\n/g, ',')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => {
        const lower = item.toLowerCase();
        if (lower === 'true') {
          return true;
        }
        if (lower === 'false') {
          return false;
        }
        if (/^-?\d+(\.\d+)?$/.test(item)) {
          return Number(item);
        }
        return item;
      });
  }

  async function createCustomListType(input: { name: string; valuesText: string }) {
    const item = await createCustomListTypeApi({
      name: input.name,
      values: parseCustomTypeValues(input.valuesText),
    });
    await props.reloadCustomListTypes();
    props.setSnack(`Created ${item.name}.`);
  }

  async function updateCustomListType(id: string, input: { name: string; valuesText: string }) {
    const previousName = props.customListTypes.find((item) => item.id === id)?.name;
    const item = await updateCustomListTypeApi(id, {
      name: input.name,
      values: parseCustomTypeValues(input.valuesText),
    });
    setColumnRules((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([tableName, rules]) => [
          tableName,
          Object.fromEntries(
            Object.entries(rules).map(([columnName, rule]) => [
              columnName,
              rule.kind === 'customList' &&
              (rule.customTypeName === previousName || rule.customTypeName === item.name)
                ? {
                    ...rule,
                    customTypeName: item.name,
                    customValues: item.values,
                  }
                : rule,
            ]),
          ),
        ]),
      ),
    );
    await props.reloadCustomListTypes();
    props.setSnack(`Updated ${item.name}.`);
  }

  async function deleteCustomListType(id: string) {
    const deletedName = props.customListTypes.find((item) => item.id === id)?.name;
    await deleteCustomListTypeApi(id);
    if (deletedName) {
      setColumnRules((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([tableName, rules]) => [
            tableName,
            Object.fromEntries(
              Object.entries(rules).map(([columnName, rule]) => [
                columnName,
                rule.kind === 'customList' && rule.customTypeName === deletedName
                  ? {
                      ...rule,
                      customTypeName: undefined,
                    }
                  : rule,
              ]),
            ),
          ]),
        ),
      );
    }
    await props.reloadCustomListTypes();
    props.setSnack('Custom type deleted.');
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

  function onSequenceDateTimeOptionChange(
    tableName: string,
    columnName: string,
    key: 'start' | 'step' | 'unit' | 'format',
    value: string,
  ) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'sequenceDateTime',
    );
    const currentOptions = fallbackRule.sequenceDateTimeOptions ?? {
      start: defaultSequenceDateTimeStart,
      step: 1,
      unit: 'days' as const,
      format: 'yyyy-MM-dd HH:mm:ss',
    };
    const nextValue =
      key === 'step'
        ? (() => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : currentOptions.step ?? 1;
          })()
        : value.trim() || currentOptions[key];

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      sequenceDateTimeOptions: {
        ...currentOptions,
        [key]: nextValue,
      },
    });
  }

  function onFixedValueOptionChange(tableName: string, columnName: string, value: string) {
    const fallbackRule = mergeRuleDefaults(
      columnRules[tableName]?.[columnName],
      columnName,
      'fixedValue',
    );

    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      fixedValueOptions: { value },
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
          <Typography>Mock data schema not found.</Typography>
          <Button
            onClick={() =>
              navigate(projectId ? `/projects/${projectId}/mock-data-schemas` : '/projects')
            }
            sx={{ mt: 1 }}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const contextValue: MockDataSchemaDetailContextValue = {
    projectId: project.id,
    requestName: form.name || request.name,
    hasUnsavedChanges,
    loading: props.loading,
    form,
    setForm: setDirtyForm,
    columnRules,
    columnOrder,
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
    customListTypes: props.customListTypes,
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
    onSequenceDateTimeOptionChange,
    onFixedValueOptionChange,
    onDigitSequenceOptionChange,
    onFormulaOptionChange,
    onRegularExpressionOptionChange,
    onEmailOptionChange,
    onTextOptionChange,
    addField,
    deleteField,
    reorderColumns,
    applyRule,
    applyCustomListRule,
    createCustomListType,
    updateCustomListType,
    deleteCustomListType,
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
    <MockDataSchemaDetailProvider value={contextValue}>
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
          <MockDataSchemaDetailHeader />
          <GeneralAccordion />
          <SchemaRelationshipsAccordion />
          <SchemasAccordion />
          <DataTypePickerDialog />
          <AnalyzeConfirmDialog />
          <PreviewDialog />
        </Stack>
      </>
    </MockDataSchemaDetailProvider>
  );
}
