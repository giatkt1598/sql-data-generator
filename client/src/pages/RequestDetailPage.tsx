import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate, useParams } from 'react-router-dom';
import { generateClassificationPrompt, getColumnDesignerModel, getGenerationRequests, updateGenerationRequest } from '../apis';
import { parseRule, stringifyRule } from '../utilities/ruleUtils';
import { tableAnchorId } from '../utilities/schemaAnchor';
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

  const referenceOptions = useMemo(() => {
    if (!designerModel) {
      return [] as string[];
    }
    return designerModel.tables.flatMap((table) =>
      table.columns.map((column) => `${table.name}.${column.name}`),
    );
  }, [designerModel]);

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
    try {
      props.setLoading(true);
      const model = await getColumnDesignerModel({
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        columnRules,
      });
      setDesignerModel(model);
      setColumnRules(model.columnRules);
      setForm((prev) => ({
        ...prev,
        schemaRelationshipsJson: buildDefaultSchemaRelationshipsJson(model, model.columnRules),
      }));
      setRelationshipsExpanded(true);
      setSchemasExpanded(true);
      props.setSnack('Schemas and schema relationships analyzed and built.');
    } catch (exception) {
      props.setError('Failed to analyze schemas.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  function onRuleChange(tableName: string, columnName: string, value: string) {
    setColumnRules((prev) => ({
      ...prev,
      [tableName]: {
        ...(prev[tableName] ?? {}),
        [columnName]: parseRule(value),
      },
    }));
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
              onClick={() => void analyzeAndBuildSchemas()}
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
                                <FormControl fullWidth size="small">
                                  <InputLabel>Type</InputLabel>
                                  <Select
                                    label="Type"
                                    value={value}
                                    onChange={(event) =>
                                      onRuleChange(table.name, column.name, event.target.value)
                                    }
                                  >
                                    {props.semanticTypes.map((item) => (
                                      <MenuItem key={item} value={item}>
                                        {item}
                                      </MenuItem>
                                    ))}
                                    {referenceOptions.map((item) => (
                                      <MenuItem key={item} value={item}>
                                        {item}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
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
    </Stack>
  );
}
