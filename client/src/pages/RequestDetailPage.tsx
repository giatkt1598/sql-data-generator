import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
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
  GenerationRequestEntity,
  TableColumnRules,
} from '../models/apiModels';
import { estimateRelationshipRows } from '../utilities/relationshipEstimate';
import { buildDefaultSchemaRelationshipsJson } from '../utilities/schemaRelationships';
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

export function RequestDetailPage(props: RequestDetailPageProps) {
  const { projectId, requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<GenerationRequestEntity | null>(null);
  const [form, setForm] = useState<RequestDetailForm>({
    name: '',
    schemaSql: '',
    classificationJson: '',
    schemaRelationshipsJson: '',
  });
  const [columnRules, setColumnRules] = useState<TableColumnRules>({});
  const [designerModel, setDesignerModel] = useState<ColumnDesignerModel | null>(null);
  const [schemaFocused, setSchemaFocused] = useState(false);
  const [generalExpanded, setGeneralExpanded] = useState(false);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(false);
  const [schemasExpanded, setSchemasExpanded] = useState(true);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerTab, setTypePickerTab] = useState(0);
  const [customListInput, setCustomListInput] = useState('');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [analyzeConfirmOpen, setAnalyzeConfirmOpen] = useState(false);

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
        });
        setColumnRules(found.columnRules ?? {});
        setGeneralExpanded(false);
        setRelationshipsExpanded(false);
        setSchemasExpanded(true);

        if (found.schemaSql.trim() && found.classificationJson.trim()) {
          const model = await getColumnDesignerModel({
            schemaSql: found.schemaSql,
            classificationJson: found.classificationJson,
            columnRules: found.columnRules,
          });
          setDesignerModel(model);
          setColumnRules(model.columnRules);
        } else {
          setDesignerModel(null);
        }
      } catch (exception) {
        props.setError('Failed to load request detail.');
        console.error(exception);
      } finally {
        props.setLoading(false);
      }
    })();
  }, [projectId, requestId]);

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

  const relationshipEstimate = useMemo(
    () => estimateRelationshipRows(form.schemaRelationshipsJson, designerModel),
    [form.schemaRelationshipsJson, designerModel],
  );

  const relationshipEstimateTooltip = useMemo(() => {
    if (!relationshipEstimate) {
      return '';
    }
    if (relationshipEstimate.error) {
      return relationshipEstimate.error;
    }
    return Object.entries(relationshipEstimate.rowCountByTable)
      .sort((left, right) => right[1] - left[1])
      .map(([tableName, rowCount]) => `${tableName}: ${rowCount.toLocaleString()} rows`)
      .join('\n');
  }, [relationshipEstimate]);

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
        columnRules,
        schemaRelationshipsJson: form.schemaRelationshipsJson,
      });
      setRequest(updated);
      props.setSnack('Request detail saved.');
    } catch (exception) {
      props.setError('Failed to save request detail.');
      console.error(exception);
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
      props.setError('Failed to build prompt.');
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
      setRelationshipsExpanded(true);
      setSchemasExpanded(true);
      props.setSnack('Schemas and schema relationships were overwritten.');
    } catch (exception) {
      props.setError('Failed to analyze schemas.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function handlePreview() {
    try {
      props.setLoading(true);
      await flushPendingInput();
      const script = await generateSqlScript({
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        columnRules,
        schemaRelationshipsJson: form.schemaRelationshipsJson,
      });
      setPreviewText(script);
      setPreviewOpen(true);
    } catch (exception) {
      props.setError('Failed to preview SQL.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function handleGenerateSql() {
    try {
      props.setLoading(true);
      await flushPendingInput();
      const script = await generateSqlScript({
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
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
      props.setError('Failed to generate SQL.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function handleCopyPreview() {
    try {
      await navigator.clipboard.writeText(previewText);
      props.setSnack('Preview content copied to clipboard.');
    } catch (exception) {
      props.setError('Failed to copy preview content.');
      console.error(exception);
    }
  }

  function onRuleChange(
    tableName: string,
    columnName: string,
    rule: TableColumnRules[string][string],
  ) {
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
      ...rule,
      fieldName: current?.fieldName ?? pickerTarget.columnName,
      blankPercentage: current?.blankPercentage ?? 0,
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
      kind: 'customList',
      fieldName: columnRules[pickerTarget.tableName]?.[pickerTarget.columnName]?.fieldName ?? pickerTarget.columnName,
      customValues: parsedValues,
      blankPercentage:
        columnRules[pickerTarget.tableName]?.[pickerTarget.columnName]?.blankPercentage ?? 0,
    });
    setTypePickerOpen(false);
  }

  function onBlankPercentageChange(tableName: string, columnName: string, value: string) {
    const parsed = Number(value);
    const blankPercentage = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    const current = columnRules[tableName]?.[columnName];
    const fallbackRule: TableColumnRules[string][string] = current ?? {
      kind: 'semantic',
      semanticType: 'unknown',
      blankPercentage: 0,
    };
    onRuleChange(tableName, columnName, {
      ...fallbackRule,
      fieldName: fallbackRule.fieldName ?? columnName,
      blankPercentage,
    });
  }

  function onFieldNameChange(tableName: string, columnName: string, value: string) {
    const current = columnRules[tableName]?.[columnName];
    const nextFieldName = value.trim() || columnName;
    const fallbackRule: TableColumnRules[string][string] = current ?? {
      kind: 'semantic',
      semanticType: 'unknown',
      fieldName: columnName,
      blankPercentage: 0,
    };
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
      kind: 'customList',
      fieldName: columnRules[tableName]?.[columnName]?.fieldName ?? columnName,
      customValues: parsedValues,
      blankPercentage: columnRules[tableName]?.[columnName]?.blankPercentage ?? 0,
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
    requestName: request.name,
    loading: props.loading,
    form,
    setForm,
    columnRules,
    designerModel,
    schemaFocused,
    setSchemaFocused,
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
    analyzeConfirmOpen,
    setAnalyzeConfirmOpen,
    semanticTypes: props.semanticTypes,
    primaryKeyOptions,
    relationshipEstimateSummary: relationshipEstimate?.summary,
    relationshipEstimateTooltip,
    relationshipEstimateError: relationshipEstimate?.error,
    openTypePicker,
    onFieldNameChange,
    onBlankPercentageChange,
    onCustomListValueChange,
    applyRule,
    applyCustomListRule,
    handleBack: () => navigate(-1),
    buildPrompt,
    handlePreview,
    handleGenerateSql,
    saveDetail,
    analyzeAndBuildSchemas,
    handleCopyPreview,
  };

  return (
    <RequestDetailProvider value={contextValue}>
      <Stack spacing={2}>
        <RequestDetailHeader />
        <GeneralAccordion />
        <SchemaRelationshipsAccordion />
        <SchemasAccordion />
        <DataTypePickerDialog />
        <AnalyzeConfirmDialog />
        <PreviewDialog />
      </Stack>
    </RequestDetailProvider>
  );
}
