import { randomUUID } from 'crypto';
import {
  buildDatabaseSchemaFromClassification,
  parseClassificationJson,
} from '../ai/classificationLoader';
import { buildClassificationPrompt } from '../ai/promptBuilder';
import {
  SchemaRelationshipsConfig,
  CustomListTypeDefinition,
  SqlProvider,
  TableColumnOrder,
  TableColumnRules,
  TableSchema,
} from '../core/types';
import { generateDataByTableOrder } from '../generator/valueGenerator';
import { buildDefaultColumnRules, sanitizeColumnRules } from '../schema/columnRules';
import { resolveTableOrder } from '../schema/dependencyResolver';
import {
  buildGeneratedSqlHeader,
  buildInsertFileArtifacts,
  buildTransactionWrapper,
  SqlFileArtifact,
} from '../writer/sqlWriter';
import { AppStorageState, MockDataSchemaEntity, ProjectEntity } from './models';
import { JsonFileStorage } from './storage';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateMockDataSchemaInput {
  projectId: string;
  name: string;
  schemaSql: string;
  classificationJson: string;
  locale?: string;
  sqlProvider?: SqlProvider | '';
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
  schemaRelationshipsJson?: string;
}

export interface UpdateMockDataSchemaInput {
  projectId?: string;
  name?: string;
  schemaSql?: string;
  classificationJson?: string;
  locale?: string;
  sqlProvider?: SqlProvider | '';
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
  schemaRelationshipsJson?: string;
}

export interface PreviewResult {
  files: SqlFileArtifact[];
  preview: string;
  totalLines: number;
}

export interface UpsertCustomListTypeInput {
  name: string;
  values: Array<string | number | boolean>;
}

function asText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function parseSchemaRelationshipsJson(
  rawJson: string | undefined,
): SchemaRelationshipsConfig | undefined {
  const trimmed = (rawJson ?? '').trim();
  if (!trimmed) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('schemaRelationshipsJson is not valid JSON.');
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(
          'schemaRelationshipsJson array items must be objects like { "users": { ... } }.',
        );
      }
    }
    return parsed as SchemaRelationshipsConfig;
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('schemaRelationshipsJson must be a JSON array or JSON object.');
  }

  // Backward compatibility: allow old object format and convert to new array format.
  return [parsed as Record<string, unknown>] as SchemaRelationshipsConfig;
}

function buildSchemaAndRules(input: {
  schemaSql: string;
  classificationJson: string;
  columnRules?: TableColumnRules;
  columnOrder?: TableColumnOrder;
}): { tables: TableSchema[]; columnRules: TableColumnRules } {
  const classification = parseClassificationJson(input.classificationJson);
  const schema = buildDatabaseSchemaFromClassification(classification);
  if (schema.tables.length === 0) {
    throw new Error('AI classification JSON does not contain any tables.');
  }
  const orderedTables = schema.tables.map((table) => {
    const preferredOrder = input.columnOrder?.[table.name] ?? [];
    if (preferredOrder.length === 0) {
      return table;
    }

    const columnsByName = new Map(table.columns.map((column) => [column.name, column]));
    const orderedColumns = preferredOrder
      .map((columnName) => columnsByName.get(columnName))
      .filter((column): column is TableSchema['columns'][number] => Boolean(column));
    const remainingColumns = table.columns.filter(
      (column) => !preferredOrder.includes(column.name),
    );

    return {
      ...table,
      columns: [...orderedColumns, ...remainingColumns],
    };
  });
  const defaultRules = buildDefaultColumnRules(orderedTables, classification);
  const mergedRules = sanitizeColumnRules(orderedTables, input.columnRules, defaultRules);
  return {
    tables: orderedTables,
    columnRules: mergedRules,
  };
}

function canBuildSchemaAndRules(schemaSql: string, classificationJson: string): boolean {
  return classificationJson.trim().length > 0;
}

export class MockDataSchemaService {
  private readonly storage: JsonFileStorage;

  constructor(storage: JsonFileStorage) {
    this.storage = storage;
  }

  listProjects(): ProjectEntity[] {
    return this.storage.read().projects;
  }

  listCustomListTypes(): CustomListTypeDefinition[] {
    return this.storage.read().customListTypes;
  }

  createCustomListType(input: UpsertCustomListTypeInput): CustomListTypeDefinition {
    const state = this.storage.read();
    const rawName = asText(input.name);
    if (!rawName) {
      throw new Error('Custom type name is required.');
    }
    const name = `Custom:${rawName.replace(/^Custom:/i, '').trim()}`;
    const values = input.values.filter(
      (value) =>
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    );
    if (values.length === 0) {
      throw new Error('Custom type must contain at least one value.');
    }
    if (state.customListTypes.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Custom type '${name}' already exists.`);
    }

    const now = new Date().toISOString();
    const item: CustomListTypeDefinition = {
      id: randomUUID(),
      name,
      values,
      createdAt: now,
      updatedAt: now,
    };
    state.customListTypes.push(item);
    this.storage.write(state);
    return item;
  }

  updateCustomListType(id: string, input: UpsertCustomListTypeInput): CustomListTypeDefinition {
    const state = this.storage.read();
    const item = state.customListTypes.find((entry) => entry.id === id);
    if (!item) {
      throw new Error('Custom type not found.');
    }

    const rawName = asText(input.name);
    if (!rawName) {
      throw new Error('Custom type name is required.');
    }
    const name = `Custom:${rawName.replace(/^Custom:/i, '').trim()}`;
    const values = input.values.filter(
      (value) =>
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    );
    if (values.length === 0) {
      throw new Error('Custom type must contain at least one value.');
    }
    if (
      state.customListTypes.some(
        (entry) => entry.id !== id && entry.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error(`Custom type '${name}' already exists.`);
    }

    item.name = name;
    item.values = values;
    item.updatedAt = new Date().toISOString();
    this.storage.write(state);
    return item;
  }

  deleteCustomListType(id: string): void {
    const state = this.storage.read();
    const deletedType = state.customListTypes.find((item) => item.id === id);
    state.customListTypes = state.customListTypes.filter((item) => item.id !== id);

    if (deletedType) {
      state.mockDataSchemas = state.mockDataSchemas.map((mockDataSchema) => ({
        ...mockDataSchema,
        columnRules: Object.fromEntries(
          Object.entries(mockDataSchema.columnRules ?? {}).map(([tableName, rules]) => [
            tableName,
            Object.fromEntries(
              Object.entries(rules).map(([columnName, rule]) => [
                columnName,
                rule.kind === 'customList' && rule.customTypeName === deletedType.name
                  ? {
                      ...rule,
                      customTypeName: undefined,
                    }
                  : rule,
              ]),
            ),
          ]),
        ),
      }));
    }

    this.storage.write(state);
  }

  createProject(input: CreateProjectInput): ProjectEntity {
    const name = asText(input.name);
    if (!name) {
      throw new Error('Project name is required.');
    }

    const now = new Date().toISOString();
    const project: ProjectEntity = {
      id: randomUUID(),
      name,
      description: asText(input.description),
      createdAt: now,
      updatedAt: now,
    };

    const state = this.storage.read();
    state.projects.push(project);
    this.storage.write(state);
    return project;
  }

  updateProject(id: string, input: UpdateProjectInput): ProjectEntity {
    const state = this.storage.read();
    const project = state.projects.find((item) => item.id === id);
    if (!project) {
      throw new Error('Project not found.');
    }

    if (typeof input.name !== 'undefined') {
      const name = asText(input.name);
      if (!name) {
        throw new Error('Project name is required.');
      }
      project.name = name;
    }
    if (typeof input.description !== 'undefined') {
      project.description = asText(input.description);
    }
    project.updatedAt = new Date().toISOString();
    this.storage.write(state);
    return project;
  }

  deleteProject(id: string): void {
    const state = this.storage.read();
    state.projects = state.projects.filter((item) => item.id !== id);
    state.mockDataSchemas = state.mockDataSchemas.filter((item) => item.projectId !== id);
    this.storage.write(state);
  }

  listMockDataSchemas(projectId?: string): MockDataSchemaEntity[] {
    const mockDataSchemas = this.storage.read().mockDataSchemas;
    if (!projectId) {
      return mockDataSchemas;
    }
    return mockDataSchemas.filter((item) => item.projectId === projectId);
  }

  createMockDataSchema(input: CreateMockDataSchemaInput): MockDataSchemaEntity {
    const state = this.storage.read();
    const project = state.projects.find((item) => item.id === input.projectId);
    if (!project) {
      throw new Error('Project not found.');
    }

    const name = asText(input.name);
    const schemaSql = asText(input.schemaSql);
    const classificationJson = asText(input.classificationJson);
    const locale = asText(input.locale) || 'en';
    const sqlProvider = (asText(input.sqlProvider) as SqlProvider | '') || '';
    const schemaRelationshipsJson = asText(input.schemaRelationshipsJson);
    if (!name) {
      throw new Error('name is required.');
    }

    let columnRules = input.columnRules;
    if (canBuildSchemaAndRules(schemaSql, classificationJson)) {
      const built = buildSchemaAndRules({
        schemaSql,
        classificationJson,
        columnRules: input.columnRules,
        columnOrder: input.columnOrder,
      });
      columnRules = built.columnRules;
    }

    const now = new Date().toISOString();
    const mockDataSchema: MockDataSchemaEntity = {
      id: randomUUID(),
      projectId: input.projectId,
      name,
      schemaSql,
      classificationJson,
      locale,
      sqlProvider,
      columnRules,
      columnOrder: input.columnOrder,
      schemaRelationshipsJson,
      createdAt: now,
      updatedAt: now,
    };

    state.mockDataSchemas.push(mockDataSchema);
    this.storage.write(state);
    return mockDataSchema;
  }

  updateMockDataSchema(id: string, input: UpdateMockDataSchemaInput): MockDataSchemaEntity {
    const state = this.storage.read();
    const mockDataSchema = state.mockDataSchemas.find((item) => item.id === id);
    if (!mockDataSchema) {
      throw new Error('Mock data schema not found.');
    }

    if (typeof input.projectId !== 'undefined') {
      const project = state.projects.find((item) => item.id === input.projectId);
      if (!project) {
        throw new Error('Project not found.');
      }
      mockDataSchema.projectId = input.projectId;
    }
    if (typeof input.name !== 'undefined') {
      const name = asText(input.name);
      if (!name) {
        throw new Error('name is required.');
      }
      mockDataSchema.name = name;
    }
    if (typeof input.schemaSql !== 'undefined') {
      const schemaSql = asText(input.schemaSql);
      mockDataSchema.schemaSql = schemaSql;
    }
    if (typeof input.classificationJson !== 'undefined') {
      const classificationJson = asText(input.classificationJson);
      mockDataSchema.classificationJson = classificationJson;
    }
    if (typeof input.locale !== 'undefined') {
      mockDataSchema.locale = asText(input.locale) || 'en';
    }
    if (typeof input.sqlProvider !== 'undefined') {
      mockDataSchema.sqlProvider = (asText(input.sqlProvider) as SqlProvider | '') || '';
    }
    if (typeof input.columnRules !== 'undefined') {
      mockDataSchema.columnRules = input.columnRules;
    }
    if (typeof input.columnOrder !== 'undefined') {
      mockDataSchema.columnOrder = input.columnOrder;
    }
    if (typeof input.schemaRelationshipsJson !== 'undefined') {
      mockDataSchema.schemaRelationshipsJson = asText(input.schemaRelationshipsJson);
    }

    if (canBuildSchemaAndRules(mockDataSchema.schemaSql, mockDataSchema.classificationJson)) {
      const { columnRules } = buildSchemaAndRules({
        schemaSql: mockDataSchema.schemaSql,
        classificationJson: mockDataSchema.classificationJson,
        columnRules: mockDataSchema.columnRules,
        columnOrder: mockDataSchema.columnOrder,
      });
      mockDataSchema.columnRules = columnRules;
    }

    mockDataSchema.updatedAt = new Date().toISOString();
    this.storage.write(state);
    return mockDataSchema;
  }

  deleteMockDataSchema(id: string): void {
    const state = this.storage.read();
    state.mockDataSchemas = state.mockDataSchemas.filter((item) => item.id !== id);
    this.storage.write(state);
  }

  getMockDataSchema(id: string): MockDataSchemaEntity {
    const mockDataSchema = this.storage.read().mockDataSchemas.find((item) => item.id === id);
    if (!mockDataSchema) {
      throw new Error('Mock data schema not found.');
    }
    return mockDataSchema;
  }

  generatePreviewForMockDataSchema(id: string): PreviewResult {
    const mockDataSchema = this.getMockDataSchema(id);
    return this.generatePreviewFromInput({
      schemaSql: mockDataSchema.schemaSql,
      classificationJson: mockDataSchema.classificationJson,
      locale: mockDataSchema.locale,
      sqlProvider: mockDataSchema.sqlProvider,
      columnRules: mockDataSchema.columnRules,
      columnOrder: mockDataSchema.columnOrder,
      schemaRelationshipsJson: mockDataSchema.schemaRelationshipsJson,
    });
  }

  generatePreviewFromInput(input: {
    schemaSql: string;
    classificationJson: string;
    locale?: string;
    sqlProvider?: SqlProvider | '';
    columnRules?: TableColumnRules;
    columnOrder?: TableColumnOrder;
    schemaRelationshipsJson?: string;
  }): PreviewResult {
    const { tables, columnRules } = buildSchemaAndRules(input);
    const relationships = parseSchemaRelationshipsJson(input.schemaRelationshipsJson);
    const orderedTables = resolveTableOrder(tables, columnRules);
    const generatedRows = generateDataByTableOrder(
      orderedTables,
      columnRules,
      relationships,
      input.locale,
    );
    const files = buildInsertFileArtifacts(generatedRows, input.sqlProvider, {
      includeHeader: false,
      includeTransaction: false,
    });
    const totalRecords = generatedRows.reduce((sum, tableData) => sum + tableData.rows.length, 0);
    const header = buildGeneratedSqlHeader(
      new Date().toISOString(),
      totalRecords,
      input.sqlProvider,
    );
    const transactionWrapper = buildTransactionWrapper(input.sqlProvider);
    const fullText = [
      header,
      ...transactionWrapper.prefix,
      ...files.map(
        (file) =>
          `-- ${(file.orderIndex + 1).toString().padStart(3, '0')}: ${file.tableName}\n${file.content}`,
      ),
      ...transactionWrapper.suffix,
    ].join('\n\n');
    const lines = fullText.split(/\r?\n/);

    return {
      files,
      preview: fullText,
      totalLines: lines.length,
    };
  }

  buildColumnDesignerModel(input: {
    schemaSql: string;
    classificationJson: string;
    columnRules?: TableColumnRules;
    columnOrder?: TableColumnOrder;
  }): { tables: TableSchema[]; columnRules: TableColumnRules } {
    return buildSchemaAndRules(input);
  }

  buildPrompt(schemaSql: string, extraBusinessContext?: string): string {
    if (!asText(schemaSql)) {
      throw new Error('schemaSql is required.');
    }
    return buildClassificationPrompt({
      sqlSchema: schemaSql,
      extraBusinessContext: asText(extraBusinessContext),
    });
  }

  exportCombinedScript(id: string): string {
    const preview = this.generatePreviewForMockDataSchema(id);
    return preview.preview;
  }

  exportCombinedScriptFromInput(input: {
    schemaSql: string;
    classificationJson: string;
    locale?: string;
    sqlProvider?: SqlProvider | '';
    columnRules?: TableColumnRules;
    columnOrder?: TableColumnOrder;
    schemaRelationshipsJson?: string;
  }): string {
    const preview = this.generatePreviewFromInput(input);
    return preview.preview;
  }

  seed(initial: AppStorageState): void {
    this.storage.write(initial);
  }
}
