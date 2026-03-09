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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
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

const DEFAULT_PROJECT_ID = 'local';

dayjs.extend(relativeTime);

function getTableNames(classificationJson: string): string[] {
  const trimmed = classificationJson.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      tables?: Record<string, unknown>;
    };
    return Object.keys(parsed.tables ?? {});
  } catch {
    return [];
  }
}

function formatTableNames(tableNames: string[]): string {
  if (tableNames.length === 0) {
    return '-';
  }

  if (tableNames.length <= 4) {
    return tableNames.join(', ');
  }

  const remainingCount = tableNames.length - 3;
  return `${tableNames[0]}, ${tableNames[1]}, ${tableNames[2]}, ... and ${remainingCount} tables`;
}

function renderDateTimeWithRelative(value: string) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="body2">{new Date(value).toLocaleString()}</Typography>
      <Typography variant="caption" color="text.secondary">
        {dayjs(value).fromNow()}
      </Typography>
    </Stack>
  );
}

export function MockDataSchemasPage(props: MockDataSchemasPageProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [mockDataSchemas, setMockDataSchemas] = useState<MockDataSchemaEntity[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMockDataSchema, setEditingMockDataSchema] = useState<MockDataSchemaEntity | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<MockDataSchemaEntity | null>(null);
  const [form, setForm] = useState<MockDataSchemaDialogForm>({ name: '' });

  const project = useMemo(
    () => props.projects.find((item) => item.id === projectId),
    [props.projects, projectId],
  );
  const fallbackProjectId =
    props.projects.find((item) => item.id === DEFAULT_PROJECT_ID)?.id ??
    props.projects[0]?.id ??
    DEFAULT_PROJECT_ID;
  const sortedMockDataSchemas = useMemo(
    () =>
      [...mockDataSchemas].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [mockDataSchemas],
  );

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

  function openEditDialog(mockDataSchema: MockDataSchemaEntity) {
    setEditingMockDataSchema(mockDataSchema);
    setForm({ name: mockDataSchema.name });
    setDialogOpen(true);
  }

  async function saveMockDataSchema() {
    if (!projectId || !editingMockDataSchema) {
      return;
    }
    try {
      props.setLoading(true);
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

  function buildNextMockDataSchemaName(): string {
    const prefix = 'MOCK DATA - ';
    const maxSequence = mockDataSchemas.reduce((currentMax, item) => {
      if (!item.name.startsWith(prefix)) {
        return currentMax;
      }

      const parsed = Number(item.name.slice(prefix.length).trim());
      if (!Number.isFinite(parsed)) {
        return currentMax;
      }

      return Math.max(currentMax, parsed);
    }, 0);

    return `${prefix}${maxSequence + 1}`;
  }

  async function createDefaultMockDataSchema() {
    if (!projectId) {
      return;
    }

    try {
      props.setLoading(true);
      const created = await createMockDataSchema({
        projectId,
        name: buildNextMockDataSchemaName(),
        schemaSql: '',
        classificationJson: '',
        locale: 'en',
        sqlProvider: '',
        columnRules: {},
        columnOrder: {},
        schemaRelationshipsJson: '',
      });
      await reloadMockDataSchemas();
      props.setSnack('Mock data schema created.');
      navigate(`/projects/${projectId}/mock-data-schemas/${created.id}`);
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to create mock data schema.'));
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
      setDeleteTarget(null);
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
            Mock Data Schemas
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => void createDefaultMockDataSchema()}
          >
            New
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Table(s)</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedMockDataSchemas.map((mockDataSchema) => (
                <TableRow
                  key={mockDataSchema.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigate(`/projects/${projectId}/mock-data-schemas/${mockDataSchema.id}`)
                  }
                >
                  <TableCell>{mockDataSchema.name}</TableCell>
                  <TableCell>{formatTableNames(getTableNames(mockDataSchema.classificationJson))}</TableCell>
                  <TableCell>{renderDateTimeWithRelative(mockDataSchema.createdAt)}</TableCell>
                  <TableCell>{renderDateTimeWithRelative(mockDataSchema.updatedAt)}</TableCell>
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
                        setDeleteTarget(mockDataSchema);
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
        <DialogTitle>Edit Mock Data Schema</DialogTitle>
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

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Mock Data Schema?</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to delete{' '}
            <strong>{deleteTarget?.name ?? 'this mock data schema'}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && void removeMockDataSchema(deleteTarget.id)}
            disabled={props.loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
