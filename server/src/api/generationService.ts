import { randomUUID } from 'crypto';
import { buildDatabaseSchemaFromClassification, parseClassificationJson } from '../ai/classificationLoader';
import { buildClassificationPrompt } from '../ai/promptBuilder';
import {
  SchemaRelationshipsConfig,
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
  SqlFileArtifact,
} from '../writer/sqlWriter';
import { AppStorageState, GenerationRequestEntity, ProjectEntity } from './models';
import { JsonFileStorage } from './storage';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateGenerationRequestInput {
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

export interface UpdateGenerationRequestInput {
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

function asText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function parseSchemaRelationshipsJson(rawJson: string | undefined): SchemaRelationshipsConfig | undefined {
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

export class GenerationService {
  private readonly storage: JsonFileStorage;

  constructor(storage: JsonFileStorage) {
    this.storage = storage;
  }

  listProjects(): ProjectEntity[] {
    return this.storage.read().projects;
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
    state.generationRequests = state.generationRequests.filter((item) => item.projectId !== id);
    this.storage.write(state);
  }

  listGenerationRequests(projectId?: string): GenerationRequestEntity[] {
    const requests = this.storage.read().generationRequests;
    if (!projectId) {
      return requests;
    }
    return requests.filter((item) => item.projectId === projectId);
  }

  createGenerationRequest(input: CreateGenerationRequestInput): GenerationRequestEntity {
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
    const request: GenerationRequestEntity = {
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

    state.generationRequests.push(request);
    this.storage.write(state);
    return request;
  }

  updateGenerationRequest(
    id: string,
    input: UpdateGenerationRequestInput,
  ): GenerationRequestEntity {
    const state = this.storage.read();
    const request = state.generationRequests.find((item) => item.id === id);
    if (!request) {
      throw new Error('Generation request not found.');
    }

    if (typeof input.projectId !== 'undefined') {
      const project = state.projects.find((item) => item.id === input.projectId);
      if (!project) {
        throw new Error('Project not found.');
      }
      request.projectId = input.projectId;
    }
    if (typeof input.name !== 'undefined') {
      const name = asText(input.name);
      if (!name) {
        throw new Error('name is required.');
      }
      request.name = name;
    }
    if (typeof input.schemaSql !== 'undefined') {
      const schemaSql = asText(input.schemaSql);
      request.schemaSql = schemaSql;
    }
    if (typeof input.classificationJson !== 'undefined') {
      const classificationJson = asText(input.classificationJson);
      request.classificationJson = classificationJson;
    }
    if (typeof input.locale !== 'undefined') {
      request.locale = asText(input.locale) || 'en';
    }
    if (typeof input.sqlProvider !== 'undefined') {
      request.sqlProvider = (asText(input.sqlProvider) as SqlProvider | '') || '';
    }
    if (typeof input.columnRules !== 'undefined') {
      request.columnRules = input.columnRules;
    }
    if (typeof input.columnOrder !== 'undefined') {
      request.columnOrder = input.columnOrder;
    }
    if (typeof input.schemaRelationshipsJson !== 'undefined') {
      request.schemaRelationshipsJson = asText(input.schemaRelationshipsJson);
    }

    if (canBuildSchemaAndRules(request.schemaSql, request.classificationJson)) {
      const { columnRules } = buildSchemaAndRules({
        schemaSql: request.schemaSql,
        classificationJson: request.classificationJson,
        columnRules: request.columnRules,
        columnOrder: request.columnOrder,
      });
      request.columnRules = columnRules;
    }

    request.updatedAt = new Date().toISOString();
    this.storage.write(state);
    return request;
  }

  deleteGenerationRequest(id: string): void {
    const state = this.storage.read();
    state.generationRequests = state.generationRequests.filter((item) => item.id !== id);
    this.storage.write(state);
  }

  getGenerationRequest(id: string): GenerationRequestEntity {
    const request = this.storage.read().generationRequests.find((item) => item.id === id);
    if (!request) {
      throw new Error('Generation request not found.');
    }
    return request;
  }

  generatePreviewForRequest(id: string): PreviewResult {
    const request = this.getGenerationRequest(id);
    return this.generatePreviewFromInput({
      schemaSql: request.schemaSql,
      classificationJson: request.classificationJson,
      locale: request.locale,
      sqlProvider: request.sqlProvider,
      columnRules: request.columnRules,
      columnOrder: request.columnOrder,
      schemaRelationshipsJson: request.schemaRelationshipsJson,
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
    const transactionWrapper =
      input.sqlProvider === 'sqlserver'
        ? { prefix: ['BEGIN TRANSACTION;', ''], suffix: ['', 'COMMIT TRANSACTION;'] }
        : input.sqlProvider === 'postgres'
          ? { prefix: ['BEGIN;', ''], suffix: ['', 'COMMIT;'] }
          : input.sqlProvider === 'mysql'
            ? { prefix: ['START TRANSACTION;', ''], suffix: ['', 'COMMIT;'] }
            : {
                prefix: [],
                suffix: [],
              };
    const fullText = [
      header,
      ...transactionWrapper.prefix,
      ...files.map((file) => `-- file: ${file.fileName}\n${file.content}`),
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
    const preview = this.generatePreviewForRequest(id);
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
