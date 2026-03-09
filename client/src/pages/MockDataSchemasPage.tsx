import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createMockDataSchema,
  deleteMockDataSchema,
  getMockDataSchemas,
  updateMockDataSchema,
} from '../apis';
import type { MockDataSchemaEntity } from '../models/apiModels';
import { getErrorMessage } from '../utilities/errorUtils';
import type { MockDataSchemasPageProps } from './pageProps';

interface MockDataSchemaDialogForm {
  name: string;
}

const emptyMockDataSchemaDialogForm: MockDataSchemaDialogForm = { name: '' };
const DEFAULT_PROJECT_ID = 'local';

export function MockDataSchemasPage(props: MockDataSchemasPageProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [mockDataSchemas, setMockDataSchemas] = useState<MockDataSchemaEntity[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMockDataSchema, setEditingMockDataSchema] = useState<MockDataSchemaEntity | null>(
    null,
  );
  const [form, setForm] = useState<MockDataSchemaDialogForm>(emptyMockDataSchemaDialogForm);

  const project = useMemo(
    () => props.projects.find((item) => item.id === projectId),
    [props.projects, projectId],
  );
  const fallbackProjectId =
    props.projects.find((item) => item.id === DEFAULT_PROJECT_ID)?.id ??
    props.projects[0]?.id ??
    DEFAULT_PROJECT_ID;

  async function reloadMockDataSchemas() {
    if (!projectId) {
      return;
    }
    const data = await getMockDataSchemas(projectId);
    setMockDataSchemas(data);
  }

  useEffect(() => {
    if (!projectId) {
      return;
    }
    void reloadMockDataSchemas();
  }, [projectId]);

  function openNewDialog() {
    setEditingMockDataSchema(null);
    setForm(emptyMockDataSchemaDialogForm);
    setDialogOpen(true);
  }

  function openEditDialog(mockDataSchema: MockDataSchemaEntity) {
    setEditingMockDataSchema(mockDataSchema);
    setForm({ name: mockDataSchema.name });
    setDialogOpen(true);
  }

  async function saveMockDataSchema() {
    if (!projectId) {
      return;
    }
    try {
      props.setLoading(true);
      if (editingMockDataSchema) {
        await updateMockDataSchema(editingMockDataSchema.id, {
          projectId,
          name: form.name,
          schemaSql: editingMockDataSchema.schemaSql,
          classificationJson: editingMockDataSchema.classificationJson,
          locale: editingMockDataSchema.locale,
          sqlProvider: editingMockDataSchema.sqlProvider,
          columnRules: editingMockDataSchema.columnRules,
          columnOrder: editingMockDataSchema.columnOrder,
          schemaRelationshipsJson: editingMockDataSchema.schemaRelationshipsJson,
        });
      } else {
        await createMockDataSchema({
          projectId,
          name: form.name,
          schemaSql: '',
          classificationJson: '',
          locale: 'en',
          sqlProvider: '',
          columnRules: {},
          columnOrder: {},
          schemaRelationshipsJson: '',
        });
      }
      await reloadMockDataSchemas();
      setDialogOpen(false);
      props.setSnack('Mock data schema saved.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to save mock data schema.'));
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  async function removeMockDataSchema(id: string) {
    try {
      props.setLoading(true);
      await deleteMockDataSchema(id);
      await reloadMockDataSchemas();
      props.setSnack('Mock data schema deleted.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to delete mock data schema.'));
      console.error(exception);
    } finally {
      props.setLoading(false);
    }
  }

  if (!project) {
    return (
      <Card>
        <CardContent>
          <Typography>{props.loading ? 'Loading...' : 'Project not found.'}</Typography>
          {!props.loading && (
            <Button
              onClick={() => navigate(`/projects/${fallbackProjectId}/mock-data-schemas`)}
              sx={{ mt: 1 }}
            >
              Back to Mock Data Schemas
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Mock Data Schemas - {project.name}
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
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockDataSchemas.map((mockDataSchema) => (
                <TableRow
                  key={mockDataSchema.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigate(`/projects/${projectId}/mock-data-schemas/${mockDataSchema.id}`)
                  }
                >
                  <TableCell>{mockDataSchema.name}</TableCell>
                  <TableCell>{new Date(mockDataSchema.updatedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDialog(mockDataSchema);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeMockDataSchema(mockDataSchema.id);
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
        <DialogTitle>
          {editingMockDataSchema ? 'Edit Mock Data Schema' : 'New Mock Data Schema'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void saveMockDataSchema()}
            disabled={props.loading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
