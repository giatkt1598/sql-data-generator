/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type {
  DataTypeDefinition,
  SupportedLocaleDefinition,
  TableColumnRules,
  ColumnDesignerModel,
} from '../../models/apiModels';
import type { RequestDetailForm } from './types';

export interface RequestDetailContextValue {
  projectId: string;
  requestName: string;
  loading: boolean;
  form: RequestDetailForm;
  setForm: Dispatch<SetStateAction<RequestDetailForm>>;
  columnRules: TableColumnRules;
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
  analyzeConfirmOpen: boolean;
  setAnalyzeConfirmOpen: (open: boolean) => void;
  semanticTypes: DataTypeDefinition[];
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
  applyRule: (rule: TableColumnRules[string][string]) => void;
  applyCustomListRule: () => void;
  handleBack: () => void;
  buildPrompt: () => Promise<void>;
  handlePreview: () => Promise<void>;
  handleGenerateSql: () => Promise<void>;
  saveDetail: () => Promise<void>;
  analyzeAndBuildSchemas: () => Promise<void>;
  handleCopyPreview: () => Promise<void>;
}

const RequestDetailContext = createContext<RequestDetailContextValue | null>(null);

export function RequestDetailProvider(props: {
  value: RequestDetailContextValue;
  children: ReactNode;
}) {
  return (
    <RequestDetailContext.Provider value={props.value}>
      {props.children}
    </RequestDetailContext.Provider>
  );
}

export function useRequestDetailContext(): RequestDetailContextValue {
  const context = useContext(RequestDetailContext);
  if (!context) {
    throw new Error('useRequestDetailContext must be used within RequestDetailProvider.');
  }
  return context;
}
