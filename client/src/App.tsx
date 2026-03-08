import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  createGenerationRequest,
  createProject,
  deleteGenerationRequest,
  deleteProject,
  generateClassificationPrompt,
  getColumnDesignerModel,
  getGenerationRequests,
  getProjects,
  getSemanticTypes,
  updateGenerationRequest,
  updateProject,
} from './api';
import type {
  ColumnDesignerModel,
  ColumnGenerationRule,
  GenerationRequestEntity,
  ProjectEntity,
  SemanticDataType,
  TableColumnRules,
} from './api';

interface ProjectForm {
  name: string;
  description: string;
}

interface RequestDialogForm {
  name: string;
  rowsPerTable: string;
}

interface RequestDetailForm {
  name: string;
  rowsPerTable: string;
  schemaSql: string;
  classificationJson: string;
}

const emptyProjectForm: ProjectForm = { name: '', description: '' };
const emptyRequestDialogForm: RequestDialogForm = { name: '', rowsPerTable: '10' };

function stringifyRule(rule?: ColumnGenerationRule): string {
  if (!rule) {
    return 'unknown';
  }
  if (rule.kind === 'reference' && rule.reference) {
    return `${rule.reference.tableName}.${rule.reference.columnName}`;
  }
  return rule.semanticType ?? 'unknown';
}

function parseRule(value: string): ColumnGenerationRule {
  if (value.includes('.')) {
    const [tableName, columnName] = value.split('.', 2);
    return { kind: 'reference', reference: { tableName, columnName } };
  }
  return { kind: 'semantic', semanticType: value as SemanticDataType };
}

function App() {
  const [projects, setProjects] = useState<ProjectEntity[]>([]);
  const [semanticTypes, setSemanticTypes] = useState<SemanticDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

  async function reloadProjects() {
    const data = await getProjects();
    setProjects(data);
  }

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [projectData, semanticData] = await Promise.all([getProjects(), getSemanticTypes()]);
        setProjects(projectData);
        setSemanticTypes(semanticData);
      } catch (exception) {
        setError('Failed to load initial data.');
        console.error(exception);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Routes>
        <Route
          path="/projects"
          element={
            <ProjectsPage
              projects={projects}
              loading={loading}
              setLoading={setLoading}
              setSnack={setSnack}
              setError={setError}
              reloadProjects={reloadProjects}
            />
          }
        />
        <Route
          path="/projects/:projectId/requests"
          element={
            <RequestsPage
              projects={projects}
              loading={loading}
              setLoading={setLoading}
              setSnack={setSnack}
              setError={setError}
            />
          }
        />
        <Route
          path="/projects/:projectId/requests/:requestId"
          element={
            <RequestDetailPage
              projects={projects}
              semanticTypes={semanticTypes}
              loading={loading}
              setLoading={setLoading}
              setSnack={setSnack}
              setError={setError}
            />
          }
        />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={3500}
        onClose={() => setSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSnack('')}>
          {snack}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3500}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function ProjectsPage(props: {
  projects: ProjectEntity[];
  loading: boolean;
  setLoading: (value: boolean) => void;
  setSnack: (value: string) => void;
  setError: (value: string) => void;
  reloadProjects: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm);

  function openNewDialog() {
    setEditingId(null);
    setForm(emptyProjectForm);
    setDialogOpen(true);
  }

  function openEditDialog(project: ProjectEntity) {
    setEditingId(project.id);
    setForm({ name: project.name, description: project.description });
    setDialogOpen(true);
  }

  async function saveProject() {
    try {
      props.setLoading(true);
      if (editingId) {
        await updateProject(editingId, form);
      } else {
        await createProject(form);
      }
      await props.reloadProjects();
      setDialogOpen(false);
      props.setSnack('Project saved.');
    } catch (exception) {
      props.setError('Failed to save project.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function removeProject(projectId: string) {
    try {
      props.setLoading(true);
      await deleteProject(projectId);
      await props.reloadProjects();
      props.setSnack('Project deleted.');
    } catch (exception) {
      props.setError('Failed to delete project.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Projects
          </Typography>
          <Button startIcon={<AddIcon />} variant="contained" onClick={openNewDialog}>
            New
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {props.projects.map((project) => (
                <TableRow
                  key={project.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${project.id}/requests`)}
                >
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.description}</TableCell>
                  <TableCell>{new Date(project.updatedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDialog(project);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeProject(project.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Project' : 'New Project'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveProject()} disabled={props.loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

function RequestsPage(props: {
  projects: ProjectEntity[];
  loading: boolean;
  setLoading: (value: boolean) => void;
  setSnack: (value: string) => void;
  setError: (value: string) => void;
}) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<GenerationRequestEntity[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<GenerationRequestEntity | null>(null);
  const [form, setForm] = useState<RequestDialogForm>(emptyRequestDialogForm);

  const project = useMemo(
    () => props.projects.find((item) => item.id === projectId),
    [props.projects, projectId],
  );

  async function reloadRequests() {
    if (!projectId) {
      return;
    }
    const data = await getGenerationRequests(projectId);
    setRequests(data);
  }

  useEffect(() => {
    if (!projectId) {
      return;
    }
    void reloadRequests();
  }, [projectId]);

  function openNewDialog() {
    setEditingRequest(null);
    setForm(emptyRequestDialogForm);
    setDialogOpen(true);
  }

  function openEditDialog(request: GenerationRequestEntity) {
    setEditingRequest(request);
    setForm({ name: request.name, rowsPerTable: String(request.rowsPerTable) });
    setDialogOpen(true);
  }

  async function saveRequest() {
    if (!projectId) {
      return;
    }
    try {
      props.setLoading(true);
      if (editingRequest) {
        await updateGenerationRequest(editingRequest.id, {
          projectId,
          name: form.name,
          rowsPerTable: Number(form.rowsPerTable),
          schemaSql: editingRequest.schemaSql,
          classificationJson: editingRequest.classificationJson,
          columnRules: editingRequest.columnRules,
        });
      } else {
        await createGenerationRequest({
          projectId,
          name: form.name,
          rowsPerTable: Number(form.rowsPerTable),
          schemaSql: '',
          classificationJson: '',
          columnRules: {},
        });
      }
      await reloadRequests();
      setDialogOpen(false);
      props.setSnack('Generation request saved.');
    } catch (exception) {
      props.setError('Failed to save generation request.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function removeRequest(id: string) {
    try {
      props.setLoading(true);
      await deleteGenerationRequest(id);
      await reloadRequests();
      props.setSnack('Generation request deleted.');
    } catch (exception) {
      props.setError('Failed to delete generation request.');
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  if (!project) {
    return (
      <Card>
        <CardContent>
          <Typography>Project not found.</Typography>
          <Button onClick={() => navigate('/projects')} sx={{ mt: 1 }}>
            Back to Projects
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={() => navigate('/projects')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Generate Requests - {project.name}
            </Typography>
          </Stack>
          <Button startIcon={<AddIcon />} variant="contained" onClick={openNewDialog}>
            New
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Rows/Table</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow
                  key={request.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${projectId}/requests/${request.id}`)}
                >
                  <TableCell>{request.name}</TableCell>
                  <TableCell>{request.rowsPerTable}</TableCell>
                  <TableCell>{new Date(request.updatedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDialog(request);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeRequest(request.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingRequest ? 'Edit Generate Request' : 'New Generate Request'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              label="Rows per table"
              value={form.rowsPerTable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rowsPerTable: event.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRequest()} disabled={props.loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

function RequestDetailPage(props: {
  projects: ProjectEntity[];
  semanticTypes: SemanticDataType[];
  loading: boolean;
  setLoading: (value: boolean) => void;
  setSnack: (value: string) => void;
  setError: (value: string) => void;
}) {
  const { projectId, requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<GenerationRequestEntity | null>(null);
  const [form, setForm] = useState<RequestDetailForm>({
    name: '',
    rowsPerTable: '10',
    schemaSql: '',
    classificationJson: '',
  });
  const [columnRules, setColumnRules] = useState<TableColumnRules>({});
  const [designerModel, setDesignerModel] = useState<ColumnDesignerModel | null>(null);
  const [schemaFocused, setSchemaFocused] = useState(false);
  const [generalExpanded, setGeneralExpanded] = useState(false);
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
          rowsPerTable: String(found.rowsPerTable),
          schemaSql: found.schemaSql,
          classificationJson: found.classificationJson,
        });
        setColumnRules(found.columnRules ?? {});
        setGeneralExpanded(false);
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
        rowsPerTable: Number(form.rowsPerTable),
        schemaSql: form.schemaSql,
        classificationJson: form.classificationJson,
        columnRules,
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
      setSchemasExpanded(true);
      props.setSnack('Schemas analyzed and built.');
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
          <Button onClick={() => navigate(projectId ? `/projects/${projectId}/requests` : '/projects')} sx={{ mt: 1 }}>
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
              label="Rows per table"
              value={form.rowsPerTable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rowsPerTable: event.target.value }))
              }
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
            <Stack spacing={1.5}>
              {designerModel.tables.map((table) => (
                <Card key={table.name} variant="outlined">
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
          )}
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}

export default App;
