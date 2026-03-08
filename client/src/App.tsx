import { useEffect, useState } from 'react';
import { Container } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getProjects, getSemanticTypes } from './apis';
import { FeedbackSnackbars } from './components/FeedbackSnackbars';
import type { DataTypeDefinition, ProjectEntity } from './models/apiModels';
import { ProjectsPage } from './pages/ProjectsPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { RequestsPage } from './pages/RequestsPage';

function App() {
  const [projects, setProjects] = useState<ProjectEntity[]>([]);
  const [semanticTypes, setSemanticTypes] = useState<DataTypeDefinition[]>([]);
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

      <FeedbackSnackbars
        snack={snack}
        error={error}
        onCloseSnack={() => setSnack('')}
        onCloseError={() => setError('')}
      />
    </Container>
  );
}

export default App;
