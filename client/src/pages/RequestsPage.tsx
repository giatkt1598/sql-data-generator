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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createGenerationRequest,
  deleteGenerationRequest,
  getGenerationRequests,
  updateGenerationRequest,
} from '../apis';
import type { GenerationRequestEntity } from '../models/apiModels';
import { getErrorMessage } from '../utilities/errorUtils';
import type { RequestsPageProps } from './pageProps';

interface RequestDialogForm {
  name: string;
}

const emptyRequestDialogForm: RequestDialogForm = { name: '' };

export function RequestsPage(props: RequestsPageProps) {
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
    setForm({ name: request.name });
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
          schemaSql: editingRequest.schemaSql,
          classificationJson: editingRequest.classificationJson,
          columnRules: editingRequest.columnRules,
          schemaRelationshipsJson: editingRequest.schemaRelationshipsJson,
        });
      } else {
        await createGenerationRequest({
          projectId,
          name: form.name,
          schemaSql: '',
          classificationJson: '',
          columnRules: {},
          schemaRelationshipsJson: '',
        });
      }
      await reloadRequests();
      setDialogOpen(false);
      props.setSnack('Generation request saved.');
    } catch (exception) {
      props.setError(getErrorMessage(exception, 'Failed to save generation request.'));
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
      props.setError(getErrorMessage(exception, 'Failed to delete generation request.'));
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
