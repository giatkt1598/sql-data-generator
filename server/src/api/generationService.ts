import { randomUUID } from 'crypto';
import { parseClassificationJson } from '../ai/classificationLoader';
import { buildClassificationPrompt } from '../ai/promptBuilder';
import { SchemaRelationshipsConfig, TableColumnRules, TableSchema } from '../core/types';
import { generateDataByTableOrder } from '../generator/valueGenerator';
import { buildDefaultColumnRules, sanitizeColumnRules } from '../schema/columnRules';
import { resolveTableOrder } from '../schema/dependencyResolver';
import { parseCreateTableSql } from '../schema/simpleSchemaParser';
import { buildInsertFileArtifacts, SqlFileArtifact } from '../writer/sqlWriter';
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
  columnRules?: TableColumnRules;
  schemaRelationshipsJson?: string;
}

export interface UpdateGenerationRequestInput {
  projectId?: string;
  name?: string;
  schemaSql?: string;
  classificationJson?: string;
  locale?: string;
  columnRules?: TableColumnRules;
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
}): { tables: TableSchema[]; columnRules: TableColumnRules } {
  const schema = parseCreateTableSql(input.schemaSql);
  if (schema.tables.length === 0) {
    throw new Error('No CREATE TABLE statements found.');
  }

  const classification = parseClassificationJson(input.classificationJson);
  const defaultRules = buildDefaultColumnRules(schema.tables, classification);
  const mergedRules = sanitizeColumnRules(schema.tables, input.columnRules, defaultRules);
  return {
    tables: schema.tables,
    columnRules: mergedRules,
  };
}

function canBuildSchemaAndRules(schemaSql: string, classificationJson: string): boolean {
  return schemaSql.trim().length > 0 && classificationJson.trim().length > 0;
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
      columnRules,
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
    if (typeof input.columnRules !== 'undefined') {
      request.columnRules = input.columnRules;
    }
    if (typeof input.schemaRelationshipsJson !== 'undefined') {
      request.schemaRelationshipsJson = asText(input.schemaRelationshipsJson);
    }

    if (canBuildSchemaAndRules(request.schemaSql, request.classificationJson)) {
      const { columnRules } = buildSchemaAndRules({
        schemaSql: request.schemaSql,
        classificationJson: request.classificationJson,
        columnRules: request.columnRules,
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
      columnRules: request.columnRules,
      schemaRelationshipsJson: request.schemaRelationshipsJson,
    });
  }

  generatePreviewFromInput(input: {
    schemaSql: string;
    classificationJson: string;
    locale?: string;
    columnRules?: TableColumnRules;
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
    const files = buildInsertFileArtifacts(generatedRows);
    const fullText = files.map((file) => `-- file: ${file.fileName}\n${file.content}`).join('\n');
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
    return preview.files.map((file) => `-- ${file.fileName}\n${file.content}`).join('\n');
  }

  exportCombinedScriptFromInput(input: {
    schemaSql: string;
    classificationJson: string;
    locale?: string;
    columnRules?: TableColumnRules;
    schemaRelationshipsJson?: string;
  }): string {
    const preview = this.generatePreviewFromInput(input);
    return preview.files.map((file) => `-- ${file.fileName}\n${file.content}`).join('\n');
  }

  seed(initial: AppStorageState): void {
    this.storage.write(initial);
  }
}
