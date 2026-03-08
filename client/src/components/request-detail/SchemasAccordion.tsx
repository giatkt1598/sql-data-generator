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
import { tableAnchorId } from '../../utilities/schemaAnchor';
import { useRequestDetailContext } from './RequestDetailContext';
import { SchemaFieldRow } from './SchemaFieldRow';

export function SchemasAccordion() {
  const context = useRequestDetailContext();

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
                {context.designerModel.tables.map((table) => (
                  <Card key={table.name} id={tableAnchorId(table.name)} variant="outlined">
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 1 }}>{table.name}</Typography>
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
                            customValues: rule?.kind === 'customList' ? rule.customValues ?? [] : [],
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
                            semanticType: rule?.kind === 'semantic' ? rule.semanticType ?? 'unknown' : undefined,
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
                  Table Index
                </Typography>
                <Stack spacing={0.5}>
                  {context.designerModel.tables.map((table) => (
                    <Button
                      key={`toc-${table.name}`}
                      size="small"
                      sx={{ justifyContent: 'flex-start' }}
                      onClick={() => {
                        document
                          .getElementById(tableAnchorId(table.name))
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      {table.name}
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
