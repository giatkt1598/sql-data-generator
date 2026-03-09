import { useEffect, useState } from 'react';
import { Container } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getCustomListTypes, getProjects, getSemanticTypes, getSupportedLocales } from './apis';
import { FeedbackSnackbars } from './components/FeedbackSnackbars';
import type {
  CustomListTypeDefinition,
  DataTypeDefinition,
  ProjectEntity,
  SupportedLocaleDefinition,
} from './models/apiModels';
import { ProjectsPage } from './pages/ProjectsPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { RequestsPage } from './pages/RequestsPage';
import { getErrorMessage } from './utilities/errorUtils';

function App() {
  const [projects, setProjects] = useState<ProjectEntity[]>([]);
  const [semanticTypes, setSemanticTypes] = useState<DataTypeDefinition[]>([]);
  const [supportedLocales, setSupportedLocales] = useState<SupportedLocaleDefinition[]>([]);
  const [customListTypes, setCustomListTypes] = useState<CustomListTypeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

  async function reloadProjects() {
    const data = await getProjects();
    setProjects(data);
  }

  async function reloadCustomListTypes() {
    const data = await getCustomListTypes();
    setCustomListTypes(data);
  }

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [projectData, semanticData, localeData, customTypeData] = await Promise.all([
          getProjects(),
          getSemanticTypes(),
          getSupportedLocales(),
          getCustomListTypes(),
        ]);
        setProjects(projectData);
        setSemanticTypes(semanticData);
        setSupportedLocales(localeData);
        setCustomListTypes(customTypeData);
      } catch (exception) {
        setError(getErrorMessage(exception, 'Failed to load initial data.'));
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
              supportedLocales={supportedLocales}
              customListTypes={customListTypes}
              reloadCustomListTypes={reloadCustomListTypes}
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
