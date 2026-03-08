import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { stringifyRule } from '../../utilities/ruleUtils';
import { tableAnchorId } from '../../utilities/schemaAnchor';
import { useRequestDetailContext } from './RequestDetailContext';

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
                        {table.columns.map((column) => {
                          const value = stringifyRule(context.columnRules[table.name]?.[column.name]);
                          const blankPercentage =
                            context.columnRules[table.name]?.[column.name]?.blankPercentage ?? 0;
                          return (
                            <Stack
                              key={`${table.name}.${column.name}`}
                              direction={{ xs: 'column', md: 'row' }}
                              spacing={1}
                              alignItems={{ md: 'center' }}
                            >
                              <Box sx={{ minWidth: 240 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {column.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {column.dbType}
                                </Typography>
                              </Box>
                              <Button
                                variant="outlined"
                                onClick={() => context.openTypePicker(table.name, column.name)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                              >
                                {value}
                              </Button>
                              <TextField
                                label="Blank (%)"
                                size="small"
                                type="number"
                                value={blankPercentage}
                                onChange={(event) =>
                                  context.onBlankPercentageChange(
                                    table.name,
                                    column.name,
                                    event.target.value,
                                  )
                                }
                                inputProps={{ min: 0, max: 100 }}
                                sx={{ width: { xs: '100%', md: 130 } }}
                              />
                            </Stack>
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
