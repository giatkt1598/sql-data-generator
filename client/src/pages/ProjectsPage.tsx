import { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { createProject, deleteProject, updateProject } from '../apis';
import type { ProjectEntity } from '../models/apiModels';
import type { ProjectsPageProps } from './pageProps';

interface ProjectForm {
  name: string;
  description: string;
}

const emptyProjectForm: ProjectForm = { name: '', description: '' };

export function ProjectsPage(props: ProjectsPageProps) {
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
