import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate, useParams } from 'react-router-dom';
import {
  generateClassificationPrompt,
  generateSqlScript,
  getColumnDesignerModel,
  getGenerationRequests,
  updateGenerationRequest,
} from '../apis';
import { stringifyRule } from '../utilities/ruleUtils';
import { tableAnchorId } from '../utilities/schemaAnchor';
import { estimateRelationshipRows } from '../utilities/relationshipEstimate';
import { buildDefaultSchemaRelationshipsJson } from '../utilities/schemaRelationships';
import type {
  ColumnDesignerModel,
  GenerationRequestEntity,
  TableColumnRules,
} from '../models/apiModels';
import type { RequestDetailPageProps } from './pageProps';

interface RequestDetailForm {
  name: string;
  schemaSql: string;
  classificationJson: string;
  schemaRelationshipsJson: string;
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
  const [pickerTarget, setPickerTarget] = useState<{
    tableName: string;
    columnName: string;
  } | null>(null);
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

  async function saveDetail() {
    if (!projectId || !requestId) {
      return;
    }
    try {
      props.setLoading(true);
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

  function requestAnalyzeAndBuildSchemas() {
    setAnalyzeConfirmOpen(true);
  }

  async function handlePreview() {
    try {
      props.setLoading(true);
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

  function onRuleChange(tableName: string, columnName: string, rule: TableColumnRules[string][string]) {
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
      customValues: parsedValues,
      blankPercentage: columnRules[pickerTarget.tableName]?.[pickerTarget.columnName]?.blankPercentage ?? 0,
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
      blankPercentage,
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

  const basicValueSet = new Set([
    'boolean',
    'guid',
    'int',
    'float',
    'number',
    'date',
    'dateTime',
    'text',
    'url',
    'unknown',
  ]);
  const personalValueSet = new Set([
    'email',
    'phoneNumber',
    'address',
    'firstName',
    'lastName',
    'fullName',
    'gender',
    'city',
    'country',
    'zipCode',
    'companyName',
    'jobTitle',
  ]);

  const basicOptions = props.semanticTypes.filter((item) => basicValueSet.has(item.value));
  const personalOptions = props.semanticTypes.filter((item) => personalValueSet.has(item.value));

  const tabGroups = [
    { label: 'Basic', kind: 'basic' as const },
    { label: 'Personal', kind: 'personal' as const },
    { label: 'Table Primary Key', kind: 'pk' as const },
  ];

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate(`/projects/${project.id}/requests`)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Request: {request.name}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={() => void handlePreview()} disabled={props.loading}>
            Preview
          </Button>
          <Button variant="outlined" onClick={() => void handleGenerateSql()} disabled={props.loading}>
            Generate SQL
          </Button>
          <Button variant="contained" onClick={() => void saveDetail()} disabled={props.loading}>
            Save
          </Button>
        </Stack>
      </Box>

      <Accordion expanded={generalExpanded} onChange={(_event, value) => setGeneralExpanded(value)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 700 }}>General</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label="Request Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              label="Create Table SQL"
              value={form.schemaSql}
              multiline
              minRows={schemaFocused ? 20 : 6}
              maxRows={20}
              onFocus={() => setSchemaFocused(true)}
              onBlur={() => setSchemaFocused(false)}
              onChange={(event) => setForm((prev) => ({ ...prev, schemaSql: event.target.value }))}
            />
            <Button variant="outlined" onClick={() => void buildPrompt()} disabled={props.loading}>
              Build Prompt
            </Button>
            <TextField
              label="AI Classification JSON"
              value={form.classificationJson}
              multiline
              minRows={6}
              maxRows={6}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, classificationJson: event.target.value }))
              }
            />
            <Button
              variant="contained"
              onClick={requestAnalyzeAndBuildSchemas}
              disabled={props.loading}
            >
              Analyze & Build Schemas
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={relationshipsExpanded}
        onChange={(_event, value) => setRelationshipsExpanded(value)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 700 }}>Schema Relationships</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <TextField
              label="Schema Relationships JSON"
              value={form.schemaRelationshipsJson}
              multiline
              minRows={10}
              maxRows={20}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, schemaRelationshipsJson: event.target.value }))
              }
              helperText='Use strict JSON array format (no comments). Default distribution is [1].'
              fullWidth
            />
            {relationshipEstimate && (
              <Tooltip
                title={
                  <Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>
                    {relationshipEstimateTooltip}
                  </Box>
                }
                placement="top-start"
                arrow
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    width: 'fit-content',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: relationshipEstimate.error ? 'error.main' : 'divider',
                    backgroundColor: relationshipEstimate.error ? 'error.lighter' : 'background.paper',
                    cursor: 'help',
                  }}
                >
                  <Typography
                    variant="body2"
                    color={relationshipEstimate.error ? 'error.main' : 'text.secondary'}
                  >
                    {relationshipEstimate.summary}
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={schemasExpanded} onChange={(_event, value) => setSchemasExpanded(value)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 700 }}>Schemas</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {!designerModel && (
            <Typography color="text.secondary">
              No schemas yet. Click "Analyze & Build Schemas" in General.
            </Typography>
          )}
          {designerModel && (
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack spacing={1.5}>
                  {designerModel.tables.map((table) => (
                    <Card key={table.name} id={tableAnchorId(table.name)} variant="outlined">
                      <CardContent>
                        <Typography sx={{ fontWeight: 700, mb: 1 }}>{table.name}</Typography>
                        <Stack spacing={1}>
                          {table.columns.map((column) => {
                            const value = stringifyRule(columnRules[table.name]?.[column.name]);
                            const blankPercentage =
                              columnRules[table.name]?.[column.name]?.blankPercentage ?? 0;
                            return (
                              <Stack
                                key={`${table.name}.${column.name}`}
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1}
                                alignItems={{ md: 'center' }}
                              >
                                <Box sx={{ minWidth: 240 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {column.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {column.dbType}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="outlined"
                                  onClick={() => openTypePicker(table.name, column.name)}
                                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                                >
                                  {value}
                                </Button>
                                <TextField
                                  label="Blank (%)"
                                  size="small"
                                  type="number"
                                  value={blankPercentage}
                                  onChange={(event) =>
                                    onBlankPercentageChange(
                                      table.name,
                                      column.name,
                                      event.target.value,
                                    )
                                  }
                                  inputProps={{ min: 0, max: 100 }}
                                  sx={{ width: { xs: '100%', md: 130 } }}
                                />
                              </Stack>
                            );
                          })}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              <Card
                variant="outlined"
                sx={{
                  width: { xs: '100%', lg: 260 },
                  position: { lg: 'sticky' },
                  top: { lg: 84 },
                  alignSelf: { lg: 'flex-start' },
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Table Index
                  </Typography>
                  <Stack spacing={0.5}>
                    {designerModel.tables.map((table) => (
                      <Button
                        key={`toc-${table.name}`}
                        size="small"
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => {
                          document
                            .getElementById(tableAnchorId(table.name))
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {table.name}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Choose Data Type</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 360 }}>
            <Tabs
              orientation="vertical"
              value={typePickerTab}
              onChange={(_event, value: number) => setTypePickerTab(value)}
              sx={{ borderRight: 1, borderColor: 'divider', minWidth: 220 }}
            >
              {tabGroups.map((group, index) => (
                <Tab key={group.label} label={group.label} value={index} />
              ))}
            </Tabs>

            <Box sx={{ flex: 1 }}>
              {typePickerTab === 0 && (
                <Stack spacing={1}>
                  {basicOptions.map((option) => (
                    <Card
                      key={option.value}
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => applyRule({ kind: 'semantic', semanticType: option.value })}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {option.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.description} ({option.value})
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        customList
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Custom values separated by comma. Example: admin,user,manager
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Custom values"
                          value={customListInput}
                          onChange={(event) => setCustomListInput(event.target.value)}
                        />
                        <Button variant="contained" onClick={applyCustomListRule}>
                          Apply
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              )}

              {typePickerTab === 1 && (
                <Stack spacing={1}>
                  {personalOptions.map((option) => (
                    <Card
                      key={option.value}
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => applyRule({ kind: 'semantic', semanticType: option.value })}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {option.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.description} ({option.value})
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              {typePickerTab === 2 && (
                <Stack spacing={1}>
                  {primaryKeyOptions.map((option) => (
                    <Card
                      key={option.value}
                      variant="outlined"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        const [tableName, columnName] = option.value.split('.', 2);
                        applyRule({
                          kind: 'reference',
                          reference: { tableName, columnName },
                        });
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {option.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={analyzeConfirmOpen}
        onClose={() => setAnalyzeConfirmOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Rebuild Schemas?</DialogTitle>
        <DialogContent>
          <Typography>
            This action will overwrite the current Schemas and Schema Relationships data.
          </Typography>
        </DialogContent>
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAnalyzeConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setAnalyzeConfirmOpen(false);
              void analyzeAndBuildSchemas();
            }}
            disabled={props.loading}
          >
            Continue
          </Button>
        </Stack>
      </Dialog>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              SQL Preview (Full Content)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void handleCopyPreview()}
            >
              Copy
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: 13,
              p: 1,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
              maxHeight: 650,
              overflow: 'auto',
            }}
          >
            {previewText}
          </Box>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
