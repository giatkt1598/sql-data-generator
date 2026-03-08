import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useState } from 'react';
import { tableAnchorId } from '../../utilities/schemaAnchor';
import { useRequestDetailContext } from './RequestDetailContext';
import { SchemaFieldRow } from './SchemaFieldRow';

export function SchemasAccordion() {
  const context = useRequestDetailContext();
  const [visibleTableNames, setVisibleTableNames] = useState<Set<string>>(new Set());
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

  return (
    <Accordion
      expanded={context.schemasExpanded}
      onChange={(_event, value) => context.setSchemasExpanded(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schemas</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {!context.designerModel && (
          <Typography color="text.secondary">
            No schemas yet. Click "Analyze & Build Schemas" in General.
          </Typography>
        )}
        {context.designerModel && (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={1.5}>
                {context.designerModel.tables.map((table, tableIndex) => (
                  <Card
                    key={table.name}
                    id={tableAnchorId(table.name)}
                    data-table-name={table.name}
                    variant="outlined"
                  >
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 1 }}>
                        {tableIndex + 1}.&nbsp;{table.name}
                      </Typography>
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1}
                          sx={{ px: 0.25 }}
                        >
                          <Box sx={{ width: 28 }} />
                          <Typography
                            variant="caption"
                            sx={{ minWidth: 160, fontWeight: 700, color: 'text.secondary' }}
                          >
                            Field Name
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              width: { xs: '100%', md: 160 },
                              fontWeight: 700,
                              color: 'text.secondary',
                            }}
                          >
                            Type
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ flex: 1, fontWeight: 700, color: 'text.secondary' }}
                          >
                            Options
                          </Typography>
                        </Stack>
                        {table.columns.map((column) => {
                          const rule = context.columnRules[table.name]?.[column.name];
                          const customListText =
                            rule?.kind === 'customList' ? (rule.customValues ?? []).join(', ') : '';
                          const fieldNameText = rule?.fieldName ?? column.name;
                          const blankPercentage = rule?.blankPercentage ?? 0;
                          const ruleSignature = JSON.stringify({
                            kind: rule?.kind ?? 'semantic',
                            fieldName: fieldNameText,
                            blankPercentage,
                            customValues:
                              rule?.kind === 'customList' ? (rule.customValues ?? []) : [],
                            numberOptions: rule?.numberOptions ?? {
                              min: 0,
                              max: 100,
                              decimals: 0,
                            },
                            dateTimeOptions: rule?.dateTimeOptions ?? {
                              start: '2024-01-01',
                              end: '2026-12-31',
                              format: 'yyyy-MM-dd HH:mm:ss',
                            },
                            sequenceOptions: rule?.sequenceOptions ?? {
                              startAt: 1,
                              step: 1,
                              repeat: 1,
                            },
                            digitSequenceOptions: rule?.digitSequenceOptions ?? {
                              format: '',
                            },
                            emailOptions: rule?.emailOptions ?? {
                              domains: [],
                            },
                            textOptions: rule?.textOptions ?? {
                              minLength: 1,
                              maxLength: 4,
                              unit: 'words',
                            },
                            semanticType:
                              rule?.kind === 'semantic'
                                ? (rule.semanticType ?? 'unknown')
                                : undefined,
                            reference: rule?.kind === 'reference' ? rule.reference : undefined,
                          });
                          return (
                            <SchemaFieldRow
                              key={`${table.name}.${column.name}:${ruleSignature}`}
                              tableName={table.name}
                              column={column}
                              blankPercentage={blankPercentage}
                              customListText={customListText}
                              fieldNameText={fieldNameText}
                            />
                          );
                        })}
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
                        backgroundColor:
                          visibleTableNames.has(table.name)
                            ? 'rgba(29, 78, 216, 0.12)'
                            : 'transparent',
                        '&:hover': {
                          backgroundColor:
                            visibleTableNames.has(table.name)
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
