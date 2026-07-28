import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tableAnchorId } from '../../utilities/schemaAnchor';
import {
  SchemaFieldRowProvider,
  useMockDataSchemaDetailContext,
} from './MockDataSchemaDetailContext';
import type { SchemaFieldRowContextValue } from './MockDataSchemaDetailContext';
import { SchemaTableCard } from './SchemaTableCard';

const PRELOAD_BATCH_SIZE = 2;

function scheduleIdlePreload(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const idleCallbackId = window.requestIdleCallback(callback, { timeout: 250 });
    return () => window.cancelIdleCallback(idleCallbackId);
  }

  const timeoutId = window.setTimeout(callback, 32);
  return () => window.clearTimeout(timeoutId);
}

export function SchemasAccordion() {
  const context = useMockDataSchemaDetailContext();
  const contextRef = useRef(context);
  const [visibleTableNames, setVisibleTableNames] = useState<Set<string>>(new Set());
  const [preloadedTableNames, setPreloadedTableNames] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<{ tableName: string; columnName: string } | null>(
    null,
  );
  const hasSchemaInputs =
    context.form.schemaSql.trim().length > 0 || context.form.classificationJson.trim().length > 0;
  const tableNames = useMemo(
    () => context.designerModel?.tables.map((table) => table.name) ?? [],
    [context.designerModel],
  );

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const getLatestActions = useCallback(() => contextRef.current, []);
  const schemaFieldContextValue = useMemo<SchemaFieldRowContextValue>(
    () => ({
      columnRules: context.columnRules,
      semanticTypes: context.semanticTypes,
      customListTypes: context.customListTypes,
      getActions: getLatestActions,
    }),
    [context.columnRules, context.customListTypes, context.semanticTypes, getLatestActions],
  );
  const tableActions = useMemo(
    () => ({
      reorderColumns: (tableName: string, fromColumnName: string, toColumnName: string) =>
        getLatestActions().reorderColumns(tableName, fromColumnName, toColumnName),
      addField: (tableName: string) => getLatestActions().addField(tableName),
      deleteField: (tableName: string, columnName: string) =>
        getLatestActions().deleteField(tableName, columnName),
    }),
    [getLatestActions],
  );

  useEffect(() => {
    const nextTableNames = tableNames
      .slice(1)
      .filter((tableName) => !preloadedTableNames.has(tableName))
      .slice(0, PRELOAD_BATCH_SIZE);

    if (nextTableNames.length === 0) {
      return;
    }

    return scheduleIdlePreload(() => {
      startTransition(() => {
        setPreloadedTableNames((current) => {
          const next = new Set(current);
          nextTableNames.forEach((tableName) => next.add(tableName));
          return next;
        });
      });
    });
  }, [preloadedTableNames, tableNames]);

  useEffect(() => {
    if (!context.designerModel || tableNames.length === 0 || !context.schemasExpanded) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleTableNames((current) => {
          const next = new Set(current);
          let changed = false;

          entries.forEach((entry) => {
            const tableName = (entry.target as HTMLElement).dataset.tableName;
            if (!tableName) {
              return;
            }

            if (entry.isIntersecting && !next.has(tableName)) {
              next.add(tableName);
              changed = true;
            } else if (!entry.isIntersecting && next.delete(tableName)) {
              changed = true;
            }
          });

          return changed ? next : current;
        });
      },
      { rootMargin: '-100px 0px 0px', threshold: 0 },
    );

    tableNames.forEach((tableName) => {
      const element = document.getElementById(tableAnchorId(tableName));
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [context.designerModel, context.schemasExpanded, tableNames]);

  function scrollToTable(tableName: string) {
    setPreloadedTableNames((current) => {
      if (current.has(tableName)) {
        return current;
      }
      const next = new Set(current);
      next.add(tableName);
      return next;
    });

    window.requestAnimationFrame(() => {
      const element = document.getElementById(tableAnchorId(tableName));
      if (!element) {
        return;
      }

      const top = window.scrollY + element.getBoundingClientRect().top - 100;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    });
  }

  const schemaSkeleton = (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack spacing={1.5}>
          {Array.from({ length: 3 }).map((_, tableIndex) => (
            <Card key={`schema-skeleton-${tableIndex}`} variant="outlined">
              <CardContent>
                <Skeleton variant="text" width={180} height={36} sx={{ mb: 1 }} />
                <Stack spacing={1}>
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <Stack
                      key={`schema-skeleton-row-${tableIndex}-${rowIndex}`}
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1}
                    >
                      <Skeleton variant="rounded" width={28} height={36} />
                      <Skeleton variant="rounded" width={160} height={40} />
                      <Skeleton variant="rounded" width={160} height={40} />
                      <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      <Card
        variant="outlined"
        sx={{
          width: { xs: '100%', lg: 260 },
          position: { lg: 'sticky' },
          top: { lg: 84 },
          alignSelf: { lg: 'flex-start' },
        }}
      >
        <CardContent>
          <Skeleton variant="text" width={72} height={28} sx={{ mb: 1 }} />
          <Stack spacing={0.75}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={`schema-index-skeleton-${index}`} variant="rounded" height={32} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <Accordion
      expanded={context.schemasExpanded}
      onChange={(_event, value) => context.setSchemasExpanded(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schemas</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {(context.loading || hasSchemaInputs) && !context.designerModel && schemaSkeleton}
        {!context.loading && !hasSchemaInputs && !context.designerModel && (
          <Typography color="text.secondary">
            No schemas yet. Click "Analyze & Build Schemas" in General.
          </Typography>
        )}
        {context.designerModel && (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SchemaFieldRowProvider value={schemaFieldContextValue}>
                <Stack spacing={1.5}>
                  {context.designerModel.tables.map((table, tableIndex) => {
                    const isPreloaded = tableIndex === 0 || preloadedTableNames.has(table.name);

                    return (
                      <Box
                        key={table.name}
                        id={tableAnchorId(table.name)}
                        data-table-name={table.name}
                        sx={{
                          minHeight: isPreloaded
                            ? undefined
                            : Math.max(160, 88 + table.columns.length * 58),
                        }}
                      >
                        {isPreloaded && (
                          <SchemaTableCard
                            table={table}
                            tableIndex={tableIndex}
                            columnRules={context.columnRules}
                            columnOrder={context.columnOrder}
                            dragState={dragState}
                            onDragStateChange={setDragState}
                            reorderColumns={tableActions.reorderColumns}
                            addField={tableActions.addField}
                            deleteField={tableActions.deleteField}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </SchemaFieldRowProvider>
            </Box>

            <Card
              variant="outlined"
              sx={{
                width: { xs: '100%', lg: 260 },
                position: { lg: 'sticky' },
                top: { lg: 84 },
                alignSelf: { lg: 'flex-start' },
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Index
                </Typography>
                <Stack spacing={0.5}>
                  {context.designerModel.tables.map((table, index) => (
                    <Button
                      key={`toc-${table.name}`}
                      size="small"
                      sx={{
                        width: '100%',
                        minWidth: 0,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        color: visibleTableNames.has(table.name) ? 'primary.light' : 'text.primary',
                        backgroundColor: visibleTableNames.has(table.name)
                          ? 'rgba(57, 255, 136, 0.14)'
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: visibleTableNames.has(table.name)
                            ? 'rgba(57, 255, 136, 0.22)'
                            : 'action.hover',
                        },
                      }}
                      title={`${index + 1}. ${table.name}`}
                      onClick={() => scrollToTable(table.name)}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          width: '100%',
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'left',
                        }}
                      >
                        {index + 1}. {table.name}
                      </Box>
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
