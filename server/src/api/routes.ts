import { Router, Request, Response } from 'express';
import { DATA_TYPE_DEFINITIONS } from '../core/semanticTypes';
import { TableColumnRules } from '../core/types';
import { GenerationService } from './generationService';

function parseBody<T>(req: Request): T {
  return req.body as T;
}

function handleError(error: unknown, res: Response): void {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  res.status(400).json({ message });
}

export function buildApiRouter(service: GenerationService): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/semantic-types', (_req, res) => {
    res.json({ items: DATA_TYPE_DEFINITIONS });
  });

  router.post('/column-designer-model', (req, res) => {
    try {
      const body = parseBody<{
        schemaSql?: string;
        classificationJson?: string;
        columnRules?: TableColumnRules;
      }>(req);
      const result = service.buildColumnDesignerModel({
        schemaSql: body.schemaSql ?? '',
        classificationJson: body.classificationJson ?? '',
        columnRules: body.columnRules,
      });
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post('/preview', (req, res) => {
    try {
      const body = parseBody<{
        schemaSql?: string;
        classificationJson?: string;
        columnRules?: TableColumnRules;
        schemaRelationshipsJson?: string;
      }>(req);
      const result = service.generatePreviewFromInput({
        schemaSql: body.schemaSql ?? '',
        classificationJson: body.classificationJson ?? '',
        columnRules: body.columnRules,
        schemaRelationshipsJson: body.schemaRelationshipsJson,
      });
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post('/download', (req, res) => {
    try {
      const body = parseBody<{
        schemaSql?: string;
        classificationJson?: string;
        columnRules?: TableColumnRules;
        schemaRelationshipsJson?: string;
      }>(req);
      const script = service.exportCombinedScriptFromInput({
        schemaSql: body.schemaSql ?? '',
        classificationJson: body.classificationJson ?? '',
        columnRules: body.columnRules,
        schemaRelationshipsJson: body.schemaRelationshipsJson,
      });
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="generated.sql"');
      res.send(script);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post('/classification-prompt', (req, res) => {
    try {
      const body = parseBody<{ schemaSql?: string; extraBusinessContext?: string }>(req);
      const prompt = service.buildPrompt(body.schemaSql ?? '', body.extraBusinessContext);
      res.json({ prompt });
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get('/projects', (_req, res) => {
    res.json({ items: service.listProjects() });
  });

  router.post('/projects', (req, res) => {
    try {
      const body = parseBody<{ name?: string; description?: string }>(req);
      const item = service.createProject({
        name: body.name ?? '',
        description: body.description,
      });
      res.status(201).json(item);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.put('/projects/:id', (req, res) => {
    try {
      const body = parseBody<{ name?: string; description?: string }>(req);
      const item = service.updateProject(req.params.id, body);
      res.json(item);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.delete('/projects/:id', (req, res) => {
    try {
      service.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get('/generation-requests', (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    res.json({ items: service.listGenerationRequests(projectId) });
  });

  router.post('/generation-requests', (req, res) => {
    try {
      const body = parseBody<{
        projectId?: string;
        name?: string;
        schemaSql?: string;
        classificationJson?: string;
        columnRules?: TableColumnRules;
        schemaRelationshipsJson?: string;
      }>(req);
      const item = service.createGenerationRequest({
        projectId: body.projectId ?? '',
        name: body.name ?? '',
        schemaSql: body.schemaSql ?? '',
        classificationJson: body.classificationJson ?? '',
        columnRules: body.columnRules,
        schemaRelationshipsJson: body.schemaRelationshipsJson,
      });
      res.status(201).json(item);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.put('/generation-requests/:id', (req, res) => {
    try {
      const body = parseBody<{
        projectId?: string;
        name?: string;
        schemaSql?: string;
        classificationJson?: string;
        columnRules?: TableColumnRules;
        schemaRelationshipsJson?: string;
      }>(req);
      const item = service.updateGenerationRequest(req.params.id, body);
      res.json(item);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.delete('/generation-requests/:id', (req, res) => {
    try {
      service.deleteGenerationRequest(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post('/generation-requests/:id/preview', (req, res) => {
    try {
      const result = service.generatePreviewForRequest(req.params.id);
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get('/generation-requests/:id/download', (req, res) => {
    try {
      const script = service.exportCombinedScript(req.params.id);
      const fileName = `generated_${req.params.id}.sql`;
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(script);
    } catch (error) {
      handleError(error, res);
    }
  });

  return router;
}
