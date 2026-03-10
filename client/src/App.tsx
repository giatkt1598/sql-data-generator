import './App.css';
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
import { MockDataSchemaDetailPage } from './pages/MockDataSchemaDetailPage';
import { MockDataSchemasPage } from './pages/MockDataSchemasPage';
import { getErrorMessage } from './utilities/errorUtils';

const DEFAULT_PROJECT_ID = 'local';

function App() {
  const [projects, setProjects] = useState<ProjectEntity[]>([]);
  const [semanticTypes, setSemanticTypes] = useState<DataTypeDefinition[]>([]);
  const [supportedLocales, setSupportedLocales] = useState<SupportedLocaleDefinition[]>([]);
  const [customListTypes, setCustomListTypes] = useState<CustomListTypeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

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

  const defaultProjectId =
    projects.find((project) => project.id === DEFAULT_PROJECT_ID)?.id ??
    projects[0]?.id ??
    DEFAULT_PROJECT_ID;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Routes>
        <Route
          path="/projects"
          element={<Navigate to={`/projects/${defaultProjectId}/mock-data-schemas`} replace />}
        />
        <Route
          path="/projects/:projectId/mock-data-schemas"
          element={
            <MockDataSchemasPage
              projects={projects}
              loading={loading}
              setLoading={setLoading}
              setSnack={setSnack}
              setError={setError}
            />
          }
        />
        <Route
          path="/projects/:projectId/mock-data-schemas/:requestId"
          element={
            <MockDataSchemaDetailPage
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
        <Route
          path="*"
          element={<Navigate to={`/projects/${defaultProjectId}/mock-data-schemas`} replace />}
        />
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
