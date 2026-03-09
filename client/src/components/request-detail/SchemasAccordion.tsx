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
import { useEffect, useMemo, useState } from 'react';
import { tableAnchorId } from '../../utilities/schemaAnchor';
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';
import { SchemaTableCard } from './SchemaTableCard';

export function SchemasAccordion() {
  const context = useMockDataSchemaDetailContext();
  const [visibleTableNames, setVisibleTableNames] = useState<Set<string>>(new Set());
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
    if (!context.designerModel || tableNames.length === 0) {
      setVisibleTableNames(new Set());
      return;
    }

    const updateVisibleTables = () => {
      const nextVisibleTableNames = new Set<string>();
      const viewportTop = 100;
      const viewportBottom = window.innerHeight;

      tableNames.forEach((tableName) => {
        const element = document.getElementById(tableAnchorId(tableName));
        if (!element) {
          return;
        }

        const rect = element.getBoundingClientRect();
        const isVisible = rect.bottom > viewportTop && rect.top < viewportBottom;

        if (isVisible) {
          nextVisibleTableNames.add(tableName);
        }
      });

      setVisibleTableNames(nextVisibleTableNames);
    };

    updateVisibleTables();
    window.addEventListener('scroll', updateVisibleTables, { passive: true });
    window.addEventListener('resize', updateVisibleTables);

    return () => {
      window.removeEventListener('scroll', updateVisibleTables);
      window.removeEventListener('resize', updateVisibleTables);
    };
  }, [context.designerModel, tableNames]);

  function scrollToTable(tableName: string) {
    const element = document.getElementById(tableAnchorId(tableName));
    if (!element) {
      return;
    }

    const top = window.scrollY + element.getBoundingClientRect().top - 100;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth',
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
              <Stack spacing={1.5}>
                {context.designerModel.tables.map((table, tableIndex) => (
                  <SchemaTableCard
                    key={table.name}
                    table={table}
                    tableIndex={tableIndex}
                    columnRules={context.columnRules}
                    columnOrder={context.columnOrder}
                    dragState={dragState}
                    onDragStateChange={setDragState}
                    reorderColumns={context.reorderColumns}
                  />
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
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Index
                </Typography>
                <Stack spacing={0.5}>
                  {context.designerModel.tables.map((table, index) => (
                    <Button
                      key={`toc-${table.name}`}
                      size="small"
                      sx={{
                        justifyContent: 'flex-start',
                        color: visibleTableNames.has(table.name) ? 'primary.dark' : 'text.primary',
                        backgroundColor: visibleTableNames.has(table.name)
                          ? 'rgba(29, 78, 216, 0.12)'
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: visibleTableNames.has(table.name)
                            ? 'rgba(29, 78, 216, 0.18)'
                            : 'action.hover',
                        },
                      }}
                      onClick={() => scrollToTable(table.name)}
                    >
                      {index + 1}. {table.name}
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
