/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type {
  CustomListTypeDefinition,
  DataTypeDefinition,
  SupportedLocaleDefinition,
  TableColumnOrder,
  TableColumnRules,
  ColumnDesignerModel,
} from '../../models/apiModels';
import type { MockDataSchemaDetailForm } from './types';

export interface MockDataSchemaDetailContextValue {
  projectId: string;
  requestName: string;
  hasUnsavedChanges: boolean;
  loading: boolean;
  form: MockDataSchemaDetailForm;
  setForm: Dispatch<SetStateAction<MockDataSchemaDetailForm>>;
  columnRules: TableColumnRules;
  columnOrder: TableColumnOrder;
  designerModel: ColumnDesignerModel | null;
  generalExpanded: boolean;
  setGeneralExpanded: (expanded: boolean) => void;
  relationshipsExpanded: boolean;
  setRelationshipsExpanded: (expanded: boolean) => void;
  schemasExpanded: boolean;
  setSchemasExpanded: (expanded: boolean) => void;
  typePickerOpen: boolean;
  setTypePickerOpen: (open: boolean) => void;
  typePickerTab: number;
  setTypePickerTab: (value: number) => void;
  customListInput: string;
  setCustomListInput: (value: string) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  previewText: string;
  previewTooLarge: boolean;
  analyzeConfirmOpen: boolean;
  setAnalyzeConfirmOpen: (open: boolean) => void;
  semanticTypes: DataTypeDefinition[];
  customListTypes: CustomListTypeDefinition[];
  supportedLocales: SupportedLocaleDefinition[];
  primaryKeyOptions: Array<{ value: string; description: string }>;
  openTypePicker: (tableName: string, columnName: string) => void;
  onFieldNameChange: (tableName: string, columnName: string, value: string) => void;
  onBlankPercentageChange: (tableName: string, columnName: string, value: string) => void;
  onCustomListValueChange: (tableName: string, columnName: string, value: string) => void;
  onNumberOptionChange: (
    tableName: string,
    columnName: string,
    key: 'min' | 'max' | 'decimals',
    value: string,
  ) => void;
  onDateTimeOptionChange: (
    tableName: string,
    columnName: string,
    key: 'start' | 'end' | 'format',
    value: string,
  ) => void;
  onTimeOptionChange: (
    tableName: string,
    columnName: string,
    key: 'from' | 'to' | 'format',
    value: string,
  ) => void;
  onSequenceOptionChange: (
    tableName: string,
    columnName: string,
    key: 'startAt' | 'step' | 'repeat',
    value: string,
  ) => void;
  onSequenceDateTimeOptionChange: (
    tableName: string,
    columnName: string,
    key: 'start' | 'step' | 'unit' | 'format',
    value: string,
  ) => void;
  onFixedValueOptionChange: (tableName: string, columnName: string, value: string) => void;
  onDigitSequenceOptionChange: (
    tableName: string,
    columnName: string,
    key: 'format',
    value: string,
  ) => void;
  onFormulaOptionChange: (
    tableName: string,
    columnName: string,
    key: 'expression',
    value: string,
  ) => void;
  onRegularExpressionOptionChange: (
    tableName: string,
    columnName: string,
    key: 'pattern',
    value: string,
  ) => void;
  onEmailOptionChange: (
    tableName: string,
    columnName: string,
    key: 'domains',
    value: string,
  ) => void;
  onTextOptionChange: (
    tableName: string,
    columnName: string,
    key: 'minLength' | 'maxLength' | 'unit',
    value: string,
  ) => void;
  addField: (tableName: string) => void;
  deleteField: (tableName: string, columnName: string) => void;
  reorderColumns: (tableName: string, fromColumnName: string, toColumnName: string) => void;
  applyRule: (rule: TableColumnRules[string][string]) => void;
  applyCustomListRule: () => void;
  createCustomListType: (input: { name: string; valuesText: string }) => Promise<void>;
  updateCustomListType: (id: string, input: { name: string; valuesText: string }) => Promise<void>;
  deleteCustomListType: (id: string) => Promise<void>;
  handleBack: () => void;
  buildPrompt: () => Promise<void>;
  handlePreview: () => Promise<void>;
  handleGenerateSql: () => Promise<void>;
  saveDetail: () => Promise<void>;
  analyzeAndBuildSchemas: () => Promise<void>;
  handleCopyPreview: () => Promise<void>;
}

export interface SchemaFieldRowContextValue {
  columnRules: TableColumnRules;
  semanticTypes: DataTypeDefinition[];
  customListTypes: CustomListTypeDefinition[];
  getActions: () => MockDataSchemaDetailContextValue;
}

const MockDataSchemaDetailContext = createContext<MockDataSchemaDetailContextValue | null>(null);
const SchemaFieldRowContext = createContext<SchemaFieldRowContextValue | null>(null);

export function MockDataSchemaDetailProvider(props: {
  value: MockDataSchemaDetailContextValue;
  children: ReactNode;
}) {
  return (
    <MockDataSchemaDetailContext.Provider value={props.value}>
      {props.children}
    </MockDataSchemaDetailContext.Provider>
  );
}

export function useMockDataSchemaDetailContext(): MockDataSchemaDetailContextValue {
  const context = useContext(MockDataSchemaDetailContext);
  if (!context) {
    throw new Error(
      'useMockDataSchemaDetailContext must be used within MockDataSchemaDetailProvider.',
    );
  }
  return context;
}

export function SchemaFieldRowProvider(props: {
  value: SchemaFieldRowContextValue;
  children: ReactNode;
}) {
  return (
    <SchemaFieldRowContext.Provider value={props.value}>
      {props.children}
    </SchemaFieldRowContext.Provider>
  );
}

export function useSchemaFieldRowContext(): SchemaFieldRowContextValue {
  const context = useContext(SchemaFieldRowContext);
  if (!context) {
    throw new Error('useSchemaFieldRowContext must be used within SchemaFieldRowProvider.');
  }
  return context;
}
