import type {
  CustomListTypeDefinition,
  DataTypeDefinition,
  ProjectEntity,
  SupportedLocaleDefinition,
} from '../models/apiModels';
import type { PaletteMode } from '@mui/material';

export interface AppPageBaseProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  setSnack: (value: string) => void;
  setError: (value: string) => void;
}

export interface ProjectsPageProps extends AppPageBaseProps {
  projects: ProjectEntity[];
  reloadProjects: () => Promise<void>;
}

export interface MockDataSchemasPageProps extends AppPageBaseProps {
  projects: ProjectEntity[];
  themeMode: PaletteMode;
  onToggleThemeMode: () => void;
}

export interface MockDataSchemaDetailPageProps extends AppPageBaseProps {
  projects: ProjectEntity[];
  semanticTypes: DataTypeDefinition[];
  supportedLocales: SupportedLocaleDefinition[];
  customListTypes: CustomListTypeDefinition[];
  reloadCustomListTypes: () => Promise<void>;
}
